# Design: Herbarium, borrowed on purpose

The film is not a tool with its own interface. It is a piece of media for one place, the Media page of speyyman.github.io, and its brief asks for the site's palette. So instead of inventing a system, it uses the site's, Herbarium (an engraved botanical catalogue), and this file records what it takes and what it leaves out, so the choice is deliberate rather than accidental.

The renderer page (`render/index.html`) is a work surface for scripts, not something a visitor sees. It has no design beyond showing the canvas.

## Tokens taken from the site

| Token | Hex | Use in the film |
|---|---|---|
| ink | `#0c1611` | Background of every frame |
| forest | `#142a1f` | Darkest of the plate's three tones |
| moss | `#4f7a5a` | Middle tone |
| bone | `#ece4d0` | Lightest tone, all text, plate frame (at 35% and 60%) |
| vermilion | `#ff6b3d` | One accent only: the newest point, seed or engraved row, the readout line that is changing, and the short rule above each caption |

Contrast (WCAG 2 formula, against ink `#0c1611`, computed): bone 14.6:1, vermilion 6.5:1, bone at 70% opacity (labels, `#a9a697`) 7.5:1, bone at 55% (dim readout lines, `#87877a`) 5.1:1. Moss (3.8:1) is never used for text. Every line of text clears AA at the sizes used (24 px and up on a 1080 or 1920 px frame).

Type: Big Shoulders Display 300 for the plate names and the title, Geist Mono 400 for everything else, both self-hosted from Fontsource (OFL 1.1). Captions are 32 px (landscape) and 34 px (portrait), set left, at most about 50 characters to a line.

The plates are three-tone Bayer 8×8 dithers from `plate-engine`'s `ditherPlate`, the same settings the site uses, drawn at 4 px per cell so the dither survives video compression.

## Motion

- Motion is the rule running, never decoration. A point is plotted, a seed is placed, a row is engraved. Nothing slides, zooms or bounces.
- The pace is slow at first, one step at a time, so the rule can be followed, then fast, so the form can appear.
- Captions fade over a quarter second. Scenes cut.
- The video is silent, and the captions carry everything. Reduced motion on the site is respected by not autoplaying it.

## Components

1. **Plate**: a 236 × 236 cell dither, framed with a thin bone rule and four registration crosses.
2. **Plate label**: `PLATE I · FERN` in Geist Mono caps above the plate name.
3. **Plate name**: one word in Big Shoulders Display.
4. **Readout**: four or five lines of monospaced numbers showing the rule's state (map counts, seed angle, rows engraved, the moon's elongation).
5. **Caption**: one or two sentences, with a short vermilion rule above.
6. **Marker**: the vermilion dot or line that shows the step being taken.

## Rules

- Never use vermilion for more than the one thing that is changing.
- Never show a number the code did not compute in that frame.
- Never add music or sound unless it is public domain or CC0 and its source is recorded in CREDITS.md.

## What it leaves out

The site's marginalia, rulers and pencil notes stay on the site. A film frame has one plate and one caption, and nothing else competes with them.
