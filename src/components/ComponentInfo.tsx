import { componentLabel } from '../model/board.ts'
import { FAULT_MODE_LABEL } from '../model/game.ts'
import type { PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'

export const KIND_NAME = { resistor: 'Resistencia', capacitor: 'Capacitor', diode: 'Diodo', pot: 'Potenciómetro', opamp: 'Circuito integrado' } as const

interface ComponentInfoProps {
  pedal: PedalDef
}

/** Ficha del componente elegido en la placa (modo taller): qué es, qué hace y qué pasa si falla. */
export function ComponentInfo({ pedal }: ComponentInfoProps) {
  const ref = useApp((s) => s.selectedRef)
  const sandbox = useApp((s) => s.sandboxFault)
  const showTech = useApp((s) => s.showTech)
  const setSandboxFault = useApp((s) => s.setSandboxFault)

  const comp = pedal.board.find((c) => c.ref === ref)
  if (!comp) {
    return <p className="hint">Tocá un componente de la placa para ver qué es y qué hace.</p>
  }

  const mine = sandbox?.ref === comp.ref ? sandbox.mode : null
  return (
    <div className="info">
      <h3 className="info-title">
        {comp.ref} · {KIND_NAME[comp.kind]}
        {showTech && comp.kind !== 'opamp' ? ` · ${componentLabel(pedal, comp)}` : ''}
      </h3>
      <p>{showTech ? comp.role : (comp.simple ?? comp.role)}</p>
      {comp.kind !== 'opamp' && (
        <div className="info-actions">
          <span className="hint">¿Qué pasa si este componente falla? Probalo y tocá el acorde:</span>
          <div className="btn-row">
            <button className={mine === 'open' ? 'chip active' : 'chip'} onClick={() => setSandboxFault(mine === 'open' ? null : { ref: comp.ref, mode: 'open' })}>
              Abrirlo
            </button>
            <button className={mine === 'short' ? 'chip active' : 'chip'} onClick={() => setSandboxFault(mine === 'short' ? null : { ref: comp.ref, mode: 'short' })}>
              Ponerlo en corto
            </button>
            {sandbox && (
              <button className="chip" onClick={() => setSandboxFault(null)}>
                Reparar
              </button>
            )}
          </div>
          {sandbox && (
            <p className="hint">
              Falla activa: {sandbox.ref} {FAULT_MODE_LABEL[sandbox.mode]}.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
