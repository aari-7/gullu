import {
  Gamepad2, PencilRuler, Ticket, Gift, Shapes, Trophy, Wallet, Sparkles, Award, Coins,
  PiggyBank, Bike, Headphones, Dices, BookOpen, Star, Volleyball, Shirt,
} from 'lucide-react'

/* Hand-drawn little things for the money lens. Same 2.2 ink stroke everywhere. */

export function SamosaIcon({ size = 24, ...rest }) {
  // a plump, tilted pastry with a crimped edge (kept off-centre so it never reads as a warning sign)
  const body = 'M16 4.6c1.3 0 2.2.7 2.8 1.7l8.8 15.3c1.3 2.3-.1 5-2.7 5.2-5.9.6-11.9.6-17.8 0-2.6-.2-4-2.9-2.7-5.2l8.8-15.3c.6-1 1.5-1.7 2.8-1.7z'
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...rest}>
      <g transform="rotate(-14 16 17)">
        <path d={body} fill="#F2B04A" />
        <path d="M18.8 6.3l8.8 15.3c1.3 2.3-.1 5-2.7 5.2-1.9.2-3.8.3-5.6.4.5-7.1.3-14.4-.5-20.9z" fill="#D9892B" />
        <circle cx="11.6" cy="19.6" r="1.1" fill="#C9781F" />
        <circle cx="15.6" cy="23" r=".9" fill="#C9781F" />
        <circle cx="15.4" cy="14.6" r=".8" fill="#C9781F" />
        <circle cx="22.6" cy="20.4" r=".9" fill="#A9600F" />
        <path d="M14.2 9q.225 1.46-1.15 2q.225 1.46-1.15 2q.225 1.46-1.15 2q.225 1.46-1.15 2q.225 1.46-1.15 2" fill="none" stroke="#141633" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16.6 8.6l1.2 2.4" stroke="#FFE3A6" strokeWidth="1.8" strokeLinecap="round" />
        <path d={body} fill="none" stroke="#141633" strokeWidth="2.2" strokeLinejoin="round" />
      </g>
    </svg>
  )
}

export function IceCreamIcon({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...rest}>
      <path d="M9.6 15h12.8L16 29.2z" fill="#E9A15A" stroke="#141633" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12.4 17.6l5.4 5.4M19.6 17.6l-5.4 5.4" stroke="#141633" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M8.4 15.4a7.6 7.6 0 1 1 15.2 0z" fill="#FF9BC8" stroke="#141633" strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="16" cy="5.4" r="2.3" fill="#FF6F59" stroke="#141633" strokeWidth="1.8" />
    </svg>
  )
}

export function CoinIcon({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...rest}>
      <circle cx="16" cy="16" r="12.5" fill="#FFC738" stroke="#141633" strokeWidth="2.2" />
      <circle cx="16" cy="16" r="8.6" fill="none" stroke="#C98A12" strokeWidth="1.6" />
      <path d="M12 10.6h8M12 13.6h8M13.2 10.6c4.4 0 4.4 6 0 6h-1.2l6.2 6" fill="none" stroke="#141633" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function DayIcon({ size = 24, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" {...rest}>
      <rect x="5" y="7" width="22" height="20" rx="4" fill="#FFFBF3" stroke="#141633" strokeWidth="2.2" />
      <path d="M5 13h22" stroke="#141633" strokeWidth="2.2" />
      <rect x="5" y="7" width="22" height="6" rx="3" fill="#FF6F59" stroke="#141633" strokeWidth="2.2" />
      <path d="M11 4.5v5M21 4.5v5" stroke="#141633" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M12 20.2l2.8 2.8 5.4-5.6" fill="none" stroke="#141633" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const LENS_ICONS = { rupees: CoinIcon, samosa: SamosaIcon, icecream: IceCreamIcon, days: DayIcon }

/* What kids spend on. `hex` is used by charts and 3D; text sits on it in ink. */
export const SPEND_CATS = [
  { key: 'snacks', label: 'Snacks', hex: '#FFC738', icon: SamosaIcon, custom: true, examples: ['Samosas', 'Ice cream', 'Vada pav', 'Juice'] },
  { key: 'toys', label: 'Toys & games', hex: '#FF6F59', icon: Gamepad2, examples: ['Cricket ball', 'Stickers', 'Card game'] },
  { key: 'school', label: 'Stationery & books', hex: '#5AA2FF', icon: PencilRuler, examples: ['Gel pens', 'Comic book', 'Notebook'] },
  { key: 'outings', label: 'Outings', hex: '#FF9BC8', icon: Ticket, examples: ['Movie', 'Fun fair', 'Bus fare'] },
  { key: 'gifts', label: 'Gifts', hex: '#3EDB9C', icon: Gift, examples: ['Birthday gift', 'Rakhi gift'] },
  { key: 'clothes', label: 'Clothes', hex: '#C6F25A', icon: Shirt, examples: ['T-shirt', 'Cap', 'Socks'] },
  { key: 'other', label: 'Other', hex: '#FFB067', icon: Shapes, examples: [] },
  { key: 'goals', label: 'Goals bought', hex: '#D4693E', icon: Trophy, hidden: true, examples: [] },
]

export const catOf = (key) => SPEND_CATS.find((c) => c.key === key) || SPEND_CATS[6]

export const INCOME_SOURCES = [
  { key: 'pocket', label: 'Pocket money', icon: Wallet },
  { key: 'gift', label: 'Gift', icon: Gift },
  { key: 'chores', label: 'Chores', icon: Sparkles },
  { key: 'prize', label: 'Prize', icon: Award },
  { key: 'other', label: 'Other', icon: Coins },
  { key: 'start', label: 'Already had', icon: PiggyBank, hidden: true },
]

export const sourceOf = (key) => INCOME_SOURCES.find((s) => s.key === key) || INCOME_SOURCES[4]

/* Goal presets. The cycle gets its own 3D build; everything else fills a coin jar. */
export const GOAL_KINDS = [
  { key: 'cycle', label: 'Cycle', price: 6000, icon: Bike },
  { key: 'football', label: 'Football', price: 900, icon: Volleyball },
  { key: 'headphones', label: 'Headphones', price: 1500, icon: Headphones },
  { key: 'game', label: 'Board game', price: 1200, icon: Dices },
  { key: 'books', label: 'Books', price: 700, icon: BookOpen },
  { key: 'gift', label: 'Gift for someone', price: 800, icon: Gift },
  { key: 'other', label: 'Something else', price: 1000, icon: Star },
]

export const goalKindOf = (key) => GOAL_KINDS.find((g) => g.key === key) || GOAL_KINDS[6]

/* Why a kid wants something. Need vs want is the money lesson. */
export const REASONS = [
  { key: 'need', label: 'I need it' },
  { key: 'want', label: 'I really want it' },
  { key: 'gift', label: "It's a gift for someone" },
  { key: 'friends', label: 'My friends have it' },
]

export const reasonOf = (key) => REASONS.find((r) => r.key === key) || REASONS[1]

export const NICKNAMES = [
  'Captain Chillar', 'Samosa Sultan', 'Rupee Ranger', 'Coin Cadet', 'Gullak Guru',
  'Paisa Panther', 'Budget Baaz', 'Sir Saves-a-Lot', 'Penny Pilot', 'Chai Champion',
  'Laddoo Legend', 'Moneybee', 'Thrifty Tiger', 'Jugaad Genius', 'Coin Comet',
]

export const CLAYS = [
  { key: 'terracotta', label: 'Clay', hex: '#D4693E' },
  { key: 'marigold', label: 'Marigold', hex: '#F3A632' },
  { key: 'mint', label: 'Mint', hex: '#3FBF8C' },
  { key: 'sky', label: 'Sky', hex: '#4F9BEA' },
  { key: 'rose', label: 'Rose', hex: '#E86A8E' },
]

export const clayOf = (key) => CLAYS.find((c) => c.key === key) || CLAYS[0]

/* The cycle goal builds one part at a time (see three/Cycle.jsx). */
export const CYCLE_PARTS = [
  { key: 'rear', at: 0, label: 'back wheel' },
  { key: 'front', at: 0.12, label: 'front wheel' },
  { key: 'back', at: 0.25, label: 'back frame' },
  { key: 'main', at: 0.38, label: 'main frame' },
  { key: 'fork', at: 0.5, label: 'front fork' },
  { key: 'pedals', at: 0.62, label: 'pedals' },
  { key: 'bars', at: 0.74, label: 'handlebars' },
  { key: 'seat', at: 0.86, label: 'seat' },
  { key: 'bell', at: 1, label: 'bell and streamers' },
]

export function nextCyclePart(goal) {
  if (!goal || goal.kind !== 'cycle' || goal.pct >= 1) return null
  const n = CYCLE_PARTS.find((p) => p.at > goal.pct + 1e-6)
  if (!n) return null
  return { label: n.label, need: Math.max(1, Math.ceil(n.at * goal.target - goal.saved)) }
}
