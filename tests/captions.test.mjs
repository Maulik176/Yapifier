// Captions: words into short lines, the word highlight's timing, and an .srt
// that follows the edit. Run with `npm test`.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let vite;
let C;

before(async () => {
  vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  C = await vite.ssrLoadModule("/src/edit/captions.ts");
});

after(() => vite?.close());

const w = (start, end, text) => ({ start, end, text });

test("music in brackets is dropped and same-instant words are spread out", () => {
  const words = C.cleanWords([w(0, 1.3, "(upbeat"), w(1.3, 2.4, "music)"), w(9.92, 9.92, "This"), w(9.92, 9.92, "is"), w(9.92, 11.18, "hands,")]);
  assert.deepEqual(
    words.map((x) => x.text),
    ["This", "is", "hands,"],
  );
  assert.ok(words.every((x, i) => x.end > x.start && (i === 0 || x.start >= words[i - 1].end - 1e-9)), "every word has time, in order");
});

test("lines break after a sentence, a pause, or seven words", () => {
  const cues = C.wordsToCues([
    w(0, 0.3, "Hello"),
    w(0.3, 0.6, "there."),
    w(0.7, 1, "One"),
    w(1, 1.2, "two"),
    w(3, 3.3, "after"),
    w(3.3, 3.6, "a"),
    w(3.6, 3.9, "pause"),
  ]);
  assert.deepEqual(
    cues.map((c) => c.text),
    ["Hello there.", "One two", "after a pause"],
  );
});

test("the sample's voiceover makes 15 lines, and none runs past 3.2 seconds", () => {
  const cues = C.wordsToCues(JSON.parse(readFileSync("src/edit/no-hands-sample.words.json", "utf8")));
  assert.equal(cues.length, 15);
  assert.ok(cues.every((c) => c.end - c.start <= 3.2 + 1e-9));
  assert.ok(!cues.some((c) => /music/i.test(c.text)));
});

test("a fixed line keeps its timing and spreads its words across it", () => {
  const cap = C.makeCaptions([{ start: 10, end: 12, text: "the Whisper Flow Challenge.", words: [w(10, 10.5, "the"), w(10.5, 11, "Whisper"), w(11, 11.5, "Flow"), w(11.5, 12, "Challenge.")] }]);
  const fixed = C.rewrite(cap, [{ n: 1, text: "the Wispr Flow Challenge." }]);
  assert.equal(fixed.cues[0].text, "the Wispr Flow Challenge.");
  const words = C.wordsOf(fixed.cues[0]);
  assert.equal(words.length, 4);
  assert.equal(words[0].start, 10);
  assert.ok(Math.abs(words[3].end - 12) < 1e-9);
});

test("the .srt follows cuts: lines move earlier, and lines inside a cut are left out", () => {
  const cap = C.makeCaptions([
    { start: 0.5, end: 1.5, text: "cut away" },
    { start: 3, end: 4, text: "kept" },
  ]);
  const srt = C.toSrt([cap, { id: "c", kind: "cut", start: 0, end: 2 }], 10);
  assert.equal(srt, "1\n00:00:01,000 --> 00:00:02,000\nkept\n");
});
