/**
 * The three plates, grown step by step. Everything here is pure: a frame's
 * luminance depends only on how far the rule has run, never on the clock or on
 * the frames before it, so any frame can be rendered on its own.
 *
 * The finished plates are plate-engine's own: the fern and the sunflower at
 * their last step equal `generate('fern')` and `generate('phyllotaxis')` cell
 * for cell (see test/scenes.test.ts), and the moon is `generate('moon')`.
 */
import { GOLDEN_ANGLE_DEG, generate, mulberry32 } from 'plate-engine'

/** Plate size in cells. Every plate in the film is this square. */
export const CELLS = 236
/** The seed plate-engine uses for the site's plates. */
export const SEED = 7

const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v)
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
// plate-engine's engraver's hatching (src/math.ts), copied so the paper behind the fern matches.
function hatch(x: number, y: number, tone: number, angle = 0.6, freq = 0.9) {
  const d = x * Math.cos(angle) + y * Math.sin(angle)
  const line = 0.5 + 0.5 * Math.sin(d * freq)
  return smooth(1 - tone - 0.15, 1 - tone + 0.15, line)
}

// ---------------------------------------------------------------- fern

/** Barnsley's four maps, in the order plate-engine applies them. */
export const FERN_MAPS = [
  { name: 'stem', p: 0.01 },
  { name: 'frond', p: 0.85 },
  { name: 'left leaflet', p: 0.07 },
  { name: 'right leaflet', p: 0.07 },
] as const

/** Points in the finished fern: plate-engine's default density of 6 per cell. */
export const FERN_POINTS = CELLS * CELLS * 6

export type FernPoint = { x: number; y: number; map: number }

/**
 * The chaos game, run for as many points as a frame needs. Keeps its state, so
 * asking for more points continues where it stopped; asking for fewer restarts.
 */
export class Fern {
  readonly w: number
  readonly h: number
  readonly hits: Float32Array
  /** Points plotted so far. */
  n = 0
  /** How many times each map has been chosen. */
  readonly counts = [0, 0, 0, 0]
  /** The most recent points, newest last, in cell coordinates. */
  recent: FernPoint[] = []
  private rand = mulberry32(SEED)
  private x = 0
  private y = 0

  constructor(w = CELLS, h = CELLS) {
    this.w = w
    this.h = h
    this.hits = new Float32Array(w * h)
  }

  private reset() {
    this.hits.fill(0)
    this.n = 0
    this.counts.fill(0)
    this.recent = []
    this.rand = mulberry32(SEED)
    this.x = 0
    this.y = 0
  }

  /** Run the game until `n` points have been plotted. */
  advance(n: number) {
    if (n < this.n) this.reset()
    const { w, h } = this
    // The same fitting and tilt as plate-engine's fern.
    const s = Math.min(w / 6.2, h / 10.6)
    const tilt = -0.18
    const cos = Math.cos(tilt)
    const sin = Math.sin(tilt)
    const ox = w * 0.5
    const oy = h * 0.97
    // Cumulative thresholds, rounded as plate-engine rounds them (0.01 + 0.85 + 0.07 is exactly 0.93).
    const t1 = 0.01
    const t2 = Math.round(0.86 * 1e12) / 1e12
    const t3 = Math.round(0.93 * 1e12) / 1e12
    while (this.n < n) {
      const r = this.rand()
      const { x, y } = this
      let nx: number
      let ny: number
      let map: number
      if (r < t1) {
        nx = 0
        ny = 0.16 * y
        map = 0
      } else if (r < t2) {
        nx = 0.85 * x + 0.04 * y
        ny = -0.04 * x + 0.85 * y + 1.6
        map = 1
      } else if (r < t3) {
        nx = 0.2 * x - 0.26 * y
        ny = 0.23 * x + 0.22 * y + 1.6
        map = 2
      } else {
        nx = -0.15 * x + 0.28 * y
        ny = 0.26 * x + 0.24 * y + 0.44
        map = 3
      }
      this.x = nx
      this.y = ny
      this.n++
      this.counts[map]!++
      const px = Math.floor(ox + (nx * cos - (ny - 5) * sin) * s)
      const py = Math.floor(oy - 5 * s - (nx * sin + (ny - 5) * cos) * s)
      if (px >= 0 && px < w && py >= 0 && py < h) this.hits[py * w + px]!++
      if (n - this.n < 12) {
        this.recent.push({ x: ox + (nx * cos - (ny - 5) * sin) * s, y: oy - 5 * s - (nx * sin + (ny - 5) * cos) * s, map })
        if (this.recent.length > 12) this.recent.shift()
      }
    }
    return this
  }

  /** Ink from the hits so far, on plate-engine's faint engraved paper. */
  luminance(): Float32Array {
    const { w, h, hits } = this
    const buf = new Float32Array(w * h)
    let max = 0
    for (let i = 0; i < hits.length; i++) max = Math.max(max, hits[i]!)
    const lmax = Math.log(1 + max)
    for (let py = 0; py < h; py++) {
      for (let px = 0; px < w; px++) {
        const i = py * w + px
        const d = hits[i]! > 0 ? Math.log(1 + hits[i]!) / lmax : 0
        const paper = 0.07 * hatch(px, py, 0.35, 0.78, 1.1)
        buf[i] = clamp(Math.max(paper, Math.pow(d, 0.55) * 1.15))
      }
    }
    return buf
  }
}

// ---------------------------------------------------------------- sunflower

/** Seeds in the finished head: plate-engine's default. */
export const SUNFLOWER_SEEDS = 620

/** Where seed i sits (Vogel's model): angle i × θ, radius c√i. Cell coordinates. */
export function seedPosition(i: number, angleDeg = GOLDEN_ANGLE_DEG, w = CELLS, h = CELLS) {
  const R = Math.min(w, h) * 0.48
  const c = R / Math.sqrt(SUNFLOWER_SEEDS)
  // plate-engine keeps the original radian expression for the golden angle; so does this.
  const theta = angleDeg === GOLDEN_ANGLE_DEG ? Math.PI * (3 - Math.sqrt(5)) : (angleDeg * Math.PI) / 180
  const a = i * theta
  const r = c * Math.sqrt(i)
  return { x: w * 0.5 + Math.cos(a) * r, y: h * 0.5 + Math.sin(a) * r, r, a, c, R }
}

/** The first `k` seeds of the head, each a small lit sphere, as plate-engine draws them. No petals. */
export function sunflowerSeeds(k: number, w = CELLS, h = CELLS): Float32Array {
  const buf = new Float32Array(w * h)
  const last = Math.min(k, SUNFLOWER_SEEDS - 1)
  for (let i = 1; i <= last; i++) {
    const { x: sx, y: sy, r, c, R } = seedPosition(i, GOLDEN_ANGLE_DEG, w, h)
    const rad = c * (0.42 + 0.2 * (r / R))
    const x0 = Math.max(0, Math.floor(sx - rad))
    const x1 = Math.min(w - 1, Math.ceil(sx + rad))
    const y0 = Math.max(0, Math.floor(sy - rad))
    const y1 = Math.min(h - 1, Math.ceil(sy + rad))
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - sx) / rad
        const dy = (y - sy) / rad
        const d2 = dx * dx + dy * dy
        if (d2 > 1) continue
        const lit = clamp(0.35 + Math.sqrt(1 - d2) * 0.55 - dx * 0.25 - dy * 0.3)
        const falloff = 0.55 + 0.45 * (r / R)
        buf[y * w + x] = Math.max(buf[y * w + x]!, lit * falloff)
      }
    }
  }
  return buf
}

/** The finished head with its halo of petals, at any divergence angle (plate-engine's phyllotaxis). */
export function sunflower(angleDeg = GOLDEN_ANGLE_DEG, w = CELLS, h = CELLS): Float32Array {
  return generate('phyllotaxis', w, h, { seed: SEED, params: { angle: angleDeg, count: SUNFLOWER_SEEDS } })
}

/** The seeds fully grown, with the petals faded in by `alpha` (0..1). */
export function sunflowerWithPetals(alpha: number, w = CELLS, h = CELLS): Float32Array {
  if (alpha >= 1) return sunflower(GOLDEN_ANGLE_DEG, w, h)
  const seeds = sunflowerSeeds(SUNFLOWER_SEEDS, w, h)
  if (alpha <= 0) return seeds
  const full = sunflower(GOLDEN_ANGLE_DEG, w, h)
  const R = Math.min(w, h) * 0.48
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (Math.hypot(x - w * 0.5, y - h * 0.5) / R >= 1) seeds[y * w + x] = full[y * w + x]! * alpha
    }
  }
  return seeds
}

// ---------------------------------------------------------------- moon

/** plate-engine's moon at a given phase (0 new, 0.5 full). */
export function moon(phase: number, w = CELLS, h = CELLS): Float32Array {
  return generate('moon', w, h, { seed: SEED, params: { phase } })
}

/** The moon engraved down to row `rows` (fractional rows allowed); below it, bare plate. */
export function moonEngraved(rows: number, phase: number, w = CELLS, h = CELLS): Float32Array {
  const buf = moon(phase, w, h)
  const from = Math.max(0, Math.floor(rows)) * w
  buf.fill(0, Math.min(from, buf.length))
  return buf
}
