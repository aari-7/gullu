import * as THREE from 'three'
import { createContext, useContext, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import { makeSpring, stepSpring, INK } from './common.jsx'
import { CYCLE_PARTS } from '../lib/catalog.jsx'

export { CYCLE_PARTS }

/*
  "How do I save for that cycle?" The cycle builds itself as the goal fills up:
  a part appears at each step, and the parts still to come wait as faint ghosts.
*/


const R = 0.48
const RH = [-0.82, R, 0]
const FH = [0.82, R, 0]
const BB = [-0.12, 0.42, 0]
const ST = [-0.34, 1.16, 0]
const HTT = [0.56, 1.2, 0]
const HTB = [0.64, 0.98, 0]
const FRAME = '#ff6f59'

const Ghost = createContext(false)

function Mat({ color, metal = 0.1, rough = 0.45 }) {
  const ghost = useContext(Ghost)
  return ghost ? (
    <meshBasicMaterial color={INK} transparent opacity={0.12} depthWrite={false} />
  ) : (
    <meshStandardMaterial color={color} metalness={metal} roughness={rough} />
  )
}

function Tube({ a, b, r = 0.04, color = FRAME, metal, rough }) {
  const { pos, quat, len } = useMemo(() => {
    const A = new THREE.Vector3(...a)
    const B = new THREE.Vector3(...b)
    const d = B.clone().sub(A)
    const len = d.length()
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())
    return { pos: A.clone().add(B).multiplyScalar(0.5).toArray(), quat, len }
  }, [a, b])
  return (
    <mesh position={pos} quaternion={quat}>
      <cylinderGeometry args={[r, r, len, 16]} />
      <Mat color={color} metal={metal} rough={rough} />
    </mesh>
  )
}

const z = (p, dz) => [p[0], p[1], dz]

function Wheel({ at, spinRef }) {
  const spokes = useMemo(() => Array.from({ length: 12 }, (_, i) => (i / 12) * Math.PI * 2), [])
  return (
    <group position={at}>
      <group ref={spinRef}>
        <mesh>
          <torusGeometry args={[R - 0.03, 0.055, 14, 48]} />
          <Mat color="#23243a" rough={0.8} />
        </mesh>
        <mesh>
          <torusGeometry args={[R - 0.1, 0.018, 8, 48]} />
          <Mat color="#d6dbea" metal={0.7} rough={0.3} />
        </mesh>
        {spokes.map((a, i) => (
          <group key={i} rotation={[0, 0, a]}>
            <mesh position={[0, (R - 0.1) / 2, 0]}>
              <cylinderGeometry args={[0.007, 0.007, R - 0.1, 5]} />
              <Mat color="#d6dbea" metal={0.6} rough={0.35} />
            </mesh>
          </group>
        ))}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.16, 16]} />
          <Mat color="#d6dbea" metal={0.6} rough={0.35} />
        </mesh>
      </group>
    </group>
  )
}

function Part({ built, order, center = [0, 0, 0], children }) {
  const ref = useRef()
  const sp = useRef(makeSpring(0))
  const born = useRef(null)
  useFrame((state, dt) => {
    if (born.current === null) born.current = state.clock.elapsedTime
    const ready = state.clock.elapsedTime - born.current > 0.25 + order * 0.16
    const v = stepSpring(sp.current, built && ready ? 1 : 0, dt, 150, 10)
    if (ref.current) {
      ref.current.scale.setScalar(Math.max(0.0001, v))
      ref.current.visible = v > 0.01
    }
  })
  const back = center.map((c) => -c)
  return (
    <>
      {!built && (
        <Ghost.Provider value>
          {children}
        </Ghost.Provider>
      )}
      <group position={center}>
        <group ref={ref}>
          <group position={back}>{children}</group>
        </group>
      </group>
    </>
  )
}

export default function Cycle({ pct = 0, still = false }) {
  const bike = useRef()
  const rearSpin = useRef()
  const frontSpin = useRef()
  const crank = useRef()
  const streamers = useRef([])
  const built = (at) => (at === 0 ? pct > 0 : pct >= at - 1e-6)
  const done = pct >= 1

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    if (bike.current) bike.current.rotation.y = still ? 0.55 : 0.55 + Math.sin(t * 0.4) * 0.45
    const spin = still ? 0 : done ? 3.2 : 0.7
    if (rearSpin.current) rearSpin.current.rotation.z -= spin * dt
    if (frontSpin.current) frontSpin.current.rotation.z -= spin * dt
    if (crank.current) crank.current.rotation.z -= spin * 0.6 * dt
    streamers.current.forEach((s, i) => s && (s.rotation.y = Math.sin(t * 6 + i) * 0.35))
  })

  return (
    <group ref={bike} position={[0, -0.72, 0]}>
      <Part built={built(0)} order={0} center={RH}>
        <Wheel at={RH} spinRef={rearSpin} />
      </Part>
      <Part built={built(0.12)} order={1} center={FH}>
        <Wheel at={FH} spinRef={frontSpin} />
      </Part>
      <Part built={built(0.25)} order={2} center={[-0.45, 0.75, 0]}>
        <Tube a={BB} b={ST} r={0.045} />
        <Tube a={z(BB, 0.07)} b={z(RH, 0.07)} r={0.03} />
        <Tube a={z(BB, -0.07)} b={z(RH, -0.07)} r={0.03} />
        <Tube a={[ST[0] + 0.02, ST[1] - 0.04, 0.07]} b={z(RH, 0.07)} r={0.028} />
        <Tube a={[ST[0] + 0.02, ST[1] - 0.04, -0.07]} b={z(RH, -0.07)} r={0.028} />
      </Part>
      <Part built={built(0.38)} order={3} center={[0.22, 0.85, 0]}>
        <Tube a={ST} b={HTT} r={0.044} />
        <Tube a={BB} b={HTB} r={0.052} />
        <Tube a={HTB} b={HTT} r={0.058} />
      </Part>
      <Part built={built(0.5)} order={4} center={[0.72, 0.75, 0]}>
        <Tube a={z(HTB, 0.07)} b={z(FH, 0.07)} r={0.034} />
        <Tube a={z(HTB, -0.07)} b={z(FH, -0.07)} r={0.034} />
      </Part>
      <Part built={built(0.62)} order={5} center={BB}>
        <group position={BB}>
          <mesh position={[0, 0, 0.09]}>
            <torusGeometry args={[0.15, 0.022, 8, 32]} />
            <Mat color="#d6dbea" metal={0.7} rough={0.3} />
          </mesh>
          <group ref={crank}>
            {[1, -1].map((s) => (
              <group key={s} rotation={[0, 0, s > 0 ? 0 : Math.PI]}>
                <mesh position={[0, -0.1, 0.13 * s]}>
                  <boxGeometry args={[0.04, 0.22, 0.03]} />
                  <Mat color="#d6dbea" metal={0.7} rough={0.3} />
                </mesh>
                <mesh position={[0, -0.21, 0.2 * s]}>
                  <boxGeometry args={[0.16, 0.04, 0.12]} />
                  <Mat color={INK} rough={0.6} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </Part>
      <Part built={built(0.74)} order={6} center={[0.53, 1.36, 0]}>
        <Tube a={HTT} b={[0.54, 1.36, 0]} r={0.035} color="#d6dbea" metal={0.6} />
        <Tube a={[0.52, 1.38, -0.32]} b={[0.52, 1.38, 0.32]} r={0.03} color="#d6dbea" metal={0.6} />
        <Tube a={[0.52, 1.38, 0.3]} b={[0.52, 1.38, 0.44]} r={0.045} color="#ffc738" />
        <Tube a={[0.52, 1.38, -0.3]} b={[0.52, 1.38, -0.44]} r={0.045} color="#ffc738" />
      </Part>
      <Part built={built(0.86)} order={7} center={[-0.36, 1.32, 0]}>
        <Tube a={ST} b={[-0.37, 1.32, 0]} r={0.03} color="#d6dbea" metal={0.6} />
        <RoundedBox args={[0.44, 0.09, 0.2]} radius={0.04} position={[-0.36, 1.37, 0]}>
          <Mat color={INK} rough={0.7} />
        </RoundedBox>
      </Part>
      <Part built={built(1)} order={8} center={[0.52, 1.42, 0]}>
        <mesh position={[0.52, 1.44, 0.18]}>
          <sphereGeometry args={[0.06, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <Mat color="#ffc738" metal={0.8} rough={0.25} />
        </mesh>
        {[0.44, -0.44].map((zz, i) => (
          <group key={i} position={[0.52, 1.38, zz]} ref={(el) => (streamers.current[i] = el)}>
            {['#3edb9c', '#ff9bc8', '#5aa2ff'].map((c, k) => (
              <mesh key={k} position={[0.16, -0.02 - k * 0.025, 0]} rotation={[0, 0, -0.25 - k * 0.15]}>
                <boxGeometry args={[0.3, 0.018, 0.004]} />
                <Mat color={c} />
              </mesh>
            ))}
          </group>
        ))}
      </Part>
      {/* soft ground shadow */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.25, 0.42, 1]}>
        <circleGeometry args={[1.05, 48]} />
        <meshBasicMaterial color={INK} transparent opacity={0.16} depthWrite={false} />
      </mesh>
    </group>
  )
}
