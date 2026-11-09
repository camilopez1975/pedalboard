import { num, si } from './format.ts'
import type { BoardComponent, Fault, PedalDef, StageDef } from './types.ts'

function stageOf(pedal: PedalDef, comp: BoardComponent): StageDef | undefined {
  return pedal.stages.find((s) => s.id === comp.stageId)
}

/** Valor nominal de un componente (Ω o F; para un diodo, su corriente de saturación en A). */
export function componentValue(pedal: PedalDef, comp: BoardComponent): number | undefined {
  const stage = stageOf(pedal, comp)
  if (!stage) return undefined
  switch (comp.param) {
    case 'rg':
    case 'cg':
    case 'rf':
    case 'cf':
    case 'd1':
    case 'd2':
    case 'driveMax':
      if (stage.type !== 'opamp-diode-clipper') return undefined
      return {
        rg: stage.rg,
        cg: stage.cg,
        rf: stage.rf,
        cf: stage.cf,
        d1: stage.diode.isD1,
        d2: stage.diode.isD2,
        driveMax: stage.rfPot.max,
      }[comp.param]
    case 'r7':
    case 'rBias':
    case 'c5':
    case 'r8':
    case 'c6':
    case 'rFeedback':
    case 'toneMax':
      if (stage.type !== 'ts-tone') return undefined
      return {
        r7: stage.r7,
        rBias: stage.rBias,
        c5: stage.c5,
        r8: stage.r8,
        c6: stage.c6,
        rFeedback: stage.rFeedback,
        toneMax: stage.potTotal,
      }[comp.param]
    case 'levelMax':
      return stage.type === 'output-level' ? stage.potTotal : undefined
    default:
      return undefined
  }
}

/** Texto corto del valor nominal: "4,7 kΩ", "47 nF", "1N914"… */
export function componentLabel(pedal: PedalDef, comp: BoardComponent): string {
  if (comp.kind === 'opamp') return 'JRC4558'
  if (comp.kind === 'diode') return '1N914'
  const v = componentValue(pedal, comp)
  if (v === undefined) return ''
  return comp.kind === 'capacitor' ? si(v, 'F') : si(v, 'Ω')
}

/** Copia del pedal con las fallas aplicadas a los componentes. El pedal original no se modifica. */
export function applyFaults(pedal: PedalDef, faults: Fault[]): PedalDef {
  if (faults.length === 0) return pedal
  const stages = pedal.stages.map((s) => ({ ...s })) as StageDef[]
  const byId = (id: string | undefined) => stages.find((s) => s.id === id)

  for (const fault of faults) {
    const comp = pedal.board.find((c) => c.ref === fault.ref)
    if (!comp) continue
    const stage = byId(comp.stageId)
    if (!stage) continue
    const open = fault.mode === 'open'
    const R = (v: number) => (open ? v * 1e9 : Math.max(0.01, v * 1e-6)) // resistencia: abierta ≈ ∞, en corto ≈ 0
    const C = (v: number) => (open ? v * 1e-6 : v * 1e6) // capacitor: abierto ≈ 0 F, en corto ≈ ∞ F

    if (stage.type === 'opamp-diode-clipper') {
      switch (comp.param) {
        case 'rg':
          stage.rg = R(stage.rg)
          break
        case 'cg':
          stage.cg = C(stage.cg)
          break
        case 'rf':
          stage.rf = R(stage.rf)
          break
        case 'cf':
          stage.cf = C(stage.cf)
          break
        case 'd1':
        case 'd2': {
          const d = { ...stage.diode }
          if (open) {
            if (comp.param === 'd1') d.isD1 = 0
            else d.isD2 = 0
          } else {
            d.isD1 = 1 // un diodo en corto pone en corto a todo el par
            d.isD2 = 1
          }
          stage.diode = d
          break
        }
        default:
          break
      }
    } else if (stage.type === 'ts-tone') {
      switch (comp.param) {
        case 'r7':
          stage.r7 = R(stage.r7)
          break
        case 'rBias':
          stage.rBias = R(stage.rBias)
          break
        case 'c5':
          stage.c5 = C(stage.c5)
          break
        case 'r8':
          stage.r8 = R(stage.r8)
          break
        case 'c6':
          stage.c6 = C(stage.c6)
          break
        case 'rFeedback':
          stage.rFeedback = R(stage.rFeedback)
          break
        default:
          break
      }
    } else if (comp.param === 'levelMax' && open) {
      stage.maxGain = 0 // cursor desconectado: no llega señal a la salida
    }
  }
  return { ...pedal, stages }
}

/** Número entre 0 y 1 que depende solo del texto: sirve para que las mediciones tengan una tolerancia fija. */
function hash01(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return ((h >>> 0) % 10000) / 10000
}

/**
 * Lo que mostraría el multímetro con el componente fuera de la placa.
 * Los componentes sanos miden su valor con una tolerancia fija (1 % las resistencias, 5 % los capacitores).
 */
export function measure(pedal: PedalDef, faults: Fault[], comp: BoardComponent): string {
  const fault = faults.find((f) => f.ref === comp.ref)
  const nominal = componentValue(pedal, comp)
  const jitter = (tol: number) => 1 + tol * (hash01(comp.ref) * 2 - 1)

  switch (comp.kind) {
    case 'resistor':
    case 'pot': {
      if (fault?.mode === 'open') return 'OL (circuito abierto)'
      if (fault?.mode === 'short') return '0,0 Ω'
      return nominal === undefined ? '—' : si(nominal * jitter(comp.kind === 'pot' ? 0.1 : 0.01), 'Ω')
    }
    case 'capacitor': {
      if (fault?.mode === 'open') return '≈ 0 pF (no almacena carga)'
      if (fault?.mode === 'short') return '0,0 Ω (en corto)'
      return nominal === undefined ? '—' : si(nominal * jitter(0.05), 'F')
    }
    case 'diode': {
      if (fault?.mode === 'open') return 'OL (no conduce)'
      if (fault?.mode === 'short') return '0,000 V (en corto)'
      return `${num(0.55 + 0.06 * hash01(comp.ref), 3)} V (prueba de diodo)`
    }
    case 'opamp':
      return 'No se mide con el multímetro'
  }
}

export type BandColor = 'black' | 'brown' | 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'violet' | 'grey' | 'white' | 'gold' | 'silver'

const DIGIT_COLORS: BandColor[] = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white']

/**
 * Código de colores de una resistencia de 4 bandas: dígito, dígito, multiplicador y tolerancia (dorado = 5 %).
 * Ejemplo: 4,7 kΩ → amarillo, violeta, rojo, dorado (47 × 10² Ω).
 */
export function resistorBands(ohms: number): BandColor[] {
  if (!(ohms > 0)) return ['black', 'black', 'black', 'gold']
  let exp = Math.floor(Math.log10(ohms)) - 1
  let digits = Math.round(ohms / 10 ** exp)
  if (digits >= 100) {
    digits = Math.round(digits / 10)
    exp += 1
  }
  const mult: BandColor = exp === -1 ? 'gold' : exp === -2 ? 'silver' : DIGIT_COLORS[Math.min(9, Math.max(0, exp))]
  return [DIGIT_COLORS[Math.floor(digits / 10)], DIGIT_COLORS[digits % 10], mult, 'gold']
}
