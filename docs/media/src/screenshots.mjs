// Drives headless Chrome over the DevTools protocol to take README screenshots
// of the local app (dev server on :5173, real Claude calls).
// Usage from the repo root: node docs/media/src/screenshots.mjs docs/media
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const OUT = process.argv[2];
const APP = "http://localhost:5173/";
const PORT = 9333;
mkdirSync(OUT, { recursive: true });

const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new",
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), "yap-shots-"))}`,
  "--window-size=1440,900",
  "--autoplay-policy=no-user-gesture-required",
  "--hide-scrollbars",
  "--no-first-run",
  "about:blank",
], { stdio: "ignore" });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
let id = 0;
const waiting = new Map();

async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === "page");
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => (ws.onopen = r));
        ws.onmessage = (m) => {
          const msg = JSON.parse(m.data);
          if (msg.id && waiting.has(msg.id)) {
            waiting.get(msg.id)(msg);
            waiting.delete(msg.id);
          }
        };
        return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error("Chrome didn't start");
}

function send(method, params = {}) {
  const n = ++id;
  ws.send(JSON.stringify({ id: n, method, params }));
  return new Promise((resolve, reject) => waiting.set(n, (msg) => (msg.error ? reject(new Error(`${method}: ${msg.error.message}`)) : resolve(msg.result))));
}

async function js(expression) {
  const r = await send("Runtime.evaluate", { expression: `(async () => { ${expression} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
}

async function until(expression, ms = 60000, label = expression) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await js(`return !!(${expression});`)) return;
    await sleep(300);
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function shot(name, clip) {
  const params = { format: "png", captureBeyondViewport: false };
  if (clip) params.clip = { ...clip, scale: 1 };
  const { data } = await send("Page.captureScreenshot", params);
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(data, "base64"));
  console.log("saved", name);
}

// The rectangle of an element (optionally padded), in page CSS pixels.
async function rect(selector, pad = 0) {
  return js(`const r = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
    return { x: Math.max(0, r.left - ${pad}), y: Math.max(0, r.top - ${pad}), width: r.width + ${pad * 2}, height: r.height + ${pad * 2} };`);
}

const click = (selector, text) =>
  js(`const el = [...document.querySelectorAll(${JSON.stringify(selector)})].find((b) => ${text ? `b.textContent.includes(${JSON.stringify(text)})` : "true"});
    if (!el) throw new Error("no ${selector} ${text ?? ""}"); el.click(); return true;`);

async function theme(mode) {
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: mode }] });
  await js(`localStorage.setItem("yapifier-theme", ${JSON.stringify(mode)}); return true;`);
}

async function load() {
  await send("Page.navigate", { url: APP });
  await until(`document.querySelector(".landing") || document.querySelector(".editor")`, 20000, "page");
  await js(`await document.fonts.ready; return true;`);
  await sleep(800);
}

try {
  await connect();
  await send("Page.enable");
  await send("Runtime.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 2, mobile: false });

  // Landing, light and dark, from a clean profile.
  await load(); // the page must be on the app's origin before localStorage is reachable
  await theme("light");
  await load();
  await shot("landing-light");
  await theme("dark");
  await load();
  await shot("landing-dark");
  await theme("light");
  await load();

  // Open the sample, load its notes, let Yappy apply them.
  await click("button", "Try it on a sample video");
  await until(`window.__yap?.source && document.querySelector(".stage canvas")`, 30000, "editor");
  await sleep(1500);
  await click("button", "Load 5 sample notes");
  await until(`window.__yap.notes.length === 5`, 30000, "sample notes");
  await sleep(500);
  await shot("editor-notes");
  await click(".notes-panel button.primary", "Apply");
  await sleep(4000);
  await shot("yappy-working");
  await until(`window.__yap.notes.every((n) => n.status !== "pending")`, 120000, "apply");
  await sleep(1500);
  console.log(await js(`return { edits: window.__yap.versions.at(-1).edits.map((e) => e.kind + " " + ("start" in e ? e.start + "-" + e.end : "")), statuses: window.__yap.notes.map((n) => n.status) };`).then(JSON.stringify));

  // The edited video at the end card: label and masked email.
  await js(`window.__yap.player.pause(); window.__yap.player.seek(31.4 - 2); return true;`);
  await sleep(800);
  await js(`document.querySelector("details.agent-log").open = true; return true;`);
  await sleep(300);
  await shot("editor-applied");
  await js(`document.querySelector(".agent-log").scrollIntoView({ block: "center" }); return true;`);
  await sleep(400);
  await shot("yappy-log", await rect(".agent-log", 10));
  await js(`document.querySelector(".notes").scrollTop = 0; document.querySelector(".notes-panel").scrollIntoView({ block: "start" }); return true;`);
  await sleep(300);
  await shot("notes-applied", await rect(".notes-panel", 8));

  // Before and after at the zoom: hold O for the original.
  await js(`window.scrollTo(0, 0); window.__yap.player.seek(24.2 - 2); return true;`);
  await sleep(900);
  await shot("compare-edited", await rect(".stage"));
  await js(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "o", bubbles: true })); return true;`);
  await sleep(900);
  await shot("compare-original", await rect(".stage"));
  await js(`document.body.dispatchEvent(new KeyboardEvent("keyup", { key: "o", bubbles: true })); return true;`);
  await sleep(500);

  // Correct by hand: select the blur, switch it to a solid mask, show the handles.
  await click(".edit-pick", "Blur an area");
  await sleep(1200);
  await click(".segmented button", "Solid mask");
  await sleep(1000);
  await js(`window.scrollTo(0, 0); return true;`);
  await sleep(400);
  await shot("correct-by-hand");
  await js(`document.querySelector(".side .inspector").scrollIntoView({ block: "center" }); return true;`);
  await sleep(400);
  await shot("inspector", await rect(".side .inspector", 10));
  await js(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); window.scrollTo(0, 0); return true;`);
  await sleep(400);

  // Talk to the timeline: say it into the command bar (a paste is how Flow types).
  const say = async (text) => {
    await js(`const el = document.querySelector('[aria-label="Command for the editor"]'); el.focus();
      const dt = new DataTransfer(); dt.setData("text/plain", ${JSON.stringify(text)});
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true })); return true;`);
    await sleep(600);
    await until(`!document.querySelector(".command-pending")`, 90000, `Yappy on “${text}”`);
    await js(`window.__yap.player.pause(); document.activeElement.blur(); window.scrollTo(0, 0); return true;`);
    await sleep(900);
  };
  // The stage down to the command bar's answer line.
  const stageAndBar = () =>
    js(`const a = document.querySelector(".stage").getBoundingClientRect(); const b = document.querySelector(".command-bar").getBoundingClientRect();
      return { x: a.left - 8, y: a.top - 8, width: a.width + 16, height: b.bottom - a.top + 16 };`);
  // A moment in video seconds, through the edit's cuts (the clock is the edited timeline).
  const seekVideo = (t) =>
    js(`const p = window.__yap.player; const s = p.segs.find((s) => s.type === "play" && ${t} >= s.src0 && ${t} < s.src1);
      p.pause(); p.seek(s.out0 + (${t} - s.src0) / s.rate); return true;`);
  await say("Go to the No Hands part.");
  await shot("voice-choices", await stageAndBar());
  await say("Take me to where it shows ₹1 lakh.");
  await shot("voice-find", await stageAndBar());

  // Captions: from the voiceover, then fixed by voice.
  await click("button", "CC Add captions");
  await until(`window.__yap.versions.at(-1).edits.some((e) => e.kind === "captions")`, 60000, "captions");
  await say("The captions say Whisper, it should be Wispr.");
  await seekVideo(11.6);
  await sleep(1000);
  await shot("captions-fixed", await stageAndBar());
  await click("button", "CC Captions");
  await sleep(1200);
  await js(`document.querySelector(".side .inspector").scrollIntoView({ block: "center" }); return true;`);
  await sleep(500);
  await shot("captions-inspector", await rect(".side .inspector", 10));
  await js(`document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); window.__yap.player.seek(29.4); return true;`);
  await sleep(800);

  // Dark editor (the toggle, as a viewer would).
  await js(`document.querySelector(".theme-toggle").click(); return true;`);
  await sleep(1000);
  await js(`window.scrollTo(0, 0); return true;`);
  await shot("editor-dark");

  // Refresh: the resume card.
  await theme("light");
  await load();
  await until(`document.querySelector(".resume")`, 10000, "resume card");
  await sleep(500);
  await shot("resume", await rect(".resume", 16));
} catch (e) {
  console.error("FAILED:", e.message);
  process.exitCode = 1;
} finally {
  ws?.close();
  chrome.kill();
}
