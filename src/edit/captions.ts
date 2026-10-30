// Captions from transcribed words: grouping words into short lines, timing
// for the word highlight, and an .srt file of the edited timeline. No DOM here.
import { buildTimeline, srcToOut } from "./timeline.js";
import type { Captions, Cue, Edit, Word } from "./types.js";

const MAX_WORDS = 7;
const MAX_SECONDS = 3.2;
const MAX_GAP = 0.7; // a pause this long starts a new line

// Whisper puts non-speech in brackets ("(upbeat music)", "[Music]"), and can
// give several words the same instant. Drop the first, spread the second.
export function cleanWords(raw: Word[]): Word[] {
  const words: Word[] = [];
  let bracket = false;
  for (const w of raw) {
    const text = w.text.trim();
    if (!text) continue;
    if (/^[([]/.test(text)) bracket = true;
    const inside = bracket;
    if (/[)\]]$/.test(text)) bracket = false;
    if (!inside) words.push({ start: w.start, end: Math.max(w.end, w.start), text });
  }
  for (let i = 0; i < words.length; ) {
    let j = i;
    while (j + 1 < words.length && words[j].end - words[j].start < 0.05 && words[j + 1].start - words[i].start < 0.05) j++;
    if (j > i || words[i].end - words[i].start < 0.05) {
      const from = words[i].start;
      const to = Math.max(words[j].end, j + 1 < words.length ? words[j + 1].start : words[j].end + 0.3, from + 0.2 * (j - i + 1));
      const each = (to - from) / (j - i + 1);
      for (let k = i; k <= j; k++) words[k] = { ...words[k], start: round(from + each * (k - i)), end: round(from + each * (k - i + 1)) };
    }
    i = j + 1;
  }
  return words;
}

// Short lines: a new one after a sentence ends, after a pause, or when a line is full.
export function wordsToCues(raw: Word[]): Cue[] {
  const cues: Cue[] = [];
  let line: Word[] = [];
  const flush = () => {
    if (line.length) cues.push({ start: line[0].start, end: line[line.length - 1].end, text: line.map((w) => w.text).join(" "), words: line });
    line = [];
  };
  for (const w of cleanWords(raw)) {
    const last = line[line.length - 1];
    if (last && (w.start - last.end > MAX_GAP || line.length >= MAX_WORDS || w.end - line[0].start > MAX_SECONDS || (/[,;:]$/.test(last.text) && line.length >= 4))) flush();
    line.push(w);
    if (/[.?!]$/.test(w.text)) flush();
  }
  flush();
  return cues;
}

// A cue's words with timing: its own when they still match its text (it may
// have been fixed or translated since), otherwise spread by length.
export function wordsOf(cue: Cue): Word[] {
  const parts = cue.text.split(/\s+/).filter(Boolean);
  if (cue.words && cue.words.map((w) => w.text).join(" ") === parts.join(" ")) return cue.words;
  const total = parts.reduce((n, p) => n + p.length + 1, 0);
  let t = cue.start;
  return parts.map((text) => {
    const len = ((text.length + 1) / total) * (cue.end - cue.start);
    const w = { start: t, end: t + len, text };
    t += len;
    return w;
  });
}

export const cueAt = (c: Captions, srcT: number) => c.cues.find((q) => srcT >= q.start && srcT <= q.end);

export function makeCaptions(cues: Cue[], lang = ""): Captions {
  return { id: `captions-${Date.now().toString(36)}`, kind: "captions", start: cues[0].start, end: cues[cues.length - 1].end, cues, style: "bold", position: "bottom", size: 1, lang };
}

// The captions with some lines' text replaced (1-based), keeping their timing.
export function rewrite(c: Captions, lines: { n: number; text: string }[], lang?: string): Captions {
  const cues = c.cues.map((q, i) => {
    const line = lines.find((l) => l.n === i + 1);
    return line && line.text.trim() ? { start: q.start, end: q.end, text: line.text.trim().slice(0, 200) } : q;
  });
  return { ...c, cues, lang: lang ?? c.lang };
}

const stamp = (t: number) => {
  const ms = Math.round(Math.max(0, t) * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3_600_000))}:${p(Math.floor(ms / 60_000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
};

// An .srt for the edited video: lines move with cuts, speed changes and
// inserted cards; lines that fall inside a cut are left out.
export function toSrt(edits: Edit[], duration: number): string {
  const c = edits.find((e): e is Captions => e.kind === "captions");
  if (!c) return "";
  const segs = buildTimeline(edits, duration);
  const out: string[] = [];
  for (const q of c.cues) {
    const a = srcToOut(segs, q.start);
    const b = srcToOut(segs, q.end);
    if (b - a < 0.2) continue;
    out.push(`${out.length + 1}\n${stamp(a)} --> ${stamp(b)}\n${q.text}\n`);
  }
  return out.join("\n");
}

const round = (t: number) => Math.round(t * 100) / 100;
