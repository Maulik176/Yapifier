// Turns the edit list into the timeline the viewer actually sees: pieces of
// the source played at some rate, with holds (freeze frames, title cards)
// slotted in between. "out" time is the edited timeline; "src" is the video.
import type { Edit, Freeze, Title } from "./types.js";

export type Segment =
  | { type: "play"; src0: number; src1: number; rate: number; out0: number; out1: number }
  | { type: "hold"; src: number; edit: Freeze | Title; out0: number; out1: number };

const EPS = 1e-3;

function mergedCuts(edits: Edit[], duration: number): [number, number][] {
  const cuts = edits
    .filter((e) => e.kind === "cut")
    .map((e) => [Math.max(0, e.start), Math.min(duration, e.end)] as [number, number])
    .filter(([a, b]) => b - a > EPS)
    .sort((a, b) => a[0] - b[0]);
  const out: [number, number][] = [];
  for (const c of cuts) {
    const last = out[out.length - 1];
    if (last && c[0] <= last[1] + EPS) last[1] = Math.max(last[1], c[1]);
    else out.push([...c]);
  }
  return out;
}

export function isCut(edits: Edit[], duration: number, t: number): boolean {
  return mergedCuts(edits, duration).some(([a, b]) => t >= a - EPS && t < b - EPS);
}

export function buildTimeline(edits: Edit[], duration: number): Segment[] {
  const cuts = mergedCuts(edits, duration);
  const speeds = edits.filter((e) => e.kind === "speed");
  const holds = edits.filter((e): e is Freeze | Title => e.kind === "freeze" || e.kind === "title").filter((h) => !cuts.some(([a, b]) => h.at > a && h.at < b));

  const points = new Set<number>([0, duration]);
  for (const [a, b] of cuts) (points.add(a), points.add(b));
  for (const s of speeds) (points.add(Math.max(0, s.start)), points.add(Math.min(duration, s.end)));
  for (const h of holds) points.add(Math.min(duration, Math.max(0, h.at)));
  const marks = [...points].sort((a, b) => a - b);

  const segs: Segment[] = [];
  let out = 0;
  const pushHolds = (at: number) => {
    for (const h of holds.filter((h) => Math.abs(Math.min(duration, Math.max(0, h.at)) - at) < EPS).sort((a, b) => (a.kind === "title" ? -1 : 1) - (b.kind === "title" ? -1 : 1))) {
      segs.push({ type: "hold", src: Math.min(at, duration - 0.05), edit: h, out0: out, out1: out + h.duration });
      out += h.duration;
    }
  };
  for (let i = 0; i < marks.length - 1; i++) {
    const a = marks[i];
    const b = marks[i + 1];
    pushHolds(a);
    if (b - a < EPS) continue;
    const mid = (a + b) / 2;
    if (cuts.some(([c0, c1]) => mid > c0 && mid < c1)) continue;
    // The latest speed edit covering this piece wins.
    const speed = [...speeds].reverse().find((s) => mid > s.start && mid < s.end);
    const rate = speed ? speed.rate : 1;
    const len = (b - a) / rate;
    const prev = segs[segs.length - 1];
    if (prev && prev.type === "play" && prev.rate === rate && Math.abs(prev.src1 - a) < EPS) {
      prev.src1 = b;
      prev.out1 += len;
    } else segs.push({ type: "play", src0: a, src1: b, rate, out0: out, out1: out + len });
    out += len;
  }
  pushHolds(duration);
  return segs;
}

export const outDuration = (segs: Segment[]) => (segs.length ? segs[segs.length - 1].out1 : 0);

export function locate(segs: Segment[], outT: number): { seg: Segment; srcT: number } {
  if (!segs.length) return { seg: { type: "play", src0: 0, src1: 0, rate: 1, out0: 0, out1: 0 }, srcT: 0 };
  const t = Math.max(0, Math.min(outT, outDuration(segs) - EPS));
  const seg = segs.find((s) => t >= s.out0 && t < s.out1) ?? segs[segs.length - 1];
  if (seg.type === "hold") return { seg, srcT: seg.src };
  return { seg, srcT: seg.src0 + (t - seg.out0) * seg.rate };
}

// Where a source moment lands on the edited timeline (cut moments map to the next piece).
export function srcToOut(segs: Segment[], srcT: number): number {
  for (const s of segs) {
    if (s.type === "play" && srcT >= s.src0 - EPS && srcT < s.src1) return s.out0 + (srcT - s.src0) / s.rate;
    if (s.type === "play" && s.src0 > srcT) return s.out0;
  }
  return outDuration(segs);
}

export function formatTime(t: number): string {
  const m = Math.floor(Math.max(0, t) / 60);
  const s = Math.max(0, t) - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}

// Closed-form damped spring 0→1, for title cards and zoom easing.
export function spring(t: number, zeta = 0.85, omega = 12): number {
  if (t <= 0) return 0;
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  return 1 - Math.exp(-zeta * omega * t) * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
}
