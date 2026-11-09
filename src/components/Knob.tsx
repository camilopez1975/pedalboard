import { useRef } from 'react'

interface KnobProps {
  label: string
  /** Posición de 0 a 1. */
  value: number
  onChange: (value: number) => void
}

const MIN_ANGLE = -135
const MAX_ANGLE = 135
const PIXELS_FOR_FULL_TURN = 160
const TICKS = 11

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Perilla con aspecto de metal torneado: se arrastra hacia arriba/abajo con el mouse o el dedo, o se maneja con el teclado. */
export function Knob({ label, value, onChange }: KnobProps) {
  const drag = useRef<{ startY: number; startValue: number } | null>(null)
  const angle = MIN_ANGLE + value * (MAX_ANGLE - MIN_ANGLE)

  return (
    <div className="knob3d">
      <div className="knob3d-scale" aria-hidden="true">
        {Array.from({ length: TICKS }, (_, i) => (
          <span
            key={i}
            className="knob3d-tick"
            style={{ transform: `rotate(${MIN_ANGLE + (i / (TICKS - 1)) * (MAX_ANGLE - MIN_ANGLE)}deg)` }}
          />
        ))}
      </div>
      <div
        className="knob3d-dial"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { startY: e.clientY, startValue: value }
        }}
        onPointerMove={(e) => {
          if (!drag.current) return
          const dy = drag.current.startY - e.clientY
          onChange(clamp01(drag.current.startValue + dy / PIXELS_FOR_FULL_TURN))
        }}
        onPointerUp={() => {
          drag.current = null
        }}
        onPointerCancel={() => {
          drag.current = null
        }}
        onKeyDown={(e) => {
          const step: Record<string, number> = { ArrowUp: 0.02, ArrowRight: 0.02, ArrowDown: -0.02, ArrowLeft: -0.02, PageUp: 0.1, PageDown: -0.1 }
          if (e.key in step) {
            e.preventDefault()
            onChange(clamp01(value + step[e.key]))
          } else if (e.key === 'Home') {
            e.preventDefault()
            onChange(0)
          } else if (e.key === 'End') {
            e.preventDefault()
            onChange(1)
          }
        }}
      >
        <div className="knob3d-base" />
        <div className="knob3d-rotor" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="knob3d-knurl" />
          <div className="knob3d-cap">
            <span className="knob3d-mark" />
          </div>
        </div>
        <div className="knob3d-gloss" />
      </div>
      <div className="knob3d-label">{label}</div>
    </div>
  )
}
