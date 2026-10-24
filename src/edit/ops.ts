// The only way the edit list changes: ops from Claude, each checked and
// clamped here before it lands. Shared by the browser and the server.
import { buildTimeline, formatTime, outDuration } from "./timeline.js";
import { EDIT_KINDS, type Change, type Edit, type EditKind } from "./types.js";

// Claude fills every field; -1 (numbers) or "" (text) means "not set".
export interface Op {
  op: "add" | "update" | "remove";
  kind: EditKind;
  id: string;
  start: number;
  end: number;
  at: number;
  duration: number;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  rate: number;
  level: number;
  text: string;
  sub: string;
  exact: boolean; // timing asked for explicitly; keep it as given
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r2 = (v: number) => Math.round(v * 100) / 100;
const pct = (v: number) => `${Math.round(v * 100)}%`;

export function describe(e: Edit): string {
  const span = "start" in e ? `${formatTime(e.start)}–${formatTime(e.end)}` : `at ${formatTime(e.at)}`;
  switch (e.kind) {
    case "cut":
      return `Cut ${span}`;
    case "speed":
      return `Speed ${e.rate}× for ${span}`;
    case "zoom":
      return `Zoom ${e.scale}× on (${pct(e.x)}, ${pct(e.y)}), ${span}`;
    case "callout":
      return `Label “${e.text}”, ${span}`;
    case "highlight":
      return `Spotlight an area, ${span}`;
    case "blur":
      return `${e.solid ? "Mask" : "Blur"} an area, ${span}`;
    case "freeze":
      return `Freeze ${e.duration}s ${span}`;
    case "title":
      return `Title card “${e.text}” (${e.duration}s) ${span}`;
    case "volume":
      return e.level === 0 ? `Mute ${span}` : `Volume ${Math.round(e.level * 100)}% for ${span}`;
  }
}

const MIN_LEFT = 0.5; // seconds of video an edit must leave

let counter = 0;
const newId = (kind: string) => `${kind}-${Date.now().toString(36)}-${counter++}`;

// Build or update one edit from op fields, clamped to sane values. Returns an error string on failure.
function shape(kind: EditKind, prev: Partial<Edit> & Record<string, unknown>, op: Op, duration: number): Edit | string {
  const pick = (k: keyof Op, fallback?: number) => (typeof op[k] === "number" && (op[k] as number) >= 0 ? (op[k] as number) : ((prev as Record<string, unknown>)[k] as number | undefined) ?? fallback);
  const text = (k: "text" | "sub") => (op[k] ? op[k].trim() : ((prev as Record<string, unknown>)[k] as string | undefined) ?? "");
  const id = (prev.id as string) ?? newId(kind);

  if (kind === "freeze" || kind === "title") {
    const at = pick("at");
    if (at === undefined) return "needs a time";
    const base = { id, at: r2(clamp(at, 0, duration)) };
    if (kind === "freeze") return { ...base, kind, duration: r2(clamp(pick("duration", 2)!, 0.3, 8)) };
    const t = text("text").slice(0, 50);
    if (!t) return "a title card needs text";
    return { ...base, kind, duration: r2(clamp(pick("duration", 2.5)!, 1, 8)), text: t, sub: text("sub").slice(0, 80) };
  }

  const start = pick("start");
  const end = pick("end");
  if (start === undefined || end === undefined) return "needs a start and an end";
  const s = r2(clamp(start, 0, duration));
  const e = r2(clamp(end, 0, duration));
  if (e - s < (kind === "cut" ? 0.1 : 0.2)) return "too short";
  const span = { id, start: s, end: e };
  const x = pick("x");
  const y = pick("y");
  switch (kind) {
    case "cut":
      return { ...span, kind };
    case "speed":
      return { ...span, kind, rate: r2(clamp(pick("rate", 2)!, 0.25, 4)) };
    case "volume":
      return { ...span, kind, level: r2(clamp(pick("level", 0)!, 0, 1.5)) };
    case "zoom":
      if (x === undefined || y === undefined) return "needs a spot";
      return { ...span, kind, x: r2(clamp(x, 0, 1)), y: r2(clamp(y, 0, 1)), scale: r2(clamp(pick("scale", 2)!, 1.1, 4)) };
    case "callout": {
      if (x === undefined || y === undefined) return "needs a spot";
      const t = text("text").slice(0, 60);
      if (!t) return "a label needs text";
      return { ...span, kind, x: r2(clamp(x, 0, 1)), y: r2(clamp(y, 0, 1)), text: t };
    }
    case "highlight":
    case "blur": {
      let w = pick("w");
      let h = pick("h");
      if (x === undefined || y === undefined || w === undefined || h === undefined) return "needs an area";
      let bx = x;
      let by = y;
      // A blur that misses a few letters leaks the secret, so new blurs get a safety margin.
      if (kind === "blur" && !prev.id) {
        bx -= 0.02;
        by -= 0.015;
        w += 0.04;
        h += 0.03;
      }
      const cx = clamp(bx, 0, 0.98);
      const cy = clamp(by, 0, 0.98);
      const box = { x: r2(cx), y: r2(cy), w: r2(clamp(w, 0.02, 1 - cx)), h: r2(clamp(h, 0.02, 1 - cy)) };
      return kind === "blur" ? { ...span, kind, ...box, ...(prev.solid ? { solid: true } : {}) } : { ...span, kind, ...box };
    }
  }
  return "unknown kind";
}

export function applyOps(edits: Edit[], ops: Op[], noteId: string, duration: number): { edits: Edit[]; changes: Change[]; rejected: string[] } {
  let next = edits.map((e) => ({ ...e }));
  const changes: Change[] = [];
  const rejected: string[] = [];
  for (const op of ops) {
    if (!EDIT_KINDS.includes(op.kind)) {
      rejected.push(`unknown edit “${op.kind}”`);
      continue;
    }
    if (op.op === "remove") {
      const gone = next.find((e) => e.id === op.id);
      if (!gone) rejected.push(`nothing to remove (${op.id})`);
      else {
        next = next.filter((e) => e.id !== op.id);
        changes.push({ noteId, label: `Removed: ${describe(gone)}` });
      }
      continue;
    }
    const prev = op.op === "update" ? next.find((e) => e.id === op.id) : undefined;
    if (op.op === "update" && !prev) {
      rejected.push(`no edit called ${op.id} to change`);
      continue;
    }
    const kind = prev?.kind ?? op.kind;
    const shaped = shape(kind, (prev ?? {}) as Partial<Edit> & Record<string, unknown>, op, duration);
    if (typeof shaped === "string") {
      rejected.push(`${kind}: ${shaped}`);
      continue;
    }
    shaped.noteId = noteId;
    if (op.exact || prev?.exact) shaped.exact = true;
    const candidate = prev ? next.map((e) => (e.id === prev.id ? shaped : e)) : [...next, shaped];
    // Cuts and speed-ups must leave something to watch.
    if (outDuration(buildTimeline(candidate, duration)) < MIN_LEFT) {
      rejected.push(`${kind}: that would cut the whole video`);
      continue;
    }
    next = candidate;
    changes.push({ noteId, label: prev ? `Changed: ${describe(shaped)}` : describe(shaped) });
  }
  return { edits: next, changes, rejected };
}
