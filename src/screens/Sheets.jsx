import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, Dice5, PiggyBank, Clock, Wallet, Sparkles } from 'lucide-react'
import { useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Btn, Chip, Sheet, useBurst, useToast, softSpring } from '../components/ui.jsx'
import { DAY, delayDays, eta, lensOf, round5, rupees, uid } from '../lib/money.js'
import {
  CLAYS, GOAL_KINDS, INCOME_SOURCES, NICKNAMES, SPEND_CATS, SamosaIcon, goalKindOf, nextCyclePart,
} from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

export default function Sheets({ sheet, close }) {
  const name = sheet?.name
  const props = sheet?.props || {}
  const titles = {
    in: 'Money in',
    out: 'Money out',
    start: 'Start your own Gullu',
    goal: 'Save up for something',
    goalMoney: props.mode === 'take' ? 'Take money out' : 'Add to your goal',
  }
  return (
    <Sheet open={!!sheet} onClose={close} title={titles[name] || ''}>
      {name === 'in' && <MoneyIn close={close} />}
      {name === 'out' && <MoneyOut close={close} preset={props} />}
      {name === 'start' && <StartFresh close={close} />}
      {name === 'goal' && <NewGoal close={close} preset={props} />}
      {name === 'goalMoney' && <GoalMoney close={close} {...props} />}
    </Sheet>
  )
}

/* ---------- shared ---------- */

export function MoneyField({ id, label, value, onChange, quick = [10, 20, 50, 100, 500], error, hint, max = 999999 }) {
  const errId = `${id}-msg`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="money-input">
        <span className="cur" aria-hidden="true">
          ₹
        </span>
        <input
          id={id}
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="0"
          autoComplete="off"
          value={value ? String(value) : ''}
          aria-invalid={!!error}
          aria-describedby={error || hint ? errId : undefined}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
            onChange(Math.min(max, v ? parseInt(v, 10) : 0))
          }}
        />
      </div>
      <div className="row-wrap">
        {quick.map((q) => (
          <Chip key={q} onClick={() => onChange(Math.min(max, (value || 0) + q))} aria-label={`Add ${q} rupees`}>
            +₹{q.toLocaleString('en-IN')}
          </Chip>
        ))}
        {value > 0 && <Chip onClick={() => onChange(0)}>Clear</Chip>}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        {error ? (
          <motion.p key="e" id={errId} className="err" role="alert" initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <AlertCircle size={18} aria-hidden="true" /> {error}
          </motion.p>
        ) : hint ? (
          <motion.p key="h" id={errId} className="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {hint}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function Impact({ rows }) {
  return (
    <motion.div className="impact" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
      {rows.filter(Boolean).map((r) => (
        <motion.div key={r.key} className="impact-row" variants={{ hidden: { opacity: 0, x: -14 }, show: { opacity: 1, x: 0, transition: softSpring } }}>
          {r.icon}
          <span>{r.text}</span>
        </motion.div>
      ))}
    </motion.div>
  )
}

/* ---------- money in ---------- */

function MoneyIn({ close }) {
  const { state, dispatch, main, lensCtx } = useStore()
  const toast = useToast()
  const [source, setSource] = useState('pocket')
  const [amount, setAmount] = useState(0)
  const [note, setNote] = useState('')
  const [saveFirst, setSaveFirst] = useState(state.autoSave.on)
  const canAuto = !!main && main.left > 0
  const autoAmt = canAuto && saveFirst ? Math.min(main.left, round5((amount * state.autoSave.pct) / 100)) : 0

  const submit = () => {
    if (!amount) return
    const s = INCOME_SOURCES.find((x) => x.key === source)
    dispatch({ type: 'ADD_IN', amount, source, note: note.trim() || s.label, skipAutoSave: !saveFirst })
    close()
    toast({ text: autoAmt ? `${rupees(amount)} in. ${rupees(autoAmt)} saved for your ${main.name}.` : `${rupees(amount)} dropped into Gullu.` })
  }

  return (
    <form
      className="stack"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="field">
        <span className="label" id="src-l">
          Where did it come from?
        </span>
        <div className="row-wrap" role="group" aria-labelledby="src-l">
          {INCOME_SOURCES.filter((s) => !s.hidden).map((s) => (
            <Chip key={s.key} pressed={source === s.key} onClick={() => setSource(s.key)}>
              <s.icon size={18} strokeWidth={2.4} aria-hidden="true" /> {s.label}
            </Chip>
          ))}
        </div>
      </div>
      <MoneyField id="in-amt" label="How much?" value={amount} onChange={setAmount} hint={amount ? `That's ${lensOf(amount, 'samosa', lensCtx).text}!` : 'Type it, or tap the coins below.'} />
      <div className="field">
        <label htmlFor="in-note">What for? (you can skip this)</label>
        <input id="in-note" className="input" maxLength={40} placeholder={source === 'chores' ? 'Washed the car' : source === 'gift' ? 'Birthday money' : 'Pocket money'} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {canAuto && (
        <div className="card flat warm tight row" style={{ alignItems: 'flex-start' }}>
          <PiggyBank size={26} strokeWidth={2.4} aria-hidden="true" style={{ flex: 'none', marginTop: 2 }} />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700 }}>Save first?</p>
            <p className="hint">
              {saveFirst
                ? amount
                  ? `Gullu puts ${rupees(autoAmt)} (${state.autoSave.pct}%) into your ${main.name} before you can spend it.`
                  : `Gullu puts ${state.autoSave.pct}% into your ${main.name} before you can spend it.`
                : 'Everything goes into Gullu to spend.'}
            </p>
          </div>
          <Chip pressed={saveFirst} onClick={() => setSaveFirst((v) => !v)} aria-label="Save first">
            {saveFirst ? 'On' : 'Off'}
          </Chip>
        </div>
      )}
      <Btn className="mint lg block" disabled={!amount} sound="pop" onClick={submit}>
        Drop {amount ? rupees(amount) : 'it'} into Gullu
      </Btn>
    </form>
  )
}

/* ---------- money out ---------- */

function MoneyOut({ close, preset }) {
  const { dispatch, balance, main, lensCtx, perDay } = useStore()
  const toast = useToast()
  const [cat, setCat] = useState(preset.cat || 'snacks')
  const [amount, setAmount] = useState(preset.amount || 0)
  const [note, setNote] = useState(preset.note || '')
  const c = SPEND_CATS.find((x) => x.key === cat)
  const tooMuch = amount > balance
  const days = main ? delayDays(amount, perDay) : 0

  const submit = () => {
    if (!amount || tooMuch) return
    const id = uid()
    dispatch({ type: 'ADD_OUT', id, amount, cat, note: note.trim() || c.label })
    close()
    toast({
      text: `${rupees(amount)} spent on ${note.trim() || c.label.toLowerCase()}.`,
      action: { label: 'Undo', onClick: () => dispatch({ type: 'DELETE_TX', id }) },
    })
  }

  return (
    <form
      className="stack"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="field">
        <span className="label" id="cat-l">
          What did you spend it on?
        </span>
        <div className="row-wrap" role="group" aria-labelledby="cat-l">
          {SPEND_CATS.filter((x) => !x.hidden).map((x) => (
            <Chip key={x.key} pressed={cat === x.key} onClick={() => setCat(x.key)}>
              <span className="chip-ic" style={{ width: 24, height: 24, borderRadius: 8, background: x.hex, border: '2px solid var(--ink)', color: 'var(--ink)' }} aria-hidden="true">
                {x.custom ? <x.icon size={18} /> : <x.icon size={15} strokeWidth={2.6} />}
              </span>
              {x.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="field">
        <label htmlFor="out-note">What was it?</label>
        <input id="out-note" className="input" maxLength={40} placeholder={c.examples[0] || 'Something fun'} value={note} onChange={(e) => setNote(e.target.value)} />
        {c.examples.length > 0 && (
          <div className="row-wrap">
            {c.examples.map((ex) => (
              <Chip key={ex} pressed={note === ex} onClick={() => setNote(ex)}>
                {ex}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <MoneyField
        id="out-amt"
        label="How much was it?"
        value={amount}
        onChange={setAmount}
        error={tooMuch ? `Gullu only has ${rupees(balance)}. If this money came from somewhere else, add it with "I got money" first.` : null}
      />
      {amount > 0 && !tooMuch && (
        <Impact
          key={amount + cat}
          rows={[
            { key: 's', icon: <SamosaIcon size={30} />, text: <>That's <b>{lensOf(amount, 'samosa', lensCtx).text}</b></> },
            main && { key: 'g', icon: <Clock size={26} strokeWidth={2.4} aria-hidden="true" />, text: <>It pushes your <b>{main.name}</b> back <b>{days} {days === 1 ? 'day' : 'days'}</b></> },
            { key: 'l', icon: <Wallet size={26} strokeWidth={2.4} aria-hidden="true" />, text: <>Gullu will have <b className="num">{rupees(balance - amount)}</b> left</> },
          ]}
        />
      )}
      <Btn className="coral lg block" disabled={!amount || tooMuch} sound="pop" onClick={submit}>
        Take {amount ? rupees(amount) : 'it'} out of Gullu
      </Btn>
    </form>
  )
}

/* ---------- start fresh ---------- */

function StartFresh({ close }) {
  const { state, dispatch } = useStore()
  const { go } = useUI()
  const burst = useBurst()
  const toast = useToast()
  const [nick, setNick] = useState(state.isDemo ? NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)] : state.profile.nickname)
  const [clay, setClay] = useState(state.profile.clay)
  const [amount, setAmount] = useState(0)
  const [sure, setSure] = useState(state.isDemo)
  const roll = () => {
    sfx.boing()
    let n = nick
    while (n === nick) n = NICKNAMES[Math.floor(Math.random() * NICKNAMES.length)]
    setNick(n)
  }
  const start = () => {
    dispatch({ type: 'START_FRESH', nickname: nick.trim() || 'Coin Cadet', clay, amount })
    close()
    go('home')
    sfx.tada()
    setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.4, 18), 200)
    toast({ text: 'Your Gullu is ready. Welcome!' })
  }
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="field">
        <label htmlFor="nick">Pick a nickname</label>
        <div className="row">
          <input id="nick" className="input" maxLength={24} value={nick} onChange={(e) => setNick(e.target.value)} />
          <Btn size="sm" className="marigold" onClick={roll} sound={null} aria-label="Roll a new nickname">
            <Dice5 size={20} strokeWidth={2.4} /> Roll
          </Btn>
        </div>
        <p className="hint">Keep it made-up. Please don't use your real name.</p>
      </div>
      <div className="field">
        <span className="label" id="clay-l">
          Pick Gullu's colour
        </span>
        <div className="row-wrap" role="radiogroup" aria-labelledby="clay-l">
          {CLAYS.map((c) => (
            <Chip key={c.key} role="radio" aria-checked={clay === c.key} onClick={() => setClay(c.key)}>
              <span style={{ width: 20, height: 20, borderRadius: '50%', background: c.hex, border: '2px solid var(--ink)' }} aria-hidden="true" />
              {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <MoneyField id="start-amt" label="How much pretend money is in your gullak right now?" value={amount} onChange={setAmount} quick={[100, 500, 1000]} hint="You can start at ₹0 too." />
      {!state.isDemo && (
        <label className="row card flat tight warm" htmlFor="sure" style={{ cursor: 'pointer' }}>
          <input id="sure" type="checkbox" checked={sure} onChange={(e) => setSure(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#141633' }} />
          <span style={{ fontWeight: 600 }}>Clear everything in this Gullu and start again</span>
        </label>
      )}
      <Btn className="marigold lg block" disabled={!sure} onClick={start} sound={null}>
        Start my Gullu
      </Btn>
    </div>
  )
}

/* ---------- new goal ---------- */

function NewGoal({ close, preset }) {
  const { dispatch, goals } = useStore()
  const { go } = useUI()
  const toast = useToast()
  const [kind, setKind] = useState(preset.kind || 'cycle')
  const [name, setName] = useState(preset.name || 'New cycle')
  const [target, setTarget] = useState(preset.target || 6000)
  const [weekly, setWeekly] = useState(100)
  const live = goals.filter((g) => !g.done)
  const [makeMain, setMakeMain] = useState(live.length === 0)
  const when = eta(target, weekly)

  const pick = (k) => {
    const g = goalKindOf(k)
    setKind(k)
    setName(k === 'cycle' ? 'New cycle' : k === 'other' ? '' : g.label)
    setTarget(g.price)
  }
  const submit = () => {
    if (!name.trim() || !target) return
    dispatch({ type: 'GOAL_CREATE', name: name.trim(), kind, target, weekly, makeMain })
    close()
    go('save')
    toast({ text: `New goal: ${name.trim()}. Let's go!` })
  }
  return (
    <form
      className="stack"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="field">
        <span className="label" id="kind-l">
          What is it?
        </span>
        <div className="row-wrap" role="radiogroup" aria-labelledby="kind-l">
          {GOAL_KINDS.map((g) => (
            <Chip key={g.key} role="radio" aria-checked={kind === g.key} onClick={() => pick(g.key)}>
              <g.icon size={18} strokeWidth={2.4} aria-hidden="true" /> {g.label}
            </Chip>
          ))}
        </div>
        {kind === 'cycle' && <p className="hint">A cycle goal builds itself in 3D, one part at a time, as you save.</p>}
      </div>
      <div className="field">
        <label htmlFor="g-name">Give it a name</label>
        <input id="g-name" className="input" maxLength={28} placeholder="Red cycle with gears" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <MoneyField id="g-price" label="How much does it cost?" value={target} onChange={setTarget} quick={[100, 500, 1000]} error={target === 0 ? 'Add a price so Gullu can count down to it.' : null} />
      <div className="field">
        <span className="label" id="wk-l">
          How much can you save each week?
        </span>
        <div className="row-wrap" role="radiogroup" aria-labelledby="wk-l">
          {[50, 100, 150, 200, 300, 500].map((w) => (
            <Chip key={w} role="radio" aria-checked={weekly === w} onClick={() => setWeekly(w)}>
              ₹{w}
            </Chip>
          ))}
        </div>
        {when && target > 0 && (
          <p className="hint">
            At {rupees(weekly)} a week, you'll have it <b>{when.text}</b> (around {when.date}).
          </p>
        )}
      </div>
      {live.length > 0 && (
        <label className="row card flat tight warm" htmlFor="mk-main" style={{ cursor: 'pointer' }}>
          <input id="mk-main" type="checkbox" checked={makeMain} onChange={(e) => setMakeMain(e.target.checked)} style={{ width: 22, height: 22, accentColor: '#141633' }} />
          <span style={{ fontWeight: 600 }}>Make this my main goal (“save first” money goes here)</span>
        </label>
      )}
      <Btn className="mint lg block" disabled={!name.trim() || !target} onClick={submit} sound="pop">
        Start saving
      </Btn>
    </form>
  )
}

/* ---------- money into / out of a goal ---------- */

function GoalMoney({ close, goalId, mode = 'add' }) {
  const { dispatch, goals, balance, perDay } = useStore()
  const toast = useToast()
  const g = goals.find((x) => x.id === goalId)
  const [amount, setAmount] = useState(0)
  if (!g) return null
  const max = mode === 'add' ? Math.min(balance, g.left) : g.saved
  const over = amount > max
  const after = mode === 'add' ? Math.min(1, (g.saved + amount) / g.target) : Math.max(0, (g.saved - amount) / g.target)
  const np = mode === 'add' ? nextCyclePart({ ...g, saved: g.saved, pct: g.pct }) : null
  const unlocks = np && amount >= np.need
  const weekly = g.weekly || 100
  const days = delayDays(amount, weekly / 7)

  const submit = () => {
    if (!amount || over) return
    dispatch({ type: mode === 'add' ? 'GOAL_SAVE' : 'GOAL_UNSAVE', id: g.id, amount })
    close()
    if (mode === 'add') sfx.coin()
    toast({ text: mode === 'add' ? `${rupees(amount)} saved for ${g.name}.` : `${rupees(amount)} is back in Gullu.` })
  }
  return (
    <form
      className="stack"
      style={{ gap: 20 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <p className="muted" style={{ fontWeight: 600 }}>
        {mode === 'add' ? `Moves money from Gullu into your ${g.name}. Gullu has ${rupees(balance)}.` : `Moves money from your ${g.name} back into Gullu.`}
      </p>
      <MoneyField
        id="gm-amt"
        label={mode === 'add' ? 'How much do you want to save?' : 'How much do you want to take out?'}
        value={amount}
        onChange={setAmount}
        quick={[20, 50, 100, 200]}
        error={over ? (mode === 'add' ? (balance < g.left ? `Gullu only has ${rupees(balance)}.` : `You only need ${rupees(g.left)} more!`) : `There's only ${rupees(g.saved)} in this goal.`) : null}
      />
      {amount > 0 && !over && (
        <Impact
          key={amount}
          rows={[
            { key: 'p', icon: <PiggyBank size={26} strokeWidth={2.4} aria-hidden="true" />, text: <>Your {g.name} will be <b>{Math.round(after * 100)}%</b> saved</> },
            mode === 'take' && { key: 'd', icon: <Clock size={26} strokeWidth={2.4} aria-hidden="true" />, text: <>That pushes it back about <b>{days} {days === 1 ? 'day' : 'days'}</b></> },
            unlocks && { key: 'u', icon: <Sparkles size={26} strokeWidth={2.4} aria-hidden="true" />, text: <>This unlocks the <b>{np.label}</b>!</> },
          ]}
        />
      )}
      <Btn className={`${mode === 'add' ? 'mint' : 'coral'} lg block`} disabled={!amount || over} onClick={submit} sound={null}>
        {mode === 'add' ? `Save ${amount ? rupees(amount) : 'it'}` : `Take out ${amount ? rupees(amount) : 'money'}`}
      </Btn>
    </form>
  )
}
