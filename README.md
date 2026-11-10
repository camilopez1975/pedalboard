# Armá tu pedal

Web para armar un pedal de efectos, escucharlo mientras girás las perillas y aprender electrónica básica con las cuentas del circuito.
Un pedal disponible (overdrive tipo Tube Screamer) en 3D, con vista interior de la placa y modo juego, probado con un acorde de guitarra sintetizado.

## Cómo correrlo

Necesitás Node.js (18 o más nuevo; para `npm test`, 22.18 o más nuevo).

```bash
npm install
npm run dev        # abre la web en http://localhost:5173
npm test           # pruebas del modelo y del procesador de audio
npm run build      # versión para publicar, en dist/
```

El audio arranca recién cuando hacés clic en **Tocar acorde** (los navegadores no dejan sonar nada antes de un clic).

## Cómo está armado

```
public/worklets/pedal-processor.js   Procesador de audio (AudioWorklet). Ejecuta una lista de bloques.
src/model/types.ts                   Qué es un pedal: una lista de etapas con los valores de sus componentes.
src/model/pedals/                    Los pedales, escritos como datos (tube-screamer.ts es el primero).
src/model/analysis.ts                Respuesta en frecuencia calculada con las fórmulas del circuito.
src/model/compile.ts                 Pedal + perillas → bloques para el procesador.
src/model/explain.ts                 Textos y cuentas paso a paso de cada etapa.
src/audio/chord.ts                   Acorde de guitarra sintetizado (Karplus-Strong).
src/audio/engine.ts                  Conecta todo en el navegador (Web Audio).
src/components/                      Interfaz (React): Home, Workbench, PedalFace/PedalVisual, Board (placa), Game, Spectrum…
src/model/board.ts, game.ts          Placa, fallas, multímetro y averías del juego.
tests/                               Pruebas con el test runner de Node.
```

La idea central: **un pedal es dato, no código**. Del mismo dato salen el sonido, el gráfico, las explicaciones y, más adelante,
la lista de materiales y el esquemático. Para sumar el Big Muff o el Fuzz Face hay que escribir su lista de etapas en `src/model/pedals/`
(y, si usa componentes nuevos, como transistores, agregar ese tipo de etapa en `types.ts`, `analysis.ts`, `compile.ts`, `explain.ts` y el procesador).

Convención de escala del audio: 1,0 digital = 1 V. La "pegada" del acorde va de unos 50 mV a 500 mV de pico.

## Pantallas

- **Inicio**: una pedalera con los tres pedales cableados entre la guitarra y el ampli. Se abre el Tube Screamer; el Big Muff y el Fuzz Face
  aparecen como "Próximamente".
- **Banco de trabajo**: una ventana al estilo GarageBand. A la izquierda, cómo tocar (acorde, pegada, encendido/bypass) y el espectro en vivo.
  Al centro, el pedal **quieto** (no se mueve con el mouse); un selector Frente / Placa lo da vuelta. A la derecha, lo que corresponda al modo.
  Arriba, el interruptor **Detalles técnicos**: apagado muestra todo en palabras simples; encendido suma valores, fórmulas, cuentas y la
  respuesta en frecuencia. Se acuerda de tu elección en el navegador (`localStorage`).

## Modos

- **Taller**: perillas, ajustes guardados del pedal (por ejemplo "Ajuste tipo Stevie Ray Vaughan": las perillas se mueven suavemente hasta ahí) y el
  circuito etapa por etapa. Al dar vuelta el pedal podés tocar un componente (qué es y qué hace) y simular que se abre o se pone en corto para
  escuchar qué le pasa al sonido.
- **Pedal roto**: el "cliente" cuenta el síntoma y se resuelve en tres pasos: escuchar, medir con el multímetro (con libreta de anotaciones) y
  diagnosticar cuál falla y cómo. Empezás con 100 puntos: −10 por medición, −25 por diagnóstico equivocado. Hay 6 averías (`src/model/game.ts`).

## Qué tan fiel es

- El modelo del Tube Screamer pone los diodos **dentro de la realimentación** del operacional (ganancia 1 + Zf/Zg), con la ecuación de Shockley
  (parámetros típicos de un 1N914), sobremuestreo ×4 y filtro anti-alias. Las pruebas comparan el procesador contra la respuesta calculada
  con las fórmulas (diferencias de décimas de dB en señal chica).
- El aspecto del Tube Screamer (esmalte verde, tres perillas arriba, chapa y pisón) es un diseño propio inspirado en ese tipo de pedal; no copia logos ni
  tipografías de ningún fabricante. El "Ajuste tipo SRV" (Drive bajo, Level alto, Tone medio-alto) sale de lo que cuentan varias fuentes sobre cómo lo
  usaba Stevie Ray Vaughan, que no coinciden en los números exactos ni en si era un TS808 o un TS9: es un punto de partida.
- El control de tono es una **reconstrucción**: no está verificado el cableado exacto del potenciómetro ni los designadores R9/R10, y la
  disposición de la placa dibujada es ilustrativa. Los demás valores (Rg, Cg, Rf, Drive, Cf, R7/C5, R8/C6, potenciómetros) coinciden con análisis publicados.
- La salida del procesador se limita a ±2 V y el motor la baja a la mitad antes de los parlantes, para que los ajustes de mucha ganancia no saturen
  digitalmente la placa de sonido.
- No se modelan ruido, ancho de banda del operacional, etapa de entrada, buffer de salida, bypass ni batería.
- Los valores son de referencia: verificalos con un esquemático antes de construir.

## Lo que viene (según tus ideas)

- Big Muff y Fuzz Face.
- Conectar tu guitarra en vivo con la interfaz de audio.
- Que cada componente suene al cambiarlo, pedalboard donde importa el orden, amplificador, "decime cómo querés que suene", exportar a físico.
- Crear un pedal que no exista.
- Sección para aprender sobre cables y conexiones.
