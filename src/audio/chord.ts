/**
 * Acorde de guitarra sintetizado con el algoritmo Karplus-Strong:
 * una ráfaga de ruido que da vueltas en una línea de retardo con un filtro pasa-bajos.
 * La longitud de la línea fija el tono; el filtro hace que los agudos se apaguen antes que los graves,
 * igual que una cuerda real. Sin samples, sin derechos de autor, todo calculado acá.
 *
 * Convención de escala: 1,0 digital = 1 V. La función devuelve la señal normalizada a pico 1;
 * el volumen real (la "pegada") se aplica después con strengthToPeakVolts().
 */

export interface Note {
  name: string
  /** Frecuencia en Hz. */
  freq: number
}

export interface ChordDef {
  id: string
  name: string
  notes: Note[]
}

export const CHORDS: ChordDef[] = [
  {
    id: 'e5',
    name: 'Mi5 (power chord)',
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'B2', freq: 123.47 },
      { name: 'E3', freq: 164.81 },
    ],
  },
  {
    id: 'e-major',
    name: 'Mi mayor (abierto)',
    notes: [
      { name: 'E2', freq: 82.41 },
      { name: 'B2', freq: 123.47 },
      { name: 'E3', freq: 164.81 },
      { name: 'G#3', freq: 207.65 },
      { name: 'B3', freq: 246.94 },
      { name: 'E4', freq: 329.63 },
    ],
  },
  {
    id: 'a-minor',
    name: 'La menor (abierto)',
    notes: [
      { name: 'A2', freq: 110.0 },
      { name: 'E3', freq: 164.81 },
      { name: 'A3', freq: 220.0 },
      { name: 'C4', freq: 261.63 },
      { name: 'E4', freq: 329.63 },
    ],
  },
  {
    id: 'e-note',
    name: 'Una sola nota (Mi grave)',
    notes: [{ name: 'E3', freq: 164.81 }],
  },
]

export function getChord(id: string): ChordDef {
  return CHORDS.find((c) => c.id === id) ?? CHORDS[0]
}

/** "Pegada" (0 a 1) → tensión pico de la guitarra en V. 0 = muy suave (≈ 50 mV), 1 = fuerte (≈ 500 mV). */
export function strengthToPeakVolts(strength: number): number {
  const s = Math.min(1, Math.max(0, strength))
  return 0.05 + 0.45 * s
}

/** Generador pseudoaleatorio con semilla: el acorde suena siempre igual. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const T60_SECONDS = 2.5 // tiempo que tarda la cuerda en caer 60 dB

/** Una cuerda pulsada. Devuelve `length` muestras con pico aproximado 1. */
function pluckString(freq: number, fs: number, length: number, rand: () => number) {
  const period = fs / freq
  // Lazo: línea de retardo (N) + promedio de dos muestras (0,5) + pasa-todo fraccionario (frac).
  const N = Math.floor(period - 1)
  const frac = period - 0.5 - N // entre 0,5 y 1,5
  const C = (1 - frac) / (1 + frac)
  const rho = 10 ** (-3 / (T60_SECONDS * freq)) // pérdida por vuelta para lograr T60

  // Excitación: ruido suavizado (pulsación) con un "peine" que imita la posición de la púa.
  const noise = new Float32Array(N)
  let smooth = 0
  for (let i = 0; i < N; i++) {
    smooth = 0.7 * (rand() * 2 - 1) + 0.3 * smooth
    noise[i] = smooth
  }
  const pick = Math.max(1, Math.floor(N * 0.18))
  const line = new Float32Array(N)
  let mean = 0
  for (let i = 0; i < N; i++) {
    line[i] = noise[i] - noise[(i + pick) % N]
    mean += line[i]
  }
  mean /= N
  let energy = 0
  for (let i = 0; i < N; i++) {
    line[i] -= mean // sin componente continua
    energy += line[i] * line[i]
  }
  const rms = Math.sqrt(energy / N) || 1
  for (let i = 0; i < N; i++) line[i] /= rms * 3 // todas las cuerdas con energía parecida

  const out = new Float32Array(length)
  let idx = 0
  let prev = 0
  let apX1 = 0
  let apY1 = 0
  for (let n = 0; n < length; n++) {
    const x = line[idx]
    const lp = rho * 0.5 * (x + prev)
    prev = x
    const ap = C * lp + apX1 - C * apY1
    apX1 = lp
    apY1 = ap
    line[idx] = ap
    out[n] = x
    idx = idx + 1 === N ? 0 : idx + 1
  }
  return out
}

/**
 * Sintetiza el acorde: las cuerdas entran de la más grave a la más aguda con `strumMs` ms entre cada una
 * (rasguido). Devuelve la señal normalizada a pico 1, con un fundido final para poder repetirla en bucle.
 */
export function synthesizeChord(chord: ChordDef, sampleRate: number, seconds = 3.2, strumMs = 14): Float32Array {
  const length = Math.round(seconds * sampleRate)
  const mix = new Float32Array(length)
  const rand = mulberry32(1234)
  chord.notes.forEach((note, i) => {
    const offset = Math.round(((i * strumMs) / 1000) * sampleRate)
    const string = pluckString(note.freq, sampleRate, length - offset, rand)
    for (let n = 0; n < string.length; n++) mix[offset + n] += string[n]
  })

  // Fundido final (0,4 s) para que el bucle no haga "click".
  const fade = Math.round(0.4 * sampleRate)
  for (let n = 0; n < fade; n++) {
    const g = 0.5 * (1 + Math.cos((Math.PI * n) / fade))
    mix[length - fade + n] *= g
  }

  let peak = 0
  for (let n = 0; n < length; n++) peak = Math.max(peak, Math.abs(mix[n]))
  if (peak > 0) for (let n = 0; n < length; n++) mix[n] /= peak
  return mix
}
