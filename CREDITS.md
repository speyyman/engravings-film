# Credits and sources

## Code and libraries

- [plate-engine](https://www.npmjs.com/package/plate-engine) 0.1.0, MIT, by Saeed Peyman: the generators, the dither and the moon's ephemeris.
- Fonts, self-hosted from Fontsource, both under the SIL Open Font License 1.1: [Geist Mono](https://fontsource.org/fonts/geist-mono) (Vercel) and [Big Shoulders Display](https://fontsource.org/fonts/big-shoulders-display) (Patric King). The licence texts ship in `node_modules/@fontsource/*/LICENSE`.
- Rendering: [Playwright](https://playwright.dev) with Chromium; encoding: [FFmpeg](https://ffmpeg.org) with libx264 and libvpx-vp9.

## Data, images, audio

None. Every image in the film is computed by the code in this repository. There is no audio.

## The rules shown

- Fern: the four affine maps and probabilities of Barnsley's fern, from M. F. Barnsley, *Fractals Everywhere*, 2nd ed., Academic Press, 1993 (the values as implemented in plate-engine).
- Sunflower: H. Vogel, "A better way to construct the sunflower head", *Mathematical Biosciences* 44 (1979) 179–189, doi:10.1016/0025-5564(79)90080-4. Seed n at angle n × 137.508° and radius proportional to √n.
- Moon: phase from a low-precision ephemeris after J. Meeus, *Astronomical Algorithms*, as implemented in plate-engine. The seas are approximate shapes placed by hand in plate-engine's moon generator and the smaller craters are random; the film says so.

## Licences

- Code: MIT (see LICENSE).
- The film, its stills and its captions: CC BY 4.0, https://creativecommons.org/licenses/by/4.0/.
