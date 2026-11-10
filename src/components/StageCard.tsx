import { explainStage } from '../model/explain.ts'
import type { Knobs, StageDef } from '../model/types.ts'
import { useApp } from '../store.ts'

interface StageCardProps {
  stage: StageDef
  knobs: Knobs
  /** true = con componentes y cuentas. false = solo qué hace, en palabras simples. */
  tech: boolean
  defaultOpen?: boolean
}

/** Una etapa del circuito: qué hace y, si se piden los detalles, con qué componentes y las cuentas con los valores actuales. */
export function StageCard({ stage, knobs, tech, defaultOpen = false }: StageCardProps) {
  const info = explainStage(stage, knobs)
  const setHover = useApp((s) => s.setHoverStage)

  if (!tech) {
    return (
      <div className="stage plain" id={`stage-${stage.id}`} data-type={stage.type}>
        <div className="stage-name">{stage.name}</div>
        <p>{info.simple}</p>
        {info.simpleTip && <p className="tip">{info.simpleTip}</p>}
      </div>
    )
  }

  return (
    <details className="stage" id={`stage-${stage.id}`} data-type={stage.type} open={defaultOpen} onMouseEnter={() => setHover(stage.id)} onMouseLeave={() => setHover(null)}>
      <summary>
        <span className="stage-name">{stage.name}</span>
        <span className="stage-desc">{stage.description}</span>
      </summary>
      <div className="stage-body">
        <p>{info.what}</p>
        <h4>Componentes</h4>
        <ul>
          {info.components.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <h4>Cuentas con los valores de ahora</h4>
        <ul className="formulas">
          {info.formulas.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {info.tip && <p className="tip">{info.tip}</p>}
      </div>
    </details>
  )
}
