import { useApp } from '../store.ts'
import type { PedalDef, StageDef } from '../model/types.ts'

/** Color y nombre corto de cada tipo de etapa (el mismo color se usa en las fichas de abajo). */
export const STAGE_STYLE: Record<StageDef['type'], { color: string; short: string }> = {
  'opamp-diode-clipper': { color: '#ff8a1f', short: 'Ganancia + diodos' },
  'ts-tone': { color: '#1fc8ff', short: 'Tono' },
  'output-level': { color: '#b266ff', short: 'Volumen' },
}

interface SignalFlowProps {
  pedal: PedalDef
  playing: boolean
  /** Etapa elegida (se muestra resaltada). */
  focus: string | null
  onPick: (stageId: string) => void
}

/** Camino de la señal: guitarra → cada etapa → ampli. Al pasar el mouse se resaltan sus componentes en la placa. */
export function SignalFlow({ pedal, playing, focus, onPick }: SignalFlowProps) {
  const setHover = useApp((s) => s.setHoverStage)

  return (
    <div className={playing ? 'flow playing' : 'flow'}>
      <div className="flow-end">
        <span className="flow-dot" />
        Guitarra
      </div>
      {pedal.stages.map((stage) => {
        const st = STAGE_STYLE[stage.type]
        return (
          <div key={stage.id} className="flow-item">
            <div className="flow-wire" aria-hidden="true" />
            <button
              className={focus === stage.id ? 'flow-block picked' : 'flow-block'}
              style={{ '--c': st.color } as never}
              onMouseEnter={() => setHover(stage.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(stage.id)}
              onBlur={() => setHover(null)}
              onClick={() => onPick(stage.id)}
            >
              <strong>{st.short}</strong>
              <span>ver qué hace</span>
            </button>
          </div>
        )
      })}
      <div className="flow-item">
        <div className="flow-wire" aria-hidden="true" />
        <div className="flow-end">
          <span className="flow-dot out" />
          Ampli
        </div>
      </div>
    </div>
  )
}
