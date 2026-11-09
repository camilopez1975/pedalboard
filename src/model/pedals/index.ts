import type { PedalDef } from '../types.ts'
import { overdriveTS } from './tube-screamer.ts'

/** Pedales que todavía no están armados: aparecen en el selector como "Próximamente". */
const comingSoon = (id: string, name: string, subtitle: string, color: string): PedalDef => ({
  id,
  name,
  subtitle,
  color,
  available: false,
  knobs: [],
  stages: [],
  board: [],
  notes: [],
})

export const PEDALS: PedalDef[] = [
  overdriveTS,
  comingSoon('fuzz-bigmuff', 'Fuzz tipo Big Muff', 'Sustain largo y sonido espeso', '#9aa0a6'),
  comingSoon('fuzz-face', 'Fuzz tipo Fuzz Face', 'Fuzz de dos transistores, cálido y rasposo', '#c0392b'),
]

export function getPedal(id: string): PedalDef | undefined {
  return PEDALS.find((p) => p.id === id)
}

/** Posición inicial de las perillas de un pedal. */
export function defaultKnobs(pedal: PedalDef): Record<string, number> {
  return Object.fromEntries(pedal.knobs.map((k) => [k.id, k.default]))
}
