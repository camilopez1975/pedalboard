import type { DspBlock } from '../model/compile.ts'
import { getChord, synthesizeChord } from './chord.ts'

export interface PedalConfig {
  bypass: boolean
  blocks: DspBlock[]
}

/**
 * Motor de audio: acorde sintetizado → ganancia de entrada (la "pegada") → procesador del pedal → salida.
 * Un solo objeto para toda la app. El audio solo puede arrancar después de un gesto del usuario (un clic).
 */
/** Atenuación de monitoreo: 1 V del modelo = 0,5 de escala completa. Con el tope del procesador (±2 V) la salida nunca pasa de 0 dBFS. */
const MONITOR_GAIN = 0.5

class AudioEngine {
  private ctx: AudioContext | null = null
  private pedalNode: AudioWorkletNode | null = null
  private inputGain: GainNode | null = null
  private analyserIn: AnalyserNode | null = null
  private analyserOut: AnalyserNode | null = null
  private spectrumIn = new Float32Array(0)
  private spectrumOut = new Float32Array(0)
  private source: AudioBufferSourceNode | null = null
  private starting: Promise<void> | null = null
  private config: PedalConfig = { bypass: false, blocks: [] }
  private inputVolts = 0.3
  private buffers = new Map<string, AudioBuffer>()

  /** Crea el contexto de audio y carga el procesador. Llamar desde un clic. */
  async start(): Promise<void> {
    if (!this.starting) this.starting = this.init()
    try {
      await this.starting
    } catch (error) {
      this.starting = null // permite reintentar
      throw error
    }
    if (this.ctx && this.ctx.state === 'suspended') await this.ctx.resume()
  }

  private async init(): Promise<void> {
    const ctx = new AudioContext({ latencyHint: 'interactive' })
    try {
      await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}worklets/pedal-processor.js`)
    } catch (error) {
      await ctx.close()
      throw error
    }
    const pedalNode = new AudioWorkletNode(ctx, 'pedal-processor', {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    })
    const inputGain = ctx.createGain()
    inputGain.gain.value = this.inputVolts
    // Dos analizadores de espectro: uno mira la señal que entra al pedal y otro la que sale.
    const makeAnalyser = () => {
      const a = ctx.createAnalyser()
      a.fftSize = 8192
      a.smoothingTimeConstant = 0.75
      a.minDecibels = -110
      a.maxDecibels = -10
      return a
    }
    const analyserIn = makeAnalyser()
    const analyserOut = makeAnalyser()
    inputGain.connect(pedalNode)
    inputGain.connect(analyserIn)
    // Margen de seguridad: la salida del pedal puede pasar de 1 V (Level alto), pero la placa de sonido no admite más de 1.
    // El mismo atenuador vale con el pedal apagado, así que se pueden comparar los volúmenes.
    const monitor = ctx.createGain()
    monitor.gain.value = MONITOR_GAIN
    pedalNode.connect(monitor)
    monitor.connect(ctx.destination)
    pedalNode.connect(analyserOut)
    pedalNode.port.postMessage(this.config)
    this.ctx = ctx
    this.pedalNode = pedalNode
    this.inputGain = inputGain
    this.analyserIn = analyserIn
    this.analyserOut = analyserOut
    this.spectrumIn = new Float32Array(analyserIn.frequencyBinCount)
    this.spectrumOut = new Float32Array(analyserOut.frequencyBinCount)
  }

  /** Frecuencia de muestreo y cantidad de bins del espectro; null si el audio todavía no arrancó. */
  get spectrumInfo(): { sampleRate: number; binCount: number } | null {
    if (!this.ctx || !this.analyserOut) return null
    return { sampleRate: this.ctx.sampleRate, binCount: this.analyserOut.frequencyBinCount }
  }

  /**
   * Espectro actual en dB (dBFS, con 1,0 = 1 V) de la entrada o de la salida del pedal.
   * Devuelve un arreglo interno que se reutiliza en cada llamada; null si el audio todavía no arrancó.
   */
  readSpectrum(which: 'in' | 'out'): Float32Array | null {
    const analyser = which === 'in' ? this.analyserIn : this.analyserOut
    if (!analyser) return null
    const buffer = which === 'in' ? this.spectrumIn : this.spectrumOut
    analyser.getFloatFrequencyData(buffer)
    return buffer
  }

  /** Manda al procesador la lista de bloques y si está en bypass. Se puede llamar antes de start(). */
  setConfig(config: PedalConfig): void {
    this.config = config
    this.pedalNode?.port.postMessage(config)
  }

  /** Tensión pico de la guitarra en V (ver strengthToPeakVolts). */
  setInputVolts(volts: number): void {
    this.inputVolts = volts
    if (this.ctx && this.inputGain) this.inputGain.gain.setTargetAtTime(volts, this.ctx.currentTime, 0.01)
  }

  private bufferFor(chordId: string): AudioBuffer {
    if (!this.ctx) throw new Error('El audio todavía no arrancó')
    const cached = this.buffers.get(chordId)
    if (cached) return cached
    const data = synthesizeChord(getChord(chordId), this.ctx.sampleRate)
    const buffer = this.ctx.createBuffer(1, data.length, this.ctx.sampleRate)
    buffer.getChannelData(0).set(data)
    this.buffers.set(chordId, buffer)
    return buffer
  }

  /** Toca el acorde. Con loop = true se repite hasta llamar a stop(). */
  play(chordId: string, loop: boolean, onEnded?: () => void): void {
    if (!this.ctx || !this.inputGain) throw new Error('El audio todavía no arrancó')
    this.stop()
    const source = this.ctx.createBufferSource()
    source.buffer = this.bufferFor(chordId)
    source.loop = loop
    source.connect(this.inputGain)
    source.onended = () => {
      if (this.source === source) this.source = null
      onEnded?.()
    }
    source.start()
    this.source = source
  }

  stop(): void {
    const source = this.source
    if (!source) return
    this.source = null
    source.onended = null
    try {
      source.stop()
    } catch {
      // ya estaba detenido
    }
    source.disconnect()
  }
}

export const engine = new AudioEngine()
