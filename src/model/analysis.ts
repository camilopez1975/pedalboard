import type { ClipperStage, Knobs, OutputLevelStage, PedalDef, PotRef, StageDef, ToneStage } from './types.ts'

const TWO_PI = 2 * Math.PI
/** Tensión térmica a ~25 °C, en V. */
export const THERMAL_VOLTAGE = 0.02585

/** Posición de una perilla, acotada a [0, 1]. Si no existe, 0. */
export function knobPosition(knobs: Knobs, id: string): number {
  const v = knobs[id]
  if (v === undefined || Number.isNaN(v)) return 0
  return Math.min(1, Math.max(0, v))
}

/** Resistencia que un potenciómetro mete en el circuito, en Ω. */
export function potResistance(pot: PotRef, knobs: Knobs): number {
  const pos = knobPosition(knobs, pot.knob)
  return pot.max * (pot.taper === 'log' ? pos * pos : pos)
}

// --- Etapa de ganancia con diodos -----------------------------------------------------------

export interface ClipperValues {
  /** Rf total (fija + potenciómetro), en Ω. */
  rf: number
  /** Ganancia que se SUMA al camino directo: Rf / Rg. */
  gainB: number
  /** Ganancia total en medios y agudos, sin contar los diodos: 1 + Rf / Rg. */
  gainTotal: number
  /** Frecuencia del pasa-altos de Rg·Cg, en Hz. */
  fcHp: number
  /** Frecuencia del pasa-bajos de Rf·Cf, en Hz. */
  fcLp: number
  /** n · Vt de los diodos, en V. */
  nVt: number
  /** Conductancia de pequeña señal de los diodos, en S. */
  diodeConductance: number
}

export function clipperValues(stage: ClipperStage, knobs: Knobs): ClipperValues {
  const rf = stage.rf + potResistance(stage.rfPot, knobs)
  const gainB = rf / stage.rg
  const nVt = stage.diode.n * THERMAL_VOLTAGE
  return {
    rf,
    gainB,
    gainTotal: 1 + gainB,
    fcHp: 1 / (TWO_PI * stage.rg * stage.cg),
    fcLp: 1 / (TWO_PI * rf * stage.cf),
    nVt,
    diodeConductance: (stage.diode.isD1 + stage.diode.isD2) / nVt,
  }
}

// --- Etapa de tono --------------------------------------------------------------------------

/** Función de transferencia analógica H(s) = (b2·s² + b1·s + b0) / (a2·s² + a1·s + a0). */
export interface AnalogBiquad {
  b0: number
  b1: number
  b2: number
  a0: number
  a1: number
  a2: number
}

/**
 * Función de transferencia de la etapa de tono con el potenciómetro en la posición dada.
 * Se obtiene resolviendo el circuito (ver explicación en types.ts) y simplificando el factor común:
 *   Rpa = resistencia del potenciómetro del lado del pasa-bajos (sube con Tone)
 *   Rpn = resistencia del lado de la entrada inversora (baja con Tone) + la fija
 *   G = 1/Rpa + 1/Rpn,  c = C6·(1 + G·R8),  k = Rf/Rpn,  R = bias, Rb = R7
 */
export function toneNetwork(stage: ToneStage, knobs: Knobs): AnalogBiquad {
  const x = knobPosition(knobs, stage.potKnob)
  const rpa = Math.max(1, x * stage.potTotal)
  const rpn = stage.rFixedN + Math.max(1, (1 - x) * stage.potTotal)
  const { r7, rBias: rb, c5, r8, c6 } = stage
  const g = 1 / rpa + 1 / rpn
  const c = c6 * (1 + g * r8)
  const k = stage.rFeedback / rpn
  return {
    b0: rb * rpa * g,
    b1: rb * rpa * (c + k * c6),
    b2: 0,
    a0: rpa * g * (rb + r7),
    a1: rpa * (c * (rb + r7) + g * rb * r7 * c5) + r7 * rb * c6,
    a2: rpa * c * rb * r7 * c5,
  }
}

export function levelValues(stage: OutputLevelStage, knobs: Knobs): { pos: number; gain: number } {
  const pos = knobPosition(knobs, stage.knob)
  return { pos, gain: stage.maxGain * (stage.taper === 'log' ? pos * pos : pos) }
}

// --- Respuesta en frecuencia (señal chica, o sea, linealizada) -------------------------------

export interface Complex {
  re: number
  im: number
}

const ONE: Complex = { re: 1, im: 0 }
export const cMul = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re })
export const cDiv = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d }
}
const cAdd = (a: Complex, b: Complex): Complex => ({ re: a.re + b.re, im: a.im + b.im })
const cScale = (a: Complex, k: number): Complex => ({ re: a.re * k, im: a.im * k })

/** H(jω) de un polinomio analógico de 2.º orden. */
export function evalAnalogBiquad(p: AnalogBiquad, f: number): Complex {
  const w = TWO_PI * f
  return cDiv({ re: p.b0 - p.b2 * w * w, im: p.b1 * w }, { re: p.a0 - p.a2 * w * w, im: p.a1 * w })
}

/** Respuesta compleja de una etapa a la frecuencia f (Hz). El recorte se linealiza (señal chica). */
export function stageResponse(stage: StageDef, knobs: Knobs, f: number): Complex {
  const w = TWO_PI * f
  switch (stage.type) {
    case 'opamp-diode-clipper': {
      const v = clipperValues(stage, knobs)
      // H = 1 + Zf/Zg,  Zf = 1 / (1/Rf + gd + jwCf),  1/Zg = jwCg / (1 + jwRgCg)
      const zf = cDiv(ONE, { re: 1 / v.rf + v.diodeConductance, im: w * stage.cf })
      const invZg = cDiv({ re: 0, im: w * stage.cg }, { re: 1, im: w * stage.rg * stage.cg })
      return cAdd(ONE, cMul(zf, invZg))
    }
    case 'ts-tone':
      return evalAnalogBiquad(toneNetwork(stage, knobs), f)
    case 'output-level':
      return cScale(ONE, levelValues(stage, knobs).gain)
  }
}

export interface ResponsePoint {
  f: number
  db: number
}

/** Respuesta total del pedal en dB, con las frecuencias espaciadas en escala logarítmica. */
export function responseCurve(pedal: PedalDef, knobs: Knobs, points = 240, fMin = 20, fMax = 20000): ResponsePoint[] {
  const out: ResponsePoint[] = []
  for (let i = 0; i < points; i++) {
    const f = fMin * (fMax / fMin) ** (i / (points - 1))
    let h = ONE
    for (const stage of pedal.stages) h = cMul(h, stageResponse(stage, knobs, f))
    const mag = Math.hypot(h.re, h.im)
    out.push({ f, db: Math.max(-80, 20 * Math.log10(Math.max(mag, 1e-9))) })
  }
  return out
}
