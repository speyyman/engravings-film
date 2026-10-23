/**
 * The film's timeline: scenes, the on-screen captions, and how far each rule
 * has run at any moment. Pure functions of time, so the renderer, the caption
 * file and the tests all read the same script.
 */
import { GOLDEN_ANGLE_DEG, moonPhase, phaseName } from 'plate-engine'
import { FERN_MAPS, FERN_POINTS, SUNFLOWER_SEEDS } from './scenes.js'

export const FPS = 30

export type SceneId = 'title' | 'fern' | 'sunflower' | 'moon' | 'end'
export type Scene = { id: SceneId; start: number; end: number; plate?: string; name?: string }

export const SCENES: readonly Scene[] = [
  { id: 'title', start: 0, end: 5 },
  { id: 'fern', start: 5, end: 37, plate: 'Plate I', name: 'Fern' },
  { id: 'sunflower', start: 37, end: 76, plate: 'Plate II', name: 'Sunflower' },
  { id: 'moon', start: 76, end: 100, plate: 'Plate III', name: 'Moon' },
  { id: 'end', start: 100, end: 106 },
]

export const DURATION = SCENES[SCENES.length - 1]!.end
export const FRAMES = DURATION * FPS

export type Cue = { start: number; end: number; text: string }

/** Facts about the moon on the film's date, computed with plate-engine's ephemeris. */
export function moonFacts(date: Date) {
  const m = moonPhase(date)
  return {
    phase: m.phase,
    /** Elongation of the moon from the sun, degrees: how phases are defined. */
    elongation: Math.round(m.phase * 360),
    litPercent: Math.round(m.lit * 100),
    name: phaseName(m.phase).toLowerCase(),
    day: date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }),
  }
}

const pct = (p: number) => `${Math.round(p * 100)}`
const thousands = (n: number) => n.toLocaleString('en-US')

/** Every caption, in order. They appear on screen and in the WebVTT file. */
export function cues(date: Date): Cue[] {
  const m = moonFacts(date)
  const [stem, frond, left] = FERN_MAPS
  const golden = GOLDEN_ANGLE_DEG.toFixed(3)
  return [
    { start: 0.5, end: 4.8, text: 'Three engravings, each drawn by a program from a few rules.' },

    { start: 5.5, end: 11, text: 'A fern. Four rules, each a small affine map: shrink, turn, shift.' },
    { start: 11, end: 17.5, text: 'Start anywhere. Pick a rule at random, apply it to the last point, mark the result. Repeat.' },
    {
      start: 17.5,
      end: 24,
      text: `The dice are loaded: ${pct(frond.p)} in 100 for the frond, ${pct(left.p)} each for the two leaflets, ${pct(stem.p)} for the stem.`,
    },
    { start: 24, end: 30.5, text: 'No rule mentions a leaflet. Each one is a smaller copy of the whole fern.' },
    { start: 30.5, end: 36.8, text: `${thousands(FERN_POINTS)} points. The same four rules every time.` },

    { start: 37.5, end: 43, text: 'A sunflower. One rule: turn, place a seed, step out a little.' },
    { start: 43, end: 50, text: `Seed n sits at an angle of n × ${golden}°, at a distance from the centre that grows as √n.` },
    {
      start: 50,
      end: 58,
      text: 'The turn is the golden angle, the turn least like any simple fraction of a circle. So no seed lines up with an earlier one.',
    },
    { start: 58, end: 66, text: `${thousands(SUNFLOWER_SEEDS)} seeds. No rule draws the spirals. They appear anyway.` },
    { start: 66, end: 70, text: 'Turn 135° instead, three eighths of a circle, and the seeds fall into eight straight rows.' },
    { start: 70, end: 74, text: 'Turn 137°, half a degree short, and they curl into arms with gaps between them.' },
    { start: 74, end: 75.8, text: `Back to ${golden}°. No gaps.` },

    { start: 76.5, end: 82, text: 'The moon. A ball, a rough map of seas and craters, and one rule for light.' },
    {
      start: 82,
      end: 88,
      text: `The sun lights one half. At midnight UTC on ${m.day}, the moon stood about ${m.elongation}° from the sun, seen from Earth.`,
    },
    { start: 88, end: 94, text: `So ${m.litPercent}% of the face we see is lit: ${m.name}. Past the terminator, only earthshine.` },
    { start: 94, end: 99.8, text: 'The seas are placed by hand and the craters at random. The light follows the rule.' },

    { start: 100.5, end: 105.8, text: 'Rules first. The form follows.' },
  ]
}

/** The cue on screen at time t, if any. */
export const cueAt = (list: readonly Cue[], t: number) => list.find((c) => t >= c.start && t < c.end)

export const sceneAt = (t: number): Scene => SCENES.find((s) => t >= s.start && t < s.end) ?? SCENES[SCENES.length - 1]!

const ease = (u: number) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u))
const span = (t: number, a: number, b: number) => (t <= a ? 0 : t >= b ? 1 : (t - a) / (b - a))

/** Fern: points plotted by scene time u (seconds since the scene began). */
export function fernPoints(u: number): number {
  if (u < 2) return 0
  // One point at a time, slowly enough to follow, then faster.
  if (u < 12) return Math.max(1, Math.round(200 * span(u, 2, 12) ** 2))
  // Then exponential growth to the full plate.
  if (u < 26) return Math.round(200 * (FERN_POINTS / 200) ** ease(span(u, 12, 26)))
  return FERN_POINTS
}

export type SunflowerState = { kind: 'growing'; seeds: number } | { kind: 'petals'; alpha: number } | { kind: 'angle'; angle: number }

/** Sunflower: what the plate shows at scene time u. */
export function sunflowerState(u: number): SunflowerState {
  if (u < 3) return { kind: 'growing', seeds: 0 }
  if (u < 12) return { kind: 'growing', seeds: Math.max(1, Math.round(30 * span(u, 3, 12))) }
  if (u < 21) return { kind: 'growing', seeds: Math.round(30 + (SUNFLOWER_SEEDS - 30) * ease(span(u, 12, 21)) ** 1.6) }
  if (u < 24) return { kind: 'petals', alpha: ease(span(u, 21, 24)) }
  if (u < 29) return { kind: 'angle', angle: GOLDEN_ANGLE_DEG }
  if (u < 33) return { kind: 'angle', angle: 135 }
  if (u < 37) return { kind: 'angle', angle: 137 }
  return { kind: 'angle', angle: GOLDEN_ANGLE_DEG }
}

export type MoonState = { rows: number; phase: number; burin: boolean }

/** Moon: rows engraved so far and the phase of the light, at scene time u. */
export function moonState(u: number, phase: number, cells: number): MoonState {
  if (u < 2) return { rows: 0, phase: 0.5, burin: false }
  // The face, engraved row by row under a full moon's light.
  if (u < 10) return { rows: cells * span(u, 2, 10), phase: 0.5, burin: true }
  // Then the light swings round to where it was on the date.
  if (u < 16) return { rows: cells, phase: 0.5 + (phase - 0.5) * ease(span(u, 10, 16)), burin: false }
  return { rows: cells, phase, burin: false }
}

/** WebVTT for the captions. */
export function toVTT(list: readonly Cue[]): string {
  const ts = (s: number) => {
    const ms = Math.round(s * 1000)
    const h = Math.floor(ms / 3600000)
    const m = Math.floor((ms % 3600000) / 60000)
    const sec = Math.floor((ms % 60000) / 1000)
    const p = (n: number, l = 2) => String(n).padStart(l, '0')
    return `${p(h)}:${p(m)}:${p(sec)}.${p(ms % 1000, 3)}`
  }
  return `WEBVTT\n\n${list.map((c, i) => `${i + 1}\n${ts(c.start)} --> ${ts(c.end)}\n${c.text}\n`).join('\n')}`
}
