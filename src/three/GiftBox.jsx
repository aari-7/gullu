import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Outlines, RoundedBox } from '@react-three/drei'
import { coinResources, makeSpring, stepSpring, INK } from './common.jsx'

/* "Can I buy this?" The thing you want, wrapped, with its price on a tag.
   A yes pops the lid and throws coins; a no gives it a sad shake. */

function priceTag() {
  const c = document.createElement('canvas')
  c.width = 512
  c.height = 300
  const g = c.getContext('2d')
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  const draw = (text) => {
    g.clearRect(0, 0, 512, 300)
    g.fillStyle = '#fffbf3'
    g.strokeStyle = '#141633'
    g.lineWidth = 14
    g.beginPath()
    g.moveTo(90, 10)
    g.lineTo(500, 10)
    g.lineTo(500, 290)
    g.lineTo(90, 290)
    g.lineTo(10, 150)
    g.closePath()
    g.fill()
    g.stroke()
    g.fillStyle = '#141633'
    g.beginPath()
    g.arc(78, 150, 18, 0, Math.PI * 2)
    g.fill()
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = 150
    do {
      g.font = `800 ${size}px "Anek Latin", "Helvetica Neue", Arial, sans-serif`
      size -= 8
    } while (g.measureText(text).width > 360 && size > 50)
    g.fillText(text, 300, 160)
    tex.needsUpdate = true
  }
  return { tex, draw }
}

export default function GiftBox({ price = 0, decision = null, still = false }) {
  const tag = useMemo(priceTag, [])
  useEffect(() => {
    const text = price > 0 ? '₹' + Math.round(price).toLocaleString('en-IN') : '₹ ?'
    tag.draw(text)
    document.fonts?.load('800 100px "Anek Latin"').then(() => tag.draw(text)).catch(() => {})
  }, [price, tag])
  useEffect(() => () => tag.tex.dispose(), [tag])

  const root = useRef()
  const lid = useRef()
  const tagRef = useRef()
  const open = useRef(makeSpring())
  const wob = useRef(makeSpring())
  const hop = useRef(makeSpring())
  const coins = useMemo(coinResources, [])
  const coinMesh = useRef()
  const flights = useRef([])
  const o = useMemo(() => new THREE.Object3D(), [])

  useEffect(() => {
    if (decision === 'yes' || decision === 'half') {
      hop.current.v += 4
      const now = performance.now() / 1000
      const n = decision === 'yes' ? 14 : 8
      for (let i = 0; i < n; i++) {
        flights.current.push({
          t0: now + 0.18 + i * 0.05,
          vel: new THREE.Vector3((Math.random() - 0.5) * 3, 3.2 + Math.random() * 1.6, (Math.random() - 0.2) * 1.6),
          spin: 4 + Math.random() * 8,
        })
      }
    } else if (decision === 'no') {
      wob.current.v += 6
      setTimeout(() => (wob.current.v -= 7), 160)
    } else if (decision === 'talk') {
      hop.current.v += 2.4
    }
  }, [decision])

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    const isOpen = decision === 'yes' || decision === 'half'
    const op = stepSpring(open.current, isOpen ? 1 : 0, dt, 110, 9)
    const w = stepSpring(wob.current, 0, dt, 160, 7)
    const h = stepSpring(hop.current, 0, dt, 90, 8)
    if (root.current) {
      root.current.rotation.y = still ? 0.55 : 0.55 + Math.sin(t * 0.6) * 0.3
      root.current.rotation.z = w * 0.12
      root.current.position.y = (still ? 0 : Math.sin(t * 1.4) * 0.04) + Math.max(0, h) * 0.18 - 0.35
    }
    if (lid.current) {
      lid.current.position.y = 0.53 + op * 0.5
      lid.current.position.x = op * 0.28
      lid.current.rotation.x = -op * 0.45
      lid.current.rotation.z = -op * 0.6
    }
    if (tagRef.current) tagRef.current.rotation.z = still ? 0 : Math.sin(t * 2.2) * 0.12

    const m = coinMesh.current
    if (!m) return
    const now = performance.now() / 1000
    let n = 0
    flights.current = flights.current.filter((f) => now - f.t0 < 1.3)
    for (const f of flights.current) {
      const tt = now - f.t0
      if (tt < 0) continue
      o.position.set(f.vel.x * tt, 0.6 + f.vel.y * tt - 4.4 * tt * tt, f.vel.z * tt)
      o.rotation.set(Math.PI / 2 + f.spin * tt, f.spin * tt * 0.6, 0)
      o.scale.setScalar(tt > 0.9 ? Math.max(0.01, 1 - (tt - 0.9) * 2.5) : Math.min(1, tt * 8))
      o.updateMatrix()
      m.setMatrixAt(n++, o.matrix)
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
  })

  return (
    <group>
      <group ref={root}>
        <RoundedBox args={[1.15, 0.9, 1.15]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color="#ff6f59" roughness={0.55} />
          <Outlines thickness={0.03} color={INK} />
        </RoundedBox>
        <mesh>
          <boxGeometry args={[0.2, 0.92, 1.17]} />
          <meshStandardMaterial color="#3edb9c" roughness={0.5} />
        </mesh>
        <mesh>
          <boxGeometry args={[1.17, 0.92, 0.2]} />
          <meshStandardMaterial color="#3edb9c" roughness={0.5} />
        </mesh>
        <group ref={lid} position={[0, 0.53, 0]}>
          <RoundedBox args={[1.26, 0.24, 1.26]} radius={0.05} smoothness={4}>
            <meshStandardMaterial color="#ffc738" roughness={0.5} />
            <Outlines thickness={0.03} color={INK} />
          </RoundedBox>
          <mesh>
            <boxGeometry args={[0.2, 0.26, 1.28]} />
            <meshStandardMaterial color="#3edb9c" roughness={0.5} />
          </mesh>
          <mesh>
            <boxGeometry args={[1.28, 0.26, 0.2]} />
            <meshStandardMaterial color="#3edb9c" roughness={0.5} />
          </mesh>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[0.2 * s, 0.24, 0]} rotation={[Math.PI / 2, 0.5 * s, 0]} scale={[1, 1, 0.6]}>
              <torusGeometry args={[0.17, 0.055, 12, 28]} />
              <meshStandardMaterial color="#3edb9c" roughness={0.5} />
              <Outlines thickness={0.02} color={INK} />
            </mesh>
          ))}
          <group ref={tagRef} position={[0.5, 0.05, 0.66]}>
            <mesh position={[0.1, -0.16, 0]} rotation={[0, 0, 0.5]}>
              <cylinderGeometry args={[0.01, 0.01, 0.34, 6]} />
              <meshBasicMaterial color={INK} />
            </mesh>
            <mesh position={[0.5, -0.42, 0.02]} rotation={[0, 0, -0.12]}>
              <planeGeometry args={[0.95, 0.56]} />
              <meshBasicMaterial map={tag.tex} transparent side={THREE.DoubleSide} />
            </mesh>
          </group>
        </group>
        <instancedMesh ref={coinMesh} args={[coins.geo, coins.mats, 16]} frustumCulled={false} />
      </group>
      <mesh position={[0.12, -0.83, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.0, 48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}
