import type { ResponsePoint } from '../model/analysis.ts'

interface Marker {
  f: number
  label: string
}

interface ResponseChartProps {
  curve: ResponsePoint[]
  markers?: Marker[]
}

const W = 640
const H = 300
const M = { l: 48, r: 16, t: 16, b: 34 }
const F_MIN = 20
const F_MAX = 20000
const F_TICKS: [number, string][] = [
  [20, '20'],
  [50, '50'],
  [100, '100'],
  [200, '200'],
  [500, '500'],
  [1000, '1k'],
  [2000, '2k'],
  [5000, '5k'],
  [10000, '10k'],
  [20000, '20k'],
]

const xOf = (f: number) => M.l + (Math.log10(f / F_MIN) / Math.log10(F_MAX / F_MIN)) * (W - M.l - M.r)

/** Respuesta en frecuencia del pedal (ganancia en dB vs. frecuencia, escala logarítmica). */
export function ResponseChart({ curve, markers = [] }: ResponseChartProps) {
  const dbs = curve.map((p) => p.db)
  const lo = Math.floor(Math.min(...dbs) / 10) * 10
  let hi = Math.ceil(Math.max(...dbs) / 10) * 10
  if (hi - lo < 40) hi = lo + 40
  const yOf = (db: number) => M.t + ((hi - db) / (hi - lo)) * (H - M.t - M.b)
  const path = curve.map((p, i) => `${i === 0 ? 'M' : 'L'}${xOf(p.f).toFixed(1)},${yOf(p.db).toFixed(1)}`).join(' ')

  const gridDb: number[] = []
  for (let db = lo; db <= hi; db += 10) gridDb.push(db)

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Respuesta en frecuencia del pedal">
      {gridDb.map((db) => (
        <g key={db}>
          <line x1={M.l} x2={W - M.r} y1={yOf(db)} y2={yOf(db)} className="chart-grid" />
          <text x={M.l - 6} y={yOf(db) + 4} className="chart-label" textAnchor="end">
            {db}
          </text>
        </g>
      ))}
      {F_TICKS.map(([f, label]) => (
        <g key={f}>
          <line x1={xOf(f)} x2={xOf(f)} y1={M.t} y2={H - M.b} className="chart-grid" />
          <text x={xOf(f)} y={H - M.b + 16} className="chart-label" textAnchor="middle">
            {label}
          </text>
        </g>
      ))}
      {markers
        .filter((m) => m.f >= F_MIN && m.f <= F_MAX)
        .map((m) => (
          <g key={m.label}>
            <line x1={xOf(m.f)} x2={xOf(m.f)} y1={M.t} y2={H - M.b} className="chart-marker" />
            <text x={xOf(m.f) + 4} y={M.t + 12} className="chart-marker-label">
              {m.label}
            </text>
          </g>
        ))}
      <path d={path} className="chart-line" />
      <text x={M.l} y={H - 4} className="chart-label">
        Frecuencia (Hz)
      </text>
      <text x={W - M.r} y={H - 4} className="chart-label" textAnchor="end">
        Ganancia (dB)
      </text>
    </svg>
  )
}
