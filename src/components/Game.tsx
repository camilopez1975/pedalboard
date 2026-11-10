import { measure } from '../model/board.ts'
import { computeScore, FAULT_MODE_LABEL, getScenario, SCORE } from '../model/game.ts'
import type { PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'
import { KIND_NAME } from './ComponentInfo.tsx'

interface GameProps {
  pedal: PedalDef
}

/** Modo "pedal roto" en tres pasos: escuchar, medir con el multímetro y diagnosticar. */
export function Game({ pedal }: GameProps) {
  const game = useApp((s) => s.game)
  const selectedRef = useApp((s) => s.selectedRef)
  const showTech = useApp((s) => s.showTech)
  const newGame = useApp((s) => s.newGame)
  const selectRef = useApp((s) => s.selectRef)
  const revealAnswer = useApp((s) => s.revealAnswer)
  const setCompare = useApp((s) => s.setCompareHealthy)
  const recordMeasurement = useApp((s) => s.recordMeasurement)
  const setDraftMode = useApp((s) => s.setDraftMode)
  const submitGuess = useApp((s) => s.submitGuess)

  const scenario = getScenario(game.scenarioId)
  const comp = pedal.board.find((c) => c.ref === selectedRef)
  const faultComp = pedal.board.find((c) => c.ref === scenario.fault.ref)
  const measuredRefs = Object.keys(game.measured)
  const score = computeScore(measuredRefs.length, game.wrongGuesses)
  const over = game.status !== 'playing'
  const measurable = !!comp && comp.kind !== 'opamp'
  const reading = comp ? game.measured[comp.ref] : undefined

  return (
    <div className="game">
      <div className="score-bar" aria-live="polite">
        <span>
          Puntos <strong>{score}</strong>
        </span>
        <span>Mediciones {measuredRefs.length}</span>
        <span>Errores {game.wrongGuesses}</span>
      </div>

      <section className="panel step">
        <h2>
          <span className="step-n">1</span> Escuchá el pedal
        </h2>
        <blockquote className="complaint">“{scenario.complaint}”</blockquote>
        <p className="hint">Tocá el acorde (panel "Tocar") y mirá el espectro. Podés comparar con uno que funciona bien.</p>
        <div className="seg" role="group" aria-label="Qué pedal escuchar">
          <button aria-pressed={!game.compareHealthy} onClick={() => setCompare(false)}>
            Pedal roto
          </button>
          <button aria-pressed={game.compareHealthy} onClick={() => setCompare(true)}>
            Pedal sano
          </button>
        </div>
      </section>

      <section className="panel step">
        <h2>
          <span className="step-n">2</span> Medí con el multímetro
        </h2>
        <p className="hint">Elegí un componente tocándolo en la placa (arriba). Cada medición cuesta {SCORE.perMeasurement} puntos.</p>
        <div className="meter">
          <div className="meter-top">
            <span className="meter-sel">{comp ? `${comp.ref} · ${KIND_NAME[comp.kind]}` : 'Sin componente'}</span>
            <span className="meter-badge">{reading ? 'MEDIDO' : 'LISTO'}</span>
          </div>
          <div className="meter-screen" aria-live="polite">
            {reading ?? (comp ? (comp.kind === 'opamp' ? 'No se mide' : '— — —') : 'Elegí uno en la placa')}
          </div>
          <button className="meter-btn" disabled={!measurable || !!reading || over} onClick={() => comp && recordMeasurement(comp.ref, measure(pedal, [scenario.fault], comp))}>
            {reading ? 'Ya medido' : `Medir (−${SCORE.perMeasurement} pts)`}
          </button>
        </div>
        <details className="howto">
          <summary>¿Cómo leo lo que mide?</summary>
          <ul>
            <li>Un valor parecido al del componente sano: está bien.</li>
            <li>“OL” o “no conduce”: está abierto, cortado.</li>
            <li>“0 Ω” o “en corto”: está en corto, deja pasar todo.</li>
            {showTech && <li>Una resistencia de 4,7 kΩ debería medir cerca de 4,7 kΩ (±1 %); un capacitor, cerca de su valor (±5 %).</li>}
          </ul>
        </details>
        {measuredRefs.length > 0 && (
          <div className="notebook">
            <h4>Libreta</h4>
            <div className="notebook-list">
              {measuredRefs.map((r) => (
                <button key={r} className={selectedRef === r ? 'note on' : 'note'} onClick={() => selectRef(r)}>
                  <strong>{r}</strong>
                  <span>{game.measured[r]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {!over && (
        <section className="panel step">
          <h2>
            <span className="step-n">3</span> Tu diagnóstico
          </h2>
          <p className="suspect">
            Sospechoso: <strong>{comp ? comp.ref : 'ninguno todavía'}</strong>
          </p>
          <div className="seg" role="group" aria-label="Cómo falla">
            <button aria-pressed={game.draftMode === 'open'} onClick={() => setDraftMode('open')}>
              Está abierto
            </button>
            <button aria-pressed={game.draftMode === 'short'} onClick={() => setDraftMode('short')}>
              Está en corto
            </button>
          </div>
          <button className="play" disabled={!measurable || !game.draftMode} onClick={() => comp && game.draftMode && submitGuess(comp.ref, game.draftMode)}>
            Diagnosticar (−{SCORE.perWrongGuess} si me equivoco)
          </button>
          {game.lastGuessWrong && <p className="error">Ese no es. Seguí midiendo.</p>}
          <button className="link" onClick={revealAnswer}>
            Rendirme y ver la respuesta
          </button>
        </section>
      )}

      {over && (
        <section className="panel step result">
          <p className={game.status === 'solved' ? 'win' : 'lose'}>{game.status === 'solved' ? `¡Lo encontraste! Puntaje final: ${score}.` : 'La falla era:'}</p>
          <p>
            <strong>
              {faultComp?.ref} {FAULT_MODE_LABEL[scenario.fault.mode]}.
            </strong>
          </p>
          <p>{showTech ? scenario.explanation : scenario.simple}</p>
          <p className="hint">Con el pedal todavía roto podés tocar el acorde y ver cómo se ve la falla en el espectro.</p>
          <button className="play" onClick={newGame}>
            Otro pedal roto
          </button>
        </section>
      )}
    </div>
  )
}
