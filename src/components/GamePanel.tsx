import { computeScore, FAULT_MODE_LABEL, getScenario, SCORE } from '../model/game.ts'
import type { PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'

interface GamePanelProps {
  pedal: PedalDef
}

/** Panel del modo "pedal roto": el cliente cuenta el síntoma y hay que encontrar el componente que falla. */
export function GamePanel({ pedal }: GamePanelProps) {
  const game = useApp((s) => s.game)
  const newGame = useApp((s) => s.newGame)
  const revealAnswer = useApp((s) => s.revealAnswer)
  const setCompare = useApp((s) => s.setCompareHealthy)
  const setFlipped = useApp((s) => s.setFlipped)
  const scenario = getScenario(game.scenarioId)
  const measurements = Object.keys(game.measured).length
  const score = computeScore(measurements, game.wrongGuesses)
  const comp = pedal.board.find((c) => c.ref === scenario.fault.ref)

  return (
    <section className="panel game">
      <h2>Pedal roto</h2>
      <blockquote className="complaint">“{scenario.complaint}”</blockquote>

      {game.status === 'playing' && (
        <>
          <p className="hint">
            Tu trabajo: encontrar qué componente falla y cómo. Escuchá el pedal, mirá el espectro, dalo vuelta, medí componentes con el
            multímetro y, cuando sospeches de uno, diagnosticalo. Empezás con {SCORE.start} puntos: cada medición resta {SCORE.perMeasurement} y cada
            diagnóstico equivocado, {SCORE.perWrongGuess}.
          </p>
          <div className="btn-row">
            <button className="chip" onClick={() => setFlipped(true)}>
              Dar vuelta el pedal
            </button>
            <label className="check">
              <input type="checkbox" checked={game.compareHealthy} onChange={(e) => setCompare(e.target.checked)} /> Escuchar un pedal sano para comparar
            </label>
          </div>
          {game.lastGuessWrong && <p className="error">Ese no es. −{SCORE.perWrongGuess} puntos. Seguí midiendo.</p>}
          <div className="score">
            Puntos: <strong>{score}</strong> · mediciones: {measurements} · errores: {game.wrongGuesses}
          </div>
          <button className="link" onClick={revealAnswer}>
            Rendirme y ver la respuesta
          </button>
        </>
      )}

      {game.status !== 'playing' && (
        <div className="result">
          <p className={game.status === 'solved' ? 'win' : 'lose'}>
            {game.status === 'solved' ? `¡Lo encontraste! Puntaje final: ${score}.` : 'La falla era:'}
          </p>
          <p>
            <strong>
              {comp?.ref} {FAULT_MODE_LABEL[scenario.fault.mode]}.
            </strong>
          </p>
          <p>{scenario.explanation}</p>
          <p className="hint">Con el pedal todavía roto podés tocar el acorde y ver cómo se ve la falla en el espectro.</p>
          <button className="play" onClick={newGame}>
            Otro pedal roto
          </button>
        </div>
      )}
    </section>
  )
}
