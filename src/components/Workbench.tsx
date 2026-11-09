import { useEffect, useMemo, useState } from 'react'
import { CHORDS, strengthToPeakVolts } from '../audio/chord.ts'
import { engine } from '../audio/engine.ts'
import { clipperValues, responseCurve } from '../model/analysis.ts'
import { applyFaults } from '../model/board.ts'
import { compilePedal } from '../model/compile.ts'
import { getScenario } from '../model/game.ts'
import type { Fault, PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'
import { ComponentInfo } from './ComponentInfo.tsx'
import { GamePanel } from './GamePanel.tsx'
import { PedalVisual } from './PedalVisual.tsx'
import { ResponseChart } from './ResponseChart.tsx'
import { Spectrum } from './Spectrum.tsx'
import { StageCard } from './StageCard.tsx'

interface WorkbenchProps {
  pedal: PedalDef
}

export function Workbench({ pedal }: WorkbenchProps) {
  const knobs = useApp((s) => s.knobs)
  const bypass = useApp((s) => s.bypass)
  const chordId = useApp((s) => s.chordId)
  const strength = useApp((s) => s.strength)
  const playing = useApp((s) => s.playing)
  const mode = useApp((s) => s.mode)
  const flipped = useApp((s) => s.flipped)
  const selectedRef = useApp((s) => s.selectedRef)
  const sandboxFault = useApp((s) => s.sandboxFault)
  const game = useApp((s) => s.game)
  const setKnob = useApp((s) => s.setKnob)
  const setBypass = useApp((s) => s.setBypass)
  const setChord = useApp((s) => s.setChord)
  const setStrength = useApp((s) => s.setStrength)
  const setPlaying = useApp((s) => s.setPlaying)
  const setMode = useApp((s) => s.setMode)
  const setFlipped = useApp((s) => s.setFlipped)
  const selectRef = useApp((s) => s.selectRef)
  const closePedal = useApp((s) => s.closePedal)
  const [error, setError] = useState<string | null>(null)

  const gameFault = getScenario(game.scenarioId).fault
  // Qué fallas tiene el pedal que suena ahora mismo.
  const faults: Fault[] = useMemo(() => {
    if (mode === 'juego') return game.compareHealthy ? [] : [gameFault]
    return sandboxFault ? [sandboxFault] : []
  }, [mode, game.compareHealthy, gameFault, sandboxFault])

  const effective = useMemo(() => applyFaults(pedal, faults), [pedal, faults])
  const blocks = useMemo(() => compilePedal(effective, knobs), [effective, knobs])
  const curve = useMemo(() => responseCurve(effective, knobs), [effective, knobs])
  const markers = useMemo(() => {
    const clipper = pedal.stages.find((s) => s.type === 'opamp-diode-clipper')
    if (!clipper || clipper.type !== 'opamp-diode-clipper' || faults.length > 0) return []
    const v = clipperValues(clipper, knobs)
    return [
      { f: v.fcHp, label: 'f₁' },
      { f: v.fcLp, label: 'f₂' },
    ]
  }, [pedal, knobs, faults])

  useEffect(() => {
    engine.setConfig({ bypass, blocks })
  }, [bypass, blocks])

  useEffect(() => {
    engine.setInputVolts(strengthToPeakVolts(strength))
  }, [strength])

  // Si cambia el acorde mientras suena, se vuelve a tocar el nuevo.
  useEffect(() => {
    if (useApp.getState().playing) engine.play(chordId, true)
  }, [chordId])

  // Al salir del banco de trabajo se corta el sonido.
  useEffect(
    () => () => {
      engine.stop()
      useApp.getState().setPlaying(false)
    },
    [],
  )

  async function togglePlay() {
    if (playing) {
      engine.stop()
      setPlaying(false)
      return
    }
    try {
      setError(null)
      await engine.start()
      engine.setInputVolts(strengthToPeakVolts(strength))
      engine.setConfig({ bypass, blocks })
      engine.play(chordId, true)
      setPlaying(true)
    } catch (e) {
      setError('No se pudo iniciar el audio: ' + (e instanceof Error ? e.message : String(e)))
    }
  }

  const gameOver = mode === 'juego' && game.status !== 'playing'

  return (
    <main className="page workbench">
      <header className="bar">
        <button className="link" onClick={closePedal}>
          ← Elegir otro pedal
        </button>
        <h1>{pedal.name}</h1>
        <div className="modes" role="tablist" aria-label="Modo">
          <button role="tab" aria-selected={mode === 'taller'} className={mode === 'taller' ? 'mode on' : 'mode'} onClick={() => setMode('taller')}>
            Taller
          </button>
          <button role="tab" aria-selected={mode === 'juego'} className={mode === 'juego' ? 'mode on' : 'mode'} onClick={() => setMode('juego')}>
            Pedal roto
          </button>
        </div>
      </header>

      <div className="columns">
        <div className="col">
          <section className="panel">
            <PedalVisual
              pedal={pedal}
              knobs={knobs}
              bypass={bypass}
              flipped={flipped}
              selectedRef={selectedRef}
              showValues={mode === 'taller'}
              highlightRef={gameOver ? gameFault.ref : null}
              onKnob={setKnob}
              onToggleBypass={() => setBypass(!bypass)}
              onSelect={selectRef}
            />
            <div className="btn-row center">
              <button className="chip" onClick={() => setFlipped(!flipped)}>
                {flipped ? 'Ver el frente' : 'Dar vuelta: ver la placa'}
              </button>
              <button className="chip" onClick={() => setBypass(!bypass)}>
                {bypass ? 'Prender pedal' : 'Apagar pedal (bypass)'}
              </button>
            </div>
            {flipped && (
              <div className="info-box">
                <ComponentInfo pedal={pedal} />
              </div>
            )}
            {!flipped && mode === 'taller' && (
              <ul className="knob-hints">
                {pedal.knobs.map((k) => (
                  <li key={k.id}>
                    <strong>{k.label}:</strong> {k.hint}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>Sonido de prueba</h2>
            <label className="field">
              Acorde
              <select value={chordId} onChange={(e) => setChord(e.target.value)}>
                {CHORDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Pegada: {Math.round(strengthToPeakVolts(strength) * 1000)} mV de pico
              <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
            </label>
            <button className="play" onClick={togglePlay}>
              {playing ? 'Parar' : 'Tocar acorde'}
            </button>
            {error && <p className="error">{error}</p>}
          </section>
        </div>

        <div className="col">
          {mode === 'juego' && <GamePanel pedal={pedal} />}

          <section className="panel">
            <h2>Espectro en vivo</h2>
            <Spectrum active={playing} />
            <p className="hint">
              Gris: lo que entra al pedal. Verde: lo que sale. Un pedal que distorsiona agrega armónicas: picos nuevos en múltiplos de cada
              nota.
            </p>
          </section>

          {mode === 'taller' && (
            <>
              <section className="panel">
                <h2>Respuesta en frecuencia</h2>
                <ResponseChart curve={curve} markers={markers} />
                <p className="hint">
                  Es la respuesta para señales chicas: no incluye el recorte de los diodos, que es no lineal y agrega armónicas.
                </p>
              </section>

              <section className="panel">
                <h2>El circuito, etapa por etapa</h2>
                <div className="chain">
                  <div className="chain-end">Entrada: acorde sintetizado</div>
                  {pedal.stages.map((stage, i) => (
                    <div key={stage.id}>
                      <div className="chain-arrow">↓</div>
                      <StageCard stage={stage} knobs={knobs} defaultOpen={i === 0} />
                    </div>
                  ))}
                  <div className="chain-arrow">↓</div>
                  <div className="chain-end">Salida</div>
                </div>
              </section>

              <section className="panel">
                <h2>Qué tan fiel es este modelo</h2>
                <ul className="notes">
                  {pedal.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </section>
            </>
          )}
        </div>
      </div>
    </main>
  )
}
