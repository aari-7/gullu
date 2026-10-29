import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { House, ChartColumnBig, Target, HandCoins, Volume2, VolumeX, ShieldCheck } from 'lucide-react'
import { StoreProvider, useStore } from './store.jsx'
import { BurstProvider, IconBtn, ToastProvider, spring } from './components/ui.jsx'
import Home from './screens/Home.jsx'
import Story from './screens/Story.jsx'
import Save from './screens/Save.jsx'
import Ask from './screens/Ask.jsx'
import Sheets from './screens/Sheets.jsx'
import { Grownups, Handoff, RemoteDecision, ReplyArrived } from './screens/Grownups.jsx'
import { decodeToken } from './lib/money.js'
import { GulluMark } from './components/mark.jsx'
import { sfx } from './lib/sfx.js'

export const TABS = [
  { key: 'home', label: 'Gullu', icon: House },
  { key: 'story', label: 'Where it went', icon: ChartColumnBig },
  { key: 'save', label: 'Save up', icon: Target },
  { key: 'ask', label: 'Can I buy?', icon: HandCoins },
]

const UICtx = createContext(null)
export const useUI = () => useContext(UICtx)

const readHash = () => decodeURIComponent((window.location.hash || '').slice(1))

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <StoreProvider>
        <ToastProvider>
          <BurstProvider>
            <Router />
          </BurstProvider>
        </ToastProvider>
      </StoreProvider>
    </MotionConfig>
  )
}

/* A grown-up opening a WhatsApp ask link sees only the decision page. */
function Router() {
  const [hash, setHash] = useState(readHash)
  useEffect(() => {
    const on = () => setHash(readHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  if (hash.startsWith('ask-')) {
    const data = decodeToken(hash.slice(4))
    if (data) return <RemoteDecision data={data} />
  }
  return <Shell hash={hash} />
}

const screens = {
  enter: (d) => ({ opacity: 0, x: d * 40 }),
  center: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 320, damping: 34 } },
  exit: (d) => ({ opacity: 0, x: d * -40, transition: { duration: 0.14, ease: 'easeIn' } }),
}

function Shell({ hash }) {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState(() => (TABS.some((t) => t.key === hash) ? hash : 'home'))
  const tabRef = useRef(tab)
  const [dir, setDir] = useState(1)
  const [sheet, setSheet] = useState(null)
  const [overlay, setOverlay] = useState(null)
  const [reply, setReply] = useState(null)

  const go = useCallback((key) => {
    if (key === tabRef.current) return
    const idx = (k) => TABS.findIndex((t) => t.key === k)
    setDir(idx(key) >= idx(tabRef.current) ? 1 : -1)
    tabRef.current = key
    setTab(key)
    try {
      window.history.replaceState(null, '', '#' + key)
    } catch {
      /* sandboxed frames may refuse */
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Back/forward buttons and typed links like #save switch tabs too.
  useEffect(() => {
    if (TABS.some((t) => t.key === hash) && hash !== tabRef.current) go(hash)
  }, [hash, go])

  // A grown-up's answer came back through a WhatsApp reply link.
  useEffect(() => {
    if (!hash.startsWith('reply-')) return
    const data = decodeToken(hash.slice(6))
    if (!data) return
    const ask = state.asks.find((a) => a.id === data.i)
    if (ask && ask.status === 'waiting') dispatch({ type: 'ASK_DECIDE', id: data.i, decision: data.d, note: data.n })
    setReply({ ...data, known: !!ask })
    tabRef.current = 'ask'
    setTab('ask')
    try {
      window.history.replaceState(null, '', '#ask')
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash])

  const ui = useMemo(
    () => ({
      tab,
      go,
      open: (name, props = {}) => setSheet({ name, props }),
      close: () => setSheet(null),
      show: (name, props = {}) => setOverlay({ name, props }),
      hide: () => setOverlay(null),
    }),
    [tab, go]
  )

  return (
    <UICtx.Provider value={ui}>
      <a className="skip" href="#main">Skip to content</a>
      <div className="app">
        <TopBar />
        <AnimatePresence mode="wait" custom={dir} initial={false}>
          <motion.main id="main" key={tab} custom={dir} variants={screens} initial="enter" animate="center" exit="exit">
            {tab === 'home' && <Home />}
            {tab === 'story' && <Story />}
            {tab === 'save' && <Save />}
            {tab === 'ask' && <Ask />}
          </motion.main>
        </AnimatePresence>
        <TabBar />
      </div>
      <Sheets sheet={sheet} close={ui.close} />
      <AnimatePresence>
        {overlay?.name === 'grownups' && <Grownups key="grownups" onClose={ui.hide} />}
        {overlay?.name === 'handoff' && <Handoff key="handoff" askId={overlay.props.askId} onClose={ui.hide} />}
        {reply && <ReplyArrived key="reply" data={reply} onClose={() => setReply(null)} />}
      </AnimatePresence>
    </UICtx.Provider>
  )
}

function TopBar() {
  const { state, dispatch } = useStore()
  const { tab, go, show } = useUI()
  return (
    <header className="topbar">
      <div className="wrap topbar-in">
        <button type="button" className="brand" onClick={() => go('home')} aria-label="Gullu, home">
          <motion.span whileHover={{ rotate: -10, scale: 1.08 }} whileTap={{ scale: 0.9 }} transition={spring}>
            <GulluMark />
          </motion.span>
          <span className="brand-word">gullu</span>
          <span className="brand-tag">your money buddy</span>
        </button>
        <nav className="topnav" aria-label="Main">
          {TABS.map((t) => (
            <button key={t.key} type="button" className="topnav-btn" aria-current={tab === t.key ? 'page' : undefined} onClick={() => go(t.key)}>
              {tab === t.key && <motion.span layoutId="topnav-pill" className="pill" transition={spring} />}
              <t.icon size={20} strokeWidth={2.4} aria-hidden="true" />
              {t.label}
            </button>
          ))}
        </nav>
        <div className="top-actions">
          <IconBtn
            label={state.sound ? 'Turn sounds off' : 'Turn sounds on'}
            onClick={() => {
              dispatch({ type: 'SET', patch: { sound: !state.sound } })
              if (!state.sound) setTimeout(() => sfx.pop(), 30)
            }}
          >
            {state.sound ? <Volume2 size={22} strokeWidth={2.4} /> : <VolumeX size={22} strokeWidth={2.4} />}
          </IconBtn>
          <motion.button
            type="button"
            className="grownup-btn"
            onClick={() => show('grownups')}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.95 }}
            transition={spring}
            aria-label="For grown-ups"
          >
            <ShieldCheck size={21} strokeWidth={2.4} aria-hidden="true" />
            <span>Grown-ups</span>
          </motion.button>
        </div>
      </div>
    </header>
  )
}

function TabBar() {
  const { tab, go } = useUI()
  const { state } = useStore()
  const waiting = state.asks.filter((a) => a.status === 'waiting').length
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => (
        <button key={t.key} type="button" className="tab" aria-current={tab === t.key ? 'page' : undefined} onClick={() => go(t.key)}>
          <span className="tab-ic">
            {tab === t.key && <motion.span layoutId="tab-pill" className="pill" transition={spring} />}
            <t.icon size={22} strokeWidth={2.4} aria-hidden="true" />
            {t.key === 'ask' && waiting > 0 && (
              <span className="dot" aria-label={`${waiting} waiting`}>
                {waiting}
              </span>
            )}
          </span>
          {t.label}
        </button>
      ))}
    </nav>
  )
}
