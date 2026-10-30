// Runs the command-bar test set (cases.mjs) and reports how often Yappy got it
// right, how fast, and what it cost. Exact commands go through the browser's
// parser, as in the app; everything else goes to the same handler /api/talk
// runs, with see_video and look answered from the sample video by ffmpeg.
//
// Every run calls the API, so it costs money: well under $1 on Opus 5.5, a few
// cents on Haiku 5.5. The model comes from TALK_MODEL (default as the server).
//
//   node evals/talk/run.mjs
//   TALK_MODEL=claude-haiku-5-5 node evals/talk/run.mjs
//   node evals/talk/run.mjs find apply        (only these categories)
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, loadEnv } from "vite";
import { CASES, FIXTURES } from "./cases.mjs";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));
const MODEL = process.env.TALK_MODEL ?? "claude-opus-5-5";
process.env.TALK_MODEL = MODEL;
const SAMPLE = "public/samples/no-hands-sample.mp4";
const CACHE = "evals/talk/.cache";
const RESULTS = "evals/talk/results";
const WORKERS = 4;
// $ per million tokens: input, output, cache read, 5-minute cache write.
const PRICES = {
  "claude-opus-5-5": { in: 4, out: 20, read: 0.2, write: 5 },
  "claude-sonnet-5-5": { in: 2, out: 10, read: 0.2, write: 2.5 },
  "claude-haiku-5-5": { in: 0.1, out: 0.5, read: 0.01, write: 0.125 },
};

mkdirSync(CACHE, { recursive: true });
mkdirSync(RESULTS, { recursive: true });

function frame(t, width) {
  const file = `${CACHE}/${width}-${t.toFixed(2)}.jpg`;
  if (!existsSync(file)) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(t), "-i", SAMPLE, "-frames:v", "1", "-vf", `scale=${width}:-2`, "-q:v", "5", file]);
  return `data:image/jpeg;base64,${readFileSync(file).toString("base64")}`;
}

// preserveSymlinks: node_modules links to node_modules.nosync, and packages must load as packages.
// A small grayscale frame, as the browser samples for the keyframe strip.
function grey(t) {
  const file = `${CACHE}/grey-${t.toFixed(2)}.raw`;
  if (!existsSync(file)) execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-ss", String(t), "-i", SAMPLE, "-frames:v", "1", "-vf", "scale=64:36,format=gray", "-f", "rawvideo", file]);
  return Float32Array.from(readFileSync(file), (v) => v / 255);
}

const vite = await createServer({ configFile: false, logLevel: "silent", server: { middlewareMode: true }, appType: "custom", resolve: { preserveSymlinks: true } });
const { handleTalk } = await vite.ssrLoadModule("/server/talk.ts");
const { parseCommands, isExact } = await vite.ssrLoadModule("/src/edit/commands.ts");
const { scenes, stripStep } = await vite.ssrLoadModule("/src/edit/scenes.ts");
// The strip the browser would build for the sample (Footage.keyframes), from the same scene logic.
const samples = [];
for (let t = 0; t < FIXTURES.fresh.duration - 0.05; t += stripStep(FIXTURES.fresh.duration)) samples.push({ t: Math.round(t * 100) / 100, grey: grey(t) });
const KEYFRAMES = scenes(samples, 36).map((s) => [s.from, s.t]);
const quiet = console.log;
console.log = (...a) => (typeof a[0] === "string" && a[0].startsWith('{"route":"talk"') ? undefined : quiet(...a)); // the server's per-step log line

// Clock time on a fixture's edited timeline → video seconds.
function toVideo(fx, clock) {
  for (const p of fx.map) if (clock >= p.clock[0] - 1e-6 && clock <= p.clock[1] + 1e-6) return "hold" in p ? p.at : p.video[0] + (clock - p.clock[0]) * p.rate;
  const last = fx.map[fx.map.length - 1];
  return "hold" in last ? last.at : last.video[1];
}
const here = (fx) => toVideo(fx, fx.clock);

const noCaptions = { op: "", lang: "", style: "", position: "", size: -1, lines: [] };
const blank = { t: -1, clock: false, play: false, by: 0, version: -1, ids: [], text: "", captions: noCaptions };
// What the browser's parser would do, as Yappy's action shape.
function localAction(c, fx) {
  const version = (v) => (typeof v === "number" ? v : v === "latest" ? 0 : -1);
  switch (c.kind) {
    case "seek": {
      const to = c.to;
      if ("time" in to) return { ...blank, do: "seek", t: to.time, clock: true, play: c.play };
      if ("edge" in to) return { ...blank, do: "seek", t: to.edge === "start" ? 0 : fx.length, clock: true, play: c.play };
      const times = fx.notes.map((n) => n.at).sort((a, b) => a - b);
      const now = here(fx);
      const t = { first: times[0], last: times.at(-1), next: times.find((x) => x > now + 0.05), previous: [...times].reverse().find((x) => x < now - 0.05) }[to.step];
      return { ...blank, do: "seek", t: t ?? -1, play: c.play };
    }
    case "nudge":
      return { ...blank, do: "nudge", by: c.by };
    case "apply":
      return { ...blank, do: "apply" };
    case "view":
    case "restore":
    case "export":
      return { ...blank, do: c.kind, version: version(c.version) };
    case "note":
      return { ...blank, do: "note", text: c.text };
    case "captions":
      return { ...blank, do: "captions", captions: { ...noCaptions, op: c.op, lang: c.lang ?? "" } };
    case "help":
      return null;
    default:
      return { ...blank, do: c.kind };
  }
}

let strip = []; // shared like the browser's: sent with every command once Yappy has asked for it

async function ask(c, i) {
  const fx = FIXTURES[c.fx];
  const local = parseCommands(c.said);
  if (local && local.every(isExact)) return { via: "local", actions: local.map((x) => localAction(x, fx)).filter(Boolean), reply: "", question: "", ms: 0, steps: 0 };
  const transcript = [];
  const usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  const sent = strip;
  let haveStrip = sent.length > 0;
  const started = Date.now();
  for (let step = 1; step <= 4; step++) {
    const res = await handleTalk(
      new Request("http://eval/api/talk", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": `eval-${i}` },
        body: JSON.stringify({ said: c.said, state: fx, recent: c.recent ?? [], strip: sent, transcript }),
      }),
    );
    const data = await res.json();
    if (data.usage) for (const k of Object.keys(usage)) usage[k] += data.usage[k];
    if (!res.ok) return { via: "yappy", error: data.error, actions: [], reply: "", question: "", ms: Date.now() - started, steps: step, usage };
    if (!data.calls) return { via: "yappy", actions: data.actions, reply: data.reply, question: data.question, choices: data.choices, ms: Date.now() - started, steps: step, usage, looked: transcript.length > 0 };
    const results = data.calls.map((call) => {
      let content;
      if (call.name === "see_video" && haveStrip) {
        content = [{ type: "text", text: "The keyframes are already above; use look for a closer view." }];
      } else if (call.name === "see_video") {
        haveStrip = true;
        const made = KEYFRAMES.map(([from, t]) => ({ t, from, jpeg: frame(t, 320) }));
        if (!strip.length) strip = made;
        content = made.flatMap((f) => [
          { type: "text", text: `Video ${f.t.toFixed(1)} s${f.from < f.t - 0.2 ? ` (scene from ${f.from.toFixed(1)} s)` : ""}:` },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: f.jpeg.split(",")[1] } },
        ]);
      } else {
        const times = (call.input.times ?? []).slice(0, 6).map((t) => Math.min(fx.duration - 0.05, Math.max(0, t)));
        content = times.flatMap((t) => [
          { type: "text", text: `Original frame at ${t.toFixed(2)} s:` },
          { type: "image", source: { type: "base64", media_type: "image/jpeg", data: frame(t, 480).split(",")[1] } },
        ]);
      }
      return { type: "tool_result", tool_use_id: call.id, content };
    });
    transcript.push({ role: "assistant", content: data.content }, { role: "user", content: results });
  }
  return { via: "yappy", error: "too many steps", actions: [], reply: "", question: "", ms: Date.now() - started, steps: 4, usage };
}

// --- Scoring (see the top of cases.mjs) ---
const videoOf = (a, fx) => (a.t < 0 ? here(fx) : a.clock && a.do === "seek" ? toVideo(fx, a.t) : a.t);
const versionOf = (a, fx) => (a.version > 0 ? a.version : a.version === 0 ? fx.latest : fx.viewing);
const sameSet = (a, b) => a.length === b.length && a.every((x) => b.includes(x));
const within = (v, [lo, hi]) => v >= lo && v <= hi;

function matches(spec, a, fx, seeks) {
  if (spec.do !== a.do) return false;
  switch (spec.do) {
    case "seek":
      return within(videoOf(a, fx), spec.video) && (spec.play === undefined || a.play === spec.play);
    case "nudge":
      return Math.abs(a.by - spec.by) <= 1;
    case "apply":
      return spec.ids === "all" ? !a.ids.length || sameSet(a.ids, fx.notes.filter((n) => n.status === "pending").map((n) => n.id)) : sameSet(a.ids, spec.ids);
    case "remove":
      return sameSet(a.ids, spec.ids);
    case "view":
    case "restore":
    case "export":
      return spec.version === undefined || versionOf(a, fx) === spec.version;
    case "edit":
    case "note":
      return (!spec.text || spec.text.test(a.text)) && (!spec.place || within(videoOf(a, fx), spec.place) || seeks.some((v) => within(v, spec.place)));
    case "captions": {
      const c = a.captions ?? {};
      const cap = fx.edits.find((e) => e.kind === "captions");
      return (
        c.op === spec.op &&
        (!spec.lines || sameSet((c.lines ?? []).map((l) => l.n), spec.lines)) &&
        (!spec.text || (c.lines ?? []).some((l) => spec.text.test(l.text))) &&
        (!spec.lang || spec.lang.test(c.lang ?? "")) &&
        (!spec.style || c.style === spec.style) &&
        (!spec.position || c.position === spec.position) &&
        (!spec.bigger || (c.size > (cap?.size ?? 1)))
      );
    }
    default:
      return true;
  }
}

function inOrder(specs, actions, fx) {
  let i = 0;
  const seeks = [];
  for (const a of actions) {
    if (i < specs.length && matches(specs[i], a, fx, seeks)) i++;
    if (a.do === "seek") seeks.push(videoOf(a, fx));
  }
  return i === specs.length;
}

function passes(c, r) {
  const fx = FIXTURES[c.fx];
  if (r.error) return false;
  if ([c.expect, ...(c.anyOf ?? [])].some((list) => list && inOrder(list, r.actions, fx))) return true;
  if (c.question && r.question && !r.actions.length) return true;
  if (c.none) {
    const changed = r.actions.some((a) => ["edit", "note", "apply", "remove", "undo", "redo", "restore"].includes(a.do));
    return !changed && (!c.reply || c.reply.test(`${r.reply} ${r.question}`));
  }
  return false;
}

function show(r) {
  if (r.error) return `error: ${r.error}`;
  const acts = r.actions.map((a) => {
    if (a.do === "seek") return `seek ${a.t < 0 ? "here" : `${a.clock ? "clock" : "video"} ${a.t}`}${a.play ? " +play" : ""}`;
    if (a.do === "nudge") return `nudge ${a.by}`;
    if (a.do === "apply" || a.do === "remove") return `${a.do} [${a.ids.join(",")}]`;
    if (["view", "restore", "export"].includes(a.do)) return `${a.do} ${a.version}`;
    if (a.do === "edit" || a.do === "note") return `${a.do}@${a.t} “${a.text.slice(0, 50)}”`;
    if (a.do === "captions") return `captions ${a.captions.op}${a.captions.lang ? ` ${a.captions.lang}` : ""}${a.captions.style ? ` ${a.captions.style}` : ""}${a.captions.position ? ` ${a.captions.position}` : ""}${a.captions.size > 0 ? ` ×${a.captions.size}` : ""}${a.captions.lines.length ? ` lines ${a.captions.lines.map((l) => l.n).join(",")}` : ""}`;
    return a.do;
  });
  return [acts.join(" → "), r.question && `? ${r.question}`, r.reply && `“${r.reply.slice(0, 60)}”`].filter(Boolean).join(" | ");
}

// --- Run ---
const only = process.argv.slice(2);
const cases = CASES.map((c, i) => ({ ...c, i })).filter((c) => !only.length || only.includes(c.cat));
const results = new Array(cases.length);
let next = 0;
async function worker() {
  while (next < cases.length) {
    const k = next++;
    const c = cases[k];
    const r = await ask(c, c.i).catch((e) => ({ via: "yappy", error: e.message, actions: [], reply: "", question: "", ms: 0, steps: 0 }));
    r.pass = passes(c, r);
    results[k] = r;
    quiet(`${r.pass ? "✓" : "✗"} ${c.cat.padEnd(11)} ${r.via === "local" ? "local " : `${(r.ms / 1000).toFixed(1).padStart(5)}s`}  ${c.said.padEnd(58).slice(0, 58)} ${show(r)}`);
  }
}
quiet(`Model: ${MODEL} · ${cases.length} cases\n`);
// One command first, so the keyframe strip exists for the rest (as it would after the first find in the app).
const first = cases.findIndex((c) => c.cat === "find");
if (first > 0) [cases[0], cases[first]] = [cases[first], cases[0]];
next = 1;
const one = await ask(cases[0], cases[0].i);
one.pass = passes(cases[0], one);
results[0] = one;
quiet(`${one.pass ? "✓" : "✗"} ${cases[0].cat.padEnd(11)} ${(one.ms / 1000).toFixed(1).padStart(5)}s  ${cases[0].said.padEnd(58).slice(0, 58)} ${show(one)}`);
await Promise.all(Array.from({ length: WORKERS }, worker));
await vite.close();

const pct = (n, d) => `${d ? Math.round((100 * n) / d) : 0}%`;
const byCat = {};
for (const [k, c] of cases.entries()) {
  byCat[c.cat] ??= { n: 0, pass: 0 };
  byCat[c.cat].n++;
  if (results[k].pass) byCat[c.cat].pass++;
}
const yappy = results.filter((r) => r.via === "yappy");
const ms = yappy.map((r) => r.ms).sort((a, b) => a - b);
const tokens = yappy.reduce((t, r) => (r.usage ? Object.fromEntries(Object.keys(t).map((k) => [k, t[k] + r.usage[k]])) : t), { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 });
const price = PRICES[MODEL];
const cost = price ? (tokens.input * price.in + tokens.output * price.out + tokens.cacheRead * price.read + tokens.cacheWrite * price.write) / 1e6 : NaN;
const passed = results.filter((r) => r.pass).length;

quiet(`\nPassed ${passed}/${cases.length} (${pct(passed, cases.length)})`);
quiet(Object.entries(byCat).map(([k, v]) => `  ${k.padEnd(12)} ${v.pass}/${v.n}`).join("\n"));
quiet(`Handled by the parser (free, instant): ${results.length - yappy.length} of ${results.length}`);
if (ms.length) quiet(`Yappy: ${ms.length} commands, median ${(ms[Math.floor(ms.length / 2)] / 1000).toFixed(1)} s, p90 ${(ms[Math.floor(ms.length * 0.9)] / 1000).toFixed(1)} s`);
quiet(`Tokens: ${tokens.input} input, ${tokens.cacheRead} cache read, ${tokens.cacheWrite} cache write, ${tokens.output} output`);
if (price) quiet(`Cost: $${cost.toFixed(3)} for the run, $${(cost / Math.max(1, yappy.length)).toFixed(4)} per command sent to Yappy`);

const file = `${RESULTS}/${MODEL}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(file, JSON.stringify({ model: MODEL, passed, total: cases.length, byCat, tokens, cost, cases: cases.map((c, k) => ({ said: c.said, cat: c.cat, fx: c.fx, ...results[k] })) }, null, 1));
quiet(`Saved ${file}`);
process.exit(0);
