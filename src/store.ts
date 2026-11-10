import { create } from 'zustand'
import { getScenario, randomScenario } from './model/game.ts'
import { defaultKnobs, getPedal } from './model/pedals/index.ts'
import type { Fault, FaultMode, Knobs } from './model/types.ts'

export type Mode = 'taller' | 'juego'

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
  /** Cómo cree el jugador que falla el componente elegido (antes de confirmar). */
  draftMode: FaultMode | null
}

function freshGame(previousId?: string): GameState {
  return {
    scenarioId: randomScenario(previousId).id,
    measured: {},
    wrongGuesses: 0,
    status: 'playing',
    lastGuessWrong: false,
    compareHealthy: false,
    draftMode: null,
  }
}

const TECH_KEY = 'arma-tu-pedal:tech:v1'

function loadTech(): boolean {
  try {
    return typeof localStorage !== 'undefined' && localStorage.getItem(TECH_KEY) === '1'
  } catch {
    return false
  }
}

function saveTech(value: boolean) {
  try {
    localStorage.setItem(TECH_KEY, value ? '1' : '0')
  } catch {
    // Sin almacenamiento: la preferencia vale hasta cerrar la página.
  }
}

interface AppState {
  /** Pedal abierto en el banco de trabajo. null = estamos en el inicio. */
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
  /** true = se muestran cuentas, fórmulas, gráfico y valores. Por defecto oculto. */
  showTech: boolean
  /** Componente seleccionado en la placa. */
  selectedRef: string | null
  game: GameState
  /** Falla que el usuario simula a mano en el modo taller (null = pedal sano). */
  sandboxFault: Fault | null
  /** Etapa que se resalta en la placa (al pasar el mouse por el diagrama de bloques). */
  hoverStage: string | null
  openPedal: (id: string) => void
  closePedal: () => void
  setKnob: (id: string, value: number) => void
  setKnobs: (knobs: Knobs) => void
  setBypass: (value: boolean) => void
  setChord: (id: string) => void
  setStrength: (value: number) => void
  setPlaying: (value: boolean) => void
  setMode: (mode: Mode) => void
  setFlipped: (value: boolean) => void
  setShowTech: (value: boolean) => void
  selectRef: (ref: string | null) => void
  newGame: () => void
  recordMeasurement: (ref: string, reading: string) => void
  setDraftMode: (mode: FaultMode | null) => void
  submitGuess: (ref: string, mode: FaultMode) => void
  revealAnswer: () => void
  setCompareHealthy: (value: boolean) => void
  setSandboxFault: (fault: Fault | null) => void
  setHoverStage: (id: string | null) => void
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
  showTech: loadTech(),
  selectedRef: null,
  game: freshGame(),
  sandboxFault: null,
  hoverStage: null,
  openPedal: (id) => {
    const pedal = getPedal(id)
    if (!pedal || !pedal.available) return
    set({ pedalId: id, knobs: defaultKnobs(pedal), bypass: false, flipped: get().mode === 'juego', selectedRef: null, sandboxFault: null })
  },
  closePedal: () => set({ pedalId: null }),
  setKnob: (id, value) => set((state) => ({ knobs: { ...state.knobs, [id]: value } })),
  setKnobs: (knobs) => set({ knobs }),
  setBypass: (bypass) => set({ bypass }),
  setChord: (chordId) => set({ chordId }),
  setStrength: (strength) => set({ strength }),
  setPlaying: (playing) => set({ playing }),
  // En el juego el pedal arranca abierto (se ve la placa); en el taller, de frente.
  setMode: (mode) => set({ mode, selectedRef: null, flipped: mode === 'juego', sandboxFault: null, hoverStage: null }),
  setFlipped: (flipped) => set({ flipped }),
  setShowTech: (showTech) => {
    saveTech(showTech)
    set({ showTech })
  },
  selectRef: (selectedRef) => set((state) => ({ selectedRef, game: selectedRef === state.selectedRef ? state.game : { ...state.game, draftMode: null } })),
  newGame: () => set((state) => ({ game: freshGame(state.game.scenarioId), selectedRef: null, flipped: true })),
  recordMeasurement: (ref, reading) => set((state) => ({ game: { ...state.game, measured: { ...state.game.measured, [ref]: reading } } })),
  setDraftMode: (draftMode) => set((state) => ({ game: { ...state.game, draftMode } })),
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
  setCompareHealthy: (compareHealthy) => set((state) => ({ game: { ...state.game, compareHealthy } })),
  setSandboxFault: (sandboxFault) => set({ sandboxFault }),
  setHoverStage: (hoverStage) => set({ hoverStage }),
}))
