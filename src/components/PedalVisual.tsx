import type { Knobs, PedalDef } from '../model/types.ts'
import { Board } from './Board.tsx'
import { PedalFace } from './PedalFace.tsx'

interface PedalVisualProps {
  pedal: PedalDef
  knobs: Knobs
  bypass: boolean
  flipped: boolean
  selectedRef: string | null
  activeStage: string | null
  showValues: boolean
  highlightRef?: string | null
  onKnob: (id: string, value: number) => void
  onToggleBypass: () => void
  onSelect: (ref: string | null) => void
}

/** Pedal quieto: de frente con perillas y pisón; al darlo vuelta, la placa con sus componentes. */
export function PedalVisual(p: PedalVisualProps) {
  return (
    <div className={`scene shape-${p.pedal.look.shape}${p.flipped ? ' flipped' : ''}`}>
      <div className="flipper">
        <PedalFace pedal={p.pedal} knobs={p.knobs} bypass={p.bypass} interactive onKnob={p.onKnob} onToggleBypass={p.onToggleBypass} />
        <div className="face back">
          <div className="back-frame">
            <Board pedal={p.pedal} selectedRef={p.selectedRef} onSelect={p.onSelect} showValues={p.showValues} highlightRef={p.highlightRef} activeStage={p.activeStage} />
          </div>
        </div>
      </div>
    </div>
  )
}
