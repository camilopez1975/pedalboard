import { useRef } from 'react'
import type { CSSProperties, PointerEvent } from 'react'
import type { Knobs, PedalDef } from '../model/types.ts'
import { Board } from './Board.tsx'
import { Knob } from './Knob.tsx'

interface PedalVisualProps {
  pedal: PedalDef
  knobs: Knobs
  bypass: boolean
  flipped: boolean
  selectedRef: string | null
  showValues: boolean
  highlightRef?: string | null
  onKnob: (id: string, value: number) => void
  onToggleBypass: () => void
  onSelect: (ref: string | null) => void
}

/** Pedal en 3D: de frente con perillas y pisón; dado vuelta, la placa con sus componentes. */
export function PedalVisual({ pedal, knobs, bypass, flipped, selectedRef, showValues, highlightRef, onKnob, onToggleBypass, onSelect }: PedalVisualProps) {
  const scene = useRef<HTMLDivElement>(null)

  // Inclinación leve según dónde está el mouse (solo cuando no se está arrastrando una perilla).
  function tilt(e: PointerEvent<HTMLDivElement>) {
    const el = scene.current
    if (!el || e.buttons !== 0) return
    const r = el.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width - 0.5
    const y = (e.clientY - r.top) / r.height - 0.5
    el.style.setProperty('--tx', `${(-y * 8).toFixed(2)}deg`)
    el.style.setProperty('--ty', `${(x * 10).toFixed(2)}deg`)
  }
  function untilt() {
    scene.current?.style.setProperty('--tx', '0deg')
    scene.current?.style.setProperty('--ty', '0deg')
  }

  return (
    <div className="stage3d" onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="pedalboard-bg" aria-hidden="true" />
      <div ref={scene} className={flipped ? 'scene flipped' : 'scene'} style={{ '--pc': pedal.color } as CSSProperties}>
        <div className="flipper">
          <div className="face front">
            <div className="jack jack-l" aria-hidden="true">
              <span>IN</span>
            </div>
            <div className="jack jack-r" aria-hidden="true">
              <span>OUT</span>
            </div>
            <div className="screw s1" aria-hidden="true" />
            <div className="screw s2" aria-hidden="true" />
            <div className="knob-row">
              {pedal.knobs.map((k) => (
                <Knob key={k.id} label={k.label} value={knobs[k.id] ?? k.default} onChange={(v) => onKnob(k.id, v)} />
              ))}
            </div>
            <div className="nameplate">
              <div className="nameplate-title">{shortName(pedal)}</div>
              <div className="nameplate-sub">{pedal.subtitle}</div>
            </div>
            <span className={bypass ? 'led3d' : 'led3d on'} aria-hidden="true" />
            <button className="stomp" onClick={onToggleBypass} aria-pressed={!bypass} aria-label={bypass ? 'Prender el pedal' : 'Apagar el pedal (bypass)'}>
              <span className="stomp-top" />
            </button>
          </div>
          <div className="face back">
            <div className="back-frame">
              <Board pedal={pedal} selectedRef={selectedRef} onSelect={onSelect} showValues={showValues} highlightRef={highlightRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function shortName(pedal: PedalDef): string {
  return pedal.name.replace(/^Overdrive tipo /, '').replace(/^Fuzz tipo /, '')
}
