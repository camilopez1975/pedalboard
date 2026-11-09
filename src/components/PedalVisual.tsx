import { useRef } from 'react'
import type { PointerEvent } from 'react'
import type { Decor } from '../model/decor.ts'
import type { Knobs, PedalDef } from '../model/types.ts'
import { Board } from './Board.tsx'
import { PedalFace } from './PedalFace.tsx'

interface PedalVisualProps {
  pedal: PedalDef
  decor: Decor
  knobs: Knobs
  bypass: boolean
  flipped: boolean
  decorating: boolean
  selectedRef: string | null
  activeStage: string | null
  showValues: boolean
  highlightRef?: string | null
  selectedSticker: string | null
  onKnob: (id: string, value: number) => void
  onToggleBypass: () => void
  onSelect: (ref: string | null) => void
  onSelectSticker: (id: string | null) => void
  onMoveSticker: (id: string, x: number, y: number) => void
  onRemoveSticker: (id: string) => void
}

/** Pedal en 3D: de frente con perillas y pisón; dado vuelta, la placa con sus componentes. */
export function PedalVisual(p: PedalVisualProps) {
  const scene = useRef<HTMLDivElement>(null)

  // Inclinación leve según dónde está el mouse (solo cuando no se está arrastrando nada).
  function tilt(e: PointerEvent<HTMLDivElement>) {
    const el = scene.current
    if (!el || e.buttons !== 0 || p.decorating) return
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

  const cls = ['scene', `shape-${p.pedal.look.shape}`, p.flipped ? 'flipped' : '', p.decorating ? 'decorating' : ''].filter(Boolean).join(' ')

  return (
    <div className="stage3d" onPointerMove={tilt} onPointerLeave={untilt}>
      <div className="pedalboard-bg" aria-hidden="true" />
      <div ref={scene} className={cls}>
        <div className="flipper">
          <PedalFace
            pedal={p.pedal}
            decor={p.decor}
            knobs={p.knobs}
            bypass={p.bypass}
            interactive
            onKnob={p.onKnob}
            onToggleBypass={p.onToggleBypass}
            decorating={p.decorating}
            selectedSticker={p.selectedSticker}
            onSelectSticker={p.onSelectSticker}
            onMoveSticker={p.onMoveSticker}
            onRemoveSticker={p.onRemoveSticker}
          />
          <div className="face back">
            <div className="back-frame">
              <Board pedal={p.pedal} selectedRef={p.selectedRef} onSelect={p.onSelect} showValues={p.showValues} highlightRef={p.highlightRef} activeStage={p.activeStage} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
