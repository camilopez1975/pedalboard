import type { ReactNode } from 'react'
import { componentLabel, componentValue, resistorBands } from '../model/board.ts'
import type { BoardComponent, PedalDef } from '../model/types.ts'

interface BoardProps {
  pedal: PedalDef
  selectedRef: string | null
  onSelect: (ref: string | null) => void
  /** Mostrar el valor al lado del designador (modo taller). En el juego no se muestra: hay que medir. */
  showValues: boolean
  /** Componente a marcar en rojo (cuando el juego terminó). */
  highlightRef?: string | null
  /** Etapa cuyos componentes se destacan (el resto se atenúa). */
  activeStage?: string | null
}

const BAND_HEX: Record<string, string> = {
  black: '#1a1a1a',
  brown: '#7a4a21',
  red: '#d33a2c',
  orange: '#f08a24',
  yellow: '#f2d338',
  green: '#3fa34d',
  blue: '#2f6fd1',
  violet: '#8a4fc7',
  grey: '#9a9a9a',
  white: '#f1f1f1',
  gold: '#c9a227',
  silver: '#c4c4c4',
}

/** Trazos de cobre decorativos: no representan el cableado real. */
const TRACES = [
  'M20 62 H60 M108 62 H152 M200 62 H330 M376 62 H412 M460 62 H500',
  'M84 80 V100 M84 136 V230 M176 80 V100 M176 136 V178',
  'M352 80 V100 M352 136 V160 H392 V150 M436 80 V100 M436 136 V160 H392',
  'M128 214 V236 H84 M174 214 V236 H262 M392 240 V252 H440 M262 160 V230',
  'M20 20 H500 M20 280 H500',
]

function Resistor({ ohms }: { ohms: number | undefined }) {
  const bands = resistorBands(ohms ?? 0)
  return (
    <g>
      <line x1={-30} x2={30} y1={0} y2={0} className="b-lead" />
      <rect x={-20} y={-8} width={40} height={16} rx={7} className="b-resistor" />
      {bands.map((b, i) => (
        <rect key={i} x={-13 + i * 8 + (i === 3 ? 3 : 0)} y={-8} width={3.5} height={16} fill={BAND_HEX[b]} />
      ))}
    </g>
  )
}

function Capacitor() {
  return (
    <g>
      <line x1={-22} x2={22} y1={0} y2={0} className="b-lead" />
      <rect x={-14} y={-13} width={28} height={26} rx={4} className="b-cap" />
      <rect x={-14} y={-13} width={28} height={7} rx={3} className="b-cap-shine" />
    </g>
  )
}

function Diode() {
  return (
    <g>
      <line x1={-26} x2={26} y1={0} y2={0} className="b-lead" />
      <rect x={-15} y={-6} width={30} height={12} rx={6} className="b-diode" />
      <rect x={7} y={-6} width={4} height={12} className="b-diode-band" />
    </g>
  )
}

function Pot() {
  return (
    <g>
      <rect x={-26} y={-24} width={52} height={48} rx={6} className="b-pot-body" />
      <circle r={15} className="b-pot-ring" />
      <circle r={9} className="b-pot-shaft" />
      <line x1={0} x2={0} y1={-9} y2={-2} className="b-pot-mark" />
    </g>
  )
}

function Chip() {
  return (
    <g>
      {[-21, -7, 7, 21].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={-27} width={6} height={9} className="b-pin" />
          <rect x={x - 3} y={18} width={6} height={9} className="b-pin" />
        </g>
      ))}
      <rect x={-30} y={-19} width={60} height={38} rx={3} className="b-chip" />
      <path d="M-30 -5 a5 5 0 0 1 0 10" className="b-chip-notch" />
      <circle cx={-22} cy={12} r={2.2} className="b-chip-dot" />
    </g>
  )
}

function shape(c: BoardComponent, ohms: number | undefined): ReactNode {
  switch (c.kind) {
    case 'resistor':
      return <Resistor ohms={ohms} />
    case 'capacitor':
      return <Capacitor />
    case 'diode':
      return <Diode />
    case 'pot':
      return <Pot />
    case 'opamp':
      return <Chip />
  }
}

/** Placa de circuito impreso del pedal. Cada componente se puede tocar para ver qué es y qué hace. */
export function Board({ pedal, selectedRef, onSelect, showValues, highlightRef, activeStage }: BoardProps) {
  return (
    <svg className="board" viewBox="0 0 520 300" role="group" aria-label={`Placa del ${pedal.name}`} onClick={() => onSelect(null)}>
      <defs>
        <radialGradient id="pcb-glow" cx="50%" cy="40%" r="75%">
          <stop offset="0" stopColor="#1f7a46" />
          <stop offset="1" stopColor="#0f4a2a" />
        </radialGradient>
      </defs>
      <rect x={4} y={4} width={512} height={292} rx={12} fill="url(#pcb-glow)" className="b-pcb" />
      {[
        [16, 16],
        [504, 16],
        [16, 284],
        [504, 284],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={6} className="b-hole" />
          <circle cx={x} cy={y} r={3} className="b-hole-in" />
        </g>
      ))}
      {TRACES.map((d) => (
        <path key={d} d={d} className="b-trace" />
      ))}

      {pedal.board.map((c) => {
        const selected = selectedRef === c.ref
        const bad = highlightRef === c.ref
        const nominal = c.kind === 'resistor' ? componentValue(pedal, c) : undefined
        const vertical = c.rot === 90
        const labelAt = vertical
          ? c.x < 150
            ? { x: -18, y: 4, anchor: 'end' as const }
            : { x: 18, y: 4, anchor: 'start' as const }
          : c.kind === 'pot'
            ? { x: 0, y: 40, anchor: 'middle' as const }
            : c.kind === 'resistor'
              ? { x: 0, y: -16, anchor: 'middle' as const }
              : c.kind === 'capacitor' && c.x > 380
                ? { x: -20, y: 4, anchor: 'end' as const }
                : { x: 0, y: 30, anchor: 'middle' as const }
        return (
          <g
            key={c.ref}
            transform={`translate(${c.x} ${c.y})`}
            className={`b-comp${selected ? ' selected' : ''}${bad ? ' bad' : ''}${activeStage && c.stageId !== activeStage ? ' dim' : ''}${activeStage && c.stageId === activeStage ? ' lit' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`${c.ref}${showValues ? ' ' + componentLabel(pedal, c) : ''}`}
            aria-pressed={selected}
            onClick={(e) => {
              e.stopPropagation()
              onSelect(selected ? null : c.ref)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(selected ? null : c.ref)
              }
            }}
          >
            <rect x={-38} y={-34} width={76} height={68} rx={10} className="b-halo" />
            <g transform={`rotate(${c.rot ?? 0})`}>{shape(c, nominal)}</g>
            <text x={labelAt.x} y={labelAt.y} textAnchor={labelAt.anchor} className="b-label">
              {c.ref}
              {showValues && c.kind !== 'opamp' ? ` · ${componentLabel(pedal, c)}` : ''}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
