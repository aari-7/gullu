import { lazy, Suspense, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Clock, Hand, Moon, Send, Wallet, Undo2, ShoppingBag, Target, MessageCircle, Link2, Check } from 'lucide-react'
import { useNow, useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Btn, Chip, Reveal, Stagger, Stamp, rise, softSpring, useBurst, useToast, burstFrom } from '../components/ui.jsx'
import { MoneyField } from './Sheets.jsx'
import { SectionHead } from '../components/bits.jsx'
import { DAY, delayDays, encodeToken, hoursLeft, lensOf, rupees, shortDate, uid } from '../lib/money.js'
import { REASONS, SPEND_CATS, SamosaIcon, reasonOf } from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

const GiftStage = lazy(() => import('../three/Stages.jsx').then((m) => ({ default: m.GiftStage })))

const QUICK = [
  { item: 'Football', price: 600, cat: 'toys' },
  { item: 'Comic book', price: 150, cat: 'school' },
  { item: 'Movie with friends', price: 300, cat: 'outings' },
  { item: 'Sneakers', price: 1800, cat: 'clothes' },
]

/** Cost to the kid: half if they asked a grown-up to chip in, or the grown-up offered to. */
export const kidPays = (ask) => (ask.pay === 'half' || ask.decision === 'half' ? Math.ceil(ask.price / 2) : ask.price)

function payLine(a) {
  const theirs = rupees(a.price - kidPays(a))
  if (a.decision === 'half' || (a.pay === 'half' && a.decision === 'yes')) return `a grown-up pays half (${theirs})`
  if (a.pay === 'half') return `asked a grown-up to pay half (${theirs})`
  return 'paying from Gullu'
}

export function askImpact(ask, { balance, main, perDay, lensCtx }) {
  const cost = kidPays(ask)
  return {
    cost,
    samosas: lensOf(cost, 'samosa', lensCtx).text,
    days: main ? delayDays(cost, perDay) : 0,
    left: balance - cost,
  }
}

/** A WhatsApp message with a link the grown-up can open on their own phone. */
export function askShareLink(ask, store) {
  const { state, balance, main, perDay } = store
  const cost = kidPays(ask)
  const payload = {
    i: ask.id, it: ask.item, p: ask.price, r: ask.reason, pay: ask.pay, c: ask.cat,
    nk: state.profile.nickname, b: balance,
    g: main ? { n: main.name, d: delayDays(cost, perDay), s: Math.round(main.pct * 100) } : null,
  }
  const url = `${window.location.origin}${window.location.pathname}#ask-${encodeToken(payload)}`
  const text = `Can I buy this? ${ask.item} for ${rupees(ask.price)}${ask.pay === 'half' ? ' (can you pay half?)' : ''}. Tap to answer: ${url}`
  return { url, wa: `https://wa.me/?text=${encodeURIComponent(text)}` }
}

export default function Ask() {
  const store = useStore()
  const { state, dispatch, balance, main } = store
  const { show } = useUI()
  const toast = useToast()
  const now = useNow(30e3)
  const [item, setItem] = useState('')
  const [price, setPrice] = useState(0)
  const [cat, setCat] = useState('toys')
  const [reason, setReason] = useState('want')
  const [pay, setPay] = useState('self')
  const [touched, setTouched] = useState(false)

  const draft = { item, price, pay }
  const imp = askImpact(draft, store)
  const ready = item.trim() && price > 0

  const create = (cool) => {
    setTouched(true)
    if (!ready) return
    const id = uid()
    dispatch({ type: 'ASK_CREATE', id, item: item.trim(), price, cat, reason, pay, cool })
    setItem('')
    setPrice(0)
    setTouched(false)
    if (cool) {
      sfx.pop()
      toast({ text: 'Good thinking. You can ask tomorrow if you still want it.' })
    } else {
      show('handoff', { askId: id })
    }
  }

  const waiting = state.asks.filter((a) => a.status === 'waiting')
  const thinking = state.asks.filter((a) => a.status === 'thinking')
  const answered = state.asks.filter((a) => ['decided', 'bought', 'goal', 'dropped'].includes(a.status))

  return (
    <div className="wrap">
      <header className="screen-head">
        <motion.p className="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Can I buy this?
        </motion.p>
        <motion.h1 className="display h-screen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
          Ask a grown-up
        </motion.h1>
        <p className="lede">Tell them what you want and why. Gullu shows you both what it really costs, so you can decide together.</p>
      </header>

      <div className="grid-2" style={{ marginTop: 14 }}>
        <Reveal className="card">
          <form
            className="stack"
            style={{ gap: 18 }}
            onSubmit={(e) => {
              e.preventDefault()
              create(false)
            }}
          >
            <div className="field">
              <label htmlFor="ask-item">What do you want?</label>
              <input id="ask-item" className="input" maxLength={36} placeholder="A football" value={item} onChange={(e) => setItem(e.target.value)} aria-invalid={touched && !item.trim()} />
              <div className="row-wrap">
                {QUICK.map((q) => (
                  <Chip
                    key={q.item}
                    pressed={item === q.item}
                    onClick={() => {
                      setItem(q.item)
                      setPrice(q.price)
                      setCat(q.cat)
                    }}
                  >
                    {q.item}
                  </Chip>
                ))}
              </div>
              {touched && !item.trim() && (
                <p className="err" role="alert">
                  Write what you want to buy.
                </p>
              )}
            </div>
            <MoneyField id="ask-price" label="How much is it?" value={price} onChange={setPrice} quick={[50, 100, 500]} error={touched && !price ? 'Add the price so your grown-up knows.' : null} />
            <div className="field">
              <span className="label" id="why-l">
                Why do you want it?
              </span>
              <div className="row-wrap" role="radiogroup" aria-labelledby="why-l">
                {REASONS.map((r) => (
                  <Chip key={r.key} role="radio" aria-checked={reason === r.key} onClick={() => setReason(r.key)}>
                    {r.label}
                  </Chip>
                ))}
              </div>
              {reason === 'friends' && <p className="hint">Fair! Just check: would you still want it if your friends didn't have it?</p>}
            </div>
            <div className="field">
              <span className="label" id="kind-l2">
                What kind of thing is it?
              </span>
              <div className="row-wrap" role="radiogroup" aria-labelledby="kind-l2">
                {SPEND_CATS.filter((c) => !c.hidden).map((c) => (
                  <Chip key={c.key} role="radio" aria-checked={cat === c.key} onClick={() => setCat(c.key)}>
                    {c.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="field">
              <span className="label" id="pay-l">
                Who pays?
              </span>
              <div className="row-wrap" role="radiogroup" aria-labelledby="pay-l">
                <Chip role="radio" aria-checked={pay === 'self'} onClick={() => setPay('self')}>
                  <Wallet size={18} strokeWidth={2.4} aria-hidden="true" /> I pay from Gullu
                </Chip>
                <Chip role="radio" aria-checked={pay === 'half'} onClick={() => setPay('half')}>
                  <Hand size={18} strokeWidth={2.4} aria-hidden="true" /> Can you pay half?
                </Chip>
              </div>
            </div>
          </form>
        </Reveal>

        <div className="stack" style={{ gap: 18 }}>
          <Reveal className="ask-stage" delay={0.05}>
            <Suspense fallback={null}>
              <GiftStage price={price} decision={null} />
            </Suspense>
          </Reveal>
          <Reveal className="card warm" delay={0.1}>
            <p className="label">Before you ask, look at this</p>
            {price > 0 ? (
              <Stagger className="impact" style={{ marginTop: 10 }} key={price + pay}>
                <motion.div className="impact-row" variants={rise}>
                  <SamosaIcon size={30} />
                  <span>
                    {pay === 'half' ? 'Your half' : 'It'} costs <b>{rupees(imp.cost)}</b>. That's <b>{imp.samosas}</b>.
                  </span>
                </motion.div>
                {main && (
                  <motion.div className="impact-row" variants={rise}>
                    <Clock size={26} strokeWidth={2.4} aria-hidden="true" />
                    <span>
                      It pushes your <b>{main.name}</b> back <b>{imp.days} days</b>.
                    </span>
                  </motion.div>
                )}
                <motion.div className="impact-row" variants={rise} style={imp.left < 0 ? { background: '#ffe1dc' } : undefined}>
                  <Wallet size={26} strokeWidth={2.4} aria-hidden="true" />
                  <span>
                    {imp.left >= 0 ? (
                      <>
                        Gullu would have <b className="num">{rupees(imp.left)}</b> left.
                      </>
                    ) : (
                      <>
                        Gullu only has <b className="num">{rupees(balance)}</b>. You'd need <b className="num">{rupees(-imp.left)}</b> more.
                      </>
                    )}
                  </span>
                </motion.div>
              </Stagger>
            ) : (
              <p className="muted" style={{ marginTop: 8 }}>
                Add a price to see what it really costs you.
              </p>
            )}
            <div className="stack" style={{ gap: 12, marginTop: 18 }}>
              <Btn className="pink lg block" onClick={() => create(false)} sound="pop">
                <Hand size={22} strokeWidth={2.4} /> Ask a grown-up now
              </Btn>
              <Btn className="block" onClick={() => create(true)} sound={null}>
                <Moon size={20} strokeWidth={2.4} /> Sleep on it first (ask tomorrow)
              </Btn>
              <p className="hint" style={{ textAlign: 'center' }}>
                Lots of “wants” fade after a day. If you still want it tomorrow, it's probably worth asking.
              </p>
            </div>
          </Reveal>
        </div>
      </div>

      {waiting.length > 0 && (
        <section className="section-gap" aria-label="Waiting for an answer">
          <SectionHead kicker="Waiting" title="Waiting for an answer" />
          <Stagger className="stack" style={{ gap: 16 }}>
            {waiting.map((a) => (
              <AskCard key={a.id} a={a} now={now} />
            ))}
          </Stagger>
        </section>
      )}

      {thinking.length > 0 && (
        <section className="section-gap" aria-label="Sleeping on it">
          <SectionHead kicker="Sleeping on it" title="Still thinking" />
          <Stagger className="stack" style={{ gap: 16 }}>
            {thinking.map((a) => (
              <AskCard key={a.id} a={a} now={now} />
            ))}
          </Stagger>
        </section>
      )}

      {answered.length > 0 && (
        <section className="section-gap" aria-label="Answers">
          <SectionHead kicker="Answers" title="What your grown-ups said" />
          <Stagger className="stack" style={{ gap: 16 }}>
            {answered.map((a) => (
              <AskCard key={a.id} a={a} now={now} />
            ))}
          </Stagger>
        </section>
      )}
      <p className="foot-note">Pretend money only. Asking never spends anything until you tap “I bought it”.</p>
    </div>
  )
}

function AskCard({ a, now }) {
  const store = useStore()
  const { dispatch, balance } = store
  const { show, go } = useUI()
  const toast = useToast()
  const burst = useBurst()
  const [copied, setCopied] = useState(false)
  const imp = askImpact(a, store)
  const coolLeft = a.status === 'thinking' ? hoursLeft(a.readyAt, now) : 0
  const share = useMemo(() => (a.status === 'waiting' ? askShareLink(a, store) : null), [a, store])

  const drop = (e) => {
    dispatch({ type: 'ASK_PATCH', id: a.id, patch: { status: 'dropped', decidedAt: Date.now() } })
    sfx.tada()
    burstFrom(burst, e.currentTarget, 16)
    toast({ text: `Nice! You kept ${rupees(kidPays(a))} in Gullu.` })
  }

  let body = null
  if (a.status === 'waiting') {
    body = (
      <div className="row-wrap">
        <Btn size="sm" className="pink" onClick={() => show('handoff', { askId: a.id })} sound="pop">
          <Hand size={18} strokeWidth={2.4} /> Hand to a grown-up
        </Btn>
        <motion.a className="btn sm" href={share.wa} target="_blank" rel="noopener noreferrer" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
          <Send size={18} strokeWidth={2.4} /> Send on WhatsApp
        </motion.a>
        <Btn
          size="sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(share.url)
              setCopied(true)
              setTimeout(() => setCopied(false), 1800)
            } catch {
              toast({ text: 'Could not copy. Use WhatsApp instead.' })
            }
          }}
        >
          {copied ? <Check size={18} strokeWidth={2.6} /> : <Link2 size={18} strokeWidth={2.4} />} {copied ? 'Copied' : 'Copy link'}
        </Btn>
        <Btn size="sm" className="ghost" onClick={drop} sound={null}>
          I changed my mind
        </Btn>
      </div>
    )
  } else if (a.status === 'thinking') {
    body =
      coolLeft > 0 ? (
        <div className="row-wrap" style={{ alignItems: 'center' }}>
          <span className="row" style={{ fontWeight: 700 }}>
            <Moon size={20} strokeWidth={2.4} aria-hidden="true" /> You can ask in {coolLeft} {coolLeft === 1 ? 'hour' : 'hours'}
          </span>
          <Btn size="sm" className="ghost" onClick={drop} sound={null}>
            I don't want it any more
          </Btn>
        </div>
      ) : (
        <div className="row-wrap" style={{ alignItems: 'center' }}>
          <b>A day has passed. Do you still want it?</b>
          <Btn
            size="sm"
            className="pink"
            onClick={() => {
              dispatch({ type: 'ASK_PATCH', id: a.id, patch: { status: 'waiting', readyAt: null } })
              show('handoff', { askId: a.id })
            }}
          >
            Yes, ask now
          </Btn>
          <Btn size="sm" onClick={drop} sound={null}>
            No, I'll keep my money
          </Btn>
        </div>
      )
  } else if (a.status === 'decided') {
    body = (
      <div className="row-wrap">
        {(a.decision === 'yes' || a.decision === 'half') && kidPays(a) > balance && (
          <p className="hint" style={{ width: '100%' }}>
            You need {rupees(kidPays(a) - balance)} more in Gullu before you can buy it.
          </p>
        )}
        {(a.decision === 'yes' || a.decision === 'half') && (
          <Btn
            size="sm"
            className="mint"
            disabled={kidPays(a) > balance}
            onClick={() => {
              dispatch({ type: 'ASK_BOUGHT', id: a.id })
              toast({ text: `${rupees(kidPays(a))} taken out of Gullu for ${a.item}.` })
            }}
            sound="pop"
          >
            <ShoppingBag size={18} strokeWidth={2.4} /> I bought it ({rupees(kidPays(a))})
          </Btn>
        )}
        {a.decision === 'no' && (
          <Btn
            size="sm"
            className="mint"
            onClick={() => {
              dispatch({ type: 'ASK_TO_GOAL', id: a.id })
              go('save')
              toast({ text: `${a.item} is now a goal. Save up for it!` })
            }}
            sound="pop"
          >
            <Target size={18} strokeWidth={2.4} /> Save up for it instead
          </Btn>
        )}
        {a.decision === 'talk' && (
          <Btn size="sm" className="sky" onClick={() => dispatch({ type: 'ASK_PATCH', id: a.id, patch: { status: 'waiting', decision: null, note: '' } })}>
            <MessageCircle size={18} strokeWidth={2.4} /> We talked. Ask again
          </Btn>
        )}
        <Btn size="sm" className="ghost" onClick={() => dispatch({ type: 'ASK_REMOVE', id: a.id })} sound={null}>
          Clear
        </Btn>
      </div>
    )
  } else {
    const label = { bought: 'Bought it', goal: 'Saving up for it', dropped: 'Decided not to buy' }[a.status]
    body = (
      <div className="row-wrap" style={{ alignItems: 'center' }}>
        <span className="li-sub" style={{ fontSize: '0.9rem' }}>
          {label}
          {a.decidedAt ? ` · ${shortDate(a.decidedAt)}` : ''}
        </span>
        <Btn size="sm" className="ghost" onClick={() => dispatch({ type: 'ASK_REMOVE', id: a.id })} sound={null}>
          <Undo2 size={16} strokeWidth={2.4} /> Clear
        </Btn>
      </div>
    )
  }

  return (
    <motion.article className="card ask-card" variants={rise} layout="position" style={a.status === 'dropped' || a.status === 'bought' || a.status === 'goal' ? { opacity: 0.86 } : undefined}>
      <div className="ask-top">
        <div style={{ minWidth: 0 }}>
          <h3 className="display" style={{ fontSize: '1.45rem' }}>
            {a.item} <span className="num">· {rupees(a.price)}</span>
          </h3>
          <p className="li-sub" style={{ fontSize: '0.9rem' }}>
            {reasonOf(a.reason).label} · {payLine(a)} · asked {shortDate(a.createdAt)}
          </p>
        </div>
        {a.decision && <Stamp decision={a.decision} animate={false} />}
      </div>
      {a.note && (
        <p className="hand" style={{ fontSize: '1.2rem', lineHeight: 1.3 }}>
          “{a.note}”
        </p>
      )}
      {(a.status === 'waiting' || a.status === 'thinking') && (
        <p className="li-sub" style={{ fontSize: '0.9rem' }}>
          Costs you {imp.samosas}
          {imp.days ? ` · pushes your goal back ${imp.days} days` : ''}
        </p>
      )}
      {body}
    </motion.article>
  )
}
