/**
 * The page the renderer drives. It exposes `window.film`; scripts/render.mjs
 * calls `film.setup()`, then `film.frame(i)` for every frame, and reads the
 * canvas back. Open it in a browser (`npm run dev`) to scrub the film by hand:
 * `?o=portrait&t=40` shows the portrait cut at 40 seconds.
 */
import '@fontsource/geist-mono/latin-400.css'
import '@fontsource/big-shoulders-display/latin-300'
import { Painter, layoutFor, type Orientation } from '../src/draw.js'
import { FRAMES, FPS, cues, toVTT } from '../src/script.js'

declare global {
  interface Window {
    film: {
      frames: number
      fps: number
      setup(o: { orientation: Orientation; date: string }): Promise<{ width: number; height: number }>
      frame(i: number): void
      png(): string
      vtt(date: string): string
    }
  }
}

const canvas = document.getElementById('film') as HTMLCanvasElement
let painter: Painter | undefined

window.film = {
  frames: FRAMES,
  fps: FPS,
  async setup({ orientation, date }) {
    const L = layoutFor(orientation)
    canvas.width = L.width
    canvas.height = L.height
    // Draw nothing until both faces are ready, or the first frames would use a fallback font.
    await Promise.all([document.fonts.load('400 32px "Geist Mono"'), document.fonts.load('300 120px "Big Shoulders Display"')])
    const d = new Date(date)
    painter = new Painter(canvas.getContext('2d')!, { orientation, date: d, cues: cues(d) })
    return { width: L.width, height: L.height }
  },
  frame(i) {
    painter!.frame(i)
  },
  png() {
    return canvas.toDataURL('image/png')
  },
  vtt(date) {
    return toVTT(cues(new Date(date)))
  },
}

// Scrubbing by hand: ?o=portrait&t=40&date=2026-10-23T00:00:00Z
const q = new URLSearchParams(location.search)
if (q.has('t')) {
  const orientation = (q.get('o') === 'portrait' ? 'portrait' : 'landscape') as Orientation
  void window.film.setup({ orientation, date: q.get('date') ?? '2026-10-23T00:00:00Z' }).then(() => {
    const target = Math.round(Number(q.get('t')) * FPS)
    window.film.frame(Math.max(0, Math.min(FRAMES - 1, target)))
  })
}
