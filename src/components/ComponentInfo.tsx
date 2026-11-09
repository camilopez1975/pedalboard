import { componentLabel, measure } from '../model/board.ts'
import { FAULT_MODE_LABEL, getScenario, SCORE } from '../model/game.ts'
import type { PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'

const KIND_NAME = { resistor: 'Resistencia', capacitor: 'Capacitor', diode: 'Diodo', pot: 'Potenciómetro', opamp: 'Circuito integrado' } as const

interface ComponentInfoProps {
  pedal: PedalDef
}

/** Ficha del componente elegido en la placa. En el taller deja simular fallas; en el juego, medir y diagnosticar. */
export function ComponentInfo({ pedal }: ComponentInfoProps) {
  const mode = useApp((s) => s.mode)
  const ref = useApp((s) => s.selectedRef)
  const sandbox = useApp((s) => s.sandboxFault)
  const game = useApp((s) => s.game)
  const setSandboxFault = useApp((s) => s.setSandboxFault)
  const recordMeasurement = useApp((s) => s.recordMeasurement)
  const submitGuess = useApp((s) => s.submitGuess)

  const comp = pedal.board.find((c) => c.ref === ref)
  if (!comp) {
    return <p className="hint">Tocá un componente de la placa para ver qué es y qué hace.</p>
  }

  const kind = KIND_NAME[comp.kind]
  const header = (
    <h3 className="info-title">
      {comp.ref} · {kind}
      {mode === 'taller' && comp.kind !== 'opamp' ? ` · ${componentLabel(pedal, comp)}` : ''}
    </h3>
  )

  if (mode === 'taller') {
    const mine = sandbox?.ref === comp.ref ? sandbox.mode : null
    return (
      <div className="info">
        {header}
        <p>{comp.role}</p>
        {comp.kind !== 'opamp' && (
          <div className="info-actions">
            <span className="hint">Probá qué pasa si falla:</span>
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
                Falla activa: {sandbox.ref} {FAULT_MODE_LABEL[sandbox.mode]}. Tocá el acorde y mirá el espectro.
              </p>
            )}
          </div>
        )}
      </div>
    )
  }

  // Modo juego
  const scenario = getScenario(game.scenarioId)
  const reading = game.measured[comp.ref]
  const over = game.status !== 'playing'
  return (
    <div className="info">
      {header}
      {over ? <p>{comp.role}</p> : <p className="hint">Es un componente de la placa; no sabés si está sano. Medilo para averiguarlo.</p>}
      {comp.kind === 'opamp' ? (
        <p className="hint">El integrado no se mide con el multímetro; sospechá de los componentes que lo rodean.</p>
      ) : (
        <div className="info-actions">
          {reading ? (
            <p className="reading">
              Multímetro: <strong>{reading}</strong>
            </p>
          ) : (
            <button className="chip" disabled={over} onClick={() => recordMeasurement(comp.ref, measure(pedal, [scenario.fault], comp))}>
              Medir con el multímetro (−{SCORE.perMeasurement} pts)
            </button>
          )}
          {!over && (
            <>
              <span className="hint">¿Es este el que falla?</span>
              <div className="btn-row">
                <button className="chip" onClick={() => submitGuess(comp.ref, 'open')}>
                  Está abierto
                </button>
                <button className="chip" onClick={() => submitGuess(comp.ref, 'short')}>
                  Está en corto
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
