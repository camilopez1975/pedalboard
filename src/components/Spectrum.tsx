import { useEffect, useRef } from 'react'
import { engine } from '../audio/engine.ts'
import { dominantPeak, drawSpectrum } from '../audio/spectrum.ts'
import { num } from '../model/format.ts'

interface SpectrumProps {
  /** true mientras suena el acorde: el gráfico se anima. */
  active: boolean
}

/** Analizador de espectro en tiempo real: lo que entra al pedal (gris) y lo que sale (verde). */
export function Spectrum({ active }: SpectrumProps) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    const g = canvas?.getContext('2d')
    if (!canvas || !g) return
    let raf = 0

    const frame = () => {
      const dpr = window.devicePixelRatio || 1
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
      }
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
      const info = engine.spectrumInfo
      const out = active ? engine.readSpectrum('out') : null
      const input = active ? engine.readSpectrum('in') : null
      let text = 'Tocá el acorde para ver el espectro'
      if (info && out) {
        const peak = dominantPeak(out, info.sampleRate)
        text = peak ? `Pico más fuerte: ${num(peak.f, 3)} Hz (${num(peak.db, 3)} dB)` : 'Sin señal'
      }
      drawSpectrum(g, w / dpr, h / dpr, info && out ? { input, output: out, sampleRate: info.sampleRate } : null, text)
      if (active) raf = requestAnimationFrame(frame)
    }

    frame()
    return () => cancelAnimationFrame(raf)
  }, [active])

  return <canvas ref={ref} className="spectrum" />
}
