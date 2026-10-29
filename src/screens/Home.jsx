import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, Minus, ArrowRight, Bike, HandCoins, Sparkles, Target } from 'lucide-react'
import { useNow, useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Bar, Btn, LensText, Marquee, Money, Reveal, Ring, Seg, Stagger, Tilt, rise } from '../components/ui.jsx'
import { Bubble, SectionHead, StageFallback, TxRow } from '../components/bits.jsx'
import { LENSES, eta, lensOf, rupees } from '../lib/money.js'
import { LENS_ICONS, SamosaIcon, clayOf, nextCyclePart } from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

const GulluStage = lazy(() => import('../three/Stages.jsx').then((m) => ({ default: m.GulluStage })))

function hello(nick, balance, now) {
  const h = new Date(now).getHours()
  const hi = h < 12 ? 'Good morning' : h < 17 ? 'Hi' : 'Good evening'
  if (balance <= 0) return `${hi}, ${nick}! I'm empty. Got any coins for me?`
  return `${hi}, ${nick}! I'm keeping ${rupees(balance)} safe for you.`
}

export default function Home() {
  const { state, dispatch, balance, main, goals, lensCtx, inGoals } = useStore()
  const { open, go } = useUI()
  const now = useNow()
  const clay = clayOf(state.profile.clay).hex
  const nick = state.profile.nickname

  const [ready3d, setReady3d] = useState(false)
  const [msg, setMsg] = useState(() => ({ id: 1, text: hello(nick, balance, Date.now()) }))
  const say = (text) => setMsg({ id: Date.now() + Math.random(), text })

  // coins fly in or out of Gullu whenever the money in it changes
  const prev = useRef(balance)
  const [pulse, setPulse] = useState(null)
  const [flash, setFlash] = useState(null)
  useEffect(() => {
    const d = balance - prev.current
    prev.current = balance
    if (!d) return
    const count = Math.min(10, Math.max(1, Math.round(Math.abs(d) / 50)))
    setPulse({ id: Date.now(), kind: d > 0 ? 'in' : 'out', count })
    setFlash(d > 0 ? 'happy' : 'wow')
    const s = lensOf(Math.abs(d), 'samosa', lensCtx).text
    if (d > 0) say(`Yum! ${rupees(d)} in. That's ${s}!`)
    else if (balance < 100) say(`Whoa, ${rupees(-d)} gone. I'm feeling a bit empty now…`)
    else say(`Whoa, ${rupees(-d)} went out. That's ${s}.`)
    const t = setTimeout(() => setFlash(null), 2600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [balance])
  const mood = flash || (balance < 100 ? 'worried' : 'calm')

  const tapLines = useMemo(
    () => [
      'Hee hee, that tickles!',
      `Fun fact: ₹500 is ${lensOf(500, 'samosa', lensCtx).text}.`,
      'Save first, then spend what is left. Easy!',
      'Before you buy something, ask yourself: do I need it, or want it?',
      main ? `Your ${main.name} is ${Math.round(main.pct * 100)}% there. Keep going!` : 'Pick something to save up for. I love a goal!',
      'Waiting one day before buying is a money superpower.',
      'Want to see where your money went? Tap "Where it went".',
    ],
    [lensCtx, main]
  )
  const tapIdx = useRef(0)
  const onTap = () => {
    sfx.boing()
    say(tapLines[tapIdx.current++ % tapLines.length])
  }

  const waiting = state.asks.filter((a) => a.status === 'waiting').length
  const spentWeek = useMemo(() => {
    const from = now - 7 * 864e5
    return state.tx.filter((t) => (t.kind === 'out' || t.kind === 'goalbuy') && t.at >= from).reduce((s, t) => s + t.amount, 0)
  }, [state.tx, now])

  const recent = useMemo(() => [...state.tx].filter((t) => t.source !== 'start').sort((a, b) => b.at - a.at).slice(0, 5), [state.tx])
  const np = nextCyclePart(main)
  const when = main ? eta(main.left, main.weekly, now) : null

  return (
    <>
      <div className="wrap">
        {state.isDemo && (
          <motion.div className="demo" initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <p>
              <b>This is example money</b> so you can look around. Everything here is pretend.
            </p>
            <Btn size="sm" className="ink" onClick={() => open('start')}>
              Start my own Gullu
            </Btn>
          </motion.div>
        )}

        <div className="home-grid">
          <section className="home-left" aria-label="Your Gullu">
            <div className="stage">
              <Bubble msg={msg} />
              <AnimatePresence>
                {!ready3d && (
                  <motion.div key="fb" style={{ position: 'absolute', inset: 0 }} exit={{ opacity: 0, scale: 0.92, transition: { duration: 0.35 } }}>
                    <StageFallback clay={clay} />
                  </motion.div>
                )}
              </AnimatePresence>
              <Suspense fallback={null}>
                <GulluStage clay={clay} mood={mood} pulse={pulse} onTap={onTap} onReady={() => setReady3d(true)} />
              </Suspense>
            </div>
            <motion.div
              className="card balance"
              initial={{ y: 40, opacity: 0, rotate: -3 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
            >
              <p className="label">In Gullu right now</p>
              <h1 className="display balance-amt">
                <Money value={balance} />
              </h1>
              {state.lens === 'rupees' ? (
                <p className="lens-hint">Pick a lens below to see this as samosas or ice creams.</p>
              ) : (
                <p>
                  <LensText amount={balance} lens={state.lens} ctx={lensCtx} />
                </p>
              )}
              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'center' }}>
                <Seg
                  id="lens"
                  label="Show money as"
                  value={state.lens}
                  onChange={(v) => dispatch({ type: 'SET', patch: { lens: v } })}
                  options={LENSES.map((l) => {
                    const I = LENS_ICONS[l.key]
                    return { key: l.key, label: l.short, icon: <I size={20} /> }
                  })}
                />
              </div>
              <div className="balance-foot">
                <span>
                  Saved in goals: <b className="num">{rupees(inGoals)}</b>
                </span>
                <span>
                  Spent in the last 7 days: <b className="num">{rupees(spentWeek)}</b>
                </span>
              </div>
            </motion.div>
          </section>

          <section className="stack" style={{ gap: 28 }} aria-label="What to do">
            <motion.div className="actions" initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.25 } } }}>
              <motion.div variants={rise}>
                <Btn className="mint block" onClick={() => open('in')} sound="pop">
                  <span className="bi">
                    <Plus size={20} strokeWidth={3} />
                  </span>
                  I got money
                </Btn>
              </motion.div>
              <motion.div variants={rise}>
                <Btn className="coral block" onClick={() => open('out')} sound="pop">
                  <span className="bi">
                    <Minus size={20} strokeWidth={3} />
                  </span>
                  I spent money
                </Btn>
              </motion.div>
            </motion.div>

            <div>
              <SectionHead kicker="Ask Gullu" title="What do you want to know?" />
              <Stagger className="qgrid" gap={0.09}>
                <QCard
                  color="var(--marigold)"
                  art={<SamosaIcon size={50} />}
                  title="Where did all my money go?"
                  text="See what you spent, and what's left."
                  onClick={() => go('story')}
                />
                <QCard
                  color="var(--mint)"
                  art={<Bike size={42} strokeWidth={2.2} />}
                  title="How do I save for that cycle?"
                  text={main ? `Your ${main.name} is ${Math.round(main.pct * 100)}% saved. Watch it build.` : 'Set a goal and watch yourself get closer.'}
                  onClick={() => go('save')}
                />
                <QCard
                  color="var(--pink)"
                  art={<HandCoins size={42} strokeWidth={2.2} />}
                  title="Can I buy this?"
                  text="Ask a grown-up, and decide together."
                  badge={waiting ? `${waiting} waiting` : null}
                  onClick={() => go('ask')}
                />
              </Stagger>
            </div>

            {main ? (
              <Reveal className="card">
                <div className="spread">
                  <div style={{ minWidth: 0 }}>
                    <p className="label">Saving for</p>
                    <h3 className="display" style={{ fontSize: '1.7rem' }}>
                      {main.name}
                    </h3>
                    <p className="muted num" style={{ fontWeight: 600 }}>
                      {rupees(main.saved)} of {rupees(main.target)}
                      {when && main.left > 0 ? ` · done ${when.text}` : ''}
                    </p>
                  </div>
                  <Ring pct={main.pct}>{Math.round(main.pct * 100)}%</Ring>
                </div>
                <div style={{ margin: '14px 0' }}>
                  <Bar pct={main.pct} label={`${main.name} progress`} />
                </div>
                {np && (
                  <p className="next-part">
                    <Sparkles size={20} strokeWidth={2.4} aria-hidden="true" />
                    <span>
                      Next part: <b>{np.label}</b> in <b className="num">{rupees(np.need)}</b>
                    </span>
                  </p>
                )}
                <div style={{ marginTop: 14 }}>
                  <Btn size="sm" className="marigold" onClick={() => go('save')}>
                    See it build <ArrowRight size={18} strokeWidth={2.6} />
                  </Btn>
                </div>
              </Reveal>
            ) : (
              <Reveal className="card warm">
                <h3 className="display" style={{ fontSize: '1.5rem' }}>
                  Nothing to save for yet
                </h3>
                <p className="muted" style={{ margin: '6px 0 14px' }}>
                  A cycle? Headphones? A gift for someone? Pick one and Gullu will help you get there.
                </p>
                <Btn size="sm" className="mint" onClick={() => open('goal')}>
                  <Target size={18} strokeWidth={2.6} /> Set a goal
                </Btn>
              </Reveal>
            )}
          </section>
        </div>
      </div>

      <div className="band-zone">
        <Marquee items={['See it', 'Save it', 'Decide together', '₹500 = 25 samosas', 'Save first, spend later', 'Pretend money, real habits']} />
      </div>

      <div className="wrap">
        <div className="grid-2">
          <Reveal className="card">
            <SectionHead title="Lately">
              <Btn size="sm" onClick={() => go('story')}>
                See all <ArrowRight size={18} strokeWidth={2.6} />
              </Btn>
            </SectionHead>
            {recent.length ? (
              <Stagger className="list">
                {recent.map((t) => (
                  <TxRow key={t.id} t={t} goals={goals} lens={state.lens} ctx={lensCtx} now={now} />
                ))}
              </Stagger>
            ) : (
              <p className="muted">Nothing yet. Tap “I got money” to drop your first coins in.</p>
            )}
          </Reveal>
          <div className="stack" style={{ gap: 26 }}>
            <Reveal className="card tip" delay={0.1}>
              <span className="tape" aria-hidden="true" />
              <p className="label" style={{ marginBottom: 6 }}>
                Gullu's money tip
              </p>
              <p>
                {state.autoSave.on && main
                  ? `Every time money comes in, I put ${state.autoSave.pct}% into your ${main.name} first. You spend what's left, so saving just happens.`
                  : 'Save first, spend later. When money comes in, put a little into your goal before you buy anything.'}
              </p>
            </Reveal>
            <Reveal className="card ink" delay={0.15}>
              <p className="label">The money lens</p>
              <p style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: 6 }}>
                ₹500 is just a number. <span style={{ color: 'var(--marigold)' }}>25 samosas</span> is something you can picture. Switch the lens on any amount to see it your way.
              </p>
            </Reveal>
          </div>
        </div>
        <p className="foot-note">
          Pretend money only. Nothing you type leaves this device.
          <br />
          Made for the Dezerv Children's Day Hackathon 2026.
        </p>
      </div>
    </>
  )
}

function QCard({ color, art, title, text, badge, onClick }) {
  return (
    <Tilt
      as="button"
      type="button"
      className="card qcard"
      variants={rise}
      onClick={() => {
        sfx.tap()
        onClick()
      }}
      whileHover={{ y: -4, boxShadow: '8px 8px 0 #141633' }}
      whileTap={{ scale: 0.98, boxShadow: '2px 2px 0 #141633' }}
    >
      {badge && <span className="badge">{badge}</span>}
      <motion.span className="qart" style={{ background: color }} whileHover={{ rotate: -8, scale: 1.06 }} aria-hidden="true">
        {art}
      </motion.span>
      <span>
        <span className="qtitle">{title}</span>
        <span className="qtext">{text}</span>
        <span className="go">
          Open <ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" />
        </span>
      </span>
    </Tilt>
  )
}
