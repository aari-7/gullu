import { createContext, useContext, useEffect, useMemo, useReducer, useState } from 'react'
import { DAY, uid, round5, startOfWeek, startOfMonth } from './lib/money.js'
import { setSfxEnabled } from './lib/sfx.js'

/*
  Everything lives in one ledger of transactions, kept only in this browser.
    in      +Gullu            (money a kid got: pocket money, gifts, chores)
    out     −Gullu            (money spent, with a category)
    save    −Gullu  +goal     (moved into a savings goal)
    unsave  +Gullu  −goal     (taken back out of a goal)
    goalbuy         −goal     (bought the goal; counts as spending)
*/

const KEY = 'gullu.v1'
const VERSION = 1

const BASE = {
  version: VERSION,
  isDemo: false,
  madeAt: 0,
  profile: { nickname: 'Captain Chillar', clay: 'terracotta' },
  lens: 'samosa',
  prices: { samosa: 20, icecream: 50 },
  autoSave: { on: true, pct: 20 },
  sound: true,
  mainGoalId: null,
  tx: [],
  goals: [],
  asks: [],
}

/* ---------- example money, dated relative to today ---------- */

export function makeDemo(now = Date.now()) {
  const at = (daysAgo, hour = 17) => {
    const d = new Date(now - daysAgo * DAY)
    d.setHours(hour, 15, 0, 0)
    return Math.min(d.getTime(), now - 60e3)
  }
  const cycle = { id: 'g-cycle', name: 'New cycle', kind: 'cycle', target: 6000, weekly: 120, createdAt: at(30), done: false }
  const phones = { id: 'g-phones', name: 'Headphones', kind: 'headphones', target: 1500, weekly: 60, createdAt: at(12), done: false }
  const t = (kind, amount, daysAgo, extra = {}) => ({ id: uid(), kind, amount, at: at(daysAgo, extra.hour), ...extra })

  const tx = [
    t('in', 3600, 30, { source: 'start', note: 'Money already in my gullak', hour: 10 }),
    t('save', 3000, 30, { goalId: cycle.id, note: 'Started saving for my cycle', hour: 10 }),
    t('in', 500, 20, { source: 'pocket', note: 'Pocket money', hour: 9 }),
    t('save', 120, 20, { goalId: cycle.id, auto: true, note: 'Saved first', hour: 9 }),
    t('out', 60, 19, { cat: 'snacks', note: 'Samosas with friends' }),
    t('out', 120, 17, { cat: 'school', note: 'Gel pens' }),
    t('out', 250, 15, { cat: 'outings', note: 'Movie with cousins', hour: 19 }),
    t('in', 500, 13, { source: 'pocket', note: 'Pocket money', hour: 9 }),
    t('save', 120, 13, { goalId: cycle.id, auto: true, note: 'Saved first', hour: 9 }),
    t('out', 50, 12, { cat: 'snacks', note: 'Ice cream' }),
    t('in', 1000, 10, { source: 'gift', note: 'Birthday money from Nani', hour: 12 }),
    t('save', 500, 10, { goalId: cycle.id, note: 'Half my birthday money', hour: 12 }),
    t('out', 150, 9, { cat: 'toys', note: 'Cricket ball' }),
    t('save', 450, 9, { goalId: phones.id, note: 'Headphones jar', hour: 18 }),
    t('out', 200, 8, { cat: 'gifts', note: "Friend's birthday gift" }),
    t('in', 500, 6, { source: 'pocket', note: 'Pocket money', hour: 9 }),
    t('save', 120, 6, { goalId: cycle.id, auto: true, note: 'Saved first', hour: 9 }),
    t('out', 70, 5, { cat: 'snacks', note: 'Vada pav and juice' }),
    t('in', 100, 4, { source: 'chores', note: 'Washed the car', hour: 11 }),
    t('out', 150, 3, { cat: 'school', note: 'Comic book' }),
    t('out', 50, 2, { cat: 'snacks', note: 'Ice cream', hour: 18 }),
    t('in', 50, 1, { source: 'chores', note: 'Watered the plants all week', hour: 8 }),
    t('out', 40, 0, { cat: 'snacks', note: 'Samosas', hour: 13 }),
  ].sort((a, b) => a.at - b.at)

  const asks = [
    { id: 'a-pens', item: 'Gel pen set', price: 120, cat: 'school', reason: 'need', pay: 'self', status: 'bought', note: 'Good pick for school!', createdAt: at(18), decidedAt: at(17, 20), decision: 'yes' },
    { id: 'a-game', item: 'Video game', price: 2500, cat: 'toys', reason: 'friends', pay: 'self', status: 'decided', decision: 'no', note: "That's a lot. Let's talk about saving for it.", createdAt: at(11), decidedAt: at(11, 21) },
    { id: 'a-ball', item: 'Football', price: 600, cat: 'toys', reason: 'want', pay: 'half', status: 'waiting', createdAt: at(1, 19) },
  ]

  return {
    ...BASE,
    isDemo: true,
    madeAt: now,
    mainGoalId: cycle.id,
    tx,
    goals: [cycle, phones],
    asks,
  }
}

/* ---------- derived numbers ---------- */

export function balanceOf(state) {
  let b = 0
  for (const t of state.tx) {
    if (t.kind === 'in' || t.kind === 'unsave') b += t.amount
    else if (t.kind === 'out' || t.kind === 'save') b -= t.amount
  }
  return b
}

export function goalSaved(state, goalId) {
  let s = 0
  for (const t of state.tx) {
    if (t.goalId !== goalId) continue
    if (t.kind === 'save') s += t.amount
    else if (t.kind === 'unsave' || t.kind === 'goalbuy') s -= t.amount
  }
  return s
}

export function goalsOf(state) {
  return state.goals.map((g) => {
    const saved = g.done ? g.target : goalSaved(state, g.id)
    return { ...g, saved, pct: Math.min(1, saved / g.target), left: Math.max(0, g.target - saved) }
  })
}

export function periodStart(period, now = Date.now()) {
  if (period === 'week') return startOfWeek(now)
  if (period === 'month') return startOfMonth(now)
  return 0
}

export function statsFor(state, period, now = Date.now()) {
  const from = periodStart(period, now)
  const txs = state.tx.filter((t) => t.at >= from)
  let got = 0, spent = 0, saved = 0
  const byCat = {}
  for (const t of txs) {
    if (t.kind === 'in' && t.source !== 'start') got += t.amount
    if (t.kind === 'save') saved += t.amount
    if (t.kind === 'unsave') saved -= t.amount
    if (t.kind === 'out' || t.kind === 'goalbuy') {
      spent += t.amount
      const k = t.kind === 'goalbuy' ? 'goals' : t.cat
      byCat[k] = (byCat[k] || 0) + t.amount
    }
  }
  const cats = Object.entries(byCat)
    .map(([key, amount]) => ({ key, amount }))
    .sort((a, b) => b.amount - a.amount)
  return { got, spent, saved, cats, txs }
}

/* ---------- reducer ---------- */

function withAutoSave(state, amount, at) {
  const goals = goalsOf(state)
  const main = goals.find((g) => g.id === state.mainGoalId && !g.done)
  if (!state.autoSave.on || !main || main.left <= 0) return []
  const save = Math.min(main.left, round5((amount * state.autoSave.pct) / 100))
  if (save <= 0) return []
  return [{ id: uid(), kind: 'save', amount: save, goalId: main.id, auto: true, note: 'Saved first', at: at + 1 }]
}

function reducer(state, a) {
  const now = Date.now()
  switch (a.type) {
    case 'ADD_IN': {
      const t = { id: a.id || uid(), kind: 'in', amount: a.amount, source: a.source, note: a.note, at: now }
      const extra = a.skipAutoSave ? [] : withAutoSave(state, a.amount, now)
      return { ...state, tx: [...state.tx, t, ...extra] }
    }
    case 'ADD_OUT':
      return { ...state, tx: [...state.tx, { id: a.id || uid(), kind: 'out', amount: a.amount, cat: a.cat, note: a.note, at: now }] }
    case 'DELETE_TX':
      return { ...state, tx: state.tx.filter((t) => t.id !== a.id) }
    case 'RESTORE_TX':
      return { ...state, tx: [...state.tx, ...a.txs].sort((x, y) => x.at - y.at) }

    case 'GOAL_CREATE': {
      const g = { id: uid(), name: a.name, kind: a.kind, target: a.target, weekly: a.weekly, createdAt: now, done: false }
      const live = state.goals.filter((x) => !x.done)
      return { ...state, goals: [...state.goals, g], mainGoalId: a.makeMain || live.length === 0 ? g.id : state.mainGoalId }
    }
    case 'GOAL_UPDATE':
      return { ...state, goals: state.goals.map((g) => (g.id === a.id ? { ...g, ...a.patch } : g)) }
    case 'GOAL_MAIN':
      return { ...state, mainGoalId: a.id }
    case 'GOAL_SAVE':
      return { ...state, tx: [...state.tx, { id: uid(), kind: 'save', amount: a.amount, goalId: a.id, note: a.note || 'Added to goal', at: now }] }
    case 'GOAL_UNSAVE':
      return { ...state, tx: [...state.tx, { id: uid(), kind: 'unsave', amount: a.amount, goalId: a.id, note: 'Took out of goal', at: now }] }
    case 'GOAL_BUY': {
      const g = goalsOf(state).find((x) => x.id === a.id)
      if (!g) return state
      const tx = [...state.tx, { id: uid(), kind: 'goalbuy', amount: g.target, goalId: g.id, note: `Bought: ${g.name}`, at: now }]
      const extra = goalSaved(state, g.id) - g.target
      if (extra > 0) tx.push({ id: uid(), kind: 'unsave', amount: extra, goalId: g.id, note: 'Left over from goal', at: now + 1 })
      const live = state.goals.filter((x) => !x.done && x.id !== g.id)
      return {
        ...state,
        tx,
        goals: state.goals.map((x) => (x.id === g.id ? { ...x, done: true, doneAt: now } : x)),
        mainGoalId: state.mainGoalId === g.id ? live[0]?.id ?? null : state.mainGoalId,
      }
    }
    case 'GOAL_DELETE': {
      const saved = goalSaved(state, a.id)
      const tx = saved > 0 ? [...state.tx, { id: uid(), kind: 'unsave', amount: saved, goalId: a.id, note: 'Goal removed, money back in Gullu', at: now }] : state.tx
      const goals = state.goals.filter((g) => g.id !== a.id)
      const live = goals.filter((g) => !g.done)
      return { ...state, tx, goals, mainGoalId: state.mainGoalId === a.id ? live[0]?.id ?? null : state.mainGoalId }
    }

    case 'ASK_CREATE': {
      const ask = {
        id: a.id || uid(), item: a.item, price: a.price, cat: a.cat, reason: a.reason, pay: a.pay,
        status: a.cool ? 'thinking' : 'waiting', readyAt: a.cool ? now + DAY : null, createdAt: now,
      }
      return { ...state, asks: [ask, ...state.asks] }
    }
    case 'ASK_PATCH':
      return { ...state, asks: state.asks.map((x) => (x.id === a.id ? { ...x, ...a.patch } : x)) }
    case 'ASK_DECIDE':
      return {
        ...state,
        asks: state.asks.map((x) =>
          x.id === a.id ? { ...x, status: 'decided', decision: a.decision, note: a.note || '', decidedAt: now } : x
        ),
      }
    case 'ASK_BOUGHT': {
      const ask = state.asks.find((x) => x.id === a.id)
      if (!ask) return state
      const amount = ask.decision === 'half' || ask.pay === 'half' ? Math.ceil(ask.price / 2) : ask.price
      return {
        ...state,
        tx: [...state.tx, { id: uid(), kind: 'out', amount, cat: ask.cat || 'other', note: ask.item, at: now }],
        asks: state.asks.map((x) => (x.id === a.id ? { ...x, status: 'bought' } : x)),
      }
    }
    case 'ASK_TO_GOAL': {
      const ask = state.asks.find((x) => x.id === a.id)
      if (!ask) return state
      const g = { id: uid(), name: ask.item, kind: /cycle|bicycle/i.test(ask.item) ? 'cycle' : 'other', target: ask.price, weekly: 100, createdAt: now, done: false }
      const live = state.goals.filter((x) => !x.done)
      return {
        ...state,
        goals: [...state.goals, g],
        mainGoalId: live.length === 0 ? g.id : state.mainGoalId,
        asks: state.asks.map((x) => (x.id === a.id ? { ...x, status: 'goal', goalId: g.id } : x)),
      }
    }
    case 'ASK_REMOVE':
      return { ...state, asks: state.asks.filter((x) => x.id !== a.id) }

    case 'SET':
      return { ...state, ...a.patch }
    case 'START_FRESH': {
      const s = { ...BASE, madeAt: now, sound: state.sound, lens: state.lens, profile: { nickname: a.nickname, clay: a.clay } }
      if (a.amount > 0) s.tx = [{ id: uid(), kind: 'in', amount: a.amount, source: 'start', note: 'Money already in my gullak', at: now }]
      return s
    }
    case 'LOAD_DEMO':
      return { ...makeDemo(now), sound: state.sound }
    default:
      return state
  }
}

/* ---------- provider ---------- */

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const s = JSON.parse(raw)
      // Example money is re-dated every few days so "this week" always has something in it.
      if (s && s.version === VERSION && !(s.isDemo && Date.now() - s.madeAt > 4 * DAY)) return { ...BASE, ...s }
    }
  } catch {
    /* storage blocked: fall through to example money */
  }
  return makeDemo()
}

const Ctx = createContext(null)

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* private mode: the app still works for this visit */
    }
  }, [state])

  useEffect(() => setSfxEnabled(state.sound), [state.sound])

  const derived = useMemo(() => {
    const goals = goalsOf(state)
    const main = goals.find((g) => g.id === state.mainGoalId && !g.done) || null
    const perDay = (main?.weekly || 100) / 7
    return {
      balance: balanceOf(state),
      goals,
      main,
      perDay,
      inGoals: goals.filter((g) => !g.done).reduce((s, g) => s + g.saved, 0),
      lensCtx: { prices: state.prices, perDay },
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch, ...derived }), [state, derived])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore = () => useContext(Ctx)

/** A clock that ticks once a minute (or faster when asked). */
export function useNow(ms = 60e3) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [ms])
  return now
}
