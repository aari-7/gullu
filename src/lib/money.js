// Money helpers: rupee formatting, the "lens" that turns rupees into things a kid
// can picture (samosas, ice creams, days of saving), dates and share-link tokens.

export const DAY = 864e5

export const uid = () => Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-4)

/** ₹1,00,000 style (Indian digit grouping). */
export function rupees(n) {
  const v = Math.round(Number(n) || 0)
  return (v < 0 ? '−' : '') + '₹' + Math.abs(v).toLocaleString('en-IN')
}

export const LENSES = [
  { key: 'rupees', label: '₹', short: 'Rupees' },
  { key: 'samosa', label: 'Samosas', short: 'Samosas', one: 'samosa', many: 'samosas' },
  { key: 'icecream', label: 'Ice creams', short: 'Ice cream', one: 'ice cream', many: 'ice creams' },
  { key: 'days', label: 'Saving days', short: 'Days', one: 'day of saving', many: 'days of saving' },
]

/** 2.5 → "2½", 0.4 → "less than 1", 37.2 → "37" */
export function niceCount(x) {
  if (!isFinite(x) || x <= 0) return '0'
  if (x >= 10) return Math.round(x).toLocaleString('en-IN')
  const half = Math.round(x * 2) / 2
  if (half === 0) return 'less than 1'
  const whole = Math.floor(half)
  return `${whole || ''}${half % 1 ? '½' : ''}`
}

/**
 * Translate an amount through a lens.
 * ctx = { prices: { samosa, icecream }, perDay }
 * returns { count, unit, text }
 */
export function lensOf(amount, lensKey, ctx) {
  const a = Math.abs(amount)
  if (lensKey === 'rupees') return { count: rupees(a), unit: '', text: rupees(a) }
  let per = 1
  let lens = LENSES.find((l) => l.key === lensKey) || LENSES[1]
  if (lens.key === 'samosa') per = ctx.prices.samosa
  else if (lens.key === 'icecream') per = ctx.prices.icecream
  else if (lens.key === 'days') per = ctx.perDay
  const raw = a / Math.max(per, 1)
  const count = niceCount(raw)
  const unit = raw <= 1 ? lens.one : lens.many
  return { count, unit, text: `${count} ${unit}`, raw }
}

/** How many days a purchase pushes a goal back, given the daily saving pace. */
export function delayDays(amount, perDay) {
  if (!(amount > 0) || !(perDay > 0)) return 0
  return Math.max(1, Math.round(amount / perDay))
}

export function plural(n, one, many) {
  return `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`
}

/* ---------- dates ---------- */

export function startOfDay(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Weeks start on Monday. */
export function startOfWeek(t) {
  const d = new Date(t)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d.getTime()
}

export function startOfMonth(t) {
  const d = new Date(t)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

export function shortDate(t) {
  return new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function dayLabel(t, now = Date.now()) {
  const diff = Math.round((startOfDay(now) - startOfDay(t)) / DAY)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return new Date(t).toLocaleDateString('en-IN', { weekday: 'long' })
  return shortDate(t)
}

/** "in 6 weeks · around 12 Dec" */
export function eta(remaining, weekly, now = Date.now()) {
  if (remaining <= 0) return { weeks: 0, text: 'You have enough!', date: '' }
  if (!(weekly > 0)) return null
  const weeks = Math.ceil(remaining / weekly)
  const date = shortDate(now + weeks * 7 * DAY)
  return { weeks, date, text: weeks === 1 ? 'in 1 week' : `in ${weeks} weeks` }
}

export function hoursLeft(until, now = Date.now()) {
  const h = Math.ceil((until - now) / 36e5)
  return Math.max(0, h)
}

/* ---------- share-link tokens (base64url JSON) ---------- */

export function encodeToken(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj))
  let bin = ''
  bytes.forEach((b) => (bin += String.fromCharCode(b)))
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeToken(s) {
  try {
    const b64 = s.replace(/-/g, '+').replace(/_/g, '/')
    const bin = atob(b64 + '==='.slice((b64.length + 3) % 4))
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0))
    return JSON.parse(new TextDecoder().decode(bytes))
  } catch {
    return null
  }
}

/** Round to the nearest ₹5 so auto-savings look tidy. */
export const round5 = (n) => Math.max(0, Math.round(n / 5) * 5)
