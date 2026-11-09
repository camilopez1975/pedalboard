import type { StickerKind } from '../model/decor.ts'

interface StickerArtProps {
  kind: StickerKind
  color: string
  text?: string
}

/** Color de contraste (casi negro o blanco) para los detalles que van encima de `color`. */
function contrast(color: string): string {
  const n = parseInt(color.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#14161a' : '#ffffff'
}

/** Dibujo de un sticker. Todos están hechos con formas simples para que se vean bien a cualquier tamaño. */
export function StickerArt({ kind, color, text }: StickerArtProps) {
  const detail = contrast(color)
  const outline = { stroke: 'rgba(0,0,0,0.45)', strokeWidth: 0.8, strokeLinejoin: 'round' as const }

  if (kind === 'texto') {
    return (
      <span className="sticker-text" style={{ color, textShadow: '0 1px 0 rgba(0,0,0,0.45), 0 0 6px rgba(0,0,0,0.25)' }}>
        {text && text.length > 0 ? text : '…'}
      </span>
    )
  }

  let art
  switch (kind) {
    case 'estrella':
      art = <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" fill={color} {...outline} />
      break
    case 'rayo':
      art = <path d="M13.5 1.5 4 13.5h6l-1.5 9L20 9.5h-6.2z" fill={color} {...outline} />
      break
    case 'llama':
      art = (
        <g>
          <path d="M12 1.5c.8 3.6 5.6 6 5.6 11a5.6 5.6 0 0 1-11.2 0c0-2.2 1-3.6 2.2-5 .3 1.7 1.2 2.5 2 2.7C10.3 7.6 10.9 4.6 12 1.5z" fill={color} {...outline} />
          <path d="M12 12.5c.4 1.6 2.2 2.6 2.2 4.4a2.2 2.2 0 0 1-4.4 0c0-1.3 1.6-2.2 2.2-4.4z" fill="rgba(255,255,255,0.75)" />
        </g>
      )
      break
    case 'corazon':
      art = <path d="M12 21.5s-8.5-5.4-8.5-11.4A4.7 4.7 0 0 1 12 7.6a4.7 4.7 0 0 1 8.5 2.5c0 6-8.5 11.4-8.5 11.4z" fill={color} {...outline} />
      break
    case 'nota':
      art = (
        <g>
          <path d="M9 3.5v12.3a3.6 3.6 0 1 0 2.2 3.3V8.6h7.3V3.5z" fill={color} {...outline} />
        </g>
      )
      break
    case 'luna':
      art = <path d="M20.5 14.7A9 9 0 0 1 9.3 3.5a9 9 0 1 0 11.2 11.2z" fill={color} {...outline} />
      break
    case 'sol':
      art = (
        <g>
          {Array.from({ length: 8 }, (_, i) => (
            <line key={i} x1="12" y1="1.8" x2="12" y2="5" stroke={color} strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${i * 45} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="5.2" fill={color} {...outline} />
        </g>
      )
      break
    case 'flor':
      art = (
        <g>
          {Array.from({ length: 6 }, (_, i) => (
            <circle key={i} cx="12" cy="6" r="3.6" fill={color} {...outline} transform={`rotate(${i * 60} 12 12)`} />
          ))}
          <circle cx="12" cy="12" r="3" fill="#ffd60a" stroke="rgba(0,0,0,0.4)" strokeWidth="0.7" />
        </g>
      )
      break
    case 'carita':
      art = (
        <g>
          <circle cx="12" cy="12" r="10" fill={color} {...outline} />
          <circle cx="8.6" cy="9.6" r="1.4" fill={detail} />
          <circle cx="15.4" cy="9.6" r="1.4" fill={detail} />
          <path d="M7 14c1.2 3 8.8 3 10 0" fill="none" stroke={detail} strokeWidth="1.7" strokeLinecap="round" />
        </g>
      )
      break
    case 'paz':
      art = (
        <g fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round">
          <circle cx="12" cy="12" r="9.2" />
          <path d="M12 2.8v18.4M12 12l-6.5 6.5M12 12l6.5 6.5" />
        </g>
      )
      break
    case 'corona':
      art = <path d="M2.5 19V6.5l5 4.5L12 3.5l4.5 7.5 5-4.5V19z" fill={color} {...outline} />
      break
    case 'diamante':
      art = (
        <g>
          <path d="M6 3h12l4.2 6L12 21.5 1.8 9z" fill={color} {...outline} />
          <path d="M1.8 9h20.4M9 3 7 9l5 12.5M15 3l2 6-5 12.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="0.8" />
        </g>
      )
      break
    case 'calavera':
      art = (
        <g>
          <path d="M12 2a8.2 8.2 0 0 0-8.2 8.2c0 2.7 1.3 4.6 3.2 5.8V19a1 1 0 0 0 1 1h1.2v-2h1.2v2h1.6v-2h1.2v2H15a1 1 0 0 0 1-1v-3c1.9-1.2 3.2-3.1 3.2-5.8A8.2 8.2 0 0 0 12 2z" fill={color} {...outline} />
          <circle cx="8.6" cy="11" r="2.2" fill={detail} />
          <circle cx="15.4" cy="11" r="2.2" fill={detail} />
          <path d="M12 13.2l-1.3 2.6h2.6z" fill={detail} />
        </g>
      )
      break
  }
  return (
    <svg className="sticker-art" viewBox="0 0 24 24" aria-hidden="true">
      {art}
    </svg>
  )
}
