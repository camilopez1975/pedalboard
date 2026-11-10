import type { PedalDef } from '../types.ts'

/**
 * Overdrive "tipo Tube Screamer" (TS808).
 *
 * Verificado contra análisis publicados del circuito (ElectroSmash, R.G. Keen y otros):
 *   - Rg = 4,7 kΩ y Cg = 47 nF → pasa-altos de 720 Hz en la realimentación.
 *   - Rf = 51 kΩ + potenciómetro de Drive de 500 kΩ, Cf = 51 pF → ganancia de ~12 a ~118 (41 dB),
 *     con un pasa-bajos que va de ~61 kHz a ~5,7 kHz.
 *   - Dos diodos de silicio (tipo 1N914/1N4148) en antiparalelo, DENTRO de la realimentación.
 *   - Tono: R7 = 1 kΩ con C5 = 0,22 µF a masa (pasa-bajos de ~723 Hz), potenciómetro de 20 kΩ y,
 *     desde su cursor, R8 = 220 Ω en serie con C6 = 0,22 µF (~3,3 kHz). Volumen: potenciómetro de 100 kΩ lineal.
 *
 * Lo que es una reconstrucción mía y NO está verificado: el cableado exacto del potenciómetro de tono
 * (en especial la resistencia fija del lado de la entrada inversora y la de realimentación, de 1 kΩ cada una),
 * los designadores R9 y R10 y la posición de los componentes en la placa dibujada.
 */
export const overdriveTS: PedalDef = {
  id: 'overdrive-ts',
  name: 'Overdrive tipo Tube Screamer',
  subtitle: 'Distorsión suave de medios marcados',
  color: '#2fbf4f',
  look: {
    shape: 'box',
    body: '#2fbf4f',
    finish: 'esmalte',
    knobStyle: 'negra',
    ledColor: '#ff2a2a',
    textColor: '#f4fff4',
    title: 'Tube Screamer',
    subtitle: 'Overdrive',
    knobLabels: ['Drive', 'Tone', 'Level'],
  },
  presets: [
    {
      id: 'srv',
      name: 'Ajuste tipo Stevie Ray Vaughan',
      note: 'Usaba el pedal casi como un empujón limpio para su ampli: Drive bajo, Level alto.',
      detail: 'Valores de una nota de Reverb: Drive a las 8:30, Tone al tope y Level a las 3. Otras fuentes ponen el Tone entre las 12 y las 3, y no coinciden en si era un TS808 o un TS9: tomalo como punto de partida, no como verdad exacta.',
      clock: { drive: '8:30', tone: 'al tope', level: '3:00' },
      knobs: { drive: 0.15, tone: 1, level: 0.8 },
    },
  ],
  available: true,
  knobs: [
    { id: 'drive', label: 'Drive', default: 0.5, hint: 'Cuánta ganancia se agrega antes de los diodos.' },
    { id: 'tone', label: 'Tone', default: 0.5, hint: 'Hacia la derecha, más brillo.' },
    { id: 'level', label: 'Level', default: 0.7, hint: 'Volumen de salida.' },
  ],
  stages: [
    {
      id: 'gain',
      type: 'opamp-diode-clipper',
      name: 'Ganancia y recorte (operacional con diodos)',
      description: 'Amplifica los medios y los recorta con diodos dentro de la realimentación.',
      rg: 4700,
      cg: 47e-9,
      rf: 51_000,
      rfPot: { knob: 'drive', max: 500_000, taper: 'log' },
      cf: 51e-12,
      // Parámetros típicos del modelo SPICE de un 1N914: Is = 2,52 nA, n = 1,752.
      diode: { name: '2 diodos de silicio (tipo 1N914) en antiparalelo', isD1: 2.52e-9, isD2: 2.52e-9, n: 1.752 },
      railVolts: 3.5,
    },
    {
      id: 'tone',
      type: 'ts-tone',
      name: 'Tono',
      description: 'Pasa-bajos fijo y control de brillo.',
      r7: 1000,
      rBias: 10_000,
      c5: 0.22e-6,
      r8: 220,
      c6: 0.22e-6,
      rFeedback: 1000,
      rFixedN: 1000,
      potKnob: 'tone',
      potTotal: 20_000,
    },
    {
      id: 'level',
      type: 'output-level',
      name: 'Volumen',
      description: 'Potenciómetro de nivel de salida.',
      knob: 'level',
      maxGain: 2,
      taper: 'lin',
      potTotal: 100_000,
    },
  ],
  board: [
    { ref: 'IC1', kind: 'opamp', role: 'Operacional doble (tipo JRC4558): una mitad es la etapa de ganancia, la otra es la del tono.', simple: 'El cerebro del pedal: un amplificador que agranda la señal de la guitarra. Una mitad hace la distorsión y la otra, el control de tono.', x: 262, y: 128 },
    { ref: 'R4', kind: 'resistor', stageId: 'gain', param: 'rg', role: 'Rg: con C3 forma el pasa-altos de 720 Hz y fija la ganancia (1 + Rf/Rg).', simple: 'Junto con C3 decide cuántos graves entran a la distorsión; por eso el sonido queda con medios marcados.', x: 84, y: 62 },
    { ref: 'C3', kind: 'capacitor', stageId: 'gain', param: 'cg', role: 'Cg: junto con R4 deja pasar los medios y agudos a la ganancia, pero no los graves.', simple: 'Deja pasar los medios y agudos a la amplificación y frena los graves. Si falla, el pedal casi no amplifica.', x: 84, y: 118 },
    { ref: 'R6', kind: 'resistor', stageId: 'gain', param: 'rf', role: 'Parte fija de Rf, en serie con el potenciómetro de Drive.', simple: 'Fija la amplificación mínima del pedal; el Drive se suma a esta.', x: 176, y: 62 },
    { ref: 'C4', kind: 'capacitor', stageId: 'gain', param: 'cf', role: 'Cf: pasa-bajos de la realimentación (recorta agudos de la ganancia).', simple: 'Le saca un poco de agudos a la distorsión para que suene menos áspera.', x: 176, y: 118 },
    { ref: 'D1', kind: 'diode', stageId: 'gain', param: 'd1', role: 'Recorta los picos positivos de la señal.', simple: 'Recorta los picos de arriba de la señal: de ahí sale la distorsión.', x: 128, y: 196, rot: 90 },
    { ref: 'D2', kind: 'diode', stageId: 'gain', param: 'd2', role: 'Recorta los picos negativos de la señal.', simple: 'Recorta los picos de abajo de la señal. Trabaja en pareja con D1.', x: 174, y: 196, rot: 90 },
    { ref: 'P1', kind: 'pot', stageId: 'gain', param: 'driveMax', role: 'Potenciómetro de Drive (500 kΩ log): cambia Rf y, con eso, la ganancia.', simple: 'La perilla de Drive: cuánta distorsión querés.', x: 84, y: 252 },
    { ref: 'R7', kind: 'resistor', stageId: 'tone', param: 'r7', role: 'Con C5 forma el pasa-bajos fijo de ~723 Hz de la etapa de tono.', simple: 'Junto con C5 suaviza los agudos más filosos antes del control de tono.', x: 352, y: 62 },
    { ref: 'C5', kind: 'capacitor', stageId: 'tone', param: 'c5', role: 'Capacitor del pasa-bajos principal (0,22 µF a masa).', simple: 'Acompaña a R7 en la suavizada de agudos. Si falta, el sonido queda áspero.', x: 352, y: 118 },
    { ref: 'R9', kind: 'resistor', stageId: 'tone', param: 'rBias', role: 'Polariza la entrada del operacional del tono (designador propio).', simple: 'Ayuda al control de tono a trabajar bien (acomoda la señal para el amplificador de esa etapa).', x: 436, y: 62 },
    { ref: 'R10', kind: 'resistor', stageId: 'tone', param: 'rFeedback', role: 'Realimentación del operacional del tono (designador propio).', simple: 'Parte del control de tono: ayuda a fijar cuánto se corrige el sonido.', x: 436, y: 118 },
    { ref: 'R8', kind: 'resistor', stageId: 'tone', param: 'r8', role: 'Con C6 forma la rama del cursor del tono (~3,3 kHz).', simple: 'Junto con C6 deja pasar los agudos hacia la perilla de Tone.', x: 392, y: 178, rot: 90 },
    { ref: 'C6', kind: 'capacitor', stageId: 'tone', param: 'c6', role: 'Capacitor de la rama del cursor del tono.', simple: 'Acompaña a R8 en ese camino de agudos.', x: 392, y: 222 },
    { ref: 'P2', kind: 'pot', stageId: 'tone', param: 'toneMax', role: 'Potenciómetro de Tone (20 kΩ).', simple: 'La perilla de Tone: más a la derecha, más brillo.', x: 262, y: 252 },
    { ref: 'P3', kind: 'pot', stageId: 'level', param: 'levelMax', role: 'Potenciómetro de volumen (100 kΩ lineal).', simple: 'La perilla de Level: el volumen final del pedal. Si está desconectada, no sale sonido.', x: 440, y: 252 },
  ],
  notes: [
    'Verificados contra análisis publicados: Rg, Cg, Rf, el potenciómetro de Drive, Cf, los diodos en la realimentación, R7/C5, R8/C6 y los potenciómetros.',
    'Reconstruido por mí y sin verificar: el cableado exacto del potenciómetro de tono (las resistencias fijas de 1 kΩ), los designadores R9 y R10 y la disposición de la placa.',
    'Los diodos se modelan con la ecuación de Shockley (parámetros típicos de un 1N914), dentro de la realimentación del operacional.',
    'No se modelan la etapa de entrada, el buffer de salida, el interruptor de bypass, el ruido, la batería ni el ancho de banda del operacional.',
  ],
}
