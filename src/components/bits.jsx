import { AnimatePresence, motion } from 'framer-motion'
import { PiggyBank, Trophy, Trash2, ArrowDownLeft } from 'lucide-react'
import { catOf, sourceOf } from '../lib/catalog.jsx'
import { dayLabel, lensOf, rupees } from '../lib/money.js'
import { rise } from './ui.jsx'
import { GulluMark } from './mark.jsx'

/** One line in a money history list. */
export function TxRow({ t, goals, lens, ctx, onDelete, now }) {
  const g = t.goalId ? goals.find((x) => x.id === t.goalId) : null
  let icon, bg, title, sub, sign = '', cls = ''
  if (t.kind === 'in') {
    const s = sourceOf(t.source)
    icon = <s.icon size={20} strokeWidth={2.4} />
    bg = 'var(--mint)'
    title = t.note || s.label
    sub = s.label
    sign = '+'
    cls = 'plus'
  } else if (t.kind === 'out') {
    const c = catOf(t.cat)
    icon = c.custom ? <c.icon size={28} /> : <c.icon size={20} strokeWidth={2.4} />
    bg = c.hex
    title = t.note || c.label
    sub = c.label
    sign = '−'
    cls = 'minus'
  } else if (t.kind === 'save') {
    icon = <PiggyBank size={20} strokeWidth={2.4} />
    bg = 'var(--paper-warm)'
    title = t.auto ? `Saved first` : t.note || 'Saved'
    sub = `Into ${g?.name || 'a goal'}`
  } else if (t.kind === 'unsave') {
    icon = <ArrowDownLeft size={20} strokeWidth={2.4} />
    bg = 'var(--paper-warm)'
    title = t.note || 'Back in Gullu'
    sub = `From ${g?.name || 'a goal'}`
  } else {
    icon = <Trophy size={20} strokeWidth={2.4} />
    bg = 'var(--clay)'
    title = t.note || 'Goal bought'
    sub = 'Goal reached'
    sign = '−'
    cls = 'minus'
  }
  return (
    <motion.div className="li" variants={rise} layout="position">
      <span className="li-ic" style={{ background: bg }} aria-hidden="true">
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div className="li-title">{title}</div>
        <div className="li-sub">
          {sub} · {dayLabel(t.at, now)}
        </div>
      </div>
      <div className="row" style={{ gap: 2 }}>
        <div className={`li-amt num ${cls}`}>
          {sign}
          {rupees(t.amount)}
          {lens !== 'rupees' && (t.kind === 'in' || t.kind === 'out') && <small>{lensOf(t.amount, lens, ctx).text}</small>}
        </div>
        {onDelete && (
          <button type="button" className="li-del" aria-label={`Delete ${title}`} onClick={() => onDelete(t)}>
            <Trash2 size={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </motion.div>
  )
}

/** Gullu's speech bubble. Each new message pops in. */
export function Bubble({ msg }) {
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={msg.id}
        className="bubble"
        role="status"
        aria-live="polite"
        initial={{ opacity: 0, scale: 0.6, y: 12, rotate: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0, rotate: -2 }}
        exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.12 } }}
        transition={{ type: 'spring', stiffness: 520, damping: 20 }}
      >
        {msg.text}
      </motion.p>
    </AnimatePresence>
  )
}

/** Shown while the 3D chunk loads. */
export function StageFallback({ clay }) {
  return (
    <div className="stage-fallback" aria-hidden="true">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}>
        <GulluMark size={150} clay={clay} />
      </motion.div>
    </div>
  )
}

export function SectionHead({ title, kicker, children }) {
  return (
    <div className="spread" style={{ alignItems: 'end', marginBottom: 14, flexWrap: 'wrap' }}>
      <div>
        {kicker && <p className="label">{kicker}</p>}
        <h2 className="display h-section">{title}</h2>
      </div>
      {children}
    </div>
  )
}
