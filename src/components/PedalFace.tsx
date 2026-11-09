import { useRef } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react'
import type { Decor } from '../model/decor.ts'
import type { Knobs, PedalDef } from '../model/types.ts'
import { Knob } from './Knob.tsx'
import { StickerArt } from './Stickers.tsx'

interface PedalFaceProps {
  pedal: PedalDef
  decor: Decor
  knobs?: Knobs
  bypass: boolean
  /** false = solo para mirar (pedalera): las perillas y el pisón no responden. */
  interactive: boolean
  onKnob?: (id: string, value: number) => void
  onToggleBypass?: () => void
  /** true = se pueden mover los stickers. */
  decorating?: boolean
  selectedSticker?: string | null
  onSelectSticker?: (id: string | null) => void
  onMoveSticker?: (id: string, x: number, y: number) => void
  onRemoveSticker?: (id: string) => void
}

/** Ancho de un sticker de tamaño 1, en % del ancho del pedal: así se ve igual de grande en la pedalera y en el taller. */
const STICKER_PCT = 14

/** Frente del pedal con su pintura, perillas, chapa, LED, pisón y stickers. */
export function PedalFace({ pedal, decor, knobs, bypass, interactive, onKnob, onToggleBypass, decorating = false, selectedSticker = null, onSelectSticker, onMoveSticker, onRemoveSticker }: PedalFaceProps) {
  const root = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; startX: number; startY: number; x: number; y: number; w: number; h: number } | null>(null)

  const knobDefs = pedal.knobs.length > 0 ? pedal.knobs.map((k) => ({ id: k.id, label: k.label, value: knobs?.[k.id] ?? k.default })) : pedal.look.knobLabels.map((label) => ({ id: label, label, value: 0.5 }))

  function startDrag(e: PointerEvent<HTMLDivElement>, id: string, x: number, y: number) {
    if (!decorating || !root.current) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    onSelectSticker?.(id)
    const r = root.current.getBoundingClientRect()
    drag.current = { id, startX: e.clientX, startY: e.clientY, x, y, w: r.width || 1, h: r.height || 1 }
  }
  function moveDrag(e: PointerEvent<HTMLDivElement>) {
    const d = drag.current
    if (!d) return
    onMoveSticker?.(d.id, d.x + ((e.clientX - d.startX) / d.w) * 100, d.y + ((e.clientY - d.startY) / d.h) * 100)
  }
  function keyOnSticker(e: KeyboardEvent<HTMLDivElement>, id: string, x: number, y: number) {
    if (!decorating) return
    if (e.key === 'Delete' || e.key === 'Backspace') {
      e.preventDefault()
      onRemoveSticker?.(id)
      return
    }
    const nudge: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const n = nudge[e.key]
    if (n) {
      e.preventDefault()
      onMoveSticker?.(id, x + n[0], y + n[1])
    }
  }

  const style = { '--pc': decor.body, '--pat': decor.patternColor, '--text': decor.textColor, '--led': decor.ledColor } as CSSProperties

  return (
    <div
      ref={root}
      className={`face front shape-${pedal.look.shape} finish-${decor.finish}${decorating ? ' decorating' : ''}${interactive ? '' : ' static'}`}
      style={style}
      onPointerDown={(e) => {
        if (decorating && !(e.target as Element).closest('.sticker')) onSelectSticker?.(null)
      }}
    >
      <div className={`face-pattern pattern-${decor.pattern}`} aria-hidden="true" />
      <div className="face-sheen" aria-hidden="true" />
      <div className="jack jack-l" aria-hidden="true">
        <span>IN</span>
      </div>
      <div className="jack jack-r" aria-hidden="true">
        <span>OUT</span>
      </div>
      <div className="screw s1" aria-hidden="true" />
      <div className="screw s2" aria-hidden="true" />

      <div className="nameplate">
        <div className="nameplate-title">{decor.title}</div>
        <div className="nameplate-sub">{decor.subtitle}</div>
      </div>

      <div className="sticker-layer">
        {decor.stickers.map((s) => (
          <div
            key={s.id}
            className={`sticker${selectedSticker === s.id ? ' selected' : ''}`}
            style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.kind === 'texto' ? 'auto' : `${STICKER_PCT * s.scale}%`, aspectRatio: s.kind === 'texto' ? 'auto' : '1 / 1', fontSize: `calc(${s.scale} * 5.2cqw)`, transform: `translate(-50%, -50%) rotate(${s.rot}deg)` }}
            tabIndex={decorating ? 0 : -1}
            role={decorating ? 'button' : undefined}
            aria-label={decorating ? `Sticker ${s.kind}` : undefined}
            onPointerDown={(e) => startDrag(e, s.id, s.x, s.y)}
            onPointerMove={moveDrag}
            onPointerUp={() => {
              drag.current = null
            }}
            onPointerCancel={() => {
              drag.current = null
            }}
            onKeyDown={(e) => keyOnSticker(e, s.id, s.x, s.y)}
          >
            <StickerArt kind={s.kind} color={s.color} text={s.text} />
          </div>
        ))}
      </div>

      <div className="knob-row">
        {knobDefs.map((k) => (
          <Knob key={k.id} label={k.label} value={k.value} variant={decor.knobStyle} disabled={!interactive} onChange={(v) => onKnob?.(k.id, v)} />
        ))}
      </div>
      <span className={bypass ? 'led3d' : 'led3d on'} aria-hidden="true" />
      <button className="stomp" tabIndex={interactive ? 0 : -1} disabled={!interactive} onClick={onToggleBypass} aria-pressed={!bypass} aria-label={bypass ? 'Prender el pedal' : 'Apagar el pedal (bypass)'}>
        <span className="stomp-top" />
      </button>
    </div>
  )
}
