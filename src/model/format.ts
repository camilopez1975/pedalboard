/** Formato de números en español (coma decimal) y con prefijos del SI. */

/** Número con `sig` cifras significativas y coma decimal. */
export function num(value: number, sig = 3): string {
  if (!Number.isFinite(value)) return '—'
  if (value === 0) return '0'
  const rounded = Number(value.toPrecision(sig))
  const text = Math.abs(rounded) >= 1e-6 || Math.abs(rounded) === 0 ? String(rounded) : rounded.toExponential(sig - 1)
  return text.replace('.', ',')
}

const PREFIXES: [number, string][] = [
  [1e9, 'G'],
  [1e6, 'M'],
  [1e3, 'k'],
  [1, ''],
  [1e-3, 'm'],
  [1e-6, 'µ'],
  [1e-9, 'n'],
  [1e-12, 'p'],
]

/** 4700, 'Ω' → "4,7 kΩ" · 47e-9, 'F' → "47 nF" */
export function si(value: number, unit: string, sig = 3): string {
  if (value === 0) return `0 ${unit}`
  const abs = Math.abs(value)
  const [factor, prefix] = PREFIXES.find(([f]) => abs >= f * 0.9995) ?? PREFIXES[PREFIXES.length - 1]
  return `${num(value / factor, sig)} ${prefix}${unit}`
}

const SUPERSCRIPT: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
}

/** Notación científica en unidades base: 4700, 'Ω' → "4,7×10³ Ω" · 47e-9, 'F' → "4,7×10⁻⁸ F" */
export function sci(value: number, unit: string, sig = 3): string {
  if (value === 0) return `0 ${unit}`
  const exp = Math.floor(Math.log10(Math.abs(value)))
  const mantissa = value / 10 ** exp
  if (exp === 0) return `${num(mantissa, sig)} ${unit}`
  const sup = String(exp)
    .split('')
    .map((c) => SUPERSCRIPT[c] ?? c)
    .join('')
  return `${num(mantissa, sig)}×10${sup} ${unit}`
}
