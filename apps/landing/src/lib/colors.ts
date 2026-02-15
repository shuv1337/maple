const SERVICE_HUES = [210, 160, 280, 340, 30, 100, 50, 190]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash)
  }
  return Math.abs(hash)
}

export function extractClassName(spanName: string): string | null {
  const dotMatch = spanName.match(/^(.+?)\.[\w]+$/)
  if (dotMatch) return dotMatch[1]
  const colonMatch = spanName.match(/^(.+?)::[\w]+$/)
  if (colonMatch) return colonMatch[1]
  return null
}

export function getSpanColorStyle(
  spanName: string,
  serviceName: string,
  services: string[]
): React.CSSProperties {
  const serviceIndex = services.indexOf(serviceName)
  const baseHue = SERVICE_HUES[serviceIndex % SERVICE_HUES.length]
  const className = extractClassName(spanName)

  let lightness = 0.55
  let chroma = 0.15

  if (className) {
    const classHash = hashString(className)
    lightness = 0.45 + (classHash % 20) / 100
    chroma = 0.12 + (classHash % 6) / 100
  }

  const bgColor = `oklch(${lightness} ${chroma} ${baseHue})`
  const textColor = lightness > 0.55 ? 'oklch(0.2 0 0)' : 'oklch(0.98 0 0)'

  return { backgroundColor: bgColor, color: textColor }
}

export function getServiceLegendColor(serviceName: string, services: string[]): string {
  const serviceIndex = services.indexOf(serviceName)
  const baseHue = SERVICE_HUES[serviceIndex % SERVICE_HUES.length]
  return `oklch(0.55 0.15 ${baseHue})`
}

export function calculateSelfTime(
  span: { startTime: string; durationMs: number },
  children: Array<{ startTime: string; durationMs: number }>
): number {
  if (children.length === 0) return span.durationMs

  const spanStartMs = new Date(span.startTime).getTime()
  const spanEndMs = spanStartMs + span.durationMs

  const childIntervals = children.map(child => {
    const childStartMs = new Date(child.startTime).getTime()
    const childEndMs = childStartMs + child.durationMs
    return {
      start: Math.max(childStartMs, spanStartMs),
      end: Math.min(childEndMs, spanEndMs)
    }
  }).filter(i => i.end > i.start)

  if (childIntervals.length === 0) return span.durationMs

  childIntervals.sort((a, b) => a.start - b.start)
  const merged: Array<{ start: number; end: number }> = []

  for (const interval of childIntervals) {
    if (merged.length === 0 || merged[merged.length - 1].end < interval.start) {
      merged.push({ ...interval })
    } else {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, interval.end)
    }
  }

  const childrenTime = merged.reduce((sum, i) => sum + (i.end - i.start), 0)
  return Math.max(0, span.durationMs - childrenTime)
}
