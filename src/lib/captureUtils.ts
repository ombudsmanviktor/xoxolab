// ─── DOM capture utilities ─────────────────────────────────────────────────
// html-to-image fails on oklch/oklab CSS colors (Tailwind v4).
//
// Root cause: html-to-image reads <style> tags AND fetches <link> stylesheets,
// then passes their text through its own CSS parser which does not support
// oklch/oklab. Patching computed styles on elements is not enough — the
// failure happens during stylesheet processing, before elements are touched.
//
// Fix: before calling toPng(), replace oklch/oklab in every stylesheet source
// with browser-resolved hex values (via canvas fillStyle round-trip), then
// restore the originals after capture.

/** Resolve a single oklch/oklab color string → '#rrggbb' via canvas. */
function resolveColor(color: string): string {
  try {
    const cvs = document.createElement('canvas')
    cvs.width = 1
    cvs.height = 1
    const ctx = cvs.getContext('2d')!
    ctx.fillStyle = color
    return ctx.fillStyle // always returns '#rrggbb' or 'rgba(r,g,b,a)'
  } catch {
    return color
  }
}

/** Replace all oklch(…) and oklab(…) occurrences in a CSS string with hex. */
function resolveOklchInCss(css: string): string {
  // Match oklch(...) or oklab(...) — no nested parens in these functions
  return css.replace(/ok(?:lch|lab)\([^)]+\)/gi, (match) => resolveColor(match))
}

/**
 * Capture a DOM element to a PNG data-URL.
 *
 * Patches all stylesheet sources (inline <style> + linked CSS files) to
 * replace oklch/oklab color values with browser-resolved hex equivalents
 * before calling html-to-image, then restores everything afterward.
 */
export async function captureToPng(el: HTMLElement, bgColor: string): Promise<string> {
  const { toPng } = await import('html-to-image')

  const cleanup: Array<() => void> = []

  // ── 1. Patch inline <style> elements ────────────────────────────────────
  for (const styleEl of Array.from(document.querySelectorAll<HTMLStyleElement>('style'))) {
    const orig = styleEl.textContent ?? ''
    if (!orig.includes('oklch') && !orig.includes('oklab')) continue
    styleEl.textContent = resolveOklchInCss(orig)
    cleanup.push(() => { styleEl.textContent = orig })
  }

  // ── 2. Patch linked stylesheets ──────────────────────────────────────────
  // Fetch each CSS file, resolve colors, inject as a new <style> with higher
  // specificity, and disable the original <link> so the browser uses our copy.
  const linkEls = Array.from(
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')
  )
  await Promise.all(linkEls.map(async (linkEl) => {
    try {
      const res = await fetch(linkEl.href, { cache: 'force-cache' })
      const css = await res.text()
      if (!css.includes('oklch') && !css.includes('oklab')) return

      const patchedStyle = document.createElement('style')
      patchedStyle.textContent = resolveOklchInCss(css)
      document.head.appendChild(patchedStyle)
      linkEl.disabled = true

      cleanup.push(() => {
        document.head.removeChild(patchedStyle)
        linkEl.disabled = false
      })
    } catch {
      // CORS or network error — skip
    }
  }))

  // ── 3. Capture ───────────────────────────────────────────────────────────
  try {
    return await toPng(el, { pixelRatio: 2, backgroundColor: bgColor })
  } finally {
    // ── 4. Restore all originals ──────────────────────────────────────────
    for (const fn of cleanup) fn()
  }
}
