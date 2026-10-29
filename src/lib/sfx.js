// Tiny synthesized sounds (no audio files). They only ever play from a tap,
// so browsers allow them. Off switch lives in the top bar.

let ctx = null
let enabled = true

export function setSfxEnabled(on) {
  enabled = !!on
}

function audio() {
  if (!enabled) return null
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext
      if (!C) return null
      ctx = new C()
    }
    if (ctx.state === 'suspended') ctx.resume()
    return ctx
  } catch {
    return null
  }
}

function tone({ freq = 880, to, type = 'sine', dur = 0.15, gain = 0.12, delay = 0 }) {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + delay
  const o = a.createOscillator()
  const g = a.createGain()
  o.type = type
  o.frequency.setValueAtTime(freq, t0)
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  o.connect(g).connect(a.destination)
  o.start(t0)
  o.stop(t0 + dur + 0.02)
}

function thud(delay = 0) {
  const a = audio()
  if (!a) return
  const t0 = a.currentTime + delay
  const len = Math.floor(a.sampleRate * 0.12)
  const buf = a.createBuffer(1, len, a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3)
  const src = a.createBufferSource()
  src.buffer = buf
  const f = a.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = 420
  const g = a.createGain()
  g.gain.value = 0.5
  src.connect(f).connect(g).connect(a.destination)
  src.start(t0)
}

export const sfx = {
  coin(delay = 0) {
    const p = 1 + Math.random() * 0.08
    tone({ freq: 1975 * p, type: 'triangle', dur: 0.1, gain: 0.09, delay })
    tone({ freq: 2637 * p, type: 'sine', dur: 0.22, gain: 0.06, delay: delay + 0.035 })
  },
  coinsOut(n = 3) {
    for (let i = 0; i < Math.min(n, 5); i++) tone({ freq: 1600 - i * 120, type: 'triangle', dur: 0.09, gain: 0.07, delay: i * 0.06 })
  },
  pop() {
    tone({ freq: 520, to: 980, type: 'sine', dur: 0.11, gain: 0.1 })
  },
  tap() {
    tone({ freq: 660, type: 'sine', dur: 0.05, gain: 0.05 })
  },
  boing() {
    tone({ freq: 180, to: 520, type: 'sine', dur: 0.28, gain: 0.14 })
    tone({ freq: 360, to: 1040, type: 'triangle', dur: 0.2, gain: 0.04, delay: 0.02 })
  },
  stamp() {
    thud()
    tone({ freq: 110, to: 60, type: 'sine', dur: 0.18, gain: 0.25 })
  },
  tada() {
    ;[523, 659, 784, 1047].forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.32, gain: 0.08, delay: i * 0.09 }))
  },
  sad() {
    tone({ freq: 392, to: 300, type: 'sine', dur: 0.3, gain: 0.08 })
    tone({ freq: 330, to: 240, type: 'sine', dur: 0.35, gain: 0.06, delay: 0.18 })
  },
}

export function buzz(ms = 12) {
  try {
    if (enabled && navigator.vibrate) navigator.vibrate(ms)
  } catch {
    /* not supported */
  }
}
