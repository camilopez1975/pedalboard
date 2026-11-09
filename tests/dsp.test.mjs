// Pruebas del modelo y del procesador de audio. Se corren con: npm test  (Node 22.18 o más nuevo).
import assert from 'node:assert/strict'
import { test } from 'node:test'

import { PedalCore } from '../public/worklets/pedal-processor.js'
import { CHORDS, strengthToPeakVolts, synthesizeChord } from '../src/audio/chord.ts'
import { clipperValues, evalAnalogBiquad, responseCurve, stageResponse, toneNetwork } from '../src/model/analysis.ts'
import { applyFaults, componentValue, measure } from '../src/model/board.ts'
import { compilePedal } from '../src/model/compile.ts'
import { num, sci, si } from '../src/model/format.ts'
import { TS_SCENARIOS, computeScore } from '../src/model/game.ts'
import { defaultKnobs } from '../src/model/pedals/index.ts'
import { overdriveTS } from '../src/model/pedals/tube-screamer.ts'

const FS = 48000
const dB = (x) => 20 * Math.log10(x)

/** Pasa una señal por el procesador en bloques de 128 muestras, como hace el navegador. */
function run(core, signal) {
  const out = new Float32Array(signal.length)
  for (let i = 0; i < signal.length; i += 128) {
    const n = Math.min(128, signal.length - i)
    const o = new Float32Array(n)
    core.process(signal.subarray(i, i + n), o)
    out.set(o, i)
  }
  return out
}

function sine(freq, amp, seconds, fs = FS) {
  const x = new Float32Array(Math.round(seconds * fs))
  for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin((2 * Math.PI * freq * i) / fs)
  return x
}

/** Amplitud de la componente a `freq` (Goertzel) sobre el último tramo de la señal. */
function amplitudeAt(x, freq, fs = FS, tail = 0.25) {
  const start = x.length - Math.round(tail * fs)
  let re = 0
  let im = 0
  const w = (2 * Math.PI * freq) / fs
  for (let i = start; i < x.length; i++) {
    re += x[i] * Math.cos(w * (i - start))
    im -= x[i] * Math.sin(w * (i - start))
  }
  return (2 * Math.hypot(re, im)) / (x.length - start)
}

const coreFor = (pedal, knobs) => {
  const core = new PedalCore(FS)
  core.setConfig({ bypass: false, blocks: compilePedal(pedal, knobs) })
  return core
}

const peaks = (x, tail = 4800) => {
  const t = x.slice(x.length - tail)
  return { max: Math.max(...t), min: Math.min(...t) }
}

// Resolución nodal directa de la etapa de tono (independiente del polinomio de analysis.ts).
const C = (re, im = 0) => ({ re, im })
const cadd = (a, b) => C(a.re + b.re, a.im + b.im)
const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const cinv = (a) => {
  const d = a.re * a.re + a.im * a.im
  return C(a.re / d, -a.im / d)
}
function toneNodal(stage, x, f) {
  const s = C(0, 2 * Math.PI * f)
  const rpa = Math.max(1, x * stage.potTotal)
  const rpn = stage.rFixedN + Math.max(1, (1 - x) * stage.potTotal)
  const zp = cadd(C(stage.r8), cinv(cmul(s, C(stage.c6))))
  const y5 = cadd(C(1 / stage.rBias), cmul(s, C(stage.c5)))
  const g = 1 / rpa + 1 / rpn
  const vwOverVa = cmul(C(g), cinv(cadd(C(g), cinv(zp)))) // VW/VA
  const iaOverVa = cmul(cadd(C(1), C(-vwOverVa.re, -vwOverVa.im)), C(1 / rpa)) // corriente que carga al nodo A
  const va = cmul(C(1 / stage.r7), cinv(cadd(cadd(C(1 / stage.r7), y5), iaOverVa))) // KCL en A, Vin = 1
  const vw = cmul(va, vwOverVa)
  const vo = cadd(va, cmul(C(stage.rFeedback / rpn), cadd(va, C(-vw.re, -vw.im)))) // KCL en la entrada inversora
  return vo
}

test('formato: unidades y notación científica en español', () => {
  assert.equal(si(4700, 'Ω'), '4,7 kΩ')
  assert.equal(si(47e-9, 'F'), '47 nF')
  assert.equal(si(51e-12, 'F'), '51 pF')
  assert.equal(si(176000, 'Ω'), '176 kΩ')
  assert.equal(sci(4700, 'Ω'), '4,7×10³ Ω')
  assert.equal(sci(47e-9, 'F'), '4,7×10⁻⁸ F')
  assert.equal(num(0.2), '0,2')
})

test('Tube Screamer: valores publicados del circuito', () => {
  const stage = overdriveTS.stages[0]
  const min = clipperValues(stage, { drive: 0 })
  const max = clipperValues(stage, { drive: 1 })
  assert.ok(Math.abs(min.fcHp - 720.5) < 1, `f1 = ${min.fcHp}`) // 1/(2π·4,7k·47n) ≈ 720 Hz
  assert.ok(Math.abs(min.gainTotal - 11.85) < 0.05, `G mín = ${min.gainTotal}`) // ≈ 12
  assert.ok(Math.abs(max.gainTotal - 118.2) < 0.2, `G máx = ${max.gainTotal}`) // ≈ 118 (41 dB)
  assert.ok(Math.abs(min.fcLp - 61.2e3) < 0.3e3, `f2 mín = ${min.fcLp}`) // ≈ 61 kHz
  assert.ok(Math.abs(max.fcLp - 5.66e3) < 0.05e3, `f2 máx = ${max.fcLp}`) // ≈ 5,7 kHz
})

test('la función de transferencia del tono coincide con la resolución nodal del circuito', () => {
  const stage = overdriveTS.stages[1]
  for (const x of [0, 0.1, 0.5, 0.9, 1]) {
    for (const f of [30, 200, 720, 1500, 3000, 8000, 15000]) {
      const a = evalAnalogBiquad(toneNetwork(stage, { tone: x }), f)
      const b = toneNodal(stage, x, f)
      const err = Math.hypot(a.re - b.re, a.im - b.im) / Math.hypot(b.re, b.im)
      assert.ok(err < 1e-9, `x = ${x}, f = ${f} Hz: error relativo ${err}`)
    }
  }
})

test('tono: a mitad de giro es casi plano respecto del pasa-bajos fijo, hacia los graves recorta y hacia los agudos realza', () => {
  const stage = overdriveTS.stages[1]
  const at = (x, f) => dB(Math.hypot(...Object.values(evalAnalogBiquad(toneNetwork(stage, { tone: x }), f))))
  assert.ok(at(0, 3000) < at(0.5, 3000) - 3, 'Tone al mínimo debe recortar agudos')
  assert.ok(at(1, 3000) > at(0.5, 3000) + 3, 'Tone al máximo debe realzar agudos')
  assert.ok(Math.abs(at(0.5, 100) - at(0.5, 50)) < 1.5, 'respuesta estable en graves')
})

test('el procesador reproduce la respuesta en frecuencia calculada (señal chica)', () => {
  // Con señal de 10 µV los diodos casi no conducen y valen las cuentas de pequeña señal.
  for (const knobs of [defaultKnobs(overdriveTS), { drive: 1, tone: 1, level: 1 }, { drive: 0, tone: 0, level: 0.5 }]) {
    for (const [freq, tolDb] of [[100, 0.3], [300, 0.3], [720, 0.3], [1500, 0.3], [3000, 0.5], [6000, 1.2], [10000, 3]]) {
      const amp = 1e-5
      const out = run(coreFor(overdriveTS, knobs), sine(freq, amp, 0.9))
      const measured = dB(amplitudeAt(out, freq) / amp)
      let h = { re: 1, im: 0 }
      for (const s of overdriveTS.stages) h = cmul(h, stageResponse(s, knobs, freq))
      const expected = dB(Math.hypot(h.re, h.im))
      assert.ok(
        Math.abs(measured - expected) <= tolDb,
        `f = ${freq} Hz, perillas ${JSON.stringify(knobs)}: medido ${measured.toFixed(2)} dB, calculado ${expected.toFixed(2)} dB`,
      )
    }
  }
})

test('responseCurve da la joroba de medios con el Drive al mínimo', () => {
  const curve = responseCurve(overdriveTS, { drive: 0, tone: 0.5, level: 1 })
  const at = (f) => curve.reduce((best, p) => (Math.abs(p.f - f) < Math.abs(best.f - f) ? p : best)).db
  assert.ok(at(30) < at(720) - 6, 'los graves tienen que quedar bastante más abajo que los medios')
  assert.ok(at(10000) < at(720) - 6, 'los agudos también')
})

test('los diodos en la realimentación recortan de forma simétrica y suave', () => {
  const clip = (vin) => peaks(run(coreFor({ ...overdriveTS, stages: [overdriveTS.stages[0]] }, { drive: 1 }), sine(1000, vin, 0.5)))
  const loud = clip(0.3)
  assert.ok(Math.abs(loud.max + loud.min) < 0.01, `asimetría ${loud.max} / ${loud.min}`)
  assert.ok(loud.max > 0.5 && loud.max < 1.2, `pico ${loud.max}`)
  const soft = clip(0.05)
  assert.ok(soft.max < loud.max, 'con menos señal, el recorte llega menos alto (rodilla suave)')
})

test('averías: cada falla cambia el comportamiento como se explica en el juego', () => {
  const clipOnly = (pedal, vin = 0.3) => peaks(run(coreFor({ ...pedal, stages: [pedal.stages[0]] }, { drive: 1 }), sine(1000, vin, 0.5)))
  const healthy = clipOnly(overdriveTS)
  // D2 abierto → recorte asimétrico
  const d2 = clipOnly(applyFaults(overdriveTS, [{ ref: 'D2', mode: 'open' }]))
  assert.ok(Math.abs(d2.min) > Math.abs(d2.max) + 0.15, `D2 abierto: ${d2.max} / ${d2.min}`)
  // C3 abierto, C4 en corto y D1 en corto → ganancia 1 (la señal sale como entró: 0,3 V)
  for (const fault of [{ ref: 'C3', mode: 'open' }, { ref: 'C4', mode: 'short' }, { ref: 'D1', mode: 'short' }]) {
    const p = clipOnly(applyFaults(overdriveTS, [fault]))
    assert.ok(Math.abs(p.max - 0.3) < 0.02, `${fault.ref} ${fault.mode}: pico ${p.max} (sano: ${healthy.max})`)
  }
  // C5 abierto → más agudos y más fuerte
  const chord = synthesizeChord(CHORDS[0], FS).map((v) => v * 0.3)
  const knobs = { drive: 0.5, tone: 0.5, level: 0.7 }
  const good = run(coreFor(overdriveTS, knobs), chord)
  const c5 = run(coreFor(applyFaults(overdriveTS, [{ ref: 'C5', mode: 'open' }]), knobs), chord)
  const energy = (x) => x.reduce((s, v) => s + v * v, 0)
  assert.ok(energy(c5) > energy(good) * 1.5, 'sin C5 llega más energía (más agudos)')
  // P3 abierto → silencio
  const p3 = run(coreFor(applyFaults(overdriveTS, [{ ref: 'P3', mode: 'open' }]), knobs), chord)
  assert.ok(p3.every((v) => Math.abs(v) < 1e-6))
})

test('multímetro y componentes de la placa', () => {
  const comp = (ref) => overdriveTS.board.find((c) => c.ref === ref)
  assert.equal(componentValue(overdriveTS, comp('R4')), 4700)
  assert.equal(componentValue(overdriveTS, comp('C3')), 47e-9)
  assert.match(measure(overdriveTS, [], comp('R4')), /kΩ/)
  assert.equal(measure(overdriveTS, [{ ref: 'R4', mode: 'open' }], comp('R4')), 'OL (circuito abierto)')
  assert.match(measure(overdriveTS, [{ ref: 'C3', mode: 'open' }], comp('C3')), /≈ 0 pF/)
  assert.match(measure(overdriveTS, [{ ref: 'D1', mode: 'short' }], comp('D1')), /0,000 V/)
  assert.equal(measure(overdriveTS, [], comp('C3')), measure(overdriveTS, [], comp('C3')), 'medición repetible')
  for (const s of TS_SCENARIOS) assert.ok(overdriveTS.board.some((c) => c.ref === s.fault.ref), `${s.id}: el componente existe`)
  assert.equal(computeScore(0, 0), 100)
  assert.equal(computeScore(3, 1), 45)
  assert.equal(computeScore(20, 5), 0)
})

test('el sobremuestreo mantiene el aliasing bajo y nada produce NaN', () => {
  // Caso exigente: 7 kHz con el Drive al máximo a 44,1 kHz. La 5.ª armónica (35 kHz) se pliega a 9,1 kHz.
  // En una corrida a 176,4 kHz ese producto ni existe (queda en el piso numérico).
  const fs = 44100
  const core = new PedalCore(fs)
  core.setConfig({ bypass: false, blocks: compilePedal({ ...overdriveTS, stages: [overdriveTS.stages[0]] }, { drive: 1 }) })
  const out = run(core, sine(7000, 0.3, 0.5, fs))
  const aliasDb = dB(amplitudeAt(out, 9100, fs) / amplitudeAt(out, 7000, fs))
  assert.ok(aliasDb < -40, `aliasing a ${aliasDb.toFixed(1)} dB del fundamental`)
  assert.ok(out.every(Number.isFinite))
})

test('bypass: la señal pasa igual y los cambios de perilla y de falla no rompen nada', () => {
  const core = new PedalCore(FS)
  core.setConfig({ bypass: true, blocks: compilePedal(overdriveTS, defaultKnobs(overdriveTS)) })
  core.mix = 0
  const x = sine(440, 0.3, 0.3)
  const out = run(core, x)
  for (let i = 0; i < x.length; i++) assert.ok(Math.abs(out[i] - x[i]) < 1e-6)
  // mover perillas y cambiar de falla mientras suena
  const core2 = new PedalCore(FS)
  const chunks = []
  for (let step = 0; step < 60; step++) {
    const knobs = { drive: step / 59, tone: 1 - step / 59, level: 0.7 }
    const fault = step % 12 === 11 ? [{ ref: TS_SCENARIOS[step % TS_SCENARIOS.length].fault.ref, mode: TS_SCENARIOS[step % TS_SCENARIOS.length].fault.mode }] : []
    core2.setConfig({ bypass: step % 10 === 9, blocks: compilePedal(applyFaults(overdriveTS, fault), knobs) })
    chunks.push(run(core2, sine(220, 0.3, 0.02)))
  }
  assert.ok(chunks.every((c) => c.every((v) => Number.isFinite(v) && Math.abs(v) <= 1)))
})

test('acorde sintetizado: afinación, pico y repetibilidad', () => {
  for (const [freq, name] of [[82.41, 'E2'], [164.81, 'E3'], [329.63, 'E4']]) {
    const chord = { id: 't', name, notes: [{ name, freq }] }
    const s = synthesizeChord(chord, FS, 1.5)
    const lo = Math.floor((FS / freq) * 0.8)
    const hi = Math.ceil((FS / freq) * 1.2)
    const start = Math.round(0.3 * FS)
    const len = Math.round(0.5 * FS)
    let best = lo
    let bestVal = -Infinity
    for (let lag = lo; lag <= hi; lag++) {
      let acc = 0
      for (let i = 0; i < len; i++) acc += s[start + i] * s[start + i + lag]
      if (acc > bestVal) {
        bestVal = acc
        best = lag
      }
    }
    const measured = FS / best
    const cents = 1200 * Math.log2(measured / freq)
    assert.ok(Math.abs(cents) < 30, `${name}: medido ${measured.toFixed(2)} Hz, ${cents.toFixed(1)} cents`)
  }
  for (const chord of CHORDS) {
    const a = synthesizeChord(chord, FS)
    const b = synthesizeChord(chord, FS)
    const peak = a.reduce((m, v) => Math.max(m, Math.abs(v)), 0)
    assert.ok(Math.abs(peak - 1) < 1e-6, `${chord.id}: pico ${peak}`)
    assert.ok(a.every(Number.isFinite))
    assert.deepEqual(a, b)
  }
  assert.ok(Math.abs(strengthToPeakVolts(0) - 0.05) < 1e-9 && Math.abs(strengthToPeakVolts(1) - 0.5) < 1e-9)
})

test('código de colores de resistencias', async () => {
  const { resistorBands } = await import('../src/model/board.ts')
  assert.deepEqual(resistorBands(4700), ['yellow', 'violet', 'red', 'gold'])
  assert.deepEqual(resistorBands(220), ['red', 'red', 'brown', 'gold'])
  assert.deepEqual(resistorBands(51000), ['green', 'brown', 'orange', 'gold'])
  assert.deepEqual(resistorBands(1000), ['brown', 'black', 'red', 'gold'])
  assert.deepEqual(resistorBands(10000), ['brown', 'black', 'orange', 'gold'])
})
