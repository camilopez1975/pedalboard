import { create } from 'zustand'
import { loadDecor, MAX_STICKERS, makeSticker, sanitizeSticker, saveDecor, defaultDecor } from './model/decor.ts'
import type { Decor, Sticker, StickerKind } from './model/decor.ts'
import { getScenario, randomScenario } from './model/game.ts'
import type { Fault, FaultMode } from './model/types.ts'
import { defaultKnobs, getPedal, PEDALS } from './model/pedals/index.ts'
import type { Knobs } from './model/types.ts'

export type Mode = 'taller' | 'juego' | 'decorar'

export interface GameState {
  scenarioId: string
  /** Lo que mostró el multímetro, por designador del componente. */
  measured: Record<string, string>
  wrongGuesses: number
  /** playing = buscando la falla · solved = la encontró · revealed = se rindió y se mostró la respuesta. */
  status: 'playing' | 'solved' | 'revealed'
  /** El último diagnóstico fue incorrecto (para mostrar el aviso). */
  lastGuessWrong: boolean
  /** Escuchar un pedal sano para comparar. */
  compareHealthy: boolean
}

function freshGame(previousId?: string): GameState {
  return {
    scenarioId: randomScenario(previousId).id,
    measured: {},
    wrongGuesses: 0,
    status: 'playing',
    lastGuessWrong: false,
    compareHealthy: false,
  }
}

interface AppState {
  /** Pedal abierto en el banco de trabajo. null = estamos en el selector. */
  pedalId: string | null
  knobs: Knobs
  /** true = pedal apagado (la señal pasa sin efecto). */
  bypass: boolean
  chordId: string
  /** Pegada de la guitarra, de 0 a 1. */
  strength: number
  playing: boolean
  mode: Mode
  /** true = el pedal está dado vuelta y se ve la placa. */
  flipped: boolean
  /** Componente seleccionado en la placa. */
  selectedRef: string | null
  game: GameState
  /** Falla que el usuario simula a mano en el modo taller (null = pedal sano). */
  sandboxFault: Fault | null
  /** Decoración de cada pedal (se guarda en el navegador). */
  decor: Record<string, Decor>
  selectedSticker: string | null
  /** Etapa que se resalta en la placa (al pasar el mouse por el diagrama de bloques). */
  hoverStage: string | null
  openPedal: (id: string) => void
  closePedal: () => void
  setKnob: (id: string, value: number) => void
  setBypass: (value: boolean) => void
  setChord: (id: string) => void
  setStrength: (value: number) => void
  setPlaying: (value: boolean) => void
  setMode: (mode: Mode) => void
  setFlipped: (value: boolean) => void
  selectRef: (ref: string | null) => void
  newGame: () => void
  recordMeasurement: (ref: string, reading: string) => void
  submitGuess: (ref: string, mode: FaultMode) => void
  revealAnswer: () => void
  setCompareHealthy: (value: boolean) => void
  setSandboxFault: (fault: Fault | null) => void
  setHoverStage: (id: string | null) => void
  setKnobs: (knobs: Knobs) => void
  patchDecor: (pedalId: string, patch: Partial<Omit<Decor, 'stickers'>>) => void
  addSticker: (pedalId: string, kind: StickerKind, color: string) => void
  updateSticker: (pedalId: string, id: string, patch: Partial<Sticker>) => void
  removeSticker: (pedalId: string, id: string) => void
  bringStickerToFront: (pedalId: string, id: string) => void
  selectSticker: (id: string | null) => void
  resetDecor: (pedalId: string) => void
}

type Setter = (partial: Partial<AppState> | ((state: AppState) => Partial<AppState>)) => void

/** Cambia la decoración de un pedal y la guarda en el navegador. */
function updateDecor(set: Setter, get: () => AppState, pedalId: string, change: (d: Decor) => Decor) {
  const current = get().decor[pedalId]
  if (!current) return
  const decor = { ...get().decor, [pedalId]: change(current) }
  saveDecor(decor)
  set({ decor })
}

export const useApp = create<AppState>()((set, get) => ({
  pedalId: null,
  knobs: {},
  bypass: false,
  chordId: 'e5',
  strength: 0.5,
  playing: false,
  mode: 'taller',
  flipped: false,
  selectedRef: null,
  game: freshGame(),
  sandboxFault: null,
  decor: loadDecor(PEDALS),
  selectedSticker: null,
  hoverStage: null,
  openPedal: (id) => {
    const pedal = getPedal(id)
    if (!pedal || !pedal.available) return
    set({ pedalId: id, knobs: defaultKnobs(pedal), bypass: false, flipped: false, selectedRef: null, sandboxFault: null })
  },
  closePedal: () => set({ pedalId: null }),
  setKnob: (id, value) => set((state) => ({ knobs: { ...state.knobs, [id]: value } })),
  setBypass: (bypass) => set({ bypass }),
  setChord: (chordId) => set({ chordId }),
  setStrength: (strength) => set({ strength }),
  setPlaying: (playing) => set({ playing }),
  setMode: (mode) => set({ mode, selectedRef: null, flipped: false, sandboxFault: null, selectedSticker: null }),
  setFlipped: (flipped) => set({ flipped }),
  selectRef: (selectedRef) => set({ selectedRef }),
  newGame: () => set((state) => ({ game: freshGame(state.game.scenarioId), selectedRef: null, flipped: false })),
  recordMeasurement: (ref, reading) =>
    set((state) => ({ game: { ...state.game, measured: { ...state.game.measured, [ref]: reading } } })),
  submitGuess: (ref, mode) => {
    const { game } = get()
    if (game.status !== 'playing') return
    const fault = getScenario(game.scenarioId).fault
    const correct = fault.ref === ref && fault.mode === mode
    set({
      game: correct
        ? { ...game, status: 'solved', lastGuessWrong: false }
        : { ...game, wrongGuesses: game.wrongGuesses + 1, lastGuessWrong: true },
    })
  },
  revealAnswer: () => set((state) => ({ game: { ...state.game, status: 'revealed', lastGuessWrong: false } })),
  setSandboxFault: (sandboxFault) => set({ sandboxFault }),
  setHoverStage: (hoverStage) => set({ hoverStage }),
  setKnobs: (knobs) => set({ knobs }),
  patchDecor: (pedalId, patch) => updateDecor(set, get, pedalId, (d) => ({ ...d, ...patch })),
  addSticker: (pedalId, kind, color) => {
    const current = get().decor[pedalId]
    if (!current || current.stickers.length >= MAX_STICKERS) return
    const sticker = makeSticker(kind, color)
    updateDecor(set, get, pedalId, (d) => ({ ...d, stickers: [...d.stickers, sticker] }))
    set({ selectedSticker: sticker.id })
  },
  updateSticker: (pedalId, id, patch) =>
    updateDecor(set, get, pedalId, (d) => ({ ...d, stickers: d.stickers.map((s) => (s.id === id ? sanitizeSticker({ ...s, ...patch }) : s)) })),
  removeSticker: (pedalId, id) => {
    updateDecor(set, get, pedalId, (d) => ({ ...d, stickers: d.stickers.filter((s) => s.id !== id) }))
    if (get().selectedSticker === id) set({ selectedSticker: null })
  },
  bringStickerToFront: (pedalId, id) =>
    updateDecor(set, get, pedalId, (d) => {
      const target = d.stickers.find((s) => s.id === id)
      return target ? { ...d, stickers: [...d.stickers.filter((s) => s.id !== id), target] } : d
    }),
  selectSticker: (selectedSticker) => set({ selectedSticker }),
  resetDecor: (pedalId) => {
    const pedal = getPedal(pedalId)
    if (!pedal) return
    updateDecor(set, get, pedalId, () => defaultDecor(pedal.look))
    set({ selectedSticker: null })
  },
  setCompareHealthy: (compareHealthy) => set((state) => ({ game: { ...state.game, compareHealthy } })),
}))
