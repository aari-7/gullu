import { lazy, Suspense, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Minus, Lightbulb } from 'lucide-react'
import { statsFor, useNow, useStore } from '../store.jsx'
import { useUI } from '../App.jsx'
import { Btn, Count, Money, Reveal, Seg, Stagger, pop, rise, softSpring, useToast, useWide } from '../components/ui.jsx'
import { SectionHead, TxRow } from '../components/bits.jsx'
import { dayLabel, lensOf, rupees, startOfDay } from '../lib/money.js'
import { CoinIcon, IceCreamIcon, SamosaIcon, catOf } from '../lib/catalog.jsx'

const TowersStage = lazy(() => import('../three/Stages.jsx').then((m) => ({ default: m.TowersStage })))

const SHORT = { snacks: 'Snacks', toys: 'Toys', school: 'School', outings: 'Outings', gifts: 'Gifts', clothes: 'Clothes', other: 'Other', goals: 'Goals', more: 'More' }
const PERIODS = [
  { key: 'week', label: 'This week' },
  { key: 'month', label: 'This month' },
  { key: 'all', label: 'All time' },
]
const COIN_VALUES = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000]

export default function Story() {
  const { state, dispatch, goals, balance, lensCtx, inGoals } = useStore()
  const { open } = useUI()
  const toast = useToast()
  const now = useNow()
  const wide = useWide('(min-width: 620px)')
  const [period, setPeriod] = useState('month')
  const st = useMemo(() => statsFor(state, period, now), [state, period, now])
  const saved = period === 'all' ? inGoals : st.saved
  const when = { week: 'this week', month: 'this month', all: 'so far' }[period]

  // one coin stack per kind of spending, plus what was saved (and what's still in Gullu)
  const towers = useMemo(() => {
    const keep = wide ? 5 : 2
    let cats = st.cats.map((c) => ({ key: c.key, amount: c.amount }))
    if (cats.length > keep + 1) {
      const rest = cats.slice(keep).reduce((s, c) => s + c.amount, 0)
      cats = [...cats.slice(0, keep), { key: 'more', amount: rest }]
    }
    const list = cats.map((c) => ({ ...c, hex: c.key === 'more' ? '#d9dcef' : catOf(c.key).hex }))
    if (saved > 0) list.push({ key: 'saved', amount: saved, hex: '#3edb9c' })
    if (period === 'all' && balance > 0) list.push({ key: 'left', amount: balance, hex: '#d4693e' })
    const max = Math.max(1, ...list.map((t) => t.amount))
    const coinValue = COIN_VALUES.find((v) => max / v <= 20) || 20000
    return {
      coinValue,
      list: list.map((t) => ({
        ...t,
        short: SHORT[t.key] || (t.key === 'saved' ? 'Saved' : 'In Gullu'),
        coins: Math.max(1, Math.round(t.amount / coinValue)),
        amountText: rupees(t.amount),
      })),
    }
  }, [st, saved, balance, period, wide])

  const lensKey = state.lens === 'icecream' ? 'icecream' : 'samosa'
  const LensIcon = lensKey === 'icecream' ? IceCreamIcon : SamosaIcon
  const spentLens = lensOf(st.spent, lensKey, lensCtx)
  const iconCount = Math.min(60, Math.floor(spentLens.raw || 0))

  const days = useMemo(() => {
    const groups = []
    const list = [...st.txs].sort((a, b) => b.at - a.at)
    for (const t of list) {
      const key = startOfDay(t.at)
      let g = groups[groups.length - 1]
      if (!g || g.key !== key) groups.push((g = { key, label: dayLabel(t.at, now), items: [] }))
      g.items.push(t)
    }
    return groups
  }, [st.txs, now])

  const top = st.cats[0]
  const insights = []
  if (top && st.spent > 0) {
    const c = catOf(top.key)
    insights.push(`Most of your spending went on ${c.label.toLowerCase()}: ${Math.round((top.amount / st.spent) * 100)}% of it.`)
  }
  const snacks = st.cats.find((c) => c.key === 'snacks')
  if (snacks) insights.push(`Snacks came to ${rupees(snacks.amount)} ${when}. That's ${lensOf(snacks.amount, 'samosa', lensCtx).text}!`)
  if (st.got > 0) {
    const per10 = Math.round((Math.max(0, saved) / st.got) * 10)
    insights.push(per10 > 0 ? `For every ₹10 you got ${when}, you saved about ₹${per10}.` : `You haven't saved any of the money you got ${when}. Try putting a little into a goal first.`)
  }

  const remove = (t) => {
    dispatch({ type: 'DELETE_TX', id: t.id })
    toast({ text: 'Deleted.', action: { label: 'Undo', onClick: () => dispatch({ type: 'RESTORE_TX', txs: [t] }) } })
  }

  return (
    <div className="wrap">
      <header className="screen-head">
        <motion.p className="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Where did all my money go?
        </motion.p>
        <motion.h1 className="display h-screen" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
          Here's where it went
        </motion.h1>
        <div className="spread" style={{ flexWrap: 'wrap' }}>
          <Seg id="period" label="Time" options={PERIODS} value={period} onChange={setPeriod} />
          <Btn size="sm" className="coral" onClick={() => open('out')} sound="pop">
            <Minus size={18} strokeWidth={3} /> I spent money
          </Btn>
        </div>
      </header>

      <Stagger className="summary" style={{ marginTop: 18 }}>
        <motion.div className="sum" style={{ background: 'var(--mint)' }} variants={pop}>
          <span className="label">You got</span>
          <b><Money value={st.got} /></b>
        </motion.div>
        <motion.div className="sum" style={{ background: 'var(--coral)' }} variants={pop}>
          <span className="label">You spent</span>
          <b><Money value={st.spent} /></b>
        </motion.div>
        <motion.div className="sum" style={{ background: 'var(--marigold)' }} variants={pop}>
          <span className="label">{period === 'all' ? 'In your goals' : 'You saved'}</span>
          <b><Money value={saved} /></b>
        </motion.div>
        <motion.div className="sum" style={{ background: 'var(--paper)' }} variants={pop}>
          <span className="label">Left in Gullu</span>
          <b><Money value={balance} /></b>
        </motion.div>
      </Stagger>

      <Reveal className="towers" style={{ marginTop: 22 }} aria-label="Coin stacks showing your spending">
        <span className="towers-key">
          <CoinIcon size={26} /> 1 coin = {rupees(towers.coinValue)}
        </span>
        {towers.list.length ? (
          <Suspense fallback={null}>
            <TowersStage towers={towers.list} coinValue={towers.coinValue} replay={period} />
          </Suspense>
        ) : (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', padding: 24, textAlign: 'center' }}>
            <p style={{ fontWeight: 700, fontSize: '1.2rem' }}>No spending {when}. Gullu is impressed.</p>
          </div>
        )}
      </Reveal>
      <p className="sr-only">
        {towers.list.map((t) => `${t.short}: ${t.amountText}`).join(', ')}
      </p>

      <div className="grid-2 section-gap">
        <Reveal className="card">
          <p className="label">The money lens</p>
          <h2 className="display h-section" style={{ margin: '6px 0 14px' }}>
            You spent {rupees(st.spent)} {when}. That's <span style={{ color: '#c0392b' }}>{spentLens.text}</span>.
          </h2>
          {iconCount > 0 && (
            <Stagger className="icon-rain" gap={0.025} aria-hidden="true">
              {Array.from({ length: iconCount }, (_, i) => (
                <motion.span key={i} variants={pop} style={{ display: 'inline-block' }}>
                  <LensIcon size={30} />
                </motion.span>
              ))}
              {Math.floor(spentLens.raw) > iconCount && <motion.span variants={pop} style={{ fontWeight: 800, alignSelf: 'center' }}>+{Math.floor(spentLens.raw) - iconCount} more</motion.span>}
            </Stagger>
          )}
          {insights.length > 0 && (
            <Stagger className="stack" style={{ gap: 10, marginTop: 18 }}>
              {insights.map((t) => (
                <motion.p key={t} variants={rise} className="row" style={{ alignItems: 'flex-start', fontWeight: 600 }}>
                  <Lightbulb size={22} strokeWidth={2.4} style={{ flex: 'none', marginTop: 1 }} aria-hidden="true" />
                  {t}
                </motion.p>
              ))}
            </Stagger>
          )}
        </Reveal>

        <Reveal className="card" delay={0.08}>
          <SectionHead kicker="Spending by kind" title="What you spent it on" />
          {st.cats.length ? (
            <Stagger className="list">
              {st.cats.map((c) => {
                const cat = catOf(c.key)
                const share = c.amount / st.spent
                return (
                  <motion.div key={c.key} className="cat-row" variants={rise}>
                    <span className="li-ic" style={{ background: cat.hex }} aria-hidden="true">
                      {cat.custom ? <cat.icon size={28} /> : <cat.icon size={20} strokeWidth={2.4} />}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div className="spread">
                        <b>{cat.label}</b>
                        <b className="num">{rupees(c.amount)}</b>
                      </div>
                      <motion.div
                        className="cat-bar"
                        style={{ background: cat.hex, width: `${Math.max(6, share * 100)}%`, margin: '6px 0 4px' }}
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={softSpring}
                      />
                      <span className="li-sub">
                        {Math.round(share * 100)}% · {lensOf(c.amount, lensKey, lensCtx).text}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </Stagger>
          ) : (
            <p className="muted">Nothing spent {when}.</p>
          )}
        </Reveal>
      </div>

      <section className="section-gap" aria-label="Every coin, in order">
        <SectionHead kicker="Every coin, in order" title="History" />
        {days.length === 0 && <p className="muted">Nothing happened {when}.</p>}
        <div className="stack" style={{ gap: 18 }}>
          {days.map((d) => (
            <Reveal key={d.key} className="card tight">
              <p className="label" style={{ marginBottom: 2 }}>
                {d.label}
              </p>
              <Stagger className="list">
                {d.items.map((t) => (
                  <TxRow key={t.id} t={t} goals={goals} lens={state.lens} ctx={lensCtx} now={now} onDelete={t.source === 'start' ? null : remove} />
                ))}
              </Stagger>
            </Reveal>
          ))}
        </div>
      </section>
      <p className="foot-note">
        Spent <Count value={st.spent} /> rupees {when}. Pretend money only.
      </p>
    </div>
  )
}
