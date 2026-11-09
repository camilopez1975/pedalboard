import { clipperValues, levelValues, potResistance, toneNetwork } from './analysis.ts'
import { num, sci, si } from './format.ts'
import type { Knobs, StageDef } from './types.ts'

export interface StageExplanation {
  /** Qué hace la etapa, en palabras. */
  what: string
  /** Valores de los componentes tal como están ahora. */
  components: string[]
  /** Cuentas paso a paso, con unidades en cada reemplazo y conversión a SI explícita. */
  formulas: string[]
  /** Un truco para razonar rápido (regla de tres). */
  tip?: string
}

/** Texto explicativo de una etapa con los valores actuales de las perillas. */
export function explainStage(stage: StageDef, knobs: Knobs): StageExplanation {
  switch (stage.type) {
    case 'opamp-diode-clipper': {
      const v = clipperValues(stage, knobs)
      const pot = potResistance(stage.rfPot, knobs)
      const vOut = 0.6
      return {
        what:
          'El operacional amplifica la señal con ganancia 1 + Zf/Zg. Por debajo de f₁ casi no amplifica (ganancia 1) y por encima amplifica 1 + Rf/Rg; ' +
          'por encima de f₂ la ganancia vuelve a caer. Eso da la "joroba de medios". Los diodos están en la realimentación: cuando la tensión sobre Zf ' +
          `llega a unos ${num(vOut)} V conducen y frenan la ganancia, y la salida se achata de forma suave. Esa es la distorsión.`,
        components: [
          `Rg (R4) = ${si(stage.rg, 'Ω')}`,
          `Cg (C3) = ${si(stage.cg, 'F')}`,
          `Rf = R6 ${si(stage.rf, 'Ω')} + Drive (P1) ${si(pot, 'Ω')} de ${si(stage.rfPot.max, 'Ω')}`,
          `Cf (C4) = ${si(stage.cf, 'F')}`,
          `Diodos: ${stage.diode.name}`,
        ],
        formulas: [
          `Rf = ${si(stage.rf, 'Ω')} + ${si(pot, 'Ω')} = ${si(v.rf, 'Ω')} = ${sci(v.rf, 'Ω')}`,
          `Ganancia (sin diodos) = 1 + Rf / Rg = 1 + ${sci(v.rf, 'Ω')} / ${sci(stage.rg, 'Ω')} = ${num(v.gainTotal)} (${num(20 * Math.log10(v.gainTotal))} dB)`,
          `f₁ = 1 / (2π · Rg · Cg) = 1 / (2π · ${sci(stage.rg, 'Ω')} · ${sci(stage.cg, 'F')}) = ${si(v.fcHp, 'Hz')}`,
          `f₂ = 1 / (2π · Rf · Cf) = 1 / (2π · ${sci(v.rf, 'Ω')} · ${sci(stage.cf, 'F')}) = ${si(v.fcLp, 'Hz')}`,
        ],
        tip: 'Regla de tres: si Rf se duplica, la ganancia que se suma (Rf/Rg) se duplica. Con señales chicas los diodos casi no conducen y valen estas cuentas; con señales grandes entran en juego y la salida se achata.',
      }
    }
    case 'ts-tone': {
      const x = Math.min(1, Math.max(0, knobs[stage.potKnob] ?? 0))
      const fc1 = 1 / (2 * Math.PI * stage.r7 * stage.c5)
      const fc2 = 1 / (2 * Math.PI * stage.r8 * stage.c6)
      const p = toneNetwork(stage, knobs)
      return {
        what:
          'Primero un pasa-bajos fijo (R7 y C5) que suaviza los agudos que dejó el recorte. Después, un operacional con el potenciómetro de tono entre sus dos entradas: ' +
          'del lado de los graves el cursor carga la entrada y recorta más los agudos (pasa-bajos de segundo orden); del lado de los agudos, esa rama (R8 y C6) hace que vuelvan a subir los agudos. ' +
          'En el centro la respuesta es casi plana. Este cableado es una reconstrucción: ver las notas del modelo.',
        components: [
          `R7 = ${si(stage.r7, 'Ω')}, C5 = ${si(stage.c5, 'F')}, R9 (polarización) = ${si(stage.rBias, 'Ω')}`,
          `R8 = ${si(stage.r8, 'Ω')}, C6 = ${si(stage.c6, 'F')}, R10 (realimentación) = ${si(stage.rFeedback, 'Ω')}`,
          `Tone (P2) = ${si(stage.potTotal, 'Ω')}, ahora en ${num(x * 100, 3)} %`,
        ],
        formulas: [
          `Pasa-bajos fijo: fc = 1 / (2π · R7 · C5) = 1 / (2π · ${sci(stage.r7, 'Ω')} · ${sci(stage.c5, 'F')}) = ${si(fc1, 'Hz')}`,
          `Rama del cursor: f = 1 / (2π · R8 · C6) = 1 / (2π · ${sci(stage.r8, 'Ω')} · ${sci(stage.c6, 'F')}) = ${si(fc2, 'Hz')}`,
          `Ganancia a frecuencias bajas = b₀ / a₀ = ${num(p.b0 / p.a0)} (${num(20 * Math.log10(p.b0 / p.a0))} dB), por el divisor R9 / (R9 + R7)`,
        ],
        tip: 'Regla de tres: con el mismo C, si R baja 10 veces, la frecuencia de corte sube 10 veces.',
      }
    }
    case 'output-level': {
      const v = levelValues(stage, knobs)
      const law = stage.taper === 'log' ? 'posición²' : 'posición'
      return {
        what:
          stage.taper === 'log'
            ? 'Sube o baja el volumen de salida con un potenciómetro logarítmico: la ganancia crece con el cuadrado de la posición.'
            : 'Sube o baja el volumen de salida con un potenciómetro lineal: la ganancia es proporcional a la posición.',
        components: [`Potenciómetro de ${si(stage.potTotal, 'Ω')}`, `Ganancia máxima = ${num(stage.maxGain)}`],
        formulas: [`Ganancia = Gmáx · ${law} = ${num(stage.maxGain)} · ${num(v.pos)}${stage.taper === 'log' ? '²' : ''} = ${num(v.gain)}`],
        tip: stage.taper === 'log' ? 'A mitad de giro (0,5) la ganancia es 0,25 · Gmáx, no 0,5 · Gmáx.' : 'Regla de tres: a mitad de giro, la mitad de la ganancia máxima.',
      }
    }
  }
}
