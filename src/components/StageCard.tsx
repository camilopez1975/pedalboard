import { explainStage } from '../model/explain.ts'
import type { Knobs, StageDef } from '../model/types.ts'

interface StageCardProps {
  stage: StageDef
  knobs: Knobs
  defaultOpen?: boolean
}

/** Una etapa del circuito: qué hace, con qué componentes y las cuentas con los valores actuales. */
export function StageCard({ stage, knobs, defaultOpen = false }: StageCardProps) {
  const info = explainStage(stage, knobs)
  return (
    <details className="stage" open={defaultOpen}>
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
