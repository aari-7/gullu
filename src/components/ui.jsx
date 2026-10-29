import { createContext, forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  AnimatePresence, motion, useAnimationFrame, useDragControls, useMotionValue, useReducedMotion,
  useInView, useScroll, useSpring, useTransform, useVelocity,
} from 'framer-motion'
import { X } from 'lucide-react'
import { rupees, lensOf } from '../lib/money.js'
import { LENS_ICONS } from '../lib/catalog.jsx'
import { sfx } from '../lib/sfx.js'

const INK = '#141633'
export const spring = { type: 'spring', stiffness: 520, damping: 30 }
export const softSpring = { type: 'spring', stiffness: 240, damping: 26 }

/* ---------- buttons ---------- */

const pressable = (base, disabled) =>
  disabled
    ? {}
    : {
        whileHover: { x: -2, y: -2, boxShadow: `${base + 2}px ${base + 2}px 0 ${INK}` },
        whileTap: { x: base - 1, y: base - 1, boxShadow: `1px 1px 0 ${INK}`, scale: 0.985 },
        transition: spring,
      }

export const Btn = forwardRef(function Btn({ className = '', size, disabled, onClick, sound = 'tap', children, ...rest }, ref) {
  const base = size === 'sm' ? 3 : 4
  return (
    <motion.button
      ref={ref}
      type="button"
      className={`btn ${size || ''} ${className}`}
      disabled={disabled}
      onClick={(e) => {
        if (sound && sfx[sound]) sfx[sound]()
        onClick?.(e)
      }}
      {...pressable(base, disabled)}
      {...rest}
    >
      {children}
    </motion.button>
  )
})

export function BtnLink({ className = '', size, children, ...rest }) {
  const base = size === 'sm' ? 3 : 4
  return (
    <motion.a className={`btn ${size || ''} ${className}`} {...pressable(base)} {...rest}>
      {children}
    </motion.a>
  )
}

export function Chip({ pressed, className = '', children, onClick, ...rest }) {
  return (
    <motion.button
      type="button"
      className={`chip ${className}`}
      aria-pressed={pressed === undefined ? undefined : !!pressed}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.94 }}
      transition={spring}
      onClick={(e) => {
        sfx.tap()
        onClick?.(e)
      }}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

export function IconBtn({ label, children, className = '', ...rest }) {
  return (
    <motion.button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      title={label}
      whileHover={{ y: -2, rotate: -6 }}
      whileTap={{ scale: 0.9 }}
      transition={spring}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

/* ---------- segmented control with a sliding pill ---------- */

export function Seg({ id, label, options, value, onChange }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => {
        const on = value === o.key
        return (
          <button
            key={o.key}
            type="button"
            role="radio"
            aria-checked={on}
            className="seg-btn"
            onClick={() => {
              sfx.tap()
              onChange(o.key)
            }}
          >
            {on && <motion.span layoutId={`seg-${id}`} className="pill" transition={spring} />}
            {o.icon}
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/* ---------- numbers that count ---------- */

export function Money({ value, className = '', from = 0 }) {
  const mv = useMotionValue(from)
  const sp = useSpring(mv, { stiffness: 90, damping: 20, mass: 0.8 })
  const text = useTransform(sp, (v) => rupees(v))
  useEffect(() => mv.set(value), [value, mv])
  return <motion.span className={`num ${className}`}>{text}</motion.span>
}

export function Count({ value, className = '' }) {
  const mv = useMotionValue(0)
  const sp = useSpring(mv, { stiffness: 90, damping: 20 })
  const text = useTransform(sp, (v) => Math.round(v).toLocaleString('en-IN'))
  useEffect(() => mv.set(value), [value, mv])
  return <motion.span className={`num ${className}`}>{text}</motion.span>
}

/* ---------- money lens ---------- */

export function LensText({ amount, lens, ctx, withIcon = true, size = 26 }) {
  const Icon = LENS_ICONS[lens]
  const l = lensOf(amount, lens, ctx)
  return (
    <span className="lens-line">
      {withIcon && Icon && <Icon size={size} />}
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={lens + l.text}
          initial={{ y: 14, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -14, opacity: 0 }}
          transition={softSpring}
        >
          {l.text}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}

/* ---------- scroll reveals ---------- */

export const rise = {
  hidden: { opacity: 0, y: 28 },
  show: { opacity: 1, y: 0, transition: softSpring },
}
export const pop = {
  hidden: { opacity: 0, scale: 0.6, y: 10 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 420, damping: 18 } },
}

export function Reveal({ as = 'div', delay = 0, amount = 0.2, children, ...rest }) {
  const M = motion[as]
  return (
    <M
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: rise.hidden, show: { ...rise.show, transition: { ...softSpring, delay } } }}
      {...rest}
    >
      {children}
    </M>
  )
}

export function Stagger({ as = 'div', gap = 0.07, delay = 0, amount = 0.15, children, ...rest }) {
  const M = motion[as]
  return (
    <M
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap, delayChildren: delay } } }}
      {...rest}
    >
      {children}
    </M>
  )
}

/* ---------- a card that tilts towards the mouse, in 3D ---------- */

export const Tilt = forwardRef(function Tilt({ as = 'div', max = 7, className = '', style, children, ...rest }, outer) {
  const local = useRef()
  const rx = useSpring(0, { stiffness: 220, damping: 18 })
  const ry = useSpring(0, { stiffness: 220, damping: 18 })
  const reduce = useReducedMotion()
  const M = motion[as]
  const setRef = (el) => {
    local.current = el
    if (typeof outer === 'function') outer(el)
    else if (outer) outer.current = el
  }
  return (
    <M
      ref={setRef}
      className={className}
      style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== 'mouse' || !local.current) return
        const r = local.current.getBoundingClientRect()
        ry.set(((e.clientX - r.left) / r.width - 0.5) * max * 2)
        rx.set(-((e.clientY - r.top) / r.height - 0.5) * max * 2)
      }}
      onPointerLeave={() => {
        rx.set(0)
        ry.set(0)
      }}
      {...rest}
    >
      {children}
    </M>
  )
})

/* ---------- marquee band that speeds up with scrolling ---------- */

export function Marquee({ items, speed = 46 }) {
  const x = useMotionValue(0)
  const track = useRef()
  const width = useRef(1)
  const dir = useRef(1)
  const { scrollY } = useScroll()
  const vel = useSpring(useVelocity(scrollY), { damping: 50, stiffness: 400 })
  const boost = useTransform(vel, [-1500, 0, 1500], [5, 0, 5], { clamp: false })
  const reduce = useReducedMotion()

  useLayoutEffect(() => {
    const measure = () => track.current && (width.current = track.current.scrollWidth / 2)
    measure()
    window.addEventListener('resize', measure)
    document.fonts?.ready.then(measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  useAnimationFrame((_, delta) => {
    if (reduce) return
    const v = vel.get()
    if (v < -5) dir.current = -1
    else if (v > 5) dir.current = 1
    let nx = x.get() - dir.current * speed * (delta / 1000) * (1 + Math.abs(boost.get()))
    const w = width.current
    if (nx <= -w) nx += w
    if (nx > 0) nx -= w
    x.set(nx)
  })

  const row = [...items, ...items, ...items]
  return (
    <div className="band" aria-hidden="true">
      <motion.div ref={track} className="band-track" style={{ x }}>
        {[0, 1].map((k) => (
          <div key={k} style={{ display: 'flex' }}>
            {row.map((t, i) => (
              <span className="band-item" key={`${k}-${i}`}>
                {t}
                <Star />
              </span>
            ))}
          </div>
        ))}
      </motion.div>
    </div>
  )
}

export function Star({ size = 22, color = INK }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 1.5l2.6 7.1 7.4.3-5.8 4.6 2 7.2L12 16.6l-6.2 4.1 2-7.2L2 8.9l7.4-.3z" fill={color} />
    </svg>
  )
}

/* ---------- progress ---------- */

export function Bar({ pct, color = 'var(--mint)', label }) {
  const ref = useRef()
  const seen = useInView(ref, { once: true, amount: 0.5 })
  const p = Math.max(0, Math.min(1, pct))
  return (
    <div ref={ref} className="bar" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)}>
      <motion.div
        className={`bar-fill ${p >= 1 ? 'full' : ''}`}
        style={{ background: color, width: '100%' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: seen ? p : 0 }}
        transition={{ ...softSpring, delay: 0.1 }}
      />
    </div>
  )
}

export function Ring({ pct, size = 64, color = '#3edb9c', children }) {
  const ref = useRef()
  const seen = useInView(ref, { once: true, amount: 0.5 })
  const p = Math.max(0.001, Math.min(1, pct))
  return (
    <div ref={ref} className="ring" style={{ width: size, height: size, position: 'relative' }}>
      <svg viewBox="0 0 64 64" width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx="32" cy="32" r="26" fill="#fff" stroke={INK} strokeWidth="3" />
        <motion.circle
          cx="32" cy="32" r="21" fill="none" stroke={color} strokeWidth="9" strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: seen ? p : 0 }}
          transition={{ ...softSpring, delay: 0.15 }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: size * 0.24 }}>{children}</div>
    </div>
  )
}

/* ---------- stamps ---------- */

export const STAMP_TEXT = { yes: 'Yes!', half: 'Half-half', no: 'Not now', talk: "Let's talk" }

export function Stamp({ decision, big = false, animate: doAnim = true }) {
  if (!decision) return null
  return (
    <motion.span
      className={`stamp ${decision} ${big ? 'big' : ''}`}
      initial={doAnim ? { scale: 2.6, opacity: 0, rotate: -26 } : false}
      animate={{ scale: 1, opacity: 1, rotate: -8 }}
      transition={{ type: 'spring', stiffness: 600, damping: 22 }}
    >
      {STAMP_TEXT[decision]}
    </motion.span>
  )
}

/* ---------- sheets (bottom sheet on phones, dialog on bigger screens) ---------- */

export function useWide(q = '(min-width: 700px)') {
  const [m, setM] = useState(() => window.matchMedia(q).matches)
  useEffect(() => {
    const mm = window.matchMedia(q)
    const on = () => setM(mm.matches)
    mm.addEventListener('change', on)
    return () => mm.removeEventListener('change', on)
  }, [q])
  return m
}

export function Sheet({ open, onClose, title, children }) {
  const wide = useWide()
  const drag = useDragControls()
  const box = useRef()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement
    const key = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    document.body.style.overflow = 'hidden'
    const t = setTimeout(() => box.current?.querySelector('input, [data-autofocus]')?.focus({ preventScroll: true }), 260)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', key)
      document.body.style.overflow = ''
      prev?.focus?.({ preventScroll: true })
    }
  }, [open, onClose])

  const variants = wide
    ? { initial: { opacity: 0, scale: 0.92, x: '-50%', y: '-46%' }, animate: { opacity: 1, scale: 1, x: '-50%', y: '-50%' }, exit: { opacity: 0, scale: 0.95, x: '-50%', y: '-48%' } }
    : { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } }

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bd" className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} onClick={onClose} />
          <motion.div
            key="sh"
            ref={box}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="sheet"
            {...variants}
            transition={{ type: 'spring', stiffness: 380, damping: 36 }}
            drag={wide ? false : 'y'}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.7 }}
            onDragEnd={(_, info) => (info.offset.y > 110 || info.velocity.y > 700) && onClose()}
          >
            <div className="sheet-grip" onPointerDown={(e) => drag.start(e)} style={{ touchAction: 'none', cursor: 'grab' }} />
            <div className="sheet-head" onPointerDown={(e) => !wide && e.target === e.currentTarget && drag.start(e)}>
              <h2 className="display sheet-title">{title}</h2>
              <IconBtn label="Close" onClick={onClose}>
                <X size={22} strokeWidth={2.6} />
              </IconBtn>
            </div>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  )
}

/* ---------- toasts ---------- */

const ToastCtx = createContext(() => {})
export const useToast = () => useContext(ToastCtx)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()
  const show = useCallback((t) => {
    clearTimeout(timer.current)
    setToast({ ...t, id: Date.now() })
    timer.current = setTimeout(() => setToast(null), t.ms || 4500)
  }, [])
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {createPortal(
        <AnimatePresence>
          {toast && (
            <motion.div
              key={toast.id}
              className="toast"
              role="status"
              aria-live="polite"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0, transition: { duration: 0.15 } }}
              transition={spring}
            >
              <span>{toast.text}</span>
              {toast.action && (
                <Btn
                  size="sm"
                  className="marigold"
                  onClick={() => {
                    toast.action.onClick()
                    setToast(null)
                  }}
                >
                  {toast.action.label}
                </Btn>
              )}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </ToastCtx.Provider>
  )
}

/* ---------- coin confetti (DOM) ---------- */

const BurstCtx = createContext(() => {})
export const useBurst = () => useContext(BurstCtx)

export function BurstProvider({ children }) {
  const [bursts, setBursts] = useState([])
  const reduce = useReducedMotion()
  const fire = useCallback(
    (x, y, n = 14) => {
      if (reduce) return
      const id = Math.random()
      const bits = Array.from({ length: n }, (_, i) => {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2
        const v = 160 + Math.random() * 220
        return { i, dx: Math.cos(a) * v, dy: Math.sin(a) * v, rot: (Math.random() - 0.5) * 720, delay: Math.random() * 0.08 }
      })
      setBursts((b) => [...b, { id, x, y, bits }])
      setTimeout(() => setBursts((b) => b.filter((q) => q.id !== id)), 1600)
    },
    [reduce]
  )
  return (
    <BurstCtx.Provider value={fire}>
      {children}
      {createPortal(
        <div className="coin-burst" aria-hidden="true">
          {bursts.map((b) =>
            b.bits.map((c) => (
              <motion.div
                key={`${b.id}-${c.i}`}
                className="coin-bit"
                style={{ left: b.x - 15, top: b.y - 15 }}
                initial={{ x: 0, y: 0, rotate: 0, opacity: 1, scale: 0.4 }}
                animate={{ x: c.dx, y: [0, c.dy, c.dy + 420], rotate: c.rot, opacity: [1, 1, 0], scale: 1 }}
                transition={{ duration: 1.3, delay: c.delay, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
              >
                <svg viewBox="0 0 32 32" width="30" height="30">
                  <circle cx="16" cy="16" r="12.5" fill="#FFC738" stroke={INK} strokeWidth="2.4" />
                  <path d="M12 10.6h8M12 13.6h8M13.2 10.6c4.4 0 4.4 6 0 6h-1.2l6.2 6" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            ))
          )}
        </div>,
        document.body
      )}
    </BurstCtx.Provider>
  )
}

/** Fire coins from the middle of an element. */
export function burstFrom(fire, el, n) {
  if (!el) return fire(window.innerWidth / 2, window.innerHeight / 2, n)
  const r = el.getBoundingClientRect()
  fire(r.left + r.width / 2, r.top + r.height / 2, n)
}
