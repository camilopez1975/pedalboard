import type { Finish, KnobStyle, Pattern, PedalDef, PedalLook } from './types.ts'

/** Tipos de sticker que se pueden pegar sobre el pedal. 'texto' muestra un texto que escribe el usuario. */
export const STICKER_KINDS = ['estrella', 'rayo', 'llama', 'corazon', 'nota', 'luna', 'sol', 'flor', 'carita', 'paz', 'corona', 'diamante', 'calavera', 'texto'] as const
export type StickerKind = (typeof STICKER_KINDS)[number]

export const STICKER_NAMES: Record<StickerKind, string> = {
  estrella: 'Estrella',
  rayo: 'Rayo',
  llama: 'Llama',
  corazon: 'Corazón',
  nota: 'Nota',
  luna: 'Luna',
  sol: 'Sol',
  flor: 'Flor',
  carita: 'Carita',
  paz: 'Paz',
  corona: 'Corona',
  diamante: 'Diamante',
  calavera: 'Calavera',
  texto: 'Texto',
}

export interface Sticker {
  id: string
  kind: StickerKind
  /** Centro del sticker, en % del ancho y del alto del pedal. */
  x: number
  y: number
  /** Tamaño relativo (1 = unos 60 px). */
  scale: number
  /** Giro en grados. */
  rot: number
  color: string
  /** Solo para el sticker de texto. */
  text?: string
}

export interface Decor {
  body: string
  finish: Finish
  pattern: Pattern
  patternColor: string
  knobStyle: KnobStyle
  ledColor: string
  textColor: string
  title: string
  subtitle: string
  stickers: Sticker[]
}

export const BODY_COLORS = ['#2fbf4f', '#e63946', '#ff8a00', '#ffd60a', '#00b4d8', '#3a5bff', '#8e44ff', '#ff4fa3', '#f4f4f4', '#1c1c1f', '#d8dde6', '#c9a227']
export const STICKER_COLORS = ['#ffffff', '#111111', '#ffd60a', '#ff3b3b', '#ff4fa3', '#00e0ff', '#3dff8a', '#8e44ff', '#ff8a00']
export const LED_COLORS = ['#ff2a2a', '#3dff8a', '#00e0ff', '#ffd60a', '#ff4fa3', '#8e44ff']

export const FINISH_NAMES: Record<Finish, string> = { esmalte: 'Esmalte brillante', metalico: 'Metalizado', mate: 'Mate' }
export const PATTERN_NAMES: Record<Pattern, string> = { ninguno: 'Liso', rayas: 'Rayas', puntos: 'Puntos', cuadros: 'Cuadros', rombos: 'Rombos' }
export const KNOB_STYLE_NAMES: Record<KnobStyle, string> = { negra: 'Negras', blanca: 'Blancas', cromada: 'Cromadas', dorada: 'Doradas', roja: 'Rojas' }

/** Decoración de fábrica de un pedal. */
export function defaultDecor(look: PedalLook): Decor {
  return {
    body: look.body,
    finish: look.finish,
    pattern: look.pattern,
    patternColor: look.patternColor,
    knobStyle: look.knobStyle,
    ledColor: look.ledColor,
    textColor: look.textColor,
    title: look.title,
    subtitle: look.subtitle,
    stickers: [],
  }
}

/** Máximo de stickers por pedal (para que no se vuelva inmanejable). */
export const MAX_STICKERS = 24

let counter = 0
export function newStickerId(): string {
  counter += 1
  return `s${Date.now().toString(36)}${counter}`
}

export function makeSticker(kind: StickerKind, color: string): Sticker {
  return {
    id: newStickerId(),
    kind,
    x: 50,
    y: 50,
    scale: kind === 'texto' ? 1 : 1.1,
    rot: 0,
    color,
    text: kind === 'texto' ? 'Hola' : undefined,
  }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Deja un sticker dentro de los límites razonables (posición dentro del pedal, tamaño y texto acotados). */
export function sanitizeSticker(s: Sticker): Sticker {
  return {
    ...s,
    x: clamp(s.x, 0, 100),
    y: clamp(s.y, 0, 100),
    scale: clamp(s.scale, 0.4, 3.5),
    rot: ((s.rot % 360) + 360) % 360,
    text: s.kind === 'texto' ? (s.text ?? '').slice(0, 24) : undefined,
  }
}

const STORAGE_KEY = 'arma-tu-pedal:decor:v1'

type Storage = { getItem(k: string): string | null; setItem(k: string, v: string): void }

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

const isStr = (v: unknown): v is string => typeof v === 'string'

/** Valida lo guardado: lo que no tenga forma de decoración se descarta y se usa el valor de fábrica. */
export function parseDecor(raw: unknown, pedal: PedalDef): Decor {
  const base = defaultDecor(pedal.look)
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Record<string, unknown>
  const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (isStr(v) && (allowed as readonly string[]).includes(v) ? (v as T) : fallback)
  const color = (v: unknown, fallback: string) => (isStr(v) && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback)
  const stickers = Array.isArray(r.stickers)
    ? r.stickers
        .filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
        .filter((s) => (STICKER_KINDS as readonly string[]).includes(s.kind as string))
        .slice(0, MAX_STICKERS)
        .map((s) =>
          sanitizeSticker({
            id: isStr(s.id) ? s.id : newStickerId(),
            kind: s.kind as StickerKind,
            x: Number(s.x) || 50,
            y: Number(s.y) || 50,
            scale: Number(s.scale) || 1,
            rot: Number(s.rot) || 0,
            color: color(s.color, '#ffffff'),
            text: isStr(s.text) ? s.text : undefined,
          }),
        )
    : []
  return {
    body: color(r.body, base.body),
    finish: pick(r.finish, ['esmalte', 'metalico', 'mate'] as const, base.finish),
    pattern: pick(r.pattern, ['ninguno', 'rayas', 'puntos', 'cuadros', 'rombos'] as const, base.pattern),
    patternColor: color(r.patternColor, base.patternColor),
    knobStyle: pick(r.knobStyle, ['negra', 'blanca', 'cromada', 'dorada', 'roja'] as const, base.knobStyle),
    ledColor: color(r.ledColor, base.ledColor),
    textColor: color(r.textColor, base.textColor),
    title: isStr(r.title) ? r.title.slice(0, 22) : base.title,
    subtitle: isStr(r.subtitle) ? r.subtitle.slice(0, 30) : base.subtitle,
    stickers,
  }
}

/** Lee las decoraciones guardadas en este navegador (una por pedal). */
export function loadDecor(pedals: PedalDef[]): Record<string, Decor> {
  let saved: Record<string, unknown> = {}
  try {
    const raw = storage()?.getItem(STORAGE_KEY)
    if (raw) saved = JSON.parse(raw) as Record<string, unknown>
  } catch {
    saved = {}
  }
  return Object.fromEntries(pedals.map((p) => [p.id, parseDecor(saved[p.id], p)]))
}

export function saveDecor(all: Record<string, Decor>): void {
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // Sin almacenamiento (modo privado, cuota llena): la decoración vale mientras la página esté abierta.
  }
}
