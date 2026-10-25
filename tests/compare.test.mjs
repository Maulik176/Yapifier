// Regression tests for hold-to-compare: the edited timeline stays the clock,
// only the picture changes. Run with `npm test` (Node's test runner; Vite
// loads the TypeScript modules).
import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { createServer } from "vite";

let vite;
let Player;

before(async () => {
  vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  ({ Player } = await vite.ssrLoadModule("/src/edit/player.ts"));
  // play() routes audio through Web Audio; a stand-in is enough here.
  globalThis.AudioContext = class {
    state = "running";
    destination = {};
    createMediaElementSource = () => ({ connect() {} });
    createGain = () => ({ connect() {}, gain: { value: 1 } });
    createMediaStreamDestination = () => ({ stream: {} });
    resume = async () => {};
  };
});

after(() => vite?.close());

// A <video> that plays when told: currentTime advances with the test clock.
function fakeVideo() {
  return {
    currentTime: 0,
    paused: true,
    ended: false,
    playbackRate: 1,
    volume: 1,
    readyState: 4,
    videoWidth: 1280,
    videoHeight: 720,
    play() {
      this.paused = false;
      return Promise.resolve();
    },
    pause() {
      this.paused = true;
    },
  };
}

// Records what gets painted, without a real canvas.
function fakeCtx() {
  const calls = [];
  const ctx = new Proxy(
    {},
    {
      get(_, key) {
        if (key === "calls") return calls;
        if (key === "measureText") return () => ({ width: 100 });
        if (key === "createLinearGradient") return () => ({ addColorStop() {} });
        return (...args) => calls.push([key, args]);
      },
      set: () => true,
    },
  );
  return ctx;
}

const SOURCE = 36;
// A 3 s title before the video, the first 2 s cut, and a zoom at 10–14 s.
const EDITS = [
  { id: "t", kind: "title", at: 0, duration: 3, text: "No Hands", sub: "" },
  { id: "c", kind: "cut", start: 0, end: 2 },
  { id: "z", kind: "zoom", start: 10, end: 14, x: 0.3, y: 0.5, scale: 2 },
];

function setup() {
  const video = fakeVideo();
  const player = new Player(video);
  player.load(SOURCE, EDITS);
  return { player, video };
}

// One test clock for every frame, as the stage loop's requestAnimationFrame would give.
let clock = 0;
const frame = (player) => player.tick(clock);

// Advance the player as the stage loop would, moving the video clock along with it.
function run(player, video, seconds, step = 1 / 60) {
  for (let t = 0; t < seconds - 1e-9; t += step) {
    clock += step * 1000;
    if (!video.paused) video.currentTime += step * video.playbackRate;
    player.tick(clock);
  }
}

test("paused: holding and releasing compare keeps the exact position, still paused", () => {
  const { player, video } = setup();
  player.seek(12.34);
  for (let i = 0; i < 50; i++) {
    player.showOriginal = i % 2 === 0;
    run(player, video, 0.05);
  }
  player.showOriginal = false;
  assert.equal(player.playing, false);
  assert.equal(player.outT.toFixed(3), "12.340");
});

test("inside a title card: compare doesn't skip the rest of the title", () => {
  const { player, video } = setup();
  player.seek(0.8); // inside the 3 s title
  player.showOriginal = true;
  run(player, video, 0.2);
  player.showOriginal = false;
  assert.equal(player.outT.toFixed(3), "0.800");
  const state = frame(player);
  assert.ok(state.title, "still showing the title card after letting go");
});

test("playing: compare carries on playing and time keeps moving", () => {
  const { player, video } = setup();
  player.seek(0.5); // in the title, so the clock runs on the test's timer
  player.play();
  clock = performance.now(); // play() starts timing from now
  run(player, video, 0.5);
  const atHold = player.outT;
  player.showOriginal = true;
  run(player, video, 1);
  player.showOriginal = false;
  run(player, video, 0.5);
  assert.equal(player.playing, true, "still playing after letting go");
  assert.ok(player.outT > atHold + 1.3, `time kept moving (${atHold.toFixed(2)} → ${player.outT.toFixed(2)})`);
});

test("across the cut: compare follows the edited timeline, not the source", () => {
  const { player, video } = setup();
  player.seek(2.9); // just before the title ends; the video continues from 2 s (after the cut)
  player.play();
  clock = performance.now();
  player.showOriginal = true;
  run(player, video, 0.6);
  player.showOriginal = false;
  const state = frame(player);
  assert.ok(player.outT > 3.4 && player.outT < 3.6, `edited time ${player.outT.toFixed(2)}`);
  assert.ok(state.srcT >= 2 && state.srcT < 2.7, `source time ${state.srcT.toFixed(2)} lands after the cut`);
});

test("original picture: no zoom crop, no title card, no overlays", () => {
  const { player } = setup();
  player.seek(3 + 10); // edited time for source 12 s (title 3 s, cut 2 s), inside the zoom
  const state = frame(player);
  const zoomed = fakeCtx();
  player.draw(zoomed, 1280, 720, state);
  const [, cropArgs] = zoomed.calls.find(([k]) => k === "drawImage");
  assert.ok(cropArgs[3] < 1280, "edited picture is zoomed in");

  player.showOriginal = true;
  const original = fakeCtx();
  player.draw(original, 1280, 720, state);
  const [, fullArgs] = original.calls.find(([k]) => k === "drawImage");
  assert.deepEqual(fullArgs.slice(1, 5), [0, 0, 1280, 720], "original picture is the whole frame");

  player.seek(1); // inside the title card
  const titleState = frame(player);
  const inTitle = fakeCtx();
  player.draw(inTitle, 1280, 720, titleState);
  assert.ok(!inTitle.calls.some(([k]) => k === "fillText"), "no title text drawn over the original");
  assert.ok(inTitle.calls.some(([k]) => k === "drawImage"), "the source frame is drawn instead");
});
