import type { Fault, FaultMode } from './types.ts'

/** Una avería del modo juego: qué le pasa al pedal, qué dice el cliente y por qué suena así. */
export interface Scenario {
  id: string
  /** Lo que cuenta el dueño del pedal. */
  complaint: string
  fault: Fault
  /** Explicación que se muestra al final. */
  explanation: string
}

export const FAULT_MODE_LABEL: Record<FaultMode, string> = {
  open: 'abierto (no conduce)',
  short: 'en corto',
}

export const TS_SCENARIOS: Scenario[] = [
  {
    id: 'c3-open',
    complaint: 'Suena limpio y bajito. Muevo el Drive y casi no cambia nada.',
    fault: { ref: 'C3', mode: 'open' },
    explanation:
      'C3 (47 nF) abierto: la rama de Rg a masa queda cortada, Zg → ∞ y la ganancia 1 + Zf/Zg → 1. El operacional deja de amplificar, nada llega a los diodos y el pedal casi no distorsiona.',
  },
  {
    id: 'd2-open',
    complaint: 'Suena raro y desparejo, como si distorsionara de un solo lado.',
    fault: { ref: 'D2', mode: 'open' },
    explanation:
      'D2 abierto: solo conduce D1. Los picos positivos se recortan en ≈ 0,6 V, pero los negativos siguen creciendo hasta el techo del operacional. Ese recorte asimétrico agrega armónicas pares (como la octava), que se ven en el espectro.',
  },
  {
    id: 'c5-open',
    complaint: 'Suena áspero y chillón, como papel de lija. El Tone no ayuda.',
    fault: { ref: 'C5', mode: 'open' },
    explanation:
      'C5 (0,22 µF) abierto: desaparece el pasa-bajos de ≈ 723 Hz que suaviza el recorte. Pasan todos los agudos que generan los diodos y el sonido queda muy brillante.',
  },
  {
    id: 'p3-open',
    complaint: 'No sale nada de sonido, aunque el LED está prendido.',
    fault: { ref: 'P3', mode: 'open' },
    explanation:
      'El cursor del potenciómetro de volumen (P3) está desconectado: no llega señal a la salida, aunque el resto del circuito funcione. Ganancia = 0.',
  },
  {
    id: 'c4-short',
    complaint: 'Suena limpio y bajito. Parece que el Drive no hace nada.',
    fault: { ref: 'C4', mode: 'short' },
    explanation:
      'C4 (51 pF) en corto: la impedancia de realimentación Zf queda en cortocircuito, Vf = 0 y Vout = Vin. Ganancia 1: no hay amplificación ni recorte. Ojo: el síntoma es igual al de C3 abierto; el multímetro desempata.',
  },
  {
    id: 'd1-short',
    complaint: 'Suena limpio y bajito. Nada de distorsión.',
    fault: { ref: 'D1', mode: 'short' },
    explanation:
      'D1 en corto: pone en corto toda la realimentación, así que Vf ≈ 0 y la ganancia es 1. Mismo síntoma que C3 abierto o C4 en corto: hace falta medir.',
  },
]

export function getScenario(id: string): Scenario {
  return TS_SCENARIOS.find((s) => s.id === id) ?? TS_SCENARIOS[0]
}

/** Elige una avería al azar, evitando repetir la anterior si se puede. */
export function randomScenario(previousId?: string): Scenario {
  const pool = TS_SCENARIOS.filter((s) => s.id !== previousId)
  return pool[Math.floor(Math.random() * pool.length)]
}

export const SCORE = { start: 100, perMeasurement: 10, perWrongGuess: 25, min: 0 }

export function computeScore(measurements: number, wrongGuesses: number): number {
  return Math.max(SCORE.min, SCORE.start - SCORE.perMeasurement * measurements - SCORE.perWrongGuess * wrongGuesses)
}
