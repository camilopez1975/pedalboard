import type { CSSProperties } from 'react'
import type { Knobs, PedalDef } from '../model/types.ts'
import { Knob } from './Knob.tsx'

interface PedalFaceProps {
  pedal: PedalDef
  knobs?: Knobs
  bypass: boolean
  /** false = solo para mirar (pedalera, miniaturas): las perillas y el pisón no responden. */
  interactive: boolean
  onKnob?: (id: string, value: number) => void
  onToggleBypass?: () => void
}

/** Frente del pedal con su pintura, perillas, chapa, LED y pisón. */
export function PedalFace({ pedal, knobs, bypass, interactive, onKnob, onToggleBypass }: PedalFaceProps) {
  const look = pedal.look
  const knobDefs = pedal.knobs.length > 0 ? pedal.knobs.map((k) => ({ id: k.id, label: k.label, value: knobs?.[k.id] ?? k.default })) : look.knobLabels.map((label) => ({ id: label, label, value: 0.5 }))
  const style = { '--pc': look.body, '--text': look.textColor, '--led': look.ledColor } as CSSProperties

  return (
    <div className={`face front shape-${look.shape} finish-${look.finish}${interactive ? '' : ' static'}`} style={style}>
      <div className="face-sheen" aria-hidden="true" />
      <div className="jack jack-l" aria-hidden="true">
        <span>IN</span>
      </div>
      <div className="jack jack-r" aria-hidden="true">
        <span>OUT</span>
      </div>
      <div className="face-bevel" aria-hidden="true" />
      <div className="screw s1" aria-hidden="true" />
      <div className="screw s2" aria-hidden="true" />

      <div className={`knob-row k${knobDefs.length}`}>
        {knobDefs.map((k) => (
          <Knob key={k.id} label={k.label} value={k.value} variant={look.knobStyle} disabled={!interactive} onChange={(v) => onKnob?.(k.id, v)} />
        ))}
      </div>
      <span className={bypass ? 'led3d' : 'led3d on'} aria-hidden="true" />

      <div className="stomp-frame">
        <div className="nameplate">
          <div className="nameplate-title">{look.title}</div>
          <div className="nameplate-sub">{look.subtitle}</div>
        </div>
        <button className="stomp" tabIndex={interactive ? 0 : -1} disabled={!interactive} onClick={onToggleBypass} aria-pressed={!bypass} aria-label={bypass ? 'Prender el pedal' : 'Apagar el pedal (bypass)'}>
          <span className="stomp-top" />
        </button>
      </div>
    </div>
  )
}
