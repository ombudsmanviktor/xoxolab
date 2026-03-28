// ─── DOM capture utilities ─────────────────────────────────────────────────
// html-to-image fails on oklch/oklab CSS colors (Tailwind v4).
// Before capture we inline-resolve those colors to hex via canvas.

const COLOR_PROPS = [
  'color',
  'background-color',
  'border-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'caret-color',
  'accent-color',
  'fill',
  'stroke',
] as const

function kebabToCamel(s: string): string {
  return s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
}

/** Resolve oklch/oklab → hex via canvas fillStyle round-trip. */
function resolveColor(color: string): string {
  if (!color || (!color.includes('oklch') && !color.includes('oklab'))) return color
  try {
    const cvs = document.createElement('canvas')
    cvs.width = 1
    cvs.height = 1
    const ctx = cvs.getContext('2d')!
    ctx.fillStyle = color
    return ctx.fillStyle // '#rrggbb' or 'rgba(r,g,b,a)'
  } catch {
    return color
  }
}

/**
 * Capture a DOM element to a PNG data-URL, resolving modern CSS colors first.
 */
export async function captureToPng(el: HTMLElement, bgColor: string): Promise<string> {
  const { toPng } = await import('html-to-image')

  const nodes = [el, ...Array.from(el.querySelectorAll<HTMLElement>('*'))]
  const restores: Array<() => void> = []

  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue
    const computed = window.getComputedStyle(node)
    const toRestore: Record<string, string> = {}
    let hasOverride = false

    for (const prop of COLOR_PROPS) {
      const val = computed.getPropertyValue(prop)
      if (!val || (!val.includes('oklch') && !val.includes('oklab'))) continue
      const camel = kebabToCamel(prop)
      toRestore[camel] = (node.style as unknown as Record<string, string>)[camel] ?? ''
      ;(node.style as unknown as Record<string, string>)[camel] = resolveColor(val)
      hasOverride = true
    }

    if (hasOverride) {
      restores.push(() => {
        for (const [prop, orig] of Object.entries(toRestore)) {
          ;(node.style as unknown as Record<string, string>)[prop] = orig
        }
      })
    }
  }

  try {
    return await toPng(el, { pixelRatio: 2, backgroundColor: bgColor })
  } finally {
    for (const restore of restores) restore()
  }
}
