import { describe, expect, it } from 'vitest'
import { FERN_POINTS, SUNFLOWER_SEEDS } from '../src/scenes.js'
import {
  DURATION,
  FPS,
  FRAMES,
  SCENES,
  cueAt,
  cues,
  fernPoints,
  moonFacts,
  moonState,
  sceneAt,
  sunflowerState,
  toVTT,
} from '../src/script.js'

const date = new Date('2026-10-23T00:00:00Z')

describe('timeline', () => {
  it('runs between 60 and 120 seconds with scenes end to end', () => {
    expect(DURATION).toBeGreaterThanOrEqual(60)
    expect(DURATION).toBeLessThanOrEqual(120)
    expect(FRAMES).toBe(DURATION * FPS)
    SCENES.forEach((s, i) => {
      expect(s.end).toBeGreaterThan(s.start)
      if (i) expect(s.start).toBe(SCENES[i - 1]!.end)
    })
    expect(sceneAt(0).id).toBe('title')
    expect(sceneAt(DURATION).id).toBe('end')
  })

  it('plots fern points monotonically up to the full plate', () => {
    let last = 0
    for (let u = 0; u <= 32; u += 1 / FPS) {
      const n = fernPoints(u)
      expect(n).toBeGreaterThanOrEqual(last)
      last = n
    }
    expect(fernPoints(1)).toBe(0)
    expect(fernPoints(2.1)).toBeGreaterThanOrEqual(1)
    expect(last).toBe(FERN_POINTS)
  })

  it('adds sunflower seeds monotonically, then shows the whole head', () => {
    let last = 0
    for (let u = 0; u < 21; u += 1 / FPS) {
      const s = sunflowerState(u)
      expect(s.kind).toBe('growing')
      if (s.kind === 'growing') {
        expect(s.seeds).toBeGreaterThanOrEqual(last)
        last = s.seeds
      }
    }
    expect(last).toBeGreaterThan(SUNFLOWER_SEEDS - 5)
    expect(sunflowerState(30)).toEqual({ kind: 'angle', angle: 135 })
    expect(sunflowerState(34)).toEqual({ kind: 'angle', angle: 137 })
  })

  it('engraves the moon, then turns the light to the date’s phase', () => {
    const p = moonFacts(date).phase
    expect(moonState(5, p, 236).phase).toBe(0.5)
    expect(moonState(20, p, 236)).toEqual({ rows: 236, phase: p, burin: false })
  })
})

describe('captions', () => {
  const list = cues(date)

  it('are in order, never overlap, and each sits inside one scene', () => {
    list.forEach((c, i) => {
      expect(c.end).toBeGreaterThan(c.start)
      if (i) expect(c.start).toBeGreaterThanOrEqual(list[i - 1]!.end)
      const scene = sceneAt(c.start)
      expect(c.end).toBeLessThanOrEqual(scene.end)
      expect(c.text).not.toMatch(/undefined|NaN|!/)
    })
    expect(cueAt(list, 0.1)).toBeUndefined()
    expect(cueAt(list, 1)?.text).toMatch(/^Three engravings/)
  })

  it('state the moon’s numbers for the film’s date', () => {
    const m = moonFacts(date)
    expect(m.day).toBe('23 October 2026')
    expect(m.litPercent).toBe(88)
    expect(m.name).toBe('waxing gibbous')
    expect(list.some((c) => c.text.includes(`${m.litPercent}% of the face`))).toBe(true)
    expect(list.some((c) => c.text.includes('334,176 points'))).toBe(true)
  })

  it('write valid WebVTT', () => {
    const vtt = toVTT(list)
    expect(vtt.startsWith('WEBVTT\n\n')).toBe(true)
    expect(vtt).toContain('00:00:00.500 --> 00:00:04.800')
    expect(vtt.match(/-->/g)).toHaveLength(list.length)
    expect(vtt).toMatch(/00:01:40\.500 --> 00:01:45\.800\nRules first\. The form follows\.\n$/)
  })
})
