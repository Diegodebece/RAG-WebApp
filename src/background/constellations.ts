// Animated background: a slowly turning star field with the Southern Cross (Crux) and the Pointers.
// It is an artistic composition, not an astronomical projection: the Crux reaches the edge in 5 minutes.
//
// Two canvas layers keep it cheap. The field turns about a pixel per second, so it is redrawn 8 times per
// second; the Crux and the stroke that runs along it move fast, so their layer is redrawn 30 times per second
// and costs little (7 stars, 3 lines). Colors come from CSS variables and are read again whenever data-theme
// changes on <html>. It respects prefers-reduced-motion and stops while the tab is hidden.

const STARS_INTERVAL = 1000 / 8
const FRAME_INTERVAL = 1000 / 30
const TIME_TO_EDGE_SECONDS = 5 * 60
// Lines between stars are grouped into opacity levels and each level is stroked at once; the highest opacity
// is 0.17, so 24 levels are indistinguishable from the exact values.
const LINE_LEVELS = 24
const MAX_LINE_ALPHA = 0.17
// a star farther than this (depth below it) is drawn larger and blurrier, and gets no lines
const FAR_DEPTH = 0.28

type Vec = { x: number; y: number }
type Star = { x: number; y: number; r: number; phase: number; depth: number }
type Colors = { sky: string; line: string; star: string; active: string; crux: string; core: string }

// The Crux (first five) and the Pointers, Alpha then Beta Centauri, as [x, y, radius] in the figure's own
// units. The figure turns as a whole; the units are isotropic, so it never stretches with the window.
const CRUX = {
  cx: 0.73,
  cy: 0.46,
  delay: 1,
  tilt: Math.PI / 6,
  points: [
    [0, -0.48, 2.5], [-0.34, -0.05, 2], [0.29, -0.18, 2.6], [0.025, 0.475, 3.2], [-0.14, 0.2, 1.3],
    [-2.14, 0.75, 2.6], [-1.625, 0.3625, 2.3],
  ],
  edges: [[0, 3], [1, 2], [5, 6]],
}

const clamp = (x: number) => Math.max(0, Math.min(1, x))
const smooth = (x: number) => {
  const c = clamp(x)
  return c * c * (3 - 2 * c)
}

export type Constellations = {
  setPaused: (paused: boolean) => void
  destroy: () => void
}

export function startConstellations(skyCanvas: HTMLCanvasElement, cruxCanvas: HTMLCanvasElement): Constellations {
  const skyContext = skyCanvas.getContext('2d')
  const frontContext = cruxCanvas.getContext('2d')
  if (!skyContext || !frontContext) {
    throw new Error('Canvas 2D is not available')
  }
  const sky: CanvasRenderingContext2D = skyContext
  const front: CanvasRenderingContext2D = frontContext

  const root = document.documentElement
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')

  let w = 0
  let h = 0
  let dpr = 1
  let colors: Colors = { sky: '', line: '', star: '', active: '', crux: '', core: '' }
  let intensity = 1
  let glow = 1
  let lineIntensity = 1
  let clock = 0
  let last = 0
  let lastStars = 0
  let raf = 0
  let paused = false
  let pivot: Vec = { x: 0, y: 0 }
  let rotationPerSecond = 0
  let stars: Star[] = []
  let fieldSpan = 0

  // Positions live in reused typed arrays rather than thousands of new objects per frame.
  let px = new Float32Array(0)
  let py = new Float32Array(0)
  let visible = new Int32Array(0)
  let gx = new Int32Array(0)
  let gy = new Int32Array(0)
  const lineBuckets: number[][] = Array.from({ length: LINE_LEVELS }, () => [])
  const grid = new Map<number, number[]>()
  const neighbors: { j: number; d: number }[] = []
  const cellKey = (x: number, y: number) => (x + 512) * 4096 + (y + 512)

  // Seeded, so the sky is the same on every visit.
  let seed = 8042
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }

  function buildField() {
    seed = 8042
    fieldSpan = 2 * Math.hypot(Math.max(pivot.x, w - pivot.x), Math.max(pivot.y, h - pivot.y)) + 160
    const target = w < 600 ? 330 : 650
    const count = Math.min(18000, Math.ceil((target * fieldSpan * fieldSpan) / (w * h)))
    // A mix of scattered stars and small groups that share a depth.
    const clusters = Array.from({ length: Math.ceil(count / 28) }, () => ({ x: random(), y: random(), depth: random() }))
    stars = Array.from({ length: count }, (_, i) => {
      const group = clusters[Math.floor(random() * clusters.length)]
      const clustered = i % 3 !== 0
      const angle = random() * Math.PI * 2
      const spread = (Math.sqrt(random()) * 100) / fieldSpan
      return {
        x: clustered ? group.x + Math.cos(angle) * spread : random(),
        y: clustered ? group.y + Math.sin(angle) * spread : random(),
        r: 0.35 + Math.pow(random(), 2) * 1.9,
        phase: random() * Math.PI * 2,
        depth: clustered ? group.depth : random(),
      }
    })
    px = new Float32Array(count)
    py = new Float32Array(count)
    visible = new Int32Array(count)
    gx = new Int32Array(count)
    gy = new Int32Array(count)
  }

  function readColors() {
    const style = getComputedStyle(root)
    const read = (name: string) => style.getPropertyValue(`--${name}`).trim()
    colors = { sky: read('sky'), line: read('line'), star: read('star'), active: read('active'), crux: read('crux'), core: read('core') }
    intensity = parseFloat(read('intensity')) || 1
    glow = parseFloat(read('glow')) || 1
    lineIntensity = parseFloat(read('line-intensity')) || 1
  }

  function resize() {
    w = innerWidth
    h = innerHeight
    // a window without a size (a hidden tab) would build the field for an area of zero
    if (!w || !h) {
      return
    }
    dpr = Math.min(devicePixelRatio || 1, 2)
    for (const [canvas, g] of [[skyCanvas, sky], [cruxCanvas, front]] as const) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      g.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    // A pivot below the screen: the circular motion carries the Crux towards the right edge.
    pivot = { x: w * 0.5, y: h * 0.46 + Math.max(h * 0.8, w * 0.6) }
    const dx = CRUX.cx * w - pivot.x
    const dy = CRUX.cy * h - pivot.y
    const radius = Math.hypot(dx, dy)
    const initialAngle = Math.atan2(dy, dx)
    const edgeAngle = -Math.acos(Math.min(1, (w - pivot.x) / radius))
    rotationPerSecond = (edgeAngle - initialAngle) / TIME_TO_EDGE_SECONDS
    buildField()
    readColors()
    draw()
  }

  const rotationAt = (t: number) => (t * rotationPerSecond) % (Math.PI * 2)

  function line(g: CanvasRenderingContext2D, a: Vec, b: Vec, alpha: number, color: string, width: number) {
    g.globalAlpha = alpha * intensity
    g.strokeStyle = color
    g.lineWidth = width
    g.beginPath()
    g.moveTo(a.x, a.y)
    g.lineTo(b.x, b.y)
    g.stroke()
  }

  function dot(g: CanvasRenderingContext2D, x: number, y: number, r: number, alpha: number, blur: number, color: string) {
    g.globalAlpha = Math.min(1, alpha * intensity)
    g.fillStyle = color
    g.shadowColor = color
    g.shadowBlur = Math.round(blur * glow)
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.shadowBlur = 0
  }

  function renderCrux(g: CanvasRenderingContext2D) {
    const scale = Math.min(w * 0.3, h * 0.58)
    const shown = reduced.matches ? 1 : smooth((clock - CRUX.delay) / 2.5)
    const cos = Math.cos(CRUX.tilt)
    const sin = Math.sin(CRUX.tilt)
    const coords = CRUX.points.map(([x, y]) => ({ x: CRUX.cx * w + (x * cos - y * sin) * scale, y: CRUX.cy * h + (x * sin + y * cos) * scale }))

    CRUX.edges.forEach(([a, b], i) => {
      const reveal = reduced.matches ? 1 : smooth((clock - CRUX.delay - i * 0.15) / 1.7)
      line(g, coords[a], coords[b], 0.003 + reveal * 0.015, colors.crux, 0.4)
      if (reduced.matches) {
        return
      }
      // A short stroke runs along each connection and fades before the next run; a 14-second cycle leaves
      // a pause between runs.
      const cycle = 14
      const local = (clock - CRUX.delay - 2 - i * 1.4) % cycle
      if (clock <= CRUX.delay + 2 + i * 1.4 || local < 0 || local >= 2.2) {
        return
      }
      const progress = local / 2.2
      const tail = progress * 1.35 - 0.35
      const opacity = smooth(progress * 8) * (1 - smooth((progress - 0.72) / 0.28))
      const p = coords[a]
      const q = coords[b]
      // Small segments make the tail fade out gradually.
      for (let j = 0; j < 14; j++) {
        const u = tail + (j * 0.35) / 14
        const v = tail + ((j + 1) * 0.35) / 14
        if (v <= 0 || u >= 1) {
          continue
        }
        const from = clamp(u)
        const to = clamp(v)
        line(g, { x: p.x + (q.x - p.x) * from, y: p.y + (q.y - p.y) * from }, { x: p.x + (q.x - p.x) * to, y: p.y + (q.y - p.y) * to }, ((opacity * (j + 1)) / 14) * 0.8, colors.active, 1.15)
      }
    })

    coords.forEach((p, i) => {
      const radius = CRUX.points[i][2] * (w < 600 ? 0.95 : 1.25)
      dot(g, p.x, p.y, radius, 0.35 + shown * 0.65, 12, i < 5 ? colors.crux : colors.star)
      // An almost white core with a compact glow, without a haze around the figure.
      dot(g, p.x, p.y, Math.max(1, radius * 0.7), 0.45 + shown * 0.55, 5, colors.core)
    })
  }

  function drawStars() {
    sky.globalAlpha = 1
    sky.fillStyle = colors.sky
    sky.fillRect(0, 0, w, h)
    const t = reduced.matches ? 0 : clock
    const rotation = rotationAt(t)
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)

    let n = 0
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i]
      const dx = (s.x - 0.5) * fieldSpan + Math.sin(t * 0.025 + s.phase) * (2 + s.depth * 5)
      const dy = (s.y - 0.5) * fieldSpan + Math.cos(t * 0.022 + s.phase) * 4
      const x = pivot.x + dx * cos - dy * sin
      const y = pivot.y + dx * sin + dy * cos
      if (x > -140 && x < w + 140 && y > -140 && y < h + 140) {
        px[n] = x
        py[n] = y
        visible[n] = i
        n++
      }
    }

    // A spatial grid, so each star is compared only with its neighbors, even with thousands of stars.
    const distance = w < 600 ? 70 : 105
    grid.clear()
    for (let i = 0; i < n; i++) {
      gx[i] = Math.floor(px[i] / distance)
      gy[i] = Math.floor(py[i] / distance)
      const key = cellKey(gx[i], gy[i])
      let cell = grid.get(key)
      if (!cell) {
        cell = []
        grid.set(key, cell)
      }
      cell.push(i)
    }

    for (const bucket of lineBuckets) {
      bucket.length = 0
    }
    for (let i = 0; i < n; i++) {
      const depth = stars[visible[i]].depth
      if (depth < FAR_DEPTH) {
        continue
      }
      neighbors.length = 0
      for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
          for (const j of grid.get(cellKey(gx[i] + x, gy[i] + y)) ?? []) {
            const other = stars[visible[j]].depth
            if (j <= i || other < FAR_DEPTH || Math.abs(depth - other) > 0.3) {
              continue
            }
            const d = Math.hypot(px[i] - px[j], py[i] - py[j])
            if (d < distance) {
              neighbors.push({ j, d })
            }
          }
        }
      }
      neighbors.sort((a, b) => a.d - b.d)
      for (let k = 0; k < neighbors.length && k < 3; k++) {
        const { j, d } = neighbors[k]
        const alpha = (1 - d / distance) * (0.05 + depth * 0.12)
        lineBuckets[Math.min(LINE_LEVELS - 1, Math.floor((alpha / MAX_LINE_ALPHA) * LINE_LEVELS))].push(px[i], py[i], px[j], py[j])
      }
    }

    sky.strokeStyle = colors.line
    sky.lineWidth = 0.5
    lineBuckets.forEach((bucket, level) => {
      if (!bucket.length) {
        return
      }
      sky.globalAlpha = ((level + 0.5) * MAX_LINE_ALPHA * lineIntensity) / LINE_LEVELS
      sky.beginPath()
      for (let k = 0; k < bucket.length; k += 4) {
        sky.moveTo(bucket[k], bucket[k + 1])
        sky.lineTo(bucket[k + 2], bucket[k + 3])
      }
      sky.stroke()
    })

    for (let i = 0; i < n; i++) {
      const s = stars[visible[i]]
      const far = s.depth < FAR_DEPTH
      const twinkle = 1 + Math.sin(t * 0.35 + s.phase) * 0.1
      dot(sky, px[i], py[i], s.r * (far ? 1.8 : 1), (0.1 + s.depth * 0.5) * twinkle, far ? 8 : 3, colors.star)
    }
    sky.globalAlpha = 1
  }

  function drawCrux() {
    front.clearRect(0, 0, w, h)
    front.save()
    front.translate(pivot.x, pivot.y)
    front.rotate(rotationAt(reduced.matches ? 0 : clock))
    front.translate(-pivot.x, -pivot.y)
    renderCrux(front)
    front.restore()
    front.globalAlpha = 1
  }

  function draw() {
    drawStars()
    drawCrux()
  }

  const running = () => !paused && !reduced.matches && !document.hidden

  function tick(now: number) {
    raf = 0
    // the 2 ms margin avoids skipping a frame when the screen delivers one slightly early
    if (!paused && !document.hidden && (!last || now - last >= FRAME_INTERVAL - 2)) {
      if (last) {
        clock += Math.min((now - last) / 1000, 0.1)
      }
      last = now
      if (!lastStars || now - lastStars >= STARS_INTERVAL - 2) {
        lastStars = now
        drawStars()
      }
      drawCrux()
    }
    if (running()) {
      raf = requestAnimationFrame(tick)
    }
  }

  function start() {
    last = 0
    lastStars = 0
    cancelAnimationFrame(raf)
    raf = 0
    draw()
    if (running()) {
      raf = requestAnimationFrame(tick)
    }
  }

  const onThemeChange = () => {
    readColors()
    draw()
  }
  const themeObserver = new MutationObserver(onThemeChange)
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] })
  document.addEventListener('visibilitychange', start)
  reduced.addEventListener('change', start)
  addEventListener('resize', resize)
  resize()
  start()

  return {
    setPaused(value) {
      paused = value
      start()
    },
    destroy() {
      cancelAnimationFrame(raf)
      themeObserver.disconnect()
      document.removeEventListener('visibilitychange', start)
      reduced.removeEventListener('change', start)
      removeEventListener('resize', resize)
    },
  }
}
