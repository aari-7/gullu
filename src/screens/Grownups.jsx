import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, ShieldCheck, Clock, Wallet, Hand, Send, ArrowLeft, Check, Link2 } from 'lucide-react'
import { useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Btn, Chip, IconBtn, Stamp, STAMP_TEXT, Seg, softSpring, useBurst, useToast } from '../components/ui.jsx'
import { GulluMark } from '../components/mark.jsx'
import { askImpact, kidPays } from './Ask.jsx'
import { encodeToken, lensOf, rupees } from '../lib/money.js'
import { SamosaIcon, reasonOf } from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

const GiftStage = lazy(() => import('../three/Stages.jsx').then((m) => ({ default: m.GiftStage })))

const NOTES = {
  yes: ['Good thinking!', 'Enjoy it!', 'You saved well for this.'],
  half: ["I'll pay half. You pay half.", 'Deal! Half from me.'],
  no: ["Let's save up for it together.", 'Maybe for your birthday?', "That's a lot right now."],
  talk: ["Let's talk about it after dinner.", 'Tell me more about why you want it.'],
}

function useLockScroll() {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => (document.body.style.overflow = '')
  }, [])
}

function FullScreen({ children, label, onClose }) {
  useLockScroll()
  useEffect(() => {
    const key = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])
  return (
    <motion.div
      className="full"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30, transition: { duration: 0.18 } }}
      transition={softSpring}
    >
      <div style={{ maxWidth: 640, margin: '0 auto' }}>{children}</div>
    </motion.div>
  )
}

/* ---------- a quick grown-up check (not security, just a speed bump) ---------- */

function makeSum() {
  const a = 12 + Math.floor(Math.random() * 27)
  const b = 13 + Math.floor(Math.random() * 26)
  const right = a + b
  const opts = new Set([right])
  while (opts.size < 3) opts.add(right + (Math.random() < 0.5 ? -1 : 1) * (1 + Math.floor(Math.random() * 12)))
  return { a, b, right, opts: [...opts].sort(() => Math.random() - 0.5) }
}

export function Gate({ onPass, onCancel }) {
  const [q, setQ] = useState(makeSum)
  const [wrong, setWrong] = useState(0)
  return (
    <div className="stack" style={{ gap: 18, textAlign: 'center' }}>
      <ShieldCheck size={44} strokeWidth={2.2} style={{ margin: '0 auto' }} aria-hidden="true" />
      <p className="label">Grown-ups only</p>
      <h2 className="display gate-q num">
        What is {q.a} + {q.b}?
      </h2>
      <motion.div className="gate-opts" key={wrong} animate={wrong ? { x: [0, -12, 12, -8, 8, 0] } : {}} transition={{ duration: 0.4 }}>
        {q.opts.map((o) => (
          <Btn
            key={o}
            className="num"
            onClick={() => {
              if (o === q.right) onPass()
              else {
                sfx.sad()
                setWrong((w) => w + 1)
                setQ(makeSum())
              }
            }}
          >
            {o}
          </Btn>
        ))}
      </motion.div>
      {wrong > 0 && (
        <p className="err" role="alert" style={{ justifyContent: 'center' }}>
          Not quite. Here's a new one.
        </p>
      )}
      {onCancel && (
        <Btn className="ghost" onClick={onCancel}>
          Cancel
        </Btn>
      )}
    </div>
  )
}

/* ---------- the grown-up's side of "Can I buy this?" ---------- */

export function DecisionView({ ask, nickname, impact, goalName, onDecide }) {
  const [note, setNote] = useState('')
  const [pick, setPick] = useState(null)
  const decisions = [
    { key: 'yes', label: 'Yes, go ahead', cls: 'mint' },
    { key: 'half', label: "I'll pay half", cls: 'marigold' },
    { key: 'no', label: 'Not now', cls: 'coral' },
    { key: 'talk', label: "Let's talk", cls: 'sky' },
  ]
  return (
    <div className="stack" style={{ gap: 16 }}>
      <div className="card">
        <p className="label">{nickname} is asking</p>
        <h2 className="display" style={{ fontSize: 'clamp(1.9rem, 6vw, 2.6rem)', margin: '4px 0' }}>
          Can I buy this?
        </h2>
        <p style={{ fontSize: '1.3rem', fontWeight: 800 }} className="num">
          {ask.item} · {rupees(ask.price)}
          {ask.pay === 'half' && <span className="muted" style={{ fontWeight: 600, fontSize: '1rem' }}> · asks you to pay half ({rupees(ask.price - kidPays(ask))})</span>}
        </p>
        <p className="hand" style={{ fontSize: '1.3rem', marginTop: 6 }}>
          “{reasonOf(ask.reason).label}”
        </p>
        <div className="impact" style={{ marginTop: 14 }}>
          <div className="impact-row">
            <SamosaIcon size={30} />
            <span>
              Costs {nickname} <b>{rupees(impact.cost)}</b>, or <b>{impact.samosas}</b>
            </span>
          </div>
          {goalName && (
            <div className="impact-row">
              <Clock size={26} strokeWidth={2.4} aria-hidden="true" />
              <span>
                Pushes their <b>{goalName}</b> back <b>{impact.days} days</b>
              </span>
            </div>
          )}
          <div className="impact-row">
            <Wallet size={26} strokeWidth={2.4} aria-hidden="true" />
            <span>
              {impact.left >= 0 ? (
                <>
                  Leaves <b className="num">{rupees(impact.left)}</b> in their Gullu
                </>
              ) : (
                <>
                  They have only <b className="num">{rupees(impact.left + impact.cost)}</b> in Gullu right now
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <p className="label" id="dec-l">
          Your answer
        </p>
        <div className="row-wrap" style={{ marginTop: 10 }} role="radiogroup" aria-labelledby="dec-l">
          {decisions.map((d) => (
            <Btn
              key={d.key}
              role="radio"
              aria-checked={pick === d.key}
              className={pick === d.key ? 'ink' : d.cls}
              onClick={() => {
                setPick(d.key)
                if (!note || Object.values(NOTES).flat().includes(note)) setNote(NOTES[d.key][0])
              }}
            >
              {pick === d.key && <Check size={18} strokeWidth={3} />}
              {d.label}
            </Btn>
          ))}
        </div>
        <AnimatePresence initial={false}>
          {pick && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
              <div className="field" style={{ marginTop: 16 }}>
                <label htmlFor="dec-note">Add a note for {nickname} (optional)</label>
                <input id="dec-note" className="input" maxLength={80} value={note} onChange={(e) => setNote(e.target.value)} />
                <div className="row-wrap">
                  {NOTES[pick].map((n) => (
                    <Chip key={n} pressed={note === n} onClick={() => setNote(n)}>
                      {n}
                    </Chip>
                  ))}
                </div>
              </div>
              <Btn className="ink lg block" style={{ marginTop: 16 }} onClick={() => onDecide(pick, note.trim())} sound="stamp">
                Stamp it: {STAMP_TEXT[pick]}
              </Btn>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/* ---------- kid hands the phone over, grown-up answers, phone comes back ---------- */

export function Handoff({ askId, onClose }) {
  const store = useStore()
  const { state, dispatch, main } = store
  const burst = useBurst()
  const ask = state.asks.find((a) => a.id === askId)
  const [step, setStep] = useState(ask?.status === 'decided' ? 'back' : 'pass')
  useEffect(() => {
    document.querySelector('.full')?.scrollTo({ top: 0 })
  }, [step])
  if (!ask) return null
  const impact = askImpact(ask, store)
  const nick = state.profile.nickname

  return (
    <FullScreen label="Ask a grown-up" onClose={onClose}>
      <div className="spread" style={{ marginBottom: 12 }}>
        <span className="row">
          <GulluMark size={34} />
          <b className="fun" style={{ fontSize: '1.5rem' }}>
            gullu
          </b>
        </span>
        <IconBtn label="Close" onClick={onClose}>
          <X size={22} strokeWidth={2.6} />
        </IconBtn>
      </div>
      <AnimatePresence mode="wait">
        {step === 'pass' && (
          <motion.div key="pass" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={softSpring} className="stack" style={{ gap: 16, textAlign: 'center' }}>
            <div className="ask-stage" style={{ height: 260 }}>
              <Suspense fallback={null}>
                <GiftStage price={ask.price} decision={null} />
              </Suspense>
            </div>
            <h2 className="display h-screen">Pass the phone to a grown-up</h2>
            <p className="lede" style={{ margin: '0 auto' }}>
              They'll see what you want, why, and what it costs your savings. Then they'll stamp an answer.
            </p>
            <Btn className="marigold lg" style={{ alignSelf: 'center' }} onClick={() => setStep('gate')} sound="pop">
              <Hand size={22} strokeWidth={2.4} /> I'm the grown-up
            </Btn>
          </motion.div>
        )}
        {step === 'gate' && (
          <motion.div key="gate" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={softSpring} className="card" style={{ padding: 28 }}>
            <Gate onPass={() => setStep('decide')} onCancel={() => setStep('pass')} />
          </motion.div>
        )}
        {step === 'decide' && (
          <motion.div key="decide" initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -40 }} transition={softSpring}>
            <DecisionView
              ask={ask}
              nickname={nick}
              impact={impact}
              goalName={main?.name}
              onDecide={(decision, note) => {
                dispatch({ type: 'ASK_DECIDE', id: ask.id, decision, note })
                setStep('back')
              }}
            />
          </motion.div>
        )}
        {step === 'back' && (
          <motion.div key="back" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={softSpring} className="stack" style={{ gap: 16, textAlign: 'center' }}>
            <p className="label">Hand the phone back to {nick}</p>
            <div className="ask-stage" style={{ height: 250 }}>
              <Suspense fallback={null}>
                <GiftStage price={ask.price} decision={ask.decision} />
              </Suspense>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stamp decision={ask.decision} big />
            </div>
            <p className="label">
              {ask.item} · {rupees(ask.price)}
            </p>
            <h2 className="display h-section">
              {ask.decision === 'yes' && 'Yes! You can buy it.'}
              {ask.decision === 'half' && `Half-half! You pay ${rupees(kidPays(ask))} and your grown-up pays ${rupees(ask.price - kidPays(ask))}.`}
              {ask.decision === 'no' && 'Not this time.'}
              {ask.decision === 'talk' && 'Time for a chat about it.'}
            </h2>
            {ask.note && (
              <p className="hand" style={{ fontSize: '1.4rem' }}>
                “{ask.note}”
              </p>
            )}
            {ask.decision === 'no' && <p className="lede" style={{ margin: '0 auto' }}>You can turn it into a savings goal from the “Can I buy?” page.</p>}
            <Btn
              className="marigold lg"
              style={{ alignSelf: 'center' }}
              onClick={(e) => {
                if (ask.decision === 'yes' || ask.decision === 'half') {
                  const r = e.currentTarget.getBoundingClientRect()
                  burst(r.left + r.width / 2, r.top, 18)
                }
                onClose()
              }}
              sound={ask.decision === 'no' ? 'tap' : 'tada'}
            >
              Got it
            </Btn>
          </motion.div>
        )}
      </AnimatePresence>
    </FullScreen>
  )
}

/* ---------- grown-ups panel ---------- */

export function Grownups({ onClose }) {
  const store = useStore()
  const { state, dispatch, main } = store
  const { open } = useUI()
  const toast = useToast()
  const [ok, setOk] = useState(false)
  const [deciding, setDeciding] = useState(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const waiting = state.asks.filter((a) => a.status === 'waiting')
  const setPrice = (k, v) => dispatch({ type: 'SET', patch: { prices: { ...state.prices, [k]: Math.max(1, Math.min(9999, v || 1)) } } })

  return (
    <FullScreen label="For grown-ups" onClose={onClose}>
      <div className="spread" style={{ marginBottom: 16 }}>
        <h2 className="display h-screen">For grown-ups</h2>
        <IconBtn label="Close" onClick={onClose}>
          <X size={22} strokeWidth={2.6} />
        </IconBtn>
      </div>
      {!ok ? (
        <div className="card" style={{ padding: 28 }}>
          <Gate onPass={() => setOk(true)} onCancel={onClose} />
        </div>
      ) : deciding ? (
        <div className="stack" style={{ gap: 14 }}>
          <Btn className="ghost" style={{ alignSelf: 'flex-start' }} onClick={() => setDeciding(null)}>
            <ArrowLeft size={18} strokeWidth={2.6} /> Back
          </Btn>
          <DecisionView
            ask={deciding}
            nickname={state.profile.nickname}
            impact={askImpact(deciding, store)}
            goalName={main?.name}
            onDecide={(decision, note) => {
              dispatch({ type: 'ASK_DECIDE', id: deciding.id, decision, note })
              setDeciding(null)
              toast({ text: `Stamped: ${STAMP_TEXT[decision]}` })
            }}
          />
        </div>
      ) : (
        <motion.div className="stack" style={{ gap: 18 }} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}>
          <motion.div className="card ink" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <p style={{ fontWeight: 600, color: '#dfe2f7' }}>
              Gullu uses <b style={{ color: 'var(--marigold)' }}>pretend money only</b>. It never connects to a bank, UPI, card or wallet, and it asks for no names, numbers or photos. Everything stays in this browser.
            </p>
          </motion.div>

          <motion.div className="card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <p className="label">Waiting for you</p>
            {waiting.length ? (
              <div className="list" style={{ marginTop: 6 }}>
                {waiting.map((a) => (
                  <div key={a.id} className="li" style={{ gridTemplateColumns: 'minmax(0,1fr) auto' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="li-title">
                        {a.item} · {rupees(a.price)}
                      </div>
                      <div className="li-sub">{reasonOf(a.reason).label}</div>
                    </div>
                    <Btn size="sm" className="marigold" onClick={() => setDeciding(a)}>
                      Answer
                    </Btn>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted" style={{ marginTop: 6 }}>
                No questions waiting.
              </p>
            )}
          </motion.div>

          <motion.div className="card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <p className="label">Prices where you live</p>
            <p className="hint" style={{ margin: '4px 0 12px' }}>
              The money lens uses these to turn rupees into things.
            </p>
            <div className="grid-2" style={{ gap: 12 }}>
              <div className="field">
                <label htmlFor="p-samosa">One samosa costs</label>
                <div className="money-input" style={{ minHeight: 60 }}>
                  <span className="cur" style={{ fontSize: '1.6rem' }} aria-hidden="true">
                    ₹
                  </span>
                  <input id="p-samosa" inputMode="numeric" style={{ fontSize: '1.7rem' }} value={state.prices.samosa} onChange={(e) => setPrice('samosa', parseInt(e.target.value.replace(/\D/g, ''), 10))} />
                </div>
              </div>
              <div className="field">
                <label htmlFor="p-ice">One ice cream costs</label>
                <div className="money-input" style={{ minHeight: 60 }}>
                  <span className="cur" style={{ fontSize: '1.6rem' }} aria-hidden="true">
                    ₹
                  </span>
                  <input id="p-ice" inputMode="numeric" style={{ fontSize: '1.7rem' }} value={state.prices.icecream} onChange={(e) => setPrice('icecream', parseInt(e.target.value.replace(/\D/g, ''), 10))} />
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div className="card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <p className="label">Save first</p>
            <p className="hint" style={{ margin: '4px 0 12px' }}>
              Share of every money-in that goes straight to the main goal{main ? ` (${main.name})` : ''}.
            </p>
            <div className="row-wrap" style={{ alignItems: 'center' }}>
              <Btn size="sm" className={state.autoSave.on ? 'marigold' : ''} onClick={() => dispatch({ type: 'SET', patch: { autoSave: { ...state.autoSave, on: !state.autoSave.on } } })}>
                {state.autoSave.on ? 'On' : 'Off'}
              </Btn>
              <Seg
                id="gpct"
                label="Save-first share"
                value={String(state.autoSave.pct)}
                onChange={(v) => dispatch({ type: 'SET', patch: { autoSave: { ...state.autoSave, pct: +v } } })}
                options={[10, 20, 30, 50].map((p) => ({ key: String(p), label: `${p}%` }))}
              />
            </div>
          </motion.div>

          <motion.div className="card" variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}>
            <p className="label">This device</p>
            <div className="row-wrap" style={{ marginTop: 10 }}>
              <Btn
                size="sm"
                className="marigold"
                onClick={() => {
                  onClose()
                  open('start')
                }}
              >
                Start a fresh Gullu
              </Btn>
              {confirmReset ? (
                <span className="row-wrap" style={{ alignItems: 'center' }}>
                  <b>Replace everything with example money?</b>
                  <Btn
                    size="sm"
                    className="coral"
                    onClick={() => {
                      dispatch({ type: 'LOAD_DEMO' })
                      setConfirmReset(false)
                      toast({ text: 'Example money loaded.' })
                    }}
                  >
                    Yes, replace
                  </Btn>
                  <Btn size="sm" onClick={() => setConfirmReset(false)}>
                    Cancel
                  </Btn>
                </span>
              ) : (
                <Btn size="sm" onClick={() => setConfirmReset(true)}>
                  Load example money
                </Btn>
              )}
            </div>
          </motion.div>
          <p className="foot-note" style={{ marginTop: 6 }}>
            Gullu was made for the Dezerv Children's Day Hackathon 2026.
          </p>
        </motion.div>
      )}
    </FullScreen>
  )
}

/* ---------- a grown-up opened an ask link on their own phone ---------- */

export function RemoteDecision({ data }) {
  const [decided, setDecided] = useState(null)
  const [copied, setCopied] = useState(false)
  const ask = { id: data.i, item: data.it, price: data.p, reason: data.r, pay: data.pay, cat: data.c }
  const cost = kidPays(ask)
  const impact = {
    cost,
    samosas: lensOf(cost, 'samosa', { prices: { samosa: 20, icecream: 50 }, perDay: 14 }).text,
    days: data.g?.d || 0,
    left: (data.b ?? 0) - cost,
  }
  const reply = useMemo(() => {
    if (!decided) return null
    const token = encodeToken({ i: data.i, d: decided.decision, n: decided.note, it: data.it, p: data.p })
    const url = `${window.location.origin}${window.location.pathname}#reply-${token}`
    const text = `Gullu answer for “${data.it}”: ${STAMP_TEXT[decided.decision]}${decided.note ? ` “${decided.note}”` : ''}\nTap to open: ${url}`
    return { url, wa: `https://wa.me/?text=${encodeURIComponent(text)}` }
  }, [decided, data])

  return (
    <div className="app" style={{ paddingBottom: 40 }}>
      <header className="topbar">
        <div className="wrap topbar-in">
          <span className="brand">
            <GulluMark />
            <span className="brand-word">gullu</span>
          </span>
        </div>
      </header>
      <main className="wrap" style={{ maxWidth: 680, paddingTop: 20 }}>
        <p className="card ink" style={{ marginBottom: 16, fontWeight: 600, color: '#dfe2f7' }}>
          This is a pretend-money app for kids. No real money moves. Your answer goes back to {data.nk || 'your kid'} through WhatsApp.
        </p>
        {!decided ? (
          <DecisionView ask={ask} nickname={data.nk || 'Your kid'} impact={impact} goalName={data.g?.n} onDecide={(decision, note) => setDecided({ decision, note })} />
        ) : (
          <motion.div className="card stack" style={{ gap: 16, textAlign: 'center' }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Stamp decision={decided.decision} big />
            </div>
            <h2 className="display h-section">Now send your answer back</h2>
            <motion.a className="btn lg mint" style={{ alignSelf: 'center' }} href={reply.wa} target="_blank" rel="noopener noreferrer" whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
              <Send size={20} strokeWidth={2.4} /> Send on WhatsApp
            </motion.a>
            <Btn
              className="ghost"
              style={{ alignSelf: 'center' }}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(reply.url)
                  setCopied(true)
                } catch {
                  setCopied(false)
                }
              }}
            >
              {copied ? <Check size={18} strokeWidth={2.6} /> : <Link2 size={18} strokeWidth={2.4} />} {copied ? 'Link copied' : 'Copy the answer link instead'}
            </Btn>
            <Btn className="ghost" style={{ alignSelf: 'center' }} onClick={() => setDecided(null)}>
              Change my answer
            </Btn>
          </motion.div>
        )}
      </main>
    </div>
  )
}

/* ---------- an answer arrived from a WhatsApp reply link ---------- */

export function ReplyArrived({ data, onClose }) {
  const burst = useBurst()
  useEffect(() => {
    if (data.d === 'yes' || data.d === 'half') {
      sfx.tada()
      setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.45, 20), 300)
    }
  }, [data, burst])
  return (
    <FullScreen label="Your grown-up answered" onClose={onClose}>
      <div className="stack" style={{ gap: 18, textAlign: 'center', paddingTop: 30 }}>
        <p className="label">Your grown-up answered</p>
        <h2 className="display h-screen">{data.it}</h2>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Stamp decision={data.d} big />
        </div>
        {data.n && (
          <p className="hand" style={{ fontSize: '1.5rem' }}>
            “{data.n}”
          </p>
        )}
        {!data.known && <p className="lede" style={{ margin: '0 auto' }}>This question was asked on a different phone, so it isn't saved here.</p>}
        <Btn className="marigold lg" style={{ alignSelf: 'center' }} onClick={onClose}>
          See my questions
        </Btn>
      </div>
    </FullScreen>
  )
}
