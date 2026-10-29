import { useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import Gullu from './Gullu.jsx'
import CoinTowers from './CoinTowers.jsx'
import Cycle from './Cycle.jsx'
import Jar from './Jar.jsx'
import GiftBox from './GiftBox.jsx'
import { Aim, Lights, useFrameloop, useFadeIn, useReducedMotion3D } from './common.jsx'

/* Each stage is its own small canvas. Only the screen on view is mounted. */

const AIM_TOWERS = [0, -0.32, 0]
const AIM_GIFT = [0.25, -0.15, 0]

function Stage({ className = 'stage-canvas', camera, onReady, children }) {
  const wrap = useRef()
  const frameloop = useFrameloop(wrap)
  const [style, fadeIn] = useFadeIn()
  const onCreated = () => {
    fadeIn()
    requestAnimationFrame(() => onReady?.())
  }
  return (
    <div ref={wrap} className={className} style={style}>
      <Canvas flat dpr={[1, 2]} frameloop={frameloop} camera={camera} gl={{ antialias: true, alpha: true }} onCreated={onCreated}>
        <Lights />
        {children}
      </Canvas>
    </div>
  )
}

export function GulluStage({ onReady, ...props }) {
  const still = useReducedMotion3D()
  return (
    <Stage camera={{ position: [0, 0.32, 5.7], fov: 32 }} onReady={onReady}>
      <Gullu {...props} still={still} />
    </Stage>
  )
}

export function TowersStage(props) {
  return (
    <Stage camera={{ position: [0, 1.25, 5.3], fov: 30 }}>
      <Aim at={AIM_TOWERS} />
      <CoinTowers {...props} />
    </Stage>
  )
}

export function GoalStage({ goal, ...rest }) {
  const still = useReducedMotion3D()
  return (
    <Stage camera={{ position: [0.4, 1.0, 5.6], fov: 32 }}>
      {goal.kind === 'cycle' ? <Cycle pct={goal.pct} still={still} {...rest} /> : <Jar pct={goal.pct} name={goal.name} still={still} {...rest} />}
    </Stage>
  )
}

export function GiftStage(props) {
  const still = useReducedMotion3D()
  return (
    <Stage camera={{ position: [0.25, 0.75, 4.3], fov: 30 }}>
      <Aim at={AIM_GIFT} />
      <GiftBox {...props} still={still} />
    </Stage>
  )
}
