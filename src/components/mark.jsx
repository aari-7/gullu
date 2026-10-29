/* The Gullu logo: a flat drawing of the clay pot. */
export function GulluMark({ size = 38, clay = '#D4693E' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 6c-3 0-4.5 2-4.5 4 0 1.2.4 2 1 2.8C19 15 12 23 12 34c0 12 9 21 20 21s20-9 20-21c0-11-7-19-16.5-21.2.6-.8 1-1.6 1-2.8 0-2-1.5-4-4.5-4z" fill={clay} stroke="#141633" strokeWidth="3.2" strokeLinejoin="round" />
      <path d="M14 40.5h36" stroke="#FFE9C9" strokeWidth="4" />
      <rect x="25" y="17" width="14" height="3.6" rx="1.8" fill="#141633" />
      <circle cx="25.5" cy="31" r="3.3" fill="#141633" />
      <circle cx="38.5" cy="31" r="3.3" fill="#141633" />
      <path d="M26.5 37c3 2.6 8 2.6 11 0" fill="none" stroke="#141633" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
