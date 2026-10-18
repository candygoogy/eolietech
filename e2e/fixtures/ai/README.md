# AI tool fixtures

Used by `e2e/ai-tools.spec.ts`.

- `photo.png` (640 x 427, ~49 KB): synthetic product shot (shaded orange ball on a studio
  backdrop) made by `generate-photo.mjs` in this folder. Original work, no third-party content.
  Regenerate with `node e2e/fixtures/ai/generate-photo.mjs`.
- `jfk.wav` (11 s, 16 kHz mono 16-bit PCM, ~344 KB): John F. Kennedy's inaugural address,
  20 January 1961 ("And so, my fellow Americans, ask not what your country can do for you, ask
  what you can do for your country"). A work of the US federal government, public domain in the
  United States. Source file: `jfk.wav` from the Hugging Face dataset
  `Xenova/transformers.js-docs` (44.1 kHz stereo), mixed down to mono and resampled to 16 kHz.
