import type { PedalDef, PedalLook } from '../types.ts'
import { overdriveTS } from './tube-screamer.ts'

/** Pedales que todavía no están armados: aparecen en el selector como "Próximamente". */
const comingSoon = (id: string, name: string, subtitle: string, look: PedalLook): PedalDef => ({
  id,
  name,
  subtitle,
  color: look.body,
  look,
  available: false,
  knobs: [],
  stages: [],
  board: [],
  notes: [],
})

export const PEDALS: PedalDef[] = [
  overdriveTS,
  comingSoon('fuzz-bigmuff', 'Fuzz tipo Big Muff', 'Sustain largo y sonido espeso', {
    shape: 'box',
    body: '#d8dde6',
    finish: 'metalico',
    knobStyle: 'negra',
    ledColor: '#ff2a2a',
    textColor: '#1a1d24',
    title: 'Big Fuzz',
    subtitle: 'Sustainer',
    knobLabels: ['Volume', 'Tone', 'Sustain'],
  }),
  comingSoon('fuzz-face', 'Fuzz tipo Fuzz Face', 'Fuzz de dos transistores, cálido y rasposo', {
    shape: 'round',
    body: '#e63946',
    finish: 'esmalte',
    knobStyle: 'blanca',
    ledColor: '#ff2a2a',
    textColor: '#fff4f4',
    title: 'Cara Fuzz',
    subtitle: 'Fuzz',
    knobLabels: ['Volume', 'Fuzz'],
  }),
]

export function getPedal(id: string): PedalDef | undefined {
  return PEDALS.find((p) => p.id === id)
}

/** Posición inicial de las perillas de un pedal. */
export function defaultKnobs(pedal: PedalDef): Record<string, number> {
  return Object.fromEntries(pedal.knobs.map((k) => [k.id, k.default]))
}
