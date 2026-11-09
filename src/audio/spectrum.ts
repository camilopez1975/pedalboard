/**
 * Dibujo del analizador de espectro (frecuencia en escala logarítmica, nivel en dB).
 * Es una función pura sobre un contexto 2D, así que también se puede probar fuera de la app.
 */

export const SPEC_F_MIN = 20
export const SPEC_F_MAX = 20000
export const SPEC_DB_MIN = -100
export const SPEC_DB_MAX = -10

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

export interface SpectrumFrame {
  /** Espectro de la señal que entra al pedal, en dB por bin (o null si no hay). */
  input: Float32Array | null
  /** Espectro de la señal que sale del pedal. */
  output: Float32Array | null
  sampleRate: number
}

const M = { l: 40, r: 10, t: 10, b: 24 }

/** Para cada columna de píxeles, el máximo de los bins de ese tramo de frecuencias. */
function columnPeaks(spectrum: Float32Array, sampleRate: number, columns: number): Float32Array {
  const out = new Float32Array(columns)
  const binHz = sampleRate / 2 / spectrum.length
  for (let c = 0; c < columns; c++) {
    const f0 = SPEC_F_MIN * (SPEC_F_MAX / SPEC_F_MIN) ** (c / columns)
    const f1 = SPEC_F_MIN * (SPEC_F_MAX / SPEC_F_MIN) ** ((c + 1) / columns)
    const b0 = Math.max(0, Math.floor(f0 / binHz))
    const b1 = Math.min(spectrum.length - 1, Math.max(b0, Math.ceil(f1 / binHz)))
    let peak = -Infinity
    for (let b = b0; b <= b1; b++) if (spectrum[b] > peak) peak = spectrum[b]
    out[c] = peak
  }
  return out
}

/** Frecuencia y nivel del pico más alto del espectro (por encima de 40 Hz). */
export function dominantPeak(spectrum: Float32Array, sampleRate: number): { f: number; db: number } | null {
  const binHz = sampleRate / 2 / spectrum.length
  let best = -1
  let bestDb = -Infinity
  for (let b = Math.ceil(40 / binHz); b < spectrum.length; b++) {
    if (spectrum[b] > bestDb) {
      bestDb = spectrum[b]
      best = b
    }
  }
  return best < 0 || bestDb < SPEC_DB_MIN ? null : { f: best * binHz, db: bestDb }
}

export function drawSpectrum(g: CanvasRenderingContext2D, width: number, height: number, frame: SpectrumFrame | null, text: string): void {
  const plotW = width - M.l - M.r
  const plotH = height - M.t - M.b
  const xOf = (f: number) => M.l + (Math.log10(f / SPEC_F_MIN) / Math.log10(SPEC_F_MAX / SPEC_F_MIN)) * plotW
  const yOf = (db: number) => M.t + ((SPEC_DB_MAX - Math.min(SPEC_DB_MAX, Math.max(SPEC_DB_MIN, db))) / (SPEC_DB_MAX - SPEC_DB_MIN)) * plotH

  g.clearRect(0, 0, width, height)
  g.fillStyle = '#12151a'
  g.fillRect(0, 0, width, height)

  g.font = '11px system-ui, sans-serif'
  g.lineWidth = 1
  g.strokeStyle = '#2c313a'
  g.fillStyle = '#8a919b'
  g.textAlign = 'right'
  for (let db = SPEC_DB_MIN; db <= SPEC_DB_MAX; db += 20) {
    g.beginPath()
    g.moveTo(M.l, yOf(db))
    g.lineTo(width - M.r, yOf(db))
    g.stroke()
    g.fillText(String(db), M.l - 5, yOf(db) + 4)
  }
  g.textAlign = 'center'
  for (const [f, label] of F_TICKS) {
    g.beginPath()
    g.moveTo(xOf(f), M.t)
    g.lineTo(xOf(f), M.t + plotH)
    g.stroke()
    g.fillText(label, xOf(f), height - 8)
  }

  if (frame) {
    const columns = Math.max(1, Math.floor(plotW))
    if (frame.input) {
      const peaks = columnPeaks(frame.input, frame.sampleRate, columns)
      g.beginPath()
      for (let c = 0; c < columns; c++) {
        const x = M.l + c + 0.5
        if (c === 0) g.moveTo(x, yOf(peaks[c]))
        else g.lineTo(x, yOf(peaks[c]))
      }
      g.strokeStyle = '#8a919b'
      g.lineWidth = 1.5
      g.stroke()
    }
    if (frame.output) {
      const peaks = columnPeaks(frame.output, frame.sampleRate, columns)
      const gradient = g.createLinearGradient(0, M.t, 0, M.t + plotH)
      gradient.addColorStop(0, 'rgba(90,209,127,0.75)')
      gradient.addColorStop(1, 'rgba(90,209,127,0.05)')
      g.beginPath()
      g.moveTo(M.l, M.t + plotH)
      for (let c = 0; c < columns; c++) g.lineTo(M.l + c + 0.5, yOf(peaks[c]))
      g.lineTo(M.l + columns, M.t + plotH)
      g.closePath()
      g.fillStyle = gradient
      g.fill()
      g.beginPath()
      for (let c = 0; c < columns; c++) {
        const x = M.l + c + 0.5
        if (c === 0) g.moveTo(x, yOf(peaks[c]))
        else g.lineTo(x, yOf(peaks[c]))
      }
      g.strokeStyle = '#5ad17f'
      g.lineWidth = 1.5
      g.stroke()
    }
  }

  g.textAlign = 'left'
  g.fillStyle = '#c4cad2'
  g.fillText(text, M.l + 6, M.t + 14)
  g.fillStyle = '#8a919b'
  g.fillRect(width - 190, M.t + 6, 14, 3)
  g.fillText('entra', width - 172, M.t + 11)
  g.fillStyle = '#5ad17f'
  g.fillRect(width - 120, M.t + 6, 14, 3)
  g.fillText('sale del pedal', width - 102, M.t + 11)
}
