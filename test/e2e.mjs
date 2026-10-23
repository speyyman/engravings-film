#!/usr/bin/env node
// End to end: renders a stretch of the film twice through the real pipeline
// (Chromium canvas -> PNG -> ffmpeg), checks the frames are identical byte for
// byte, probes the video, and checks the captions file. If a full render is in
// out/, the frames must also match it, so frames rendered on their own equal
// frames rendered in sequence. Run after `npm run build`.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'

const root = fileURLToPath(new URL('..', import.meta.url))
const ffprobe = process.env.FFPROBE ?? 'ffprobe'
const render = (out, ...extra) =>
  execFileSync(process.execPath, ['scripts/render.mjs', '--out', out, ...extra], { cwd: root, stdio: ['ignore', 'pipe', 'inherit'] })

const cases = [
  { only: 'landscape', from: 600, to: 660, name: 'engravings-drawn-live-1920x1080', width: 1920, height: 1080 },
  { only: 'portrait', from: 2400, to: 2430, name: 'engravings-drawn-live-1080x1920', width: 1080, height: 1920 },
]

const lines = (file) => readFileSync(file, 'utf8').trim().split('\n')

for (const c of cases) {
  for (const run of ['a', 'b']) render(`out-e2e/${run}`, '--only', c.only, '--from', String(c.from), '--to', String(c.to))
  const a = lines(`${root}out-e2e/a/${c.name}.frames.sha256`)
  const b = lines(`${root}out-e2e/b/${c.name}.frames.sha256`)
  assert.equal(a.length, c.to - c.from, `${c.only}: frame count`)
  assert.deepEqual(a, b, `${c.only}: two renders differ`)
  console.log(`ok ${c.only}: ${a.length} frames identical across two renders`)

  const full = `${root}out/${c.name}.frames.sha256`
  if (existsSync(full)) {
    const all = new Map(lines(full).map((l) => [l.split('  ')[1], l]))
    for (const l of a) assert.equal(all.get(l.split('  ')[1]), l, `${c.only}: frame differs from the full render`)
    console.log(`ok ${c.only}: frames match the full render in out/`)
  }

  const probe = JSON.parse(
    execFileSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-of', 'json', `${root}out-e2e/a/${c.name}.mp4`], {
      encoding: 'utf8',
    }),
  ).streams[0]
  assert.equal(probe.codec_name, 'h264')
  assert.equal(probe.width, c.width)
  assert.equal(probe.height, c.height)
  assert.equal(probe.pix_fmt, 'yuv420p')
  assert.equal(Number(probe.nb_read_frames), c.to - c.from)
  console.log(`ok ${c.only}: ${probe.codec_name} ${probe.width}x${probe.height}, ${probe.nb_read_frames} frames`)
}

const vtt = readFileSync(`${root}out-e2e/a/engravings-drawn-live.en.vtt`, 'utf8')
assert.match(vtt, /^WEBVTT\n\n1\n00:00:00\.500 --> /)
console.log('ok captions')
rmSync(`${root}out-e2e`, { recursive: true, force: true })
