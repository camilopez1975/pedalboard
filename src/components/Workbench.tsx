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
import { Game } from './Game.tsx'
import { PedalBrowser } from './PedalBrowser.tsx'
import { PedalVisual } from './PedalVisual.tsx'
import { ResponseChart } from './ResponseChart.tsx'
import { SignalFlow } from './SignalFlow.tsx'
import { Spectrum } from './Spectrum.tsx'
import { StageCard } from './StageCard.tsx'

interface WorkbenchProps {
  pedal: PedalDef
}

function strengthWord(strength: number): string {
  return strength < 0.34 ? 'suave' : strength < 0.67 ? 'media' : 'fuerte'
}

export function Workbench({ pedal }: WorkbenchProps) {
  const knobs = useApp((s) => s.knobs)
  const bypass = useApp((s) => s.bypass)
  const chordId = useApp((s) => s.chordId)
  const strength = useApp((s) => s.strength)
  const playing = useApp((s) => s.playing)
  const mode = useApp((s) => s.mode)
  const flipped = useApp((s) => s.flipped)
  const showTech = useApp((s) => s.showTech)
  const selectedRef = useApp((s) => s.selectedRef)
  const sandboxFault = useApp((s) => s.sandboxFault)
  const game = useApp((s) => s.game)
  const hoverStage = useApp((s) => s.hoverStage)
  const setKnob = useApp((s) => s.setKnob)
  const setBypass = useApp((s) => s.setBypass)
  const setChord = useApp((s) => s.setChord)
  const setStrength = useApp((s) => s.setStrength)
  const setPlaying = useApp((s) => s.setPlaying)
  const setMode = useApp((s) => s.setMode)
  const setFlipped = useApp((s) => s.setFlipped)
  const setShowTech = useApp((s) => s.setShowTech)
  const selectRef = useApp((s) => s.selectRef)
  const closePedal = useApp((s) => s.closePedal)
  const [error, setError] = useState<string | null>(null)
  const [focusStage, setFocusStage] = useState<string>(pedal.stages[0]?.id ?? '')

  const gameFault = getScenario(game.scenarioId).fault
  // Qué fallas tiene el pedal que suena ahora mismo.
  const faults: Fault[] = useMemo(() => {
    if (mode === 'juego') return game.compareHealthy ? [] : [gameFault]
    return sandboxFault ? [sandboxFault] : []
  }, [mode, game.compareHealthy, gameFault, sandboxFault])

  const effective = useMemo(() => applyFaults(pedal, faults), [pedal, faults])
  const blocks = useMemo(() => compilePedal(effective, knobs), [effective, knobs])
  // El gráfico solo se calcula si se muestran los detalles técnicos.
  const curve = useMemo(() => (showTech ? responseCurve(effective, knobs) : []), [showTech, effective, knobs])
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
  const focused = pedal.stages.find((s) => s.id === focusStage) ?? pedal.stages[0]

  return (
    <main className="page workbench">
      <header className="bar">
        <button className="link" onClick={closePedal}>
          ← Pedalera
        </button>
        <h1>{pedal.name}</h1>
        <div className="bar-right">
          <div className="modes" role="tablist" aria-label="Modo">
            <button role="tab" aria-selected={mode === 'taller'} className={mode === 'taller' ? 'mode on' : 'mode'} onClick={() => setMode('taller')}>
              Taller
            </button>
            <button role="tab" aria-selected={mode === 'juego'} className={mode === 'juego' ? 'mode on' : 'mode'} onClick={() => setMode('juego')}>
              Pedal roto
            </button>
          </div>
          <label className={showTech ? 'switch on' : 'switch'}>
            <input type="checkbox" checked={showTech} onChange={(e) => setShowTech(e.target.checked)} />
            <span className="switch-track" aria-hidden="true" />
            Detalles técnicos
          </label>
        </div>
      </header>

      <section className="gb-window" aria-label="Pedalboard">
        <div className="gb-titlebar">
          <button className={bypass ? 'power' : 'power on'} onClick={() => setBypass(!bypass)} aria-pressed={!bypass} aria-label={bypass ? 'Prender el pedal' : 'Apagar el pedal (bypass)'} title={bypass ? 'Pedal apagado: pasa la guitarra limpia' : 'Pedal prendido'}>
            ⏻
          </button>
          <span className="gb-title">Pedalboard</span>
          <div className="seg small" role="group" aria-label="Vista del pedal">
            <button aria-pressed={!flipped} onClick={() => setFlipped(false)}>
              Frente
            </button>
            <button aria-pressed={flipped} onClick={() => setFlipped(true)}>
              Placa
            </button>
          </div>
        </div>
        <div className="gb-body">
          <div className="gb-area">
            <PedalVisual
              pedal={pedal}
              knobs={knobs}
              bypass={bypass}
              flipped={flipped}
              selectedRef={selectedRef}
              activeStage={mode === 'taller' && flipped ? hoverStage : null}
              showValues={mode === 'taller' && showTech}
              highlightRef={gameOver ? gameFault.ref : null}
              onKnob={setKnob}
              onToggleBypass={() => setBypass(!bypass)}
              onSelect={selectRef}
            />
          </div>
          <PedalBrowser pedal={pedal} showPresets={mode === 'taller'} />
        </div>
      </section>

      <div className="columns">
        <div className="col">
          <section className="panel">
            <h2>Tocar</h2>
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
              Pegada de la guitarra: {showTech ? `${Math.round(strengthToPeakVolts(strength) * 1000)} mV de pico` : strengthWord(strength)}
              <input type="range" min={0} max={1} step={0.01} value={strength} onChange={(e) => setStrength(Number(e.target.value))} />
            </label>
            <button className="play" onClick={togglePlay}>
              {playing ? 'Parar' : 'Tocar acorde'}
            </button>
            {error && <p className="error">{error}</p>}
            {mode === 'taller' && (
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
            <h2>Espectro en vivo</h2>
            <Spectrum active={playing} />
            <p className="hint">Celeste: lo que entra al pedal. Verde: lo que sale. Cuando distorsiona, aparecen picos nuevos.</p>
          </section>
        </div>

        <div className="col">
          {mode === 'juego' ? (
            <Game pedal={pedal} />
          ) : (
            <>
              {flipped && (
                <section className="panel">
                  <h2>Componente</h2>
                  <ComponentInfo pedal={pedal} />
                </section>
              )}

              <section className="panel">
                <h2>El camino de la señal</h2>
                <SignalFlow pedal={pedal} playing={playing} focus={focused?.id ?? null} onPick={setFocusStage} />
                <p className="hint">Tocá un bloque para ver qué hace. Con el pedal dado vuelta, al pasar el mouse se iluminan sus componentes.</p>
                {!showTech && focused && <StageCard stage={focused} knobs={knobs} tech={false} />}
              </section>

              {showTech && (
                <section className="panel">
                  <h2>Respuesta en frecuencia</h2>
                  <ResponseChart curve={curve} markers={markers} />
                  <p className="hint">Es la respuesta para señales chicas: no incluye el recorte de los diodos, que es no lineal y agrega armónicas.</p>
                </section>
              )}

              {showTech && (
                <section className="panel">
                  <h2>Etapa por etapa, con las cuentas</h2>
                  <div className="chain">
                    {pedal.stages.map((stage, i) => (
                      <StageCard key={stage.id} stage={stage} knobs={knobs} tech defaultOpen={i === 0} />
                    ))}
                  </div>
                </section>
              )}

              {showTech && (
                <section className="panel">
                  <h2>Qué tan fiel es este modelo</h2>
                  <ul className="notes">
                    {pedal.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  )
}
