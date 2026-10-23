/**
 * Paints one frame onto a 2D canvas: the plate (dithered with plate-engine in
 * the site's three tones), its frame and marks, the plate's label, a small
 * readout of the rule, and the caption. Fonts must already be loaded.
 */
import { GOLDEN_ANGLE_DEG, ditherPlate, palettes } from 'plate-engine'
import { CELLS, FERN_MAPS, Fern, moon, moonEngraved, seedPosition, sunflower, sunflowerSeeds, sunflowerWithPetals } from './scenes.js'
import { FPS, type Cue, cueAt, fernPoints, moonFacts, moonState, sceneAt, sunflowerState } from './script.js'

/** The site's colours (speyyman.github.io, "Herbarium"). */
export const COLORS = {
  ink: '#0c1611',
  forest: '#142a1f',
  moss: '#4f7a5a',
  bone: '#ece4d0',
  vermilion: '#ff6b3d',
} as const

const DISPLAY = '"Big Shoulders Display"'
const MONO = '"Geist Mono"'

export type Orientation = 'landscape' | 'portrait'

type Box = { x: number; y: number; w: number; h: number }
export type Layout = {
  width: number
  height: number
  /** The plate, in pixels; one cell is `cell` pixels square. */
  plate: Box
  cell: number
  label: { x: number; y: number }
  title: { x: number; y: number; size: number }
  readout: Box
  caption: Box & { size: number }
}

export function layoutFor(o: Orientation): Layout {
  const cell = 4
  const side = CELLS * cell
  if (o === 'landscape') {
    return {
      width: 1920,
      height: 1080,
      cell,
      plate: { x: 1920 - 96 - side, y: (1080 - side) / 2, w: side, h: side },
      label: { x: 96, y: 128 },
      title: { x: 96, y: 290, size: 148 },
      readout: { x: 96, y: 380, w: 760, h: 260 },
      caption: { x: 96, y: 720, w: 760, h: 260, size: 32 },
    }
  }
  return {
    width: 1080,
    height: 1920,
    cell,
    plate: { x: (1080 - side) / 2, y: 200, w: side, h: side },
    label: { x: (1080 - side) / 2, y: 160 },
    title: { x: (1080 - side) / 2, y: 1300, size: 132 },
    readout: { x: (1080 - side) / 2, y: 1360, w: side, h: 170 },
    caption: { x: (1080 - side) / 2, y: 1660, w: side, h: 220, size: 34 },
  }
}

export type FilmOptions = { date: Date; orientation: Orientation; cues: readonly Cue[] }

/** Lines that fit `width` at the context's current font. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(' ')) {
    const next = line ? `${line} ${word}` : word
    if (ctx.measureText(next).width > width && line) {
      lines.push(line)
      line = word
    } else line = next
  }
  if (line) lines.push(line)
  return lines
}

/** A small cross, like the registration marks on a printing plate. */
function mark(ctx: CanvasRenderingContext2D, x: number, y: number, r = 10) {
  ctx.beginPath()
  ctx.moveTo(x - r, y)
  ctx.lineTo(x + r, y)
  ctx.moveTo(x, y - r)
  ctx.lineTo(x, y + r)
  ctx.stroke()
}

/** Draws frames for one orientation. Holds the fern's chaos game between frames. */
export class Painter {
  readonly layout: Layout
  private readonly fern = new Fern()
  private readonly cells: HTMLCanvasElement | OffscreenCanvas
  private readonly facts: ReturnType<typeof moonFacts>

  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    private readonly opts: FilmOptions,
  ) {
    this.layout = layoutFor(opts.orientation)
    this.cells = new OffscreenCanvas(CELLS, CELLS)
    this.facts = moonFacts(opts.date)
  }

  /** Paint frame `i` (0-based). */
  frame(i: number) {
    const t = i / FPS
    const { ctx, layout: L } = this
    ctx.save()
    ctx.fillStyle = COLORS.ink
    ctx.fillRect(0, 0, L.width, L.height)
    const scene = sceneAt(t)
    const u = t - scene.start
    if (scene.id === 'title') this.title(u)
    else if (scene.id === 'end') this.end(u)
    else {
      this.chrome(scene.plate!, scene.name!)
      if (scene.id === 'fern') this.fernFrame(u)
      if (scene.id === 'sunflower') this.sunflowerFrame(u)
      if (scene.id === 'moon') this.moonFrame(u)
    }
    this.caption(t)
    ctx.restore()
  }

  private plate(lum: Float32Array) {
    const img = ditherPlate(lum, CELLS, CELLS, { palette: palettes.herbarium })
    const c2 = this.cells.getContext('2d') as OffscreenCanvasRenderingContext2D
    c2.putImageData(new ImageData(new Uint8ClampedArray(img.data), CELLS, CELLS), 0, 0)
    const { ctx, layout: L } = this
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(this.cells, L.plate.x, L.plate.y, L.plate.w, L.plate.h)
  }

  /** Cell coordinates to canvas pixels (centre of the cell). */
  private px(x: number, y: number) {
    const { plate, cell } = this.layout
    return { x: plate.x + x * cell, y: plate.y + y * cell }
  }

  private chrome(plate: string, name: string) {
    const { ctx, layout: L } = this
    // Plate frame and registration marks.
    ctx.strokeStyle = 'rgba(236, 228, 208, 0.35)'
    ctx.lineWidth = 2
    ctx.strokeRect(L.plate.x - 14, L.plate.y - 14, L.plate.w + 28, L.plate.h + 28)
    ctx.strokeStyle = 'rgba(236, 228, 208, 0.6)'
    for (const [x, y] of [
      [L.plate.x - 14, L.plate.y - 14],
      [L.plate.x + L.plate.w + 14, L.plate.y - 14],
      [L.plate.x - 14, L.plate.y + L.plate.h + 14],
      [L.plate.x + L.plate.w + 14, L.plate.y + L.plate.h + 14],
    ] as const)
      mark(ctx, x, y)
    ctx.fillStyle = COLORS.bone
    ctx.globalAlpha = 0.7
    ctx.font = `400 24px ${MONO}`
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(`${plate.toUpperCase()}  ·  ${name.toUpperCase()}`, L.label.x, L.label.y)
    ctx.globalAlpha = 1
    ctx.font = `300 ${L.title.size}px ${DISPLAY}`
    ctx.fillText(name, L.title.x, L.title.y)
  }

  private readout(lines: { text: string; accent?: boolean; dim?: boolean }[]) {
    const { ctx, layout: L } = this
    const size = 26
    ctx.font = `400 ${size}px ${MONO}`
    lines.forEach((l, i) => {
      ctx.fillStyle = l.accent ? COLORS.vermilion : COLORS.bone
      ctx.globalAlpha = l.dim ? 0.55 : 1
      ctx.fillText(l.text, L.readout.x, L.readout.y + 48 + i * size * 1.6)
    })
    ctx.globalAlpha = 1
  }

  private caption(t: number) {
    const cue = cueAt(this.opts.cues, t)
    if (!cue) return
    const { ctx, layout: L } = this
    // Fade in and out over a quarter second.
    ctx.globalAlpha = Math.min(1, (t - cue.start) / 0.25, (cue.end - t) / 0.25)
    ctx.fillStyle = COLORS.bone
    ctx.font = `400 ${L.caption.size}px ${MONO}`
    const box = L.caption
    const lines = wrap(ctx, cue.text, box.w)
    // A short vermilion rule marks the caption, like a pencil note in a margin.
    ctx.fillStyle = COLORS.vermilion
    ctx.fillRect(box.x, box.y - 6, 48, 4)
    ctx.fillStyle = COLORS.bone
    lines.forEach((line, i) => ctx.fillText(line, box.x, box.y + 48 + i * box.size * 1.5))
    ctx.globalAlpha = 1
  }

  private title(u: number) {
    const { ctx } = this
    const land = this.opts.orientation === 'landscape'
    ctx.globalAlpha = Math.min(1, u / 0.6, (5 - u) / 0.4)
    ctx.fillStyle = COLORS.bone
    ctx.font = `300 ${land ? 190 : 150}px ${DISPLAY}`
    const x = land ? 96 : 68
    if (land) ctx.fillText('Engravings, drawn live', x, 480)
    else {
      ctx.fillText('Engravings,', x, 760)
      ctx.fillText('drawn live', x, 910)
    }
    ctx.globalAlpha *= 0.7
    ctx.font = `400 26px ${MONO}`
    ctx.fillText('A FERN  ·  A SUNFLOWER  ·  THE MOON', x, land ? 560 : 990)
    ctx.globalAlpha = 1
  }

  private end(u: number) {
    const { ctx } = this
    const land = this.opts.orientation === 'landscape'
    const x = land ? 96 : 68
    ctx.globalAlpha = Math.min(1, u / 0.6)
    ctx.fillStyle = COLORS.bone
    ctx.globalAlpha *= 0.7
    ctx.font = `400 26px ${MONO}`
    ctx.fillText('SPEYYMAN.GITHUB.IO', x, land ? 980 : 1780)
    ctx.fillText('CC BY 4.0', x, land ? 1020 : 1820)
    ctx.globalAlpha = 1
  }

  private fernFrame(u: number) {
    const n = fernPoints(u)
    this.fern.advance(n)
    this.plate(this.fern.luminance())
    const { ctx } = this
    const slow = n > 0 && n <= 200
    if (slow) {
      // The last few points, joined in the order they were made; the newest in vermilion.
      const pts = this.fern.recent.slice(-6).map((p) => ({ ...this.px(p.x, p.y), map: p.map }))
      ctx.strokeStyle = 'rgba(255, 107, 61, 0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
      ctx.stroke()
      const last = pts[pts.length - 1]
      if (last) {
        ctx.fillStyle = COLORS.vermilion
        ctx.beginPath()
        ctx.arc(last.x, last.y, 9, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    const current = slow ? this.fern.recent[this.fern.recent.length - 1]?.map : undefined
    this.readout([
      ...FERN_MAPS.map((m, k) => ({
        text: `${String(k + 1)}  ${m.name.padEnd(14)} ${String(Math.round(m.p * 100)).padStart(2)}%   ${this.fern.counts[k]!.toLocaleString('en-US').padStart(7)}`,
        accent: k === current,
      })),
      { text: `${n.toLocaleString('en-US')} points`, dim: true },
    ])
  }

  private sunflowerFrame(u: number) {
    const s = sunflowerState(u)
    const { ctx } = this
    if (s.kind === 'growing') {
      this.plate(sunflowerSeeds(s.seeds))
      if (s.seeds > 0 && s.seeds <= 30) {
        // The newest seed and the turn that placed it.
        const p = seedPosition(s.seeds)
        const c = this.px(CELLS / 2, CELLS / 2)
        const q = this.px(p.x, p.y)
        ctx.strokeStyle = 'rgba(255, 107, 61, 0.7)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(c.x, c.y)
        ctx.lineTo(q.x, q.y)
        ctx.stroke()
        ctx.fillStyle = COLORS.vermilion
        ctx.beginPath()
        ctx.arc(q.x, q.y, 9, 0, Math.PI * 2)
        ctx.fill()
      }
      const turn = ((s.seeds * GOLDEN_ANGLE_DEG) % 360).toFixed(1)
      this.readout([
        { text: `seed      ${String(s.seeds).padStart(5)}` },
        { text: `turn      ${GOLDEN_ANGLE_DEG.toFixed(3)}° each` },
        { text: `angle     ${turn.padStart(5)}°`, accent: s.seeds > 0 && s.seeds <= 30 },
        { text: `distance  √${s.seeds}`, dim: true },
      ])
      return
    }
    if (s.kind === 'petals') this.plate(sunflowerWithPetals(s.alpha))
    else this.plate(s.angle === GOLDEN_ANGLE_DEG ? sunflowerWithPetals(1) : sunflower(s.angle))
    const angle = s.kind === 'angle' ? s.angle : GOLDEN_ANGLE_DEG
    this.readout([
      { text: `seeds     620` },
      {
        text: `turn      ${angle === GOLDEN_ANGLE_DEG ? GOLDEN_ANGLE_DEG.toFixed(3) : angle.toFixed(3)}° each`,
        accent: angle !== GOLDEN_ANGLE_DEG,
      },
    ])
  }

  private moonFrame(u: number) {
    const f = this.facts
    const s = moonState(u, f.phase, CELLS)
    this.plate(s.rows >= CELLS ? moon(s.phase) : moonEngraved(s.rows, s.phase))
    const { ctx } = this
    if (s.burin && s.rows > 0 && s.rows < CELLS) {
      // The engraver's line, moving down the plate.
      const y = this.px(0, s.rows).y
      ctx.fillStyle = COLORS.vermilion
      ctx.fillRect(this.layout.plate.x, y, this.layout.plate.w, 3)
    }
    const lit = Math.round((0.5 - 0.5 * Math.cos(s.phase * Math.PI * 2)) * 100)
    // While the face is engraved it is lit as a full moon; the date's light comes after.
    if (u < 10) {
      this.readout([
        { text: `rows      ${String(Math.min(CELLS, Math.floor(s.rows))).padStart(3)} of ${CELLS}` },
        { text: 'light     full, to engrave by', dim: true },
      ])
      return
    }
    this.readout([
      { text: `date      ${f.day}` },
      { text: `elongation ${String(Math.round(s.phase * 360)).padStart(4)}°`, accent: u < 16 },
      { text: `lit       ${String(lit).padStart(4)}%` },
      { text: u >= 16 ? f.name : '', dim: true },
    ])
  }
}
