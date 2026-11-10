import { PEDALS, defaultKnobs } from '../model/pedals/index.ts'
import type { Knobs, PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'
import { PedalFace } from './PedalFace.tsx'

let tween = 0

/** Lleva las perillas a los valores dados con un movimiento suave (así se ve y se escucha el cambio, sin saltos). */
function animateKnobs(from: Knobs, to: Knobs, set: (k: Knobs) => void, ms = 450) {
  cancelAnimationFrame(tween)
  const start = performance.now()
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / ms)
    const e = t * t * (3 - 2 * t)
    const next: Knobs = { ...to }
    for (const id of Object.keys(to)) next[id] = (from[id] ?? to[id]) + (to[id] - (from[id] ?? to[id])) * e
    set(next)
    if (t < 1) tween = requestAnimationFrame(step)
  }
  tween = requestAnimationFrame(step)
}

const sameKnobs = (a: Knobs, b: Knobs) => Object.keys(b).every((id) => Math.abs((a[id] ?? -1) - b[id]) < 0.02)

interface PedalBrowserProps {
  pedal: PedalDef
  /** Mostrar los ajustes de perillas (en el juego se ocultan). */
  showPresets: boolean
}

/** Columna de la derecha de la ventana Pedalboard: los pedales disponibles y los ajustes sugeridos. */
export function PedalBrowser({ pedal, showPresets }: PedalBrowserProps) {
  const openPedal = useApp((s) => s.openPedal)
  const knobs = useApp((s) => s.knobs)
  const setKnobs = useApp((s) => s.setKnobs)
  const labelOf = (id: string) => pedal.knobs.find((k) => k.id === id)?.label ?? id
  const factory = defaultKnobs(pedal)

  return (
    <aside className="gb-browser" aria-label="Pedales y ajustes">
      <div className="gb-browser-head">Pedales</div>
      <div className="thumb-grid">
        {PEDALS.map((p) => (
          <button key={p.id} className={`thumb${p.id === pedal.id ? ' on' : ''}`} disabled={!p.available} onClick={() => openPedal(p.id)} aria-label={p.available ? `Abrir ${p.name}` : `${p.name}: próximamente`}>
            <span className={`thumb-box shape-${p.look.shape}`}>
              <span className="thumb-scale">
                <PedalFace pedal={p} bypass={false} interactive={false} />
              </span>
            </span>
            <span className="thumb-name">{p.look.title}</span>
            {!p.available && <span className="thumb-soon">Pronto</span>}
          </button>
        ))}
      </div>

      {showPresets && <div className="gb-browser-head">Ajustes</div>}
      {showPresets && (
      <div className="presets">
        <button className={sameKnobs(knobs, factory) ? 'preset on' : 'preset'} onClick={() => animateKnobs(knobs, factory, setKnobs)}>
          <strong>De fábrica</strong>
          <span>Todo a la mitad (Level un poco más arriba)</span>
        </button>
        {(pedal.presets ?? []).map((pr) => {
          const active = sameKnobs(knobs, pr.knobs)
          return (
            <div key={pr.id} className={active ? 'preset on' : 'preset'}>
              <button className="preset-main" onClick={() => animateKnobs(knobs, pr.knobs, setKnobs)}>
                <strong>{pr.name}</strong>
                <span>{Object.entries(pr.clock).map(([id, v]) => `${labelOf(id)} ${v}`).join(' · ')}</span>
              </button>
              <p>{pr.note}</p>
              <details>
                <summary>De dónde sale</summary>
                <p>{pr.detail}</p>
              </details>
            </div>
          )
        })}
      </div>
      )}
    </aside>
  )
}
