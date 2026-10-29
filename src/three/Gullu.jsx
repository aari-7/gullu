import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { ContactShadows, Outlines, RoundedBox } from '@react-three/drei'
import { coinResources, makeSpring, stepSpring, usePagePointer, INK } from './common.jsx'
import { sfx } from '../lib/sfx.js'

/*
  Gullu: a clay gullak (the Indian money pot) that is alive.
  The body is a lathe of one profile line; the paint is drawn on a canvas.
*/

// radius, height (bottom to top) of the pot's outline
const RAW = [
  [0, 0], [0.36, 0], [0.43, 0.03], [0.41, 0.1], [0.56, 0.24], [0.75, 0.47], [0.86, 0.73], [0.87, 0.96],
  [0.8, 1.19], [0.64, 1.39], [0.45, 1.52], [0.3, 1.6], [0.27, 1.66], [0.32, 1.7], [0.3, 1.76],
  [0.19, 1.8], [0.14, 1.88], [0.1, 1.95], [0, 1.98],
]
const H = 1.98
const OFF = H / 2

function buildProfile() {
  const curve = new THREE.CatmullRomCurve3(RAW.map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'catmullrom', 0.3)
  const pts = curve.getPoints(120).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y))
  pts[0].set(0, 0)
  pts[pts.length - 1].set(0, H)
  return pts
}

function indexAt(pts, h) {
  const i = pts.findIndex((p) => p.y >= h)
  return i < 0 ? pts.length - 1 : Math.max(1, i)
}

function radiusAt(pts, h) {
  const i = indexAt(pts, h)
  const a = pts[i - 1], b = pts[i]
  const t = b.y === a.y ? 0 : (h - a.y) / (b.y - a.y)
  return a.x + (b.x - a.x) * t
}

function flower(g, x, y, r, petal, centre) {
  g.fillStyle = petal
  for (let k = 0; k < 5; k++) {
    const a = (k * Math.PI * 2) / 5 - Math.PI / 2
    g.beginPath()
    g.ellipse(x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.42, r * 0.28, a, 0, Math.PI * 2)
    g.fill()
  }
  g.fillStyle = centre
  g.beginPath()
  g.arc(x, y, r * 0.26, 0, Math.PI * 2)
  g.fill()
}

/** Paint the pot like a market gullak: speckled clay, cream bands, dots, flowers. */
function paintPot(hex, pts) {
  const W = 2048, Hc = 1024
  const c = document.createElement('canvas')
  c.width = W
  c.height = Hc
  const g = c.getContext('2d')
  g.fillStyle = hex
  g.fillRect(0, 0, W, Hc)
  for (let i = 0; i < 4200; i++) {
    g.fillStyle = Math.random() < 0.55 ? 'rgba(70,25,8,0.09)' : 'rgba(255,236,210,0.10)'
    g.beginPath()
    g.arc(Math.random() * W, Math.random() * Hc, Math.random() * 2.4 + 0.5, 0, Math.PI * 2)
    g.fill()
  }
  const n = pts.length
  const yOf = (h) => (1 - indexAt(pts, h) / (n - 1)) * Hc
  const band = (h0, h1, fill) => {
    const top = yOf(h1), bottom = yOf(h0)
    g.fillStyle = fill
    g.fillRect(0, top, W, bottom - top)
    return [top, bottom]
  }
  const cream = '#ffe9c9', mari = '#ffc738', ink = 'rgba(20,22,51,0.6)'

  band(0.2, 0.225, ink)
  const [a0, a1] = band(0.25, 0.34, cream)
  g.fillStyle = hex
  for (let x = 0; x < W; x += 40) {
    g.beginPath()
    g.arc(x + 20, (a0 + a1) / 2, 6, 0, Math.PI * 2)
    g.fill()
  }
  // flowers stay off the face (the face sits at u ≈ 0)
  const fy = yOf(0.53)
  for (let u = 0.2; u <= 0.81; u += 0.0762) flower(g, u * W, fy, 30, cream, mari)

  const [b0, b1] = band(1.2, 1.31, mari)
  g.fillStyle = cream
  for (let x = 0, s = 36; x < W; x += s) {
    g.beginPath()
    g.moveTo(x, b1)
    g.lineTo(x + s / 2, b0 + 6)
    g.lineTo(x + s, b1)
    g.closePath()
    g.fill()
  }
  band(1.335, 1.36, ink)
  band(1.6, 1.69, cream)
  band(1.83, 1.98, mari)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.anisotropy = 8
  return tex
}

const MOUTHS = ['happy', 'calm', 'worried', 'wow']

export default function Gullu({ clay = '#d4693e', mood = 'calm', pulse, onTap, still = false }) {
  const pts = useMemo(buildProfile, [])
  const bodyGeo = useMemo(() => new THREE.LatheGeometry(pts, 96).translate(0, -OFF, 0), [pts])
  const paint = useMemo(() => paintPot(clay, pts), [clay, pts])
  useEffect(() => () => paint.dispose(), [paint])

  const face = useMemo(() => {
    const at = (h, ang, inset = 0.012) => {
      const r = radiusAt(pts, h) - inset
      return [Math.sin(ang) * r, h - OFF, Math.cos(ang) * r]
    }
    const slotH = 1.44
    const slotR = radiusAt(pts, slotH)
    return {
      eyeL: at(0.99, -0.3), eyeR: at(0.99, 0.3),
      cheekL: at(0.8, -0.56, 0.005), cheekR: at(0.8, 0.56, 0.005),
      mouth: at(0.74, 0, 0.004),
      slot: [0, slotH - OFF, slotR * 0.97],
    }
  }, [pts])

  const root = useRef()
  const body = useRef()
  const eyes = useRef([])
  const pupils = useRef([])
  const slot = useRef()
  const mouthRefs = useRef({})
  const squash = useRef(makeSpring())
  const wobble = useRef(makeSpring())
  const hop = useRef(makeSpring())
  const blink = useRef({ next: 2, t: -1 })
  const look = useRef(new THREE.Vector2())
  const pointer = usePagePointer()

  const kick = (what, v) => (what.current.v += v)

  // coins flying in and out
  const coins = useMemo(coinResources, [])
  const coinMesh = useRef()
  const flights = useRef([])
  const tmp = useMemo(() => ({ o: new THREE.Object3D(), target: new THREE.Vector3(), aim: new THREE.Vector2() }), [])

  useEffect(() => {
    if (!pulse || !pulse.count) return
    const now = performance.now() / 1000
    for (let i = 0; i < pulse.count; i++) {
      if (pulse.kind === 'in') {
        flights.current.push({
          kind: 'in', t0: now + 0.15 + i * 0.13, dur: 0.72,
          from: new THREE.Vector3((Math.random() - 0.5) * 1.8, 2.1 + Math.random() * 0.3, 0.4 + Math.random() * 0.3),
          spin: 5 + Math.random() * 6,
        })
      } else {
        flights.current.push({
          kind: 'out', t0: now + 0.1 + i * 0.08, dur: 1.15,
          vel: new THREE.Vector3((Math.random() - 0.5) * 2.6, 3.1 + Math.random() * 1.1, 0.8 + Math.random() * 0.7),
          spin: 4 + Math.random() * 8, from: null,
        })
      }
    }
    flights.current = flights.current.slice(-24)
    if (pulse.kind === 'out') {
      kick(squash, -1.4)
      kick(wobble, (Math.random() - 0.5) * 3)
    }
  }, [pulse])

  useEffect(() => {
    if (mood === 'happy') kick(hop, 3.2)
  }, [mood, pulse])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const g = root.current
    if (!g) return

    // body motion
    const s = stepSpring(squash.current, 0, dt, 220, 9)
    const w = stepSpring(wobble.current, 0, dt, 120, 6)
    const hp = stepSpring(hop.current, 0, dt, 90, 8)
    g.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5)
    g.rotation.z = w * 0.35
    const bob = still ? 0 : Math.sin(t * 1.6) * 0.035
    g.position.y = bob + Math.max(0, hp) * 0.12
    look.current.lerp(tmp.aim.set(pointer.x, pointer.y), 0.08)
    const ry = still ? 0 : look.current.x * 0.42 + Math.sin(t * 0.45) * 0.08
    g.rotation.y = THREE.MathUtils.lerp(g.rotation.y, ry, 0.1)
    g.rotation.x = THREE.MathUtils.lerp(g.rotation.x, -look.current.y * 0.12, 0.1)

    // eyes: follow the pointer, blink now and then
    const b = blink.current
    if (b.t < 0 && t > b.next) b.t = 0
    let lid = 1
    if (b.t >= 0) {
      b.t += dt
      lid = Math.abs(Math.cos(Math.min(b.t / 0.16, 1) * Math.PI))
      if (b.t > 0.16) {
        b.t = -1
        b.next = t + 2 + Math.random() * 3.5
      }
    }
    const squint = mood === 'happy' ? 0.72 : mood === 'wow' ? 1.12 : 1
    eyes.current.forEach((e) => e && (e.scale.y = Math.max(0.08, lid * squint)))
    pupils.current.forEach((p) => {
      if (!p) return
      p.position.x = THREE.MathUtils.clamp(look.current.x, -1, 1) * 0.045
      p.position.y = THREE.MathUtils.clamp(look.current.y, -1, 1) * 0.04
    })

    // mouth shapes cross-fade by scale
    MOUTHS.forEach((m) => {
      const mesh = mouthRefs.current[m]
      if (!mesh) return
      const k = THREE.MathUtils.lerp(mesh.scale.x, m === mood ? 1 : 0.001, 0.18)
      mesh.scale.setScalar(k)
    })

    // coins
    const mesh = coinMesh.current
    if (!mesh) return
    slot.current.getWorldPosition(tmp.target)
    const now = performance.now() / 1000
    let n = 0
    const keep = []
    for (const f of flights.current) {
      const u = (now - f.t0) / f.dur
      if (u < 0) {
        keep.push(f)
        continue
      }
      if (u >= 1) {
        if (f.kind === 'in') {
          kick(squash, 1.1)
          sfx.coin()
        }
        continue
      }
      keep.push(f)
      const o = tmp.o
      if (f.kind === 'in') {
        const e = u * u
        const xz = 1 - Math.pow(1 - u, 2)
        o.position.set(
          THREE.MathUtils.lerp(f.from.x, tmp.target.x, xz),
          THREE.MathUtils.lerp(f.from.y, tmp.target.y + 0.06, e),
          THREE.MathUtils.lerp(f.from.z, tmp.target.z, xz)
        )
        o.rotation.set(Math.PI / 2, f.spin * Math.pow(1 - u, 2), 0)
        o.scale.setScalar(u > 0.86 ? Math.max(0.01, 1 - (u - 0.86) * 7) : 1)
      } else {
        if (!f.from) f.from = tmp.target.clone()
        const tt = u * f.dur
        o.position.set(f.from.x + f.vel.x * tt, f.from.y + f.vel.y * tt - 4.6 * tt * tt, f.from.z + f.vel.z * tt)
        o.rotation.set(Math.PI / 2 + f.spin * tt, f.spin * tt * 0.7, 0)
        o.scale.setScalar(u > 0.7 ? Math.max(0.01, 1 - (u - 0.7) * 3.3) : Math.min(1, u * 6))
      }
      o.updateMatrix()
      mesh.setMatrixAt(n++, o.matrix)
    }
    flights.current = keep
    mesh.count = n
    mesh.instanceMatrix.needsUpdate = true
  })

  const tap = (e) => {
    e.stopPropagation()
    kick(wobble, Math.random() < 0.5 ? -4 : 4)
    kick(squash, 0.9)
    onTap?.()
  }

  return (
    <group>
      <group ref={root}>
        <mesh
          ref={body}
          geometry={bodyGeo}
          onPointerDown={tap}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = '')}
        >
          <meshStandardMaterial map={paint} roughness={0.78} metalness={0} />
          <Outlines thickness={0.035} color={INK} />
        </mesh>

        {/* coin slot */}
        <group position={face.slot} rotation={[-0.92, 0, 0]}>
          <RoundedBox ref={slot} args={[0.36, 0.075, 0.08]} radius={0.03} smoothness={3}>
            <meshStandardMaterial color="#2a1206" roughness={0.6} />
          </RoundedBox>
        </group>

        {/* eyes */}
        {[face.eyeL, face.eyeR].map((p, i) => (
          <group key={i} position={p} rotation={[0, i ? 0.3 : -0.3, 0]}>
            <group ref={(el) => (eyes.current[i] = el)}>
              <mesh scale={[1, 1.18, 0.5]}>
                <sphereGeometry args={[0.15, 32, 24]} />
                <meshStandardMaterial color="#fffdf7" roughness={0.35} />
                <Outlines thickness={0.022} color={INK} />
              </mesh>
              <group position={[0, 0, 0.062]}>
                <group ref={(el) => (pupils.current[i] = el)}>
                  <mesh scale={[1, 1.1, 0.55]}>
                    <sphereGeometry args={[0.078, 24, 18]} />
                    <meshStandardMaterial color={INK} roughness={0.25} />
                  </mesh>
                  <mesh position={[-0.026, 0.032, 0.04]}>
                    <sphereGeometry args={[0.022, 12, 10]} />
                    <meshBasicMaterial color="#ffffff" />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        ))}

        {/* cheeks */}
        {[face.cheekL, face.cheekR].map((p, i) => (
          <mesh key={i} position={p} rotation={[0, i ? 0.56 : -0.56, 0]} scale={[1, 0.6, 0.32]}>
            <sphereGeometry args={[0.1, 20, 14]} />
            <meshStandardMaterial color="#ff8f7e" roughness={0.9} transparent opacity={0.9} />
          </mesh>
        ))}

        {/* mouths, one per mood */}
        <group position={face.mouth} rotation={[0.12, 0, 0]}>
          <mesh ref={(el) => (mouthRefs.current.happy = el)} rotation={[0, 0, Math.PI]} scale={0.001}>
            <torusGeometry args={[0.13, 0.03, 10, 28, Math.PI]} />
            <meshStandardMaterial color={INK} roughness={0.4} />
          </mesh>
          <mesh ref={(el) => (mouthRefs.current.calm = el)} rotation={[0, 0, Math.PI + 0.55]} scale={0.001}>
            <torusGeometry args={[0.1, 0.026, 10, 24, Math.PI - 1.1]} />
            <meshStandardMaterial color={INK} roughness={0.4} />
          </mesh>
          <mesh ref={(el) => (mouthRefs.current.worried = el)} position={[0, -0.07, 0]} rotation={[0, 0, 0.5]} scale={0.001}>
            <torusGeometry args={[0.1, 0.026, 10, 24, Math.PI - 1]} />
            <meshStandardMaterial color={INK} roughness={0.4} />
          </mesh>
          <mesh ref={(el) => (mouthRefs.current.wow = el)} scale={0.001}>
            <torusGeometry args={[0.06, 0.028, 10, 24]} />
            <meshStandardMaterial color={INK} roughness={0.4} />
          </mesh>
        </group>
      </group>

      {/* plinth with a flat "sticker" shadow, to match the cards */}
      <mesh position={[0, -OFF - 0.09, 0]}>
        <cylinderGeometry args={[1.18, 1.22, 0.18, 64]} />
        <meshStandardMaterial color="#fffbf3" roughness={0.7} />
        <Outlines thickness={0.03} color={INK} />
      </mesh>
      <mesh position={[0.1, -OFF - 0.19, -0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.26, 64]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <ContactShadows position={[0, -OFF + 0.005, 0]} scale={2.6} blur={2.2} far={1.6} opacity={0.42} resolution={256} color={INK} />

      <instancedMesh ref={coinMesh} args={[coins.geo, coins.mats, 24]} frustumCulled={false} />
    </group>
  )
}
