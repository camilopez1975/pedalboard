import { useState } from 'react'
import { BODY_COLORS, FINISH_NAMES, KNOB_STYLE_NAMES, LED_COLORS, MAX_STICKERS, PATTERN_NAMES, STICKER_COLORS, STICKER_KINDS, STICKER_NAMES } from '../model/decor.ts'
import type { StickerKind } from '../model/decor.ts'
import type { Finish, KnobStyle, Pattern, PedalDef } from '../model/types.ts'
import { useApp } from '../store.ts'
import { StickerArt } from './Stickers.tsx'

interface SwatchesProps {
  colors: string[]
  value: string
  onPick: (color: string) => void
  label: string
}

/** Fila de colores para elegir, más un selector libre al final. */
function Swatches({ colors, value, onPick, label }: SwatchesProps) {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colors.map((c) => (
        <button key={c} className={c.toLowerCase() === value.toLowerCase() ? 'swatch on' : 'swatch'} style={{ background: c }} aria-label={`${label} ${c}`} onClick={() => onPick(c)} />
      ))}
      <label className="swatch custom" title="Otro color">
        <input type="color" value={value} aria-label={`${label}: otro color`} onChange={(e) => onPick(e.target.value)} />
      </label>
    </div>
  )
}

interface DecorPanelProps {
  pedal: PedalDef
}

/** Panel para decorar el pedal: pintura, acabado, dibujo, perillas, letras, LED y stickers. */
export function DecorPanel({ pedal }: DecorPanelProps) {
  const decor = useApp((s) => s.decor[pedal.id])
  const selectedId = useApp((s) => s.selectedSticker)
  const patchDecor = useApp((s) => s.patchDecor)
  const addSticker = useApp((s) => s.addSticker)
  const updateSticker = useApp((s) => s.updateSticker)
  const removeSticker = useApp((s) => s.removeSticker)
  const bringFront = useApp((s) => s.bringStickerToFront)
  const resetDecor = useApp((s) => s.resetDecor)
  const [newColor, setNewColor] = useState('#ffffff')
  const [confirmReset, setConfirmReset] = useState(false)

  const selected = decor.stickers.find((s) => s.id === selectedId)
  const full = decor.stickers.length >= MAX_STICKERS

  return (
    <section className="panel decor">
      <h2>Decorar tu pedal</h2>
      <p className="hint">Todo se guarda en este navegador. Los stickers se arrastran sobre el pedal.</p>

      <h3>Pintura</h3>
      <Swatches label="Color del pedal" colors={BODY_COLORS} value={decor.body} onPick={(c) => patchDecor(pedal.id, { body: c })} />
      <div className="btn-row">
        {(Object.keys(FINISH_NAMES) as Finish[]).map((f) => (
          <button key={f} className={decor.finish === f ? 'chip active-ok' : 'chip'} onClick={() => patchDecor(pedal.id, { finish: f })}>
            {FINISH_NAMES[f]}
          </button>
        ))}
      </div>

      <h3>Dibujo</h3>
      <div className="btn-row">
        {(Object.keys(PATTERN_NAMES) as Pattern[]).map((p) => (
          <button key={p} className={decor.pattern === p ? 'chip active-ok' : 'chip'} onClick={() => patchDecor(pedal.id, { pattern: p })}>
            {PATTERN_NAMES[p]}
          </button>
        ))}
      </div>
      {decor.pattern !== 'ninguno' && <Swatches label="Color del dibujo" colors={['#ffffff', '#111111', ...BODY_COLORS.slice(0, 8)]} value={decor.patternColor} onPick={(c) => patchDecor(pedal.id, { patternColor: c })} />}

      <h3>Perillas</h3>
      <div className="btn-row">
        {(Object.keys(KNOB_STYLE_NAMES) as KnobStyle[]).map((k) => (
          <button key={k} className={decor.knobStyle === k ? 'chip active-ok' : 'chip'} onClick={() => patchDecor(pedal.id, { knobStyle: k })}>
            {KNOB_STYLE_NAMES[k]}
          </button>
        ))}
      </div>

      <h3>Letras</h3>
      <div className="field-row">
        <label className="field">
          Nombre
          <input type="text" maxLength={22} value={decor.title} onChange={(e) => patchDecor(pedal.id, { title: e.target.value })} />
        </label>
        <label className="field">
          Subtítulo
          <input type="text" maxLength={30} value={decor.subtitle} onChange={(e) => patchDecor(pedal.id, { subtitle: e.target.value })} />
        </label>
      </div>
      <Swatches label="Color de las letras" colors={['#ffffff', '#111111', '#ffd60a', '#ff4fa3', '#00e0ff', '#3dff8a']} value={decor.textColor} onPick={(c) => patchDecor(pedal.id, { textColor: c })} />

      <h3>LED</h3>
      <Swatches label="Color del LED" colors={LED_COLORS} value={decor.ledColor} onPick={(c) => patchDecor(pedal.id, { ledColor: c })} />

      <h3>
        Stickers <span className="count">{decor.stickers.length}/{MAX_STICKERS}</span>
      </h3>
      <Swatches label="Color del sticker nuevo" colors={STICKER_COLORS} value={newColor} onPick={setNewColor} />
      <div className="sticker-grid">
        {STICKER_KINDS.map((k: StickerKind) => (
          <button key={k} className="sticker-btn" disabled={full} title={STICKER_NAMES[k]} aria-label={`Agregar ${STICKER_NAMES[k]}`} onClick={() => addSticker(pedal.id, k, newColor)}>
            <StickerArt kind={k} color={newColor} text="Abc" />
          </button>
        ))}
      </div>

      {selected ? (
        <div className="sticker-edit">
          <h4>{STICKER_NAMES[selected.kind]} seleccionado</h4>
          {selected.kind === 'texto' && (
            <label className="field">
              Texto
              <input type="text" maxLength={24} value={selected.text ?? ''} onChange={(e) => updateSticker(pedal.id, selected.id, { text: e.target.value })} />
            </label>
          )}
          <label className="field">
            Tamaño
            <input type="range" min={0.4} max={3.5} step={0.05} value={selected.scale} onChange={(e) => updateSticker(pedal.id, selected.id, { scale: Number(e.target.value) })} />
          </label>
          <label className="field">
            Giro: {Math.round(selected.rot)}°
            <input type="range" min={0} max={359} step={1} value={selected.rot} onChange={(e) => updateSticker(pedal.id, selected.id, { rot: Number(e.target.value) })} />
          </label>
          <Swatches label="Color" colors={STICKER_COLORS} value={selected.color} onPick={(c) => updateSticker(pedal.id, selected.id, { color: c })} />
          <div className="btn-row">
            <button className="chip" onClick={() => bringFront(pedal.id, selected.id)}>
              Traer al frente
            </button>
            <button className="chip danger" onClick={() => removeSticker(pedal.id, selected.id)}>
              Borrar
            </button>
          </div>
        </div>
      ) : (
        <p className="hint">Tocá un sticker del pedal para moverlo, cambiarle el tamaño o borrarlo (también con la tecla Suprimir).</p>
      )}

      <div className="btn-row reset-row">
        <button
          className={confirmReset ? 'chip danger' : 'chip'}
          onClick={() => {
            if (confirmReset) {
              resetDecor(pedal.id)
              setConfirmReset(false)
            } else {
              setConfirmReset(true)
            }
          }}
          onBlur={() => setConfirmReset(false)}
        >
          {confirmReset ? '¿Seguro? Tocá de nuevo para borrar todo' : 'Volver al pedal de fábrica'}
        </button>
      </div>
    </section>
  )
}
