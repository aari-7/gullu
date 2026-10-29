import * as THREE from 'three'
import { useEffect, useRef, useState } from 'react'
import { Environment, Lightformer } from '@react-three/drei'
import { useThree } from '@react-three/fiber'

export const INK = '#141633'

/** Studio light built from light panels, so no HDR file has to be downloaded. */
export function Lights({ warm = '#ffd27a', cool = '#9fdcff' }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 5, 4]} intensity={1.5} color="#fff3df" />
      <directionalLight position={[-4, 2, -3]} intensity={0.45} color={cool} />
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={2.6} position={[0, 5, -1]} scale={[10, 4, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.8} color={warm} position={[-5, 1, 2]} scale={[3, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="rect" intensity={1.6} color={cool} position={[5, 1, 2]} scale={[3, 6, 1]} target={[0, 0, 0]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 1, 6]} scale={3} target={[0, 0, 0]} />
      </Environment>
    </>
  )
}

/** Point the camera at something other than the origin. */
export function Aim({ at = [0, 0, 0] }) {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.lookAt(...at)
    camera.updateProjectionMatrix()
  }, [camera, at])
  return null
}

/* ---------- ₹ coins (shared geometry + materials) ---------- */

let coinRes = null

function drawCoin(ctx) {
  const s = 256
  ctx.fillStyle = '#f5b82e'
  ctx.fillRect(0, 0, s, s)
  ctx.lineWidth = 16
  ctx.strokeStyle = '#cf8f16'
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, 110, 0, Math.PI * 2)
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.strokeStyle = '#ffe08a'
  ctx.beginPath()
  ctx.arc(s / 2, s / 2, 96, 0, Math.PI * 2)
  ctx.stroke()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '800 150px "Anek Latin", "Helvetica Neue", Arial, sans-serif'
  ctx.fillStyle = '#ffe08a'
  ctx.fillText('₹', s / 2 - 5, s / 2 + 2)
  ctx.fillStyle = '#a86c08'
  ctx.fillText('₹', s / 2, s / 2 + 7)
}

export function coinResources() {
  if (coinRes) return coinRes
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')
  drawCoin(ctx)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  // Redraw once the web font is in, so the ₹ matches the rest of the app.
  document.fonts?.load('800 150px "Anek Latin"').then(() => {
    drawCoin(ctx)
    tex.needsUpdate = true
  }).catch(() => {})
  const face = new THREE.MeshStandardMaterial({ map: tex, metalness: 0.35, roughness: 0.38, emissive: '#5a3a00', emissiveIntensity: 0.35 })
  const side = new THREE.MeshStandardMaterial({ color: '#f0b23a', metalness: 0.45, roughness: 0.32, emissive: '#4a2e00', emissiveIntensity: 0.3 })
  coinRes = {
    geo: new THREE.CylinderGeometry(0.22, 0.22, 0.055, 40, 1),
    mats: [side, face, face],
  }
  return coinRes
}

/* ---------- pointer anywhere on the page, for eyes that follow you ---------- */

export const pagePointer = { x: 0, y: 0 }
let pointerBound = false
export function usePagePointer() {
  useEffect(() => {
    if (pointerBound) return
    pointerBound = true
    const on = (e) => {
      pagePointer.x = (e.clientX / window.innerWidth) * 2 - 1
      pagePointer.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('pointermove', on, { passive: true })
    window.addEventListener('pointerdown', on, { passive: true })
  }, [])
  return pagePointer
}

/* ---------- tiny spring for squash, wobble and pop-in ---------- */

export function makeSpring(x = 0) {
  return { x, v: 0 }
}
export function stepSpring(s, target, dt, k = 170, d = 13) {
  const h = Math.min(dt, 1 / 30)
  const a = (target - s.x) * k - s.v * d
  s.v += a * h
  s.x += s.v * h
  return s.x
}

/** Pause rendering while the canvas is scrolled out of view. */
export function useFrameloop(ref) {
  const [loop, setLoop] = useState('always')
  useEffect(() => {
    const el = ref.current
    if (!el || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([e]) => setLoop(e.isIntersecting ? 'always' : 'never'), { rootMargin: '80px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ref])
  return loop
}

export function useReducedMotion3D() {
  const [r, setR] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false)
  useEffect(() => {
    const m = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!m) return
    const on = () => setR(m.matches)
    m.addEventListener?.('change', on)
    return () => m.removeEventListener?.('change', on)
  }, [])
  return r
}

/** Canvas fades in after its first frame so there is no black flash. */
export function useFadeIn() {
  const [ready, setReady] = useState(false)
  const style = { opacity: ready ? 1 : 0, transition: 'opacity 0.6s ease-out' }
  return [style, () => requestAnimationFrame(() => setReady(true))]
}

export function useMounted() {
  const r = useRef(false)
  useEffect(() => {
    r.current = true
    return () => (r.current = false)
  }, [])
  return r
}
