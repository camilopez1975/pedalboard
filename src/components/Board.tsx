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

type Stop = [number, string, number?]

/** Degradé en dos direcciones: "v" (de arriba hacia abajo) para piezas horizontales y "h" para las giradas 90°, así la luz siempre viene de arriba. */
function Lin({ id, stops }: { id: string; stops: Stop[] }) {
  const items = () => stops.map(([o, c, op]) => <stop key={o} offset={o} stopColor={c} stopOpacity={op ?? 1} />)
  return (
    <>
      <linearGradient id={`${id}-v`} x1="0" y1="0" x2="0" y2="1">
        {items()}
      </linearGradient>
      <linearGradient id={`${id}-h`} x1="0" y1="0" x2="1" y2="0">
        {items()}
      </linearGradient>
    </>
  )
}

const dir = (rot: number) => (rot === 90 ? 'h' : 'v')

function Pad({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6.5} fill="url(#g-solder)" />
      <circle cx={x} cy={y} r={2.2} className="b-hole-in" />
    </g>
  )
}

function Lead({ x1, x2 }: { x1: number; x2: number }) {
  return (
    <g>
      <line x1={x1} x2={x2} y1={0} y2={0} className="b-lead" />
      <line x1={x1} x2={x2} y1={-0.9} y2={-0.9} className="b-lead-shine" />
    </g>
  )
}

function Resistor({ ohms, rot }: { ohms: number | undefined; rot: number }) {
  const bands = resistorBands(ohms ?? 0)
  const d = dir(rot)
  return (
    <g>
      <Pad x={-30} y={0} />
      <Pad x={30} y={0} />
      <Lead x1={-30} x2={-17} />
      <Lead x1={17} x2={30} />
      <rect x={-17} y={-6.5} width={34} height={13} rx={3} fill={`url(#g-res-${d})`} stroke="#6f5f3d" strokeWidth={0.6} />
      {[-1, 1].map((sgn) => (
        <rect key={sgn} x={sgn < 0 ? -21 : 13} y={-8.5} width={8} height={17} rx={4} fill={`url(#g-res-${d})`} stroke="#6f5f3d" strokeWidth={0.6} />
      ))}
      {bands.map((b, i) => (
        <rect key={i} x={-13 + i * 6.2 + (i === 3 ? 2.5 : 0)} y={-6.5} width={3.2} height={13} fill={BAND_HEX[b]} />
      ))}
      <rect x={-21} y={-8.5} width={42} height={17} rx={5} fill={`url(#g-shade-${d})`} />
      <rect x={-15} y={-5.4} width={30} height={2} rx={1} fill="#fff" opacity={0.55} />
    </g>
  )
}

function Capacitor({ rot }: { rot: number }) {
  const d = dir(rot)
  return (
    <g>
      <Pad x={-22} y={0} />
      <Pad x={22} y={0} />
      <Lead x1={-22} x2={-12} />
      <Lead x1={12} x2={22} />
      <rect x={-14} y={-13} width={28} height={26} rx={5} fill={`url(#g-cap-${d})`} stroke="#7a470d" strokeWidth={0.8} />
      <rect x={-11.5} y={-10.5} width={23} height={21} rx={3.5} fill={`url(#g-captop-${d})`} stroke="#fff" strokeOpacity={0.25} strokeWidth={0.6} />
      <rect x={-9} y={-9} width={18} height={4} rx={2} fill="#fff" opacity={0.5} />
      <rect x={-14} y={-13} width={28} height={26} rx={5} fill={`url(#g-shade-${d})`} opacity={0.7} />
    </g>
  )
}

function Diode({ rot }: { rot: number }) {
  const d = dir(rot)
  return (
    <g>
      <Pad x={-30} y={0} />
      <Pad x={30} y={0} />
      <Lead x1={-30} x2={-18} />
      <Lead x1={18} x2={30} />
      <rect x={-19} y={-3} width={5} height={6} fill="#9aa0a6" />
      <rect x={14} y={-3} width={5} height={6} fill="#9aa0a6" />
      <rect x={-15} y={-7} width={30} height={14} rx={7} fill={`url(#g-glass-${d})`} stroke="#5a2f08" strokeWidth={0.7} />
      <rect x={6} y={-7} width={5} height={14} fill={`url(#g-band-${d})`} />
      <rect x={-11} y={-5.4} width={19} height={2.2} rx={1.1} fill="#fff" opacity={0.65} />
    </g>
  )
}

function Pot() {
  return (
    <g>
      {[-14, 0, 14].map((x) => (
        <g key={x}>
          <rect x={x - 2} y={22} width={4} height={9} fill="url(#g-pin-h)" />
          <Pad x={x} y={36} />
        </g>
      ))}
      <rect x={-26} y={-24} width={52} height={48} rx={7} fill="url(#g-potbody-v)" stroke="#5c5f64" strokeWidth={0.8} />
      <rect x={-23} y={-21} width={46} height={42} rx={5} fill="none" stroke="#fff" strokeOpacity={0.45} strokeWidth={0.8} />
      <circle r={17} fill="#1b1c1f" />
      <circle r={15.5} fill="url(#g-bushing)" />
      <circle r={15.5} fill="none" stroke="#2c2e32" strokeWidth={1} strokeDasharray="1.2 1.2" opacity={0.6} />
      <circle r={9.5} fill="url(#g-shaft)" stroke="#5c5f64" strokeWidth={0.7} />
      <rect x={-1.4} y={-9.5} width={2.8} height={19} fill="#2b2d31" />
      <ellipse cx={-3.5} cy={-5} rx={3.5} ry={2} fill="#fff" opacity={0.6} />
    </g>
  )
}

function Chip() {
  return (
    <g>
      {[-21, -7, 7, 21].map((x) => (
        <g key={x}>
          <rect x={x - 3} y={-28} width={6} height={11} rx={1} fill="url(#g-pin-h)" />
          <rect x={x - 3} y={17} width={6} height={11} rx={1} fill="url(#g-pin-h)" />
          <Pad x={x} y={-32} />
          <Pad x={x} y={32} />
        </g>
      ))}
      <rect x={-30} y={-19} width={60} height={38} rx={4} fill="url(#g-chip-v)" stroke="#000" strokeWidth={0.8} />
      <rect x={-28} y={-17} width={56} height={34} rx={3} fill="none" stroke="#fff" strokeOpacity={0.16} strokeWidth={1} />
      <rect x={-26} y={-16} width={52} height={5} rx={2.5} fill="#fff" opacity={0.1} />
      <path d="M-30 -5 a5 5 0 0 1 0 10" className="b-chip-notch" />
      <circle cx={-22} cy={12} r={2.2} className="b-chip-dot" />
    </g>
  )
}

/** Cuánto sobresale cada pieza de la placa: manda el largo de su sombra. */
const HEIGHT: Record<BoardComponent['kind'], number> = { resistor: 3, diode: 3, capacitor: 6, pot: 9, opamp: 7 }

function shape(c: BoardComponent, ohms: number | undefined, rot: number): ReactNode {
  switch (c.kind) {
    case 'resistor':
      return <Resistor ohms={ohms} rot={rot} />
    case 'capacitor':
      return <Capacitor rot={rot} />
    case 'diode':
      return <Diode rot={rot} />
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
          <stop offset="0" stopColor="#22884d" />
          <stop offset="1" stopColor="#0d4326" />
        </radialGradient>
        <radialGradient id="g-solder" cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="#fff3c4" />
          <stop offset="0.5" stopColor="#d9a441" />
          <stop offset="1" stopColor="#8a5f12" />
        </radialGradient>
        <radialGradient id="g-bushing" cx="38%" cy="32%" r="80%">
          <stop offset="0" stopColor="#f4f5f7" />
          <stop offset="0.55" stopColor="#a4a8ae" />
          <stop offset="1" stopColor="#5c5f65" />
        </radialGradient>
        <radialGradient id="g-shaft" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.6" stopColor="#b9bcc2" />
          <stop offset="1" stopColor="#6f7379" />
        </radialGradient>
        <Lin id="g-res" stops={[[0, '#f6e9c6'], [0.45, '#d8c49a'], [1, '#85724a']]} />
        <Lin id="g-shade" stops={[[0, '#fff', 0.5], [0.4, '#fff', 0], [1, '#000', 0.45]]} />
        <Lin id="g-cap" stops={[[0, '#ffc65a'], [0.5, '#e69a2e'], [1, '#9c5a12']]} />
        <Lin id="g-captop" stops={[[0, '#ffd988'], [1, '#e9a238']]} />
        <Lin id="g-glass" stops={[[0, '#ffe3a8'], [0.45, '#e58f2c'], [1, '#6e3409']]} />
        <Lin id="g-band" stops={[[0, '#4a4a4e'], [0.5, '#161618'], [1, '#000']]} />
        <Lin id="g-potbody" stops={[[0, '#f0f2f4'], [0.5, '#c0c4ca'], [1, '#80848b']]} />
        <Lin id="g-chip" stops={[[0, '#4b4b52'], [0.2, '#2a2a2f'], [1, '#0b0b0d']]} />
        <linearGradient id="g-pin-h" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#80848b" />
          <stop offset="0.4" stopColor="#f6f7f9" />
          <stop offset="1" stopColor="#7a7e84" />
        </linearGradient>
        {[3, 6, 7, 9].map((h) => (
          <filter key={h} id={`b-shadow-${h}`} x="-30%" y="-30%" width="170%" height="190%" colorInterpolationFilters="sRGB">
            <feDropShadow dx={h * 0.45} dy={h * 0.7} stdDeviation={h * 0.32} floodColor="#021a0c" floodOpacity="0.8" />
          </filter>
        ))}
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
            ? { x: 0, y: -33, anchor: 'middle' as const }
            : c.kind === 'resistor'
              ? { x: 0, y: -16, anchor: 'middle' as const }
              : c.kind === 'capacitor' && c.x > 380
                ? { x: -20, y: 4, anchor: 'end' as const }
                : { x: 0, y: c.kind === 'opamp' ? 50 : 30, anchor: 'middle' as const }
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
            <g className="b-lift">
              <g filter={`url(#b-shadow-${HEIGHT[c.kind]})`}>
                <g transform={`rotate(${c.rot ?? 0})`}>{shape(c, nominal, c.rot ?? 0)}</g>
              </g>
            </g>
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
