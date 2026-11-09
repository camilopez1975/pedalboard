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
}

/** Camino de la señal: guitarra → cada etapa → ampli. Al pasar el mouse se resaltan sus componentes en la placa. */
export function SignalFlow({ pedal, playing }: SignalFlowProps) {
  const setHover = useApp((s) => s.setHoverStage)

  function openStage(id: string) {
    const el = document.getElementById(`stage-${id}`) as HTMLDetailsElement | null
    if (!el) return
    el.open = true
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

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
              className="flow-block"
              style={{ '--c': st.color } as never}
              onMouseEnter={() => setHover(stage.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(stage.id)}
              onBlur={() => setHover(null)}
              onClick={() => openStage(stage.id)}
            >
              <strong>{st.short}</strong>
              <span>ver cuentas</span>
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
