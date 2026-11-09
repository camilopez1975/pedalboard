import { clipperValues, levelValues, toneNetwork } from './analysis.ts'
import type { Knobs, PedalDef } from './types.ts'

/**
 * Bloques que entiende el procesador de audio (public/worklets/pedal-processor.js).
 * El procesador no sabe nada de pedales: solo ejecuta esta lista en orden.
 */
export type DspBlock =
  /**
   * Operacional con diodos en la realimentación. Resuelve el circuito muestra a muestra:
   * la corriente por Rg (pasa-altos de la entrada) circula por Rf ‖ Cf ‖ diodos y Vout = Vin + Vf.
   */
  | { kind: 'opamp-diode'; rg: number; cg: number; rf: number; cf: number; isPos: number; isNeg: number; nVt: number; rail: number }
  /** Filtro lineal de 2.º orden dado por su función de transferencia analógica. */
  | { kind: 'analog2'; b0: number; b1: number; b2: number; a0: number; a1: number; a2: number }
  /** Ganancia simple. */
  | { kind: 'gain'; g: number }

/** Traduce un pedal (datos) + la posición de las perillas a la lista de bloques de audio. */
export function compilePedal(pedal: PedalDef, knobs: Knobs): DspBlock[] {
  return pedal.stages.map((stage): DspBlock => {
    switch (stage.type) {
      case 'opamp-diode-clipper': {
        const v = clipperValues(stage, knobs)
        return {
          kind: 'opamp-diode',
          rg: stage.rg,
          cg: stage.cg,
          rf: v.rf,
          cf: stage.cf,
          isPos: stage.diode.isD1,
          isNeg: stage.diode.isD2,
          nVt: v.nVt,
          rail: stage.railVolts,
        }
      }
      case 'ts-tone':
        return { kind: 'analog2', ...toneNetwork(stage, knobs) }
      case 'output-level':
        return { kind: 'gain', g: levelValues(stage, knobs).gain }
    }
  })
}
