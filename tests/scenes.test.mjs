// The keyframe strip's scenes: a new scene where the picture changes, each
// shown partway through. Run with `npm test`.
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let vite;
let scenes;

before(async () => {
  vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  ({ scenes } = await vite.ssrLoadModule("/src/edit/scenes.ts"));
});

after(() => vite?.close());

// A 64 × 36 grey frame, with an optional bright band (a line of text) at some rows.
function frame(base, band = null) {
  const g = new Float32Array(64 * 36).fill(base);
  if (band) for (let y = band[0]; y < band[1]; y++) for (let x = 8; x < 56; x++) g[y * 64 + x] = 1;
  return g;
}

test("a line of text appearing starts a new scene", () => {
  const samples = [0, 0.5, 1, 1.5, 2, 2.5].map((t) => ({ t, grey: frame(0.8, t >= 1.5 ? [10, 12] : null) }));
  assert.deepEqual(
    scenes(samples, 36).map((s) => s.from),
    [0, 1.5],
  );
});

test("each scene is shown 60% of the way through", () => {
  const samples = [0, 1, 2, 3, 4, 5].map((t) => ({ t, grey: frame(t < 3 ? 0.2 : 0.8) }));
  assert.deepEqual(scenes(samples, 36), [
    { from: 0, t: 1 },
    { from: 3, t: 4 },
  ]);
});

test("too many scenes are thinned to an even spread", () => {
  const samples = Array.from({ length: 50 }, (_, i) => ({ t: i, grey: frame(i % 2 ? 0.2 : 0.8) }));
  const picked = scenes(samples, 10);
  assert.equal(picked.length, 10);
  assert.equal(picked[0].from, 0);
  assert.equal(picked[9].from, 49);
});
