import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html, Outlines } from '@react-three/drei'
import { coinResources, INK } from './common.jsx'

/*
  "Where did my money go?" as stacks of ₹ coins, one stack per kind of spending.
  Every coin is worth the same (`coinValue`), so the heights are to scale.
*/

const GAP = 1.05
const COIN_H = 0.072
const BASE_Y = -1.0

function bounce(t) {
  const n = 7.5625, d = 2.75
  if (t < 1 / d) return n * t * t
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375
  return n * (t -= 2.625 / d) * t + 0.984375
}

export default function CoinTowers({ towers, coinValue, replay = 0, still = false }) {
  const { size, camera } = useThree()
  const coins = useMemo(coinResources, [])
  const mesh = useRef()
  const group = useRef()
  const clock = useRef(0)
  const o = useMemo(() => new THREE.Object3D(), [])

  const layout = useMemo(() => {
    const n = towers.length
    const items = []
    towers.forEach((tw, ti) => {
      const x = (ti - (n - 1) / 2) * GAP
      for (let i = 0; i < tw.coins; i++) {
        items.push({
          x: x + (Math.sin(i * 12.9898 + ti) * 0.5) * 0.035,
          z: (Math.cos(i * 78.233 + ti) * 0.5) * 0.035,
          y: BASE_Y + 0.09 + COIN_H / 2 + i * COIN_H,
          rot: i * 0.7 + ti,
          delay: ti * 0.12 + i * 0.045,
        })
      }
    })
    return items
  }, [towers])

  useEffect(() => {
    clock.current = 0
  }, [layout, replay])

  // fit the row of stacks into whatever width the canvas has
  const fit = useMemo(() => {
    const dist = camera.position.length()
    const visW = 2 * dist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * (size.width / size.height)
    const need = Math.max(1, towers.length) * GAP + 0.4
    return Math.min(1.15, visW / need)
  }, [camera, size, towers.length])

  useFrame((_, dt) => {
    clock.current += dt
    const m = mesh.current
    if (!m) return
    const t = clock.current
    layout.forEach((c, i) => {
      const u = still ? 1 : THREE.MathUtils.clamp((t - c.delay) / 0.55, 0, 1)
      const y = c.y + (1 - bounce(u)) * 2.6
      o.position.set(c.x, y, c.z)
      o.rotation.set(0, c.rot, 0)
      o.scale.setScalar(u > 0 ? 1 : 0.001)
      o.updateMatrix()
      m.setMatrixAt(i, o.matrix)
    })
    m.count = layout.length
    m.instanceMatrix.needsUpdate = true
    if (group.current && !still) group.current.rotation.y = Math.sin(t * 0.35) * 0.08
  })

  return (
    <group ref={group} scale={fit} position={[0, BASE_Y * (1 - fit), 0]}>
      {towers.map((tw, ti) => {
        const x = (ti - (towers.length - 1) / 2) * GAP
        return (
          <group key={tw.key} position={[x, 0, 0]}>
            <mesh position={[0, BASE_Y + 0.045, 0]}>
              <cylinderGeometry args={[0.36, 0.38, 0.09, 40]} />
              <meshStandardMaterial color={tw.hex} roughness={0.6} />
              <Outlines thickness={0.025} color={INK} />
            </mesh>
            <Html position={[0, BASE_Y - 0.08, 0.3]} center zIndexRange={[5, 0]}>
              <div className="tower-label">
                <b>{tw.short}</b>
                <span>{tw.amountText}</span>
              </div>
            </Html>
          </group>
        )
      })}
      <instancedMesh key={layout.length} ref={mesh} args={[coins.geo, coins.mats, Math.max(1, layout.length)]} frustumCulled={false} />
    </group>
  )
}
