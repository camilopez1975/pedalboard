/**
 * Procesador de audio del pedal (corre en el hilo de audio, como AudioWorklet).
 *
 * Recibe por mensaje una lista de bloques (ver src/model/compile.ts) y los ejecuta en orden:
 *
 *  - 'opamp-diode': operacional no inversor con diodos DENTRO de la realimentación, resuelto muestra a muestra
 *      ig  = PasaAltos(Vin) / Rg                     corriente por Rg (a masa, en serie con Cg)
 *      ig  = Vf/Rf + Cf·dVf/dt + Id(Vf)              la misma corriente circula por Rf ‖ Cf ‖ diodos
 *      Id  = Is1·(e^(Vf/nVt) − 1) − Is2·(e^(−Vf/nVt) − 1)
 *      Vout = Vin + Vf                               (limitada al techo del operacional)
 *    La ecuación de Vf es no lineal: se resuelve con Newton + bisección (la función es monótona).
 *    Se corre a 4 veces la frecuencia de muestreo para evitar aliasing y se filtra al volver.
 *  - 'analog2': filtro de 2.º orden dado por H(s); se pasa a digital con la transformada bilineal.
 *  - 'gain': ganancia simple.
 *
 * Convención de escala: 1,0 digital = 1 V.
 * La clase PedalCore no depende de la API de Web Audio, así que se puede probar en Node (ver tests/).
 */

const OVERSAMPLING = 4
const SMOOTHING_SECONDS = 0.02 // los cambios de perilla se suavizan en ~20 ms para evitar "clicks"
const BUTTERWORTH8_Q = [0.5098, 0.6013, 0.9, 2.5629] // factores de calidad de un Butterworth de 8.º orden
const ANALOG_KEYS = ['b0', 'b1', 'b2', 'a0', 'a1', 'a2']

/** Filtros de primer orden por transformada bilineal con prewarping: k = tan(π·fc/fs). */
function onePole(fs, fc) {
  const k = Math.tan((Math.PI * Math.min(fc, fs * 0.49)) / fs)
  return { a1: (k - 1) / (k + 1), bLp: k / (1 + k), bHp: 1 / (1 + k) }
}

class Biquad {
  constructor(c) {
    this.c = c
    this.z1 = 0
    this.z2 = 0
  }
  process(x) {
    const c = this.c
    const y = c.b0 * x + this.z1
    this.z1 = c.b1 * x - c.a1 * y + this.z2
    this.z2 = c.b2 * x - c.a2 * y
    return y
  }
  reset() {
    this.z1 = 0
    this.z2 = 0
  }
}

/** Pasa-bajos de segundo orden (cookbook de Robert Bristow-Johnson). */
function biquadLowpass(fs, fc, q) {
  const w0 = (2 * Math.PI * fc) / fs
  const cos = Math.cos(w0)
  const alpha = Math.sin(w0) / (2 * q)
  const a0 = 1 + alpha
  return {
    b0: (1 - cos) / 2 / a0,
    b1: (1 - cos) / a0,
    b2: (1 - cos) / 2 / a0,
    a1: (-2 * cos) / a0,
    a2: (1 - alpha) / a0,
  }
}

/** H(s) = (b2 s² + b1 s + b0) / (a2 s² + a1 s + a0)  →  biquad digital, con s = 2·fs·(1 − z⁻¹)/(1 + z⁻¹). */
export function bilinear2(c, fs) {
  const K = 2 * fs
  const K2 = K * K
  const da0 = c.a2 * K2 + c.a1 * K + c.a0
  return {
    b0: (c.b2 * K2 + c.b1 * K + c.b0) / da0,
    b1: (2 * c.b0 - 2 * c.b2 * K2) / da0,
    b2: (c.b2 * K2 - c.b1 * K + c.b0) / da0,
    a1: (2 * c.a0 - 2 * c.a2 * K2) / da0,
    a2: (c.a2 * K2 - c.a1 * K + c.a0) / da0,
  }
}

/**
 * Resuelve f(v) = v·gTot + isPos·(e^(v/nVt) − 1) − isNeg·(e^(−v/nVt) − 1) − b = 0.
 * f es creciente, así que la solución está entre 0 y b/gTot (los diodos solo suman corriente).
 * Newton con bisección de respaldo (rtsafe).
 */
function solveFeedbackVoltage(b, gTot, isPos, isNeg, invA, guess) {
  const v0 = b / gTot
  let lo = v0 < 0 ? v0 : 0
  let hi = v0 < 0 ? 0 : v0
  if (hi - lo < 1e-15) return 0
  let v = guess < lo ? lo : guess > hi ? hi : guess
  let dxOld = hi - lo
  let dx = dxOld
  for (let it = 0; it < 80; it++) {
    const ep = Math.exp(Math.min(v * invA, 700))
    const en = Math.exp(Math.min(-v * invA, 700))
    const f = v * gTot + isPos * (ep - 1) - isNeg * (en - 1) - b
    const df = gTot + (isPos * ep + isNeg * en) * invA
    if (f > 0) hi = v
    else lo = v
    let vn = v - f / df
    if (vn <= lo || vn >= hi || Math.abs(2 * f) > Math.abs(dxOld * df)) {
      dxOld = dx
      dx = 0.5 * (hi - lo)
      vn = lo + dx
    } else {
      dxOld = dx
      dx = vn - v
    }
    if (Math.abs(vn - v) < 1e-10 || hi - lo < 1e-12) return vn
    v = vn
  }
  return v
}

/** Tope de seguridad de la salida, en V. El motor de audio atenúa por MONITOR_GAIN, así que ±2 V quedan en ±1 de escala completa. */
const OUTPUT_LIMIT = 2

export class PedalCore {
  constructor(fs) {
    this.fs = fs
    this.blocks = []
    this.mix = 1 // 1 = pedal activo, 0 = bypass (se suaviza)
    this.mixTarget = 1
    this.wet = new Float32Array(128)
    this.dry = new Float32Array(128)
  }

  /** cfg = { bypass: boolean, blocks: DspBlock[] } */
  setConfig(cfg) {
    this.mixTarget = cfg.bypass ? 0 : 1
    const specs = cfg.blocks
    const sameShape = specs.length === this.blocks.length && specs.every((s, i) => s.kind === this.blocks[i].kind)
    if (!sameShape) {
      this.blocks = specs.map((s) => this.makeBlock(s))
      return
    }
    specs.forEach((s, i) => this.retarget(this.blocks[i], s))
  }

  makeBlock(s) {
    switch (s.kind) {
      case 'opamp-diode': {
        const osFs = this.fs * OVERSAMPLING
        const fc = Math.min(20000, 0.45 * this.fs)
        // Filtro antialias antes de diezmar: Butterworth de 8.º orden = cuatro biquads
        return {
          kind: 'opamp-diode',
          rg: s.rg, cg: s.cg, cf: s.cf, isPos: s.isPos, isNeg: s.isNeg, nVt: s.nVt, rail: s.rail,
          rfT: s.rf, rfC: s.rf,
          prev: 0, hpX1: 0, hpY1: 0, vF: 0, iC: 0,
          aa: BUTTERWORTH8_Q.map((q) => new Biquad(biquadLowpass(osFs, fc, q))),
        }
      }
      case 'analog2': {
        const c = { b0: s.b0, b1: s.b1, b2: s.b2, a0: s.a0, a1: s.a1, a2: s.a2 }
        return { kind: 'analog2', tgt: c, cur: { ...c }, bq: new Biquad(bilinear2(c, this.fs)) }
      }
      case 'gain':
        return { kind: 'gain', gT: s.g, gC: s.g }
      default:
        throw new Error('Bloque desconocido: ' + s.kind)
    }
  }

  retarget(b, s) {
    switch (b.kind) {
      case 'opamp-diode':
        b.rfT = s.rf
        b.rg = s.rg
        b.cg = s.cg
        b.cf = s.cf
        b.isPos = s.isPos
        b.isNeg = s.isNeg
        b.nVt = s.nVt
        b.rail = s.rail
        break
      case 'analog2':
        b.tgt = { b0: s.b0, b1: s.b1, b2: s.b2, a0: s.a0, a1: s.a1, a2: s.a2 }
        break
      case 'gain':
        b.gT = s.g
        break
    }
  }

  reset() {
    for (const b of this.blocks) {
      if (b.kind === 'opamp-diode') {
        b.prev = b.hpX1 = b.hpY1 = b.vF = b.iC = 0
        for (const f of b.aa) f.reset()
      } else if (b.kind === 'analog2') {
        b.bq.reset()
      }
    }
  }

  /** Procesa un bloque de audio. input puede ser null (silencio). */
  process(input, output) {
    const n = output.length
    if (this.wet.length !== n) {
      this.wet = new Float32Array(n)
      this.dry = new Float32Array(n)
    }
    const wet = this.wet
    const dry = this.dry
    if (input) {
      dry.set(input.length > n ? input.subarray(0, n) : input)
      if (input.length < n) dry.fill(0, input.length)
    } else {
      dry.fill(0)
    }
    wet.set(dry)

    const alpha = 1 - Math.exp(-n / (this.fs * SMOOTHING_SECONDS))
    for (const b of this.blocks) this.runBlock(b, wet, n, alpha)

    const mixAlpha = 1 - Math.exp(-1 / (this.fs * 0.005))
    for (let i = 0; i < n; i++) {
      this.mix += (this.mixTarget - this.mix) * mixAlpha
      let y = dry[i] + (wet[i] - dry[i]) * this.mix
      if (!Number.isFinite(y)) {
        this.reset()
        y = 0
      }
      output[i] = y > OUTPUT_LIMIT ? OUTPUT_LIMIT : y < -OUTPUT_LIMIT ? -OUTPUT_LIMIT : y // tope de seguridad (en voltios; el motor lo baja a ≤ 0 dBFS)
    }
  }

  runBlock(b, buf, n, alpha) {
    switch (b.kind) {
      case 'opamp-diode': {
        b.rfC += (b.rfT - b.rfC) * alpha
        const osFs = this.fs * OVERSAMPLING
        const T = 1 / osFs
        const hp = onePole(osFs, 1 / (2 * Math.PI * b.rg * b.cg))
        const g2 = (2 * b.cf) / T // capacitor Cf, regla del trapecio
        const gTot = 1 / b.rfC + g2
        const invA = 1 / b.nVt
        const invRg = 1 / b.rg
        for (let i = 0; i < n; i++) {
          const x = buf[i]
          let y = 0
          for (let k = 1; k <= OVERSAMPLING; k++) {
            const u = b.prev + ((x - b.prev) * k) / OVERSAMPLING // interpolación lineal
            const hpOut = hp.bHp * (u - b.hpX1) - hp.a1 * b.hpY1
            b.hpX1 = u
            b.hpY1 = hpOut
            const ig = hpOut * invRg
            const bias = ig + g2 * b.vF + b.iC
            const vF = solveFeedbackVoltage(bias, gTot, b.isPos, b.isNeg, invA, b.vF)
            b.iC = g2 * (vF - b.vF) - b.iC
            b.vF = vF
            let vo = u + vF
            if (vo > b.rail) vo = b.rail
            else if (vo < -b.rail) vo = -b.rail
            y = vo
            for (let j = 0; j < b.aa.length; j++) y = b.aa[j].process(y)
          }
          b.prev = x
          buf[i] = y // nos quedamos con 1 de cada OVERSAMPLING muestras (diezmado)
        }
        break
      }
      case 'analog2': {
        for (const key of ANALOG_KEYS) b.cur[key] += (b.tgt[key] - b.cur[key]) * alpha
        b.bq.c = bilinear2(b.cur, this.fs)
        for (let i = 0; i < n; i++) buf[i] = b.bq.process(buf[i])
        break
      }
      case 'gain': {
        const gPrev = b.gC
        b.gC += (b.gT - b.gC) * alpha
        for (let i = 0; i < n; i++) buf[i] *= gPrev + ((b.gC - gPrev) * (i + 1)) / n
        break
      }
    }
  }
}

// Solo existe dentro del AudioWorklet (en Node, para las pruebas, esto se saltea).
if (typeof AudioWorkletProcessor !== 'undefined') {
  class PedalProcessor extends AudioWorkletProcessor {
    constructor() {
      super()
      this.core = new PedalCore(sampleRate)
      this.port.onmessage = (event) => this.core.setConfig(event.data)
    }

    process(inputs, outputs) {
      const out = outputs[0]
      const input = inputs[0] && inputs[0][0] ? inputs[0][0] : null
      this.core.process(input, out[0])
      for (let c = 1; c < out.length; c++) out[c].set(out[0])
      return true
    }
  }
  registerProcessor('pedal-processor', PedalProcessor)
}
