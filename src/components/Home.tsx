import { Fragment } from 'react'
import type { KeyboardEvent } from 'react'
import { PEDALS } from '../model/pedals/index.ts'
import { useApp } from '../store.ts'
import { PedalFace } from './PedalFace.tsx'

const CABLE_COLORS = ['#ffb703', '#ff4d6d', '#2ec4ff', '#9b5de5', '#06d6a0']

/** Cable de parche entre dos pedales: dos fichas y un tramo con caída. */
function Cable({ color }: { color: string }) {
  return (
    <svg className="cable" viewBox="0 0 80 40" aria-hidden="true">
      <path d="M12 20 C 24 46, 56 46, 68 20" fill="none" stroke="rgba(0,0,0,0.45)" strokeWidth="6" strokeLinecap="round" transform="translate(0 3)" />
      <path d="M12 20 C 24 46, 56 46, 68 20" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <path d="M13 19 C 25 43, 55 43, 67 19" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" />
      {[0, 1].map((i) => (
        <g key={i} transform={i === 0 ? '' : 'translate(80 0) scale(-1 1)'}>
          <rect x="0" y="14" width="14" height="12" rx="2" fill="#2a2c31" />
          <rect x="-4" y="16" width="6" height="8" rx="1.5" fill="#c9ccd1" />
        </g>
      ))}
    </svg>
  )
}

function Jack({ label }: { label: string }) {
  return (
    <div className="pbd-end">
      <div className="end-jack" aria-hidden="true" />
      <span>{label}</span>
    </div>
  )
}

/** Pantalla de inicio: una pedalera con los pedales cableados; se elige uno tocándolo. */
export function Home() {
  const openPedal = useApp((s) => s.openPedal)
  const decor = useApp((s) => s.decor)

  return (
    <main className="page home">
      <header className="hero">
        <h1>
          Armá tu <span className="grad">pedal</span>
        </h1>
        <p>Elegí un pedal de tu pedalera, girá las perillas, escuchalo en vivo y descubrí qué pasa adentro. Después decoralo a tu gusto.</p>
      </header>

      <section className="pbd" aria-label="Pedalera">
        <div className="pbd-surface">
          <div className="pbd-scroll">
            <div className="pbd-row">
              <Jack label="Guitarra" />
              <Cable color={CABLE_COLORS[0]} />
              {PEDALS.map((pedal, i) => {
                const open = () => pedal.available && openPedal(pedal.id)
                const key = (e: KeyboardEvent<HTMLDivElement>) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    open()
                  }
                }
                return (
                  <Fragment key={pedal.id}>
                    {i > 0 && <Cable color={CABLE_COLORS[i % CABLE_COLORS.length]} />}
                    <div className={pedal.available ? 'board-pedal' : 'board-pedal soon'} onClick={open} onKeyDown={key} role="button" tabIndex={pedal.available ? 0 : -1} aria-disabled={!pedal.available} aria-label={pedal.available ? `Abrir ${pedal.name}` : `${pedal.name}: próximamente`}>
                      <div className={`pedal-box shape-${pedal.look.shape}`}>
                        <PedalFace pedal={pedal} decor={decor[pedal.id]} bypass={false} interactive={false} />
                        {!pedal.available && <span className="ribbon">Próximamente</span>}
                      </div>
                      <div className="board-label">
                        <strong>{pedal.name}</strong>
                        <span>{pedal.available ? pedal.subtitle : 'En camino'}</span>
                      </div>
                    </div>
                  </Fragment>
                )
              })}
              <Cable color={CABLE_COLORS[3]} />
              <Jack label="Ampli" />
            </div>
          </div>
        </div>
        <div className="pbd-rail" aria-hidden="true" />
      </section>
      <p className="hint center">Tocá el Tube Screamer para empezar. El Big Muff y el Fuzz Face vienen después.</p>
    </main>
  )
}
