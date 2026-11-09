import { useRef } from 'react'
import type { KnobStyle } from '../model/types.ts'

interface KnobProps {
  label: string
  /** Posición de 0 a 1. */
  value: number
  onChange: (value: number) => void
  /** Aspecto de la perilla. */
  variant?: KnobStyle
  /** Solo decoración: no responde al mouse ni al teclado. */
  disabled?: boolean
}

const MIN_ANGLE = -135
const MAX_ANGLE = 135
const PIXELS_FOR_FULL_TURN = 160
const TICKS = 11

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Perilla con aspecto de metal torneado: se arrastra hacia arriba/abajo con el mouse o el dedo, o se maneja con el teclado. */
export function Knob({ label, value, onChange, variant = 'negra', disabled = false }: KnobProps) {
  const drag = useRef<{ startY: number; startValue: number } | null>(null)
  const angle = MIN_ANGLE + value * (MAX_ANGLE - MIN_ANGLE)

  return (
    <div className="knob3d" data-style={variant}>
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
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        onPointerDown={(e) => {
          if (disabled) return
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
          if (disabled) return
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
