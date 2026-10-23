import { generate } from 'plate-engine'
import { describe, expect, it } from 'vitest'
import {
  CELLS,
  DRAWN_SEEDS,
  FERN_POINTS,
  Fern,
  SEED,
  SUNFLOWER_SEEDS,
  moonEngraved,
  moon,
  sunflowerSeeds,
  sunflowerWithPetals,
} from '../src/scenes.js'

describe('fern', () => {
  it('ends as plate-engine’s fern, cell for cell', () => {
    const grown = new Fern().advance(FERN_POINTS).luminance()
    const engine = generate('fern', CELLS, CELLS, { seed: SEED })
    expect(grown).toEqual(engine)
  })

  it('chooses the maps in roughly Barnsley’s proportions', () => {
    const f = new Fern().advance(FERN_POINTS)
    const share = f.counts.map((c) => c / FERN_POINTS)
    expect(share[0]).toBeCloseTo(0.01, 2)
    expect(share[1]).toBeCloseTo(0.85, 2)
    expect(share[2]).toBeCloseTo(0.07, 2)
    expect(share[3]).toBeCloseTo(0.07, 2)
  })

  it('gives the same plate whether it is grown in steps or at once, and restarts when asked for fewer points', () => {
    const steps = new Fern()
    for (const n of [1, 10, 200, 5000, 20000]) steps.advance(n)
    const once = new Fern().advance(20000)
    expect(steps.luminance()).toEqual(once.luminance())
    expect(steps.counts).toEqual(once.counts)
    steps.advance(300)
    expect(steps.luminance()).toEqual(new Fern().advance(300).luminance())
    expect(steps.n).toBe(300)
  })

  it('remembers the newest points for the marker', () => {
    const f = new Fern().advance(5)
    expect(f.recent).toHaveLength(5)
    expect(f.recent.every((p) => p.map >= 0 && p.map <= 3)).toBe(true)
  })
})

describe('sunflower', () => {
  const engine = generate('phyllotaxis', CELLS, CELLS, { seed: SEED, params: { count: SUNFLOWER_SEEDS } })
  const R = CELLS * 0.48
  const inside = (i: number) => Math.hypot((i % CELLS) - CELLS / 2, Math.floor(i / CELLS) - CELLS / 2) < R

  it('grows into plate-engine’s head: every cell inside the rim matches', () => {
    const seeds = sunflowerSeeds(SUNFLOWER_SEEDS)
    let checked = 0
    for (let i = 0; i < seeds.length; i++) {
      if (!inside(i)) continue
      expect(seeds[i]).toBe(engine[i])
      checked++
    }
    expect(checked).toBeGreaterThan(30000)
  })

  it('with the petals fully in, is plate-engine’s plate', () => {
    expect(sunflowerWithPetals(1)).toEqual(engine)
    expect(sunflowerWithPetals(0)).toEqual(sunflowerSeeds(SUNFLOWER_SEEDS))
  })

  it('draws 619 seeds, as plate-engine does for a count of 620', () => {
    expect(DRAWN_SEEDS).toBe(619)
    expect(sunflowerSeeds(DRAWN_SEEDS)).toEqual(sunflowerSeeds(SUNFLOWER_SEEDS))
    expect(sunflowerSeeds(DRAWN_SEEDS - 1)).not.toEqual(sunflowerSeeds(DRAWN_SEEDS))
  })

  it('draws more ink as seeds are added', () => {
    const ink = (k: number) => sunflowerSeeds(k).reduce((a, b) => a + b, 0)
    expect(ink(0)).toBe(0)
    expect(ink(10)).toBeGreaterThan(0)
    expect(ink(300)).toBeGreaterThan(ink(10))
  })
})

describe('moon', () => {
  it('engraves row by row, leaving the rest of the plate bare', () => {
    const full = moon(0.5)
    const half = moonEngraved(CELLS / 2, 0.5)
    expect(half.subarray(0, (CELLS / 2) * CELLS)).toEqual(full.subarray(0, (CELLS / 2) * CELLS))
    expect(half.subarray((CELLS / 2) * CELLS).every((v) => v === 0)).toBe(true)
    expect(moonEngraved(CELLS, 0.3)).toEqual(moon(0.3))
  })
})
