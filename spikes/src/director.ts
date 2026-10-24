import { hitTest, preloadImages, render, type El } from "./engine";
import { sampleFilm as film } from "./sample-film";

interface Note {
  t: number;
  x: number;
  y: number;
  element: El | null;
  text: string;
  source: "voice (paste)" | "typed" | "mixed";
  msToWords: number | null;
}

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const canvas = $<HTMLCanvasElement>("canvas");
const stage = $<HTMLDivElement>("stage");
const popover = $<HTMLDivElement>("popover");
const noteBox = $<HTMLTextAreaElement>("note");
const pinEl = $<HTMLDivElement>("pin");
const playBtn = $<HTMLButtonElement>("play");
const scrub = $<HTMLInputElement>("scrub");
const timeLabel = $<HTMLSpanElement>("time");
const notesList = $<HTMLOListElement>("notes");
const logEl = $<HTMLPreElement>("log");
const timeline = $<HTMLDivElement>("timeline");

const ctx = canvas.getContext("2d")!;
const notes: Note[] = [];
const events: string[] = [];

let playing = true;
let t = 0;
let lastFrame = performance.now();
let highlightId: string | undefined;
let pending: { t: number; x: number; y: number; element: El | null } | null = null;
let focusAt = 0;
let firstWordsAt = 0;
let sawPaste = false;
let sawTypedKey = false;

function resize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(stage.clientWidth * dpr);
  canvas.height = Math.round(stage.clientHeight * dpr);
}

function draw() {
  ctx.setTransform(canvas.width / film.width, 0, 0, canvas.height / film.height, 0, 0);
  render(ctx, film, t, highlightId);
  scrub.value = String(t);
  timeLabel.textContent = `${t.toFixed(2)}s`;
}

function loop(now: number) {
  if (playing) t = (t + (now - lastFrame) / 1000) % film.duration;
  lastFrame = now;
  draw();
  requestAnimationFrame(loop);
}

function setPlaying(next: boolean) {
  playing = next;
  playBtn.textContent = playing ? "Pause" : "Play";
}

function log(line: string) {
  const stamp = focusAt ? `+${Math.round(performance.now() - focusAt)}ms` : "";
  events.push(`${stamp.padStart(8)} ${line}`);
  logEl.textContent = events.slice(-60).join("\n");
  logEl.scrollTop = logEl.scrollHeight;
}

stage.addEventListener("click", (e) => {
  if (popover.contains(e.target as Node)) return;
  const rect = canvas.getBoundingClientRect();
  const px = e.clientX - rect.left;
  const py = e.clientY - rect.top;
  const fx = (px / rect.width) * film.width;
  const fy = (py / rect.height) * film.height;
  setPlaying(false);
  const element = hitTest(film, t, fx, fy);
  highlightId = element?.id;
  pending = { t, x: Math.round(fx), y: Math.round(fy), element };

  pinEl.style.display = "block";
  pinEl.style.left = `${px}px`;
  pinEl.style.top = `${py}px`;
  popover.style.display = "block";
  popover.style.left = `${Math.min(px + 16, rect.width - popover.offsetWidth - 8)}px`;
  popover.style.top = `${Math.min(py + 16, rect.height - popover.offsetHeight - 8)}px`;
  $("target").textContent = `${t.toFixed(2)}s · ${element ? element.name : "background"} · (${pending.x}, ${pending.y})`;
  $("source").textContent = "waiting for words";
  noteBox.value = "";
  sawPaste = false;
  sawTypedKey = false;
  firstWordsAt = 0;
  focusAt = performance.now();
  noteBox.focus();
  events.length = 0;
  log(`pinned at ${t.toFixed(2)}s on ${element?.id ?? "background"}; note box focused`);
});

noteBox.addEventListener("keydown", (e) => {
  const mods = [e.metaKey && "Meta", e.ctrlKey && "Ctrl", e.altKey && "Alt", e.shiftKey && "Shift"].filter(Boolean).join("+");
  log(`keydown key=${JSON.stringify(e.key)} code=${e.code}${mods ? ` mods=${mods}` : ""}`);
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    saveNote();
    return;
  }
  if (e.key === "Escape") {
    closePopover();
    return;
  }
  if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) sawTypedKey = true;
});

noteBox.addEventListener("beforeinput", (e) => {
  const ie = e as InputEvent;
  log(`beforeinput inputType=${ie.inputType} data=${JSON.stringify((ie.data ?? "").slice(0, 40))}`);
});

noteBox.addEventListener("paste", (e) => {
  sawPaste = true;
  const text = e.clipboardData?.getData("text/plain") ?? "";
  log(`paste ${text.length} chars: ${JSON.stringify(text.slice(0, 60))}`);
});

noteBox.addEventListener("input", (e) => {
  const ie = e as InputEvent;
  if (!firstWordsAt && noteBox.value.trim()) firstWordsAt = performance.now();
  log(`input inputType=${ie.inputType} length=${noteBox.value.length}`);
  $("source").textContent = sourceLabel();
});

function sourceLabel(): Note["source"] {
  if (sawPaste && sawTypedKey) return "mixed";
  return sawPaste ? "voice (paste)" : "typed";
}

function saveNote() {
  const text = noteBox.value.trim();
  if (!pending || !text) return closePopover();
  notes.push({ ...pending, text, source: sourceLabel(), msToWords: firstWordsAt ? Math.round(firstWordsAt - focusAt) : null });
  renderNotes();
  closePopover();
}

function closePopover() {
  popover.style.display = "none";
  pinEl.style.display = "none";
  highlightId = undefined;
  pending = null;
  setPlaying(true);
}

function renderNotes() {
  notesList.innerHTML = "";
  timeline.innerHTML = "";
  for (const n of notes) {
    const li = document.createElement("li");
    li.textContent = `${n.t.toFixed(2)}s · ${n.element?.name ?? "background"} · "${n.text}"`;
    const tag = document.createElement("span");
    tag.className = `tag${n.source === "voice (paste)" ? " voice" : ""}`;
    tag.textContent = n.source + (n.msToWords !== null ? ` · words after ${n.msToWords}ms` : "");
    li.appendChild(tag);
    notesList.appendChild(li);
    const m = document.createElement("div");
    m.className = "marker";
    m.style.left = `${(n.t / film.duration) * 100}%`;
    m.title = n.text;
    timeline.appendChild(m);
  }
}

playBtn.addEventListener("click", () => setPlaying(!playing));
scrub.addEventListener("input", () => {
  setPlaying(false);
  t = Number(scrub.value);
});

// Exposed so automated checks can read results.
(window as unknown as { __spike: unknown }).__spike = { notes, events, film };

window.addEventListener("resize", resize);
preloadImages(film).then(() => {
  resize();
  requestAnimationFrame(loop);
});
