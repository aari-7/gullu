import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines } from '@react-three/drei'
import { coinResources, INK } from './common.jsx'

/* Any goal that isn't a cycle: a labelled glass jar that fills with ₹ coins. */

const MAX = 42
const BOTTOM = -0.62

function labelTexture(name) {
  const c = document.createElement('canvas')
  c.width = 1024
  c.height = 256
  const g = c.getContext('2d')
  const draw = () => {
    g.fillStyle = '#fffbf3'
    g.fillRect(0, 0, 1024, 256)
    g.strokeStyle = '#141633'
    g.lineWidth = 10
    g.strokeRect(5, 5, 1014, 246)
    g.fillStyle = '#141633'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = 120
    const text = (name || 'My goal').toUpperCase().slice(0, 22)
    do {
      g.font = `800 ${size}px "Anek Latin", "Helvetica Neue", Arial, sans-serif`
      size -= 6
    } while (g.measureText(text).width > 900 && size > 40)
    g.fillText(text, 512, 136)
  }
  draw()
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  document.fonts?.load('800 100px "Anek Latin"').then(() => {
    draw()
    tex.needsUpdate = true
  }).catch(() => {})
  return tex
}

export default function Jar({ pct = 0, name, still = false }) {
  const coins = useMemo(coinResources, [])
  const label = useMemo(() => labelTexture(name), [name])
  useEffect(() => () => label.dispose(), [label])
  const jar = useRef()
  const mesh = useRef()
  const o = useMemo(() => new THREE.Object3D(), [])
  const count = Math.round(Math.min(1, pct) * MAX)

  // a messy pile: rings of coins, each layer a little rotated
  const spots = useMemo(
    () =>
      Array.from({ length: MAX }, (_, i) => {
        const layer = Math.floor(i / 7)
        const k = i % 7
        const ang = k * ((Math.PI * 2) / 6) + layer * 0.6
        const rad = k === 6 ? 0 : 0.3
        return {
          x: Math.cos(ang) * rad,
          z: Math.sin(ang) * rad,
          y: BOTTOM + 0.05 + layer * 0.13 + (k === 6 ? 0.04 : 0),
          rx: Math.sin(i * 3.1) * 0.25,
          rz: Math.cos(i * 1.7) * 0.25,
        }
      }),
    []
  )
  const shown = useRef(0)
  const born = useRef([])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (jar.current) jar.current.rotation.y = still ? -0.35 : -0.35 + Math.sin(t * 0.5) * 0.35
    const m = mesh.current
    if (!m) return
    // drop the coins in one after another until the pile matches the goal
    if (shown.current < count && (born.current.length === 0 || t - born.current[born.current.length - 1] > 0.05)) {
      born.current.push(t)
      shown.current++
    }
    if (shown.current > count) {
      shown.current = count
      born.current.length = count
    }
    for (let i = 0; i < shown.current; i++) {
      const s = spots[i]
      const u = still ? 1 : Math.min(1, (t - born.current[i]) / 0.45)
      const fall = (1 - u * u) * 1.6
      o.position.set(s.x, s.y + fall, s.z)
      o.rotation.set(s.rx, i, s.rz)
      o.scale.setScalar(1)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    }
    m.count = shown.current
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={jar} position={[0, -0.05, 0]}>
      <instancedMesh ref={mesh} args={[coins.geo, coins.mats, MAX]} frustumCulled={false} />
      {/* glass */}
      <mesh renderOrder={2}>
        <cylinderGeometry args={[0.62, 0.62, 1.32, 48, 1, true]} />
        <meshStandardMaterial color="#e6f6ff" transparent opacity={0.28} roughness={0.08} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, BOTTOM - 0.04, 0]}>
        <cylinderGeometry args={[0.62, 0.62, 0.06, 48]} />
        <meshStandardMaterial color="#cdeeff" transparent opacity={0.6} roughness={0.1} />
      </mesh>
      {[0.66, -0.66].map((y) => (
        <mesh key={y} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.028, 10, 64]} />
          <meshBasicMaterial color={INK} />
        </mesh>
      ))}
      {/* label */}
      <mesh position={[0, 0.06, 0]} renderOrder={3}>
        <cylinderGeometry args={[0.635, 0.635, 0.38, 48, 1, true, -0.85, 1.7]} />
        <meshStandardMaterial map={label} roughness={0.8} side={THREE.DoubleSide} />
      </mesh>
      {/* lid */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.68, 0.68, 0.16, 48]} />
        <meshStandardMaterial color="#ffc738" roughness={0.45} />
        <Outlines thickness={0.025} color={INK} />
      </mesh>
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.16, 0.2, 0.1, 24]} />
        <meshStandardMaterial color="#ff6f59" roughness={0.45} />
        <Outlines thickness={0.02} color={INK} />
      </mesh>
      <mesh position={[0, BOTTOM - 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.5, 1]}>
        <circleGeometry args={[0.95, 48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}
