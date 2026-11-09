import { PEDALS } from '../model/pedals/index.ts'
import { useApp } from '../store.ts'

export function PedalPicker() {
  const openPedal = useApp((s) => s.openPedal)
  return (
    <main className="page">
      <header className="hero">
        <h1>Armá tu pedal</h1>
        <p>
          Elegí un pedal, girá las perillas y escuchá cómo cambia el sonido mientras ves qué hace cada parte del circuito.
        </p>
      </header>
      <section className="picker">
        {PEDALS.map((pedal) => (
          <button
            key={pedal.id}
            className="pedal-card"
            disabled={!pedal.available}
            onClick={() => openPedal(pedal.id)}
            style={{ borderColor: pedal.color }}
          >
            <span className="pedal-card-swatch" style={{ background: pedal.color }} />
            <span className="pedal-card-name">{pedal.name}</span>
            <span className="pedal-card-sub">{pedal.subtitle}</span>
            <span className="pedal-card-tag">{pedal.available ? 'Abrir' : 'Próximamente'}</span>
          </button>
        ))}
      </section>
    </main>
  )
}
