/**
 * Modelo de datos de un pedal.
 *
 * Un pedal es DATO, no código: una lista de etapas con los valores de sus componentes y una lista de
 * componentes dibujados sobre la placa. De ese mismo dato salen (1) el sonido, (2) el gráfico de respuesta
 * en frecuencia, (3) las explicaciones con fórmulas, (4) la vista interior con los componentes y (5) las
 * fallas del modo juego. Crear un pedal nuevo es escribir otra lista de etapas.
 *
 * Unidades: resistencias en Ω, capacitores en F, tensiones en V, corrientes en A, frecuencias en Hz.
 */

/** Posición de cada perilla, de 0 (mínimo) a 1 (máximo), por id de perilla. */
export type Knobs = Record<string, number>

/** 'lin' = potenciómetro lineal (B). 'log' = logarítmico / de audio (A), aproximado como posición². */
export type PotTaper = 'lin' | 'log'

export interface KnobDef {
  id: string
  label: string
  /** Posición inicial, de 0 a 1. */
  default: number
  /** Qué hace esta perilla, en una frase. */
  hint: string
}

/** Un potenciómetro que forma parte de una resistencia del circuito. */
export interface PotRef {
  knob: string
  /** Resistencia total del potenciómetro, en Ω. */
  max: number
  taper: PotTaper
}

/** Par de diodos en antiparalelo: D1 conduce con tensión positiva y D2 con tensión negativa. */
export interface DiodePair {
  /** Texto: qué diodos son. */
  name: string
  /** Corriente de saturación de D1 y de D2, en A. 0 = diodo abierto. */
  isD1: number
  isD2: number
  /** Factor de idealidad (n). */
  n: number
}

interface StageBase {
  id: string
  name: string
  description: string
}

/**
 * Operacional no inversor con ganancia dependiente de la frecuencia y diodos DENTRO de la realimentación:
 *   Zg = Rg + 1/(s·Cg)                       (de la entrada − a masa)
 *   Zf = Rf ‖ Cf ‖ diodos                    (de la salida a la entrada −), con Rf = rf + potenciómetro
 *   Vout = Vin + Vf,   donde Vf es la tensión sobre Zf.
 */
export interface ClipperStage extends StageBase {
  type: 'opamp-diode-clipper'
  rg: number
  cg: number
  rf: number
  rfPot: PotRef
  cf: number
  diode: DiodePair
  /** Tensión máxima a la que puede llegar la salida del operacional, en V. */
  railVolts: number
}

/**
 * Etapa de tono tipo Tube Screamer, reconstruida a partir de la descripción del circuito:
 *   R7 en serie, con C5 en paralelo con la resistencia de polarización hacia masa → pasa-bajos principal.
 *   Operacional no inversor con el potenciómetro de tono entre sus dos entradas, la realimentación rFeedback
 *   y, desde el cursor del potenciómetro, R8 en serie con C6 hacia masa.
 */
export interface ToneStage extends StageBase {
  type: 'ts-tone'
  r7: number
  rBias: number
  c5: number
  r8: number
  c6: number
  rFeedback: number
  /** Resistencia fija entre el potenciómetro y la entrada inversora. */
  rFixedN: number
  potKnob: string
  /** Resistencia total del potenciómetro de tono, en Ω. */
  potTotal: number
}

/** Volumen de salida: ganancia = maxGain · posición (lineal) o · posición² (logarítmico). */
export interface OutputLevelStage extends StageBase {
  type: 'output-level'
  knob: string
  maxGain: number
  taper: PotTaper
  /** Resistencia total del potenciómetro, en Ω. */
  potTotal: number
}

export type StageDef = ClipperStage | ToneStage | OutputLevelStage

// --- Placa (vista interior) y fallas ------------------------------------------------------------

export type ComponentKind = 'resistor' | 'capacitor' | 'diode' | 'pot' | 'opamp'

/** De qué parámetro de una etapa sale el valor de un componente. */
export type ComponentParam =
  | 'rg'
  | 'cg'
  | 'rf'
  | 'cf'
  | 'd1'
  | 'd2'
  | 'driveMax'
  | 'r7'
  | 'rBias'
  | 'c5'
  | 'r8'
  | 'c6'
  | 'rFeedback'
  | 'toneMax'
  | 'levelMax'

export interface BoardComponent {
  /** Designador en la placa (R4, C3, D1…). */
  ref: string
  kind: ComponentKind
  stageId?: string
  param?: ComponentParam
  /** Para qué sirve, en una frase. */
  role: string
  /** Posición en la placa (viewBox 520 × 300) y giro en grados. */
  x: number
  y: number
  rot?: number
}

export type FaultMode = 'open' | 'short'

export interface Fault {
  ref: string
  mode: FaultMode
}

// --- Aspecto ---------------------------------------------------------------------------------------

export type PedalShape = 'box' | 'round'
/** Estilo de las perillas. */
export type KnobStyle = 'negra' | 'blanca' | 'cromada' | 'dorada' | 'roja'
/** Terminación de la pintura del gabinete. */
export type Finish = 'esmalte' | 'metalico' | 'mate'
/** Dibujo que se superpone a la pintura. */
export type Pattern = 'ninguno' | 'rayas' | 'puntos' | 'cuadros' | 'rombos'

/** Cómo se ve un pedal de fábrica (el usuario después lo puede decorar). */
export interface PedalLook {
  shape: PedalShape
  body: string
  finish: Finish
  pattern: Pattern
  patternColor: string
  knobStyle: KnobStyle
  ledColor: string
  textColor: string
  /** Texto grande de la chapa. */
  title: string
  subtitle: string
  /** Rótulos de las perillas (se usan para dibujar el pedal en la pedalera aunque no esté armado). */
  knobLabels: string[]
}

export interface PedalDef {
  id: string
  name: string
  subtitle: string
  /** Color del gabinete. */
  color: string
  look: PedalLook
  /** Ajustes de perillas sugeridos (por ejemplo, de un guitarrista famoso). */
  presets?: { id: string; name: string; note: string; knobs: Knobs }[]
  /** false = todavía no está armado (se muestra como "Próximamente"). */
  available: boolean
  knobs: KnobDef[]
  stages: StageDef[]
  board: BoardComponent[]
  /** Aclaraciones honestas sobre qué tan fiel es el modelo. */
  notes: string[]
}
