import { lazy, Suspense, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Plus, ArrowDownLeft, Sparkles, Star, Trophy, PartyPopper, Trash2, Clock, PiggyBank } from 'lucide-react'
import { useNow, useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Bar, Btn, Chip, Reveal, Ring, Seg, Stagger, pop, rise, softSpring, useBurst, useToast, burstFrom } from '../components/ui.jsx'
import { SectionHead } from '../components/bits.jsx'
import { delayDays, eta, lensOf, rupees, shortDate } from '../lib/money.js'
import { IceCreamIcon, SamosaIcon, goalKindOf, nextCyclePart } from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

const GoalStage = lazy(() => import('../three/Stages.jsx').then((m) => ({ default: m.GoalStage })))

const WHAT_IFS = [
  { key: 'ice', label: 'Ice cream', price: 50, icon: <IceCreamIcon size={22} /> },
  { key: 'samosa', label: 'Two samosas', price: 40, icon: <SamosaIcon size={22} /> },
  { key: 'comic', label: 'Comic book', price: 150 },
  { key: 'movie', label: 'Movie ticket', price: 250 },
  { key: 'game', label: 'Video game', price: 2500 },
]

export default function Save() {
  const { state, dispatch, goals, main } = useStore()
  const { open } = useUI()
  const live = goals.filter((g) => !g.done)
  const done = goals.filter((g) => g.done)
  const [selId, setSelId] = useState(main?.id || live[0]?.id)
  const g = live.find((x) => x.id === selId) || main || live[0]

  return (
    <div className="wrap">
      <header className="screen-head">
        <motion.p className="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          How do I save for that cycle?
        </motion.p>
        <motion.h1 className="display h-screen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
          Save up for something
        </motion.h1>
        <div className="spread" style={{ flexWrap: 'wrap' }}>
          <p className="lede">Set a goal and watch yourself get closer. Every rupee you save builds it a little more.</p>
          <Btn size="sm" className="mint" onClick={() => open('goal')} sound="pop">
            <Plus size={18} strokeWidth={3} /> New goal
          </Btn>
        </div>
      </header>

      {g ? <GoalHero key={g.id} g={g} isMain={g.id === state.mainGoalId} /> : <NoGoals />}

      {g && (
        <div className="grid-2 section-gap">
          <WhatIf g={g} />
          <SaveFirst />
        </div>
      )}

      {live.length > 1 && (
        <section className="section-gap" aria-label="Your other goals">
          <SectionHead kicker="All your goals" title="Other things you're saving for" />
          <Stagger className="summary" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
            {live
              .filter((x) => x.id !== g?.id)
              .map((x) => {
                const K = goalKindOf(x.kind)
                return (
                  <motion.button
                    key={x.id}
                    type="button"
                    className="card tight"
                    variants={rise}
                    style={{ textAlign: 'left', display: 'flex', gap: 12, alignItems: 'center', cursor: 'pointer' }}
                    whileHover={{ y: -4, boxShadow: '8px 8px 0 #141633' }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      sfx.tap()
                      setSelId(x.id)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    }}
                  >
                    <Ring pct={x.pct} size={58}>
                      <K.icon size={20} strokeWidth={2.4} />
                    </Ring>
                    <span style={{ minWidth: 0 }}>
                      <b style={{ display: 'block', fontSize: '1.1rem' }}>{x.name}</b>
                      <span className="li-sub num">
                        {rupees(x.saved)} of {rupees(x.target)} · {Math.round(x.pct * 100)}%
                      </span>
                    </span>
                  </motion.button>
                )
              })}
          </Stagger>
        </section>
      )}

      {done.length > 0 && (
        <section className="section-gap" aria-label="Goals you reached">
          <SectionHead kicker="Wall of wins" title="Goals you reached" />
          <Stagger className="row-wrap" style={{ gap: 16 }}>
            {done.map((x) => (
              <motion.div key={x.id} className="card tight warm" variants={pop} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <Trophy size={26} strokeWidth={2.4} aria-hidden="true" />
                <span>
                  <b>{x.name}</b>
                  <span className="li-sub" style={{ display: 'block' }}>
                    {rupees(x.target)} · {x.doneAt ? shortDate(x.doneAt) : ''}
                  </span>
                </span>
                <span className="stamp yes" style={{ fontSize: '0.8rem' }}>
                  Got it!
                </span>
              </motion.div>
            ))}
          </Stagger>
        </section>
      )}
    </div>
  )
}

function NoGoals() {
  const { open } = useUI()
  return (
    <Reveal className="card warm" style={{ marginTop: 18, textAlign: 'center', padding: '36px 20px' }}>
      <PiggyBank size={56} strokeWidth={2} style={{ margin: '0 auto 10px' }} aria-hidden="true" />
      <h2 className="display h-section">Nothing to save for yet</h2>
      <p className="muted" style={{ margin: '8px auto 18px', maxWidth: '40ch' }}>
        Pick something you really want. A cycle builds itself in 3D as you save. Anything else fills a jar with coins.
      </p>
      <div className="row-wrap" style={{ justifyContent: 'center' }}>
        <Btn className="mint" onClick={() => open('goal', { kind: 'cycle', name: 'New cycle', target: 6000 })}>
          Save for a cycle
        </Btn>
        <Btn onClick={() => open('goal', { kind: 'other', name: '', target: 1000 })}>Something else</Btn>
      </div>
    </Reveal>
  )
}

function GoalHero({ g, isMain }) {
  const { dispatch, balance } = useStore()
  const { open } = useUI()
  const now = useNow()
  const burst = useBurst()
  const toast = useToast()
  const btnRef = useRef()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const np = nextCyclePart(g)
  const when = eta(g.left, g.weekly, now)
  const complete = g.pct >= 1

  const buy = () => {
    dispatch({ type: 'GOAL_BUY', id: g.id })
    sfx.tada()
    burstFrom(burst, btnRef.current, 22)
    toast({ text: `You did it! ${g.name} is yours.` })
  }

  return (
    <Reveal className="card" style={{ marginTop: 18 }}>
      <div className="goal-hero">
        <div className="goal-stage" style={{ background: g.kind === 'cycle' ? '#c9f3e2' : '#fff1d4' }}>
          <Suspense fallback={null}>
            <GoalStage goal={g} />
          </Suspense>
          {complete && (
            <span style={{ position: 'absolute', top: 14, right: 14 }}>
              <span className="stamp yes big" style={{ fontSize: '1.6rem' }}>
                Ready!
              </span>
            </span>
          )}
        </div>
        <div className="stack" style={{ gap: 14 }}>
          <div className="spread">
            <div style={{ minWidth: 0 }}>
              <p className="label">{isMain ? 'Main goal' : 'Goal'}</p>
              <h2 className="display" style={{ fontSize: 'clamp(1.9rem, 5vw, 2.6rem)' }}>
                {g.name}
              </h2>
            </div>
            <Ring pct={g.pct} size={72}>
              {Math.round(g.pct * 100)}%
            </Ring>
          </div>
          <p style={{ fontSize: '1.25rem', fontWeight: 700 }} className="num">
            {rupees(g.saved)} <span className="muted">of {rupees(g.target)}</span>
          </p>
          <Bar pct={g.pct} label={`${g.name} progress`} />
          {np && (
            <p className="next-part">
              <Sparkles size={20} strokeWidth={2.4} aria-hidden="true" />
              <span>
                Next part: <b>{np.label}</b> in <b className="num">{rupees(np.need)}</b>
              </span>
            </p>
          )}
          {!complete && (
            <div className="field" style={{ gap: 6 }}>
              <label htmlFor={`wk-${g.id}`}>
                I'll save <b className="num">{rupees(g.weekly)}</b> a week
                {when ? (
                  <>
                    {' '}
                    · done <b>{when.text}</b>, around {when.date}
                  </>
                ) : null}
              </label>
              <input
                id={`wk-${g.id}`}
                className="range"
                type="range"
                min={20}
                max={1000}
                step={10}
                value={g.weekly}
                onChange={(e) => dispatch({ type: 'GOAL_UPDATE', id: g.id, patch: { weekly: +e.target.value } })}
              />
            </div>
          )}
          <div className="row-wrap" style={{ gap: 12 }}>
            {complete ? (
              <Btn ref={btnRef} className="marigold lg" onClick={buy} sound={null}>
                <PartyPopper size={22} strokeWidth={2.4} /> I bought it!
              </Btn>
            ) : (
              <Btn className="mint" disabled={balance <= 0} onClick={() => open('goalMoney', { goalId: g.id, mode: 'add' })} sound="pop">
                <Plus size={20} strokeWidth={3} /> Add money
              </Btn>
            )}
            {g.saved > 0 && (
              <Btn onClick={() => open('goalMoney', { goalId: g.id, mode: 'take' })}>
                <ArrowDownLeft size={20} strokeWidth={2.6} /> Take some out
              </Btn>
            )}
          </div>
          <div className="row-wrap" style={{ gap: 6 }}>
            {!isMain && (
              <Btn className="ghost" onClick={() => dispatch({ type: 'GOAL_MAIN', id: g.id })} sound="tap">
                <Star size={18} strokeWidth={2.4} /> Make this my main goal
              </Btn>
            )}
            <AnimatePresence mode="wait" initial={false}>
              {confirmDelete ? (
                <motion.span key="c" className="row" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                  <span style={{ fontWeight: 600 }}>Remove it? Saved money goes back to Gullu.</span>
                  <Btn size="sm" className="coral" onClick={() => dispatch({ type: 'GOAL_DELETE', id: g.id })}>
                    Remove
                  </Btn>
                  <Btn size="sm" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </Btn>
                </motion.span>
              ) : (
                <motion.span key="d" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <Btn className="ghost" onClick={() => setConfirmDelete(true)}>
                    <Trash2 size={18} strokeWidth={2.4} /> Remove goal
                  </Btn>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Reveal>
  )
}

/* "This ice cream pushes your cycle back 3 days." */
function WhatIf({ g }) {
  const { lensCtx } = useStore()
  const [pick, setPick] = useState(WHAT_IFS[0])
  const perDay = (g.weekly || 100) / 7
  const days = delayDays(pick.price, perDay)
  return (
    <Reveal className="card">
      <p className="label">Before you buy</p>
      <h2 className="display h-section" style={{ margin: '4px 0 12px' }}>
        What does it cost your {g.name}?
      </h2>
      <div className="row-wrap" role="radiogroup" aria-label="Things you might buy">
        {WHAT_IFS.map((w) => (
          <Chip key={w.key} role="radio" aria-checked={pick.key === w.key} onClick={() => setPick(w)}>
            {w.icon}
            {w.label} · ₹{w.price.toLocaleString('en-IN')}
          </Chip>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={pick.key + g.weekly}
          initial={{ opacity: 0, y: 14, rotate: -1 }}
          animate={{ opacity: 1, y: 0, rotate: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={softSpring}
          className="card flat warm"
          style={{ marginTop: 16 }}
        >
          <p className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
            <Clock size={34} strokeWidth={2.2} style={{ flex: 'none' }} aria-hidden="true" />
            <span style={{ fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.3 }}>
              {pick.label === 'Two samosas' ? 'Two samosas push' : `This ${pick.label.toLowerCase()} pushes`} your {g.name} back{' '}
              <span className="fun" style={{ color: '#c0392b', fontSize: '1.5rem' }}>
                {days} {days === 1 ? 'day' : 'days'}
              </span>
              .
            </span>
          </p>
          <p className="hint" style={{ marginTop: 8 }}>
            You save about {rupees(perDay)} a day, so {rupees(pick.price)} is {days} {days === 1 ? 'day' : 'days'} of saving. That's also {lensOf(pick.price, 'samosa', lensCtx).text}.
          </p>
        </motion.div>
      </AnimatePresence>
    </Reveal>
  )
}

function SaveFirst() {
  const { state, dispatch, main } = useStore()
  const a = state.autoSave
  return (
    <Reveal className="card ink" delay={0.08}>
      <p className="label">Gullu's habit</p>
      <h2 className="display h-section" style={{ margin: '4px 0 8px', color: 'var(--paper)' }}>
        Save first, spend later
      </h2>
      <p style={{ color: '#dfe2f7', marginBottom: 14 }}>
        When money comes in, Gullu moves a share into {main ? `your ${main.name}` : 'your main goal'} before you can spend it. Saving just happens.
      </p>
      <div className="row-wrap" style={{ alignItems: 'center' }}>
        <Btn size="sm" className={a.on ? 'marigold' : ''} onClick={() => dispatch({ type: 'SET', patch: { autoSave: { ...a, on: !a.on } } })}>
          {a.on ? 'On' : 'Off'}
        </Btn>
        {a.on && (
          <Seg
            id="pct"
            label="How much to save first"
            value={String(a.pct)}
            onChange={(v) => dispatch({ type: 'SET', patch: { autoSave: { ...a, pct: +v } } })}
            options={[10, 20, 30, 50].map((p) => ({ key: String(p), label: `${p}%` }))}
          />
        )}
      </div>
      {a.on && (
        <p className="hint" style={{ color: '#c7cbea', marginTop: 12 }}>
          Get ₹100, and ₹{a.pct} goes straight to your goal.
        </p>
      )}
    </Reveal>
  )
}
