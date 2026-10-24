// Looks at the original footage without touching playback: a hidden <video>
// of its own, seeked to any moment and read back as frames or as small
// grayscale patches. Tracking compares the patch inside a box with the patch
// at the pinned moment, so an overlay can end when what it covers leaves.
import { mediaEvent, seekTo } from "./media";
import type { Edit } from "./types";

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

// When the content of a box stays the same. Open ends mean the search reached
// its limit (or the video's edge) without seeing a change.
export interface Span {
  start: number;
  end: number;
  openStart: boolean;
  openEnd: boolean;
}

const STEP = 0.5; // coarse sampling, seconds
const REACH = 20; // how far to search each way
const PIXEL = 0.16; // a pixel changed when its grey level moved this much (0–1)
const SHARE = 0.05; // a box changed when this share of its pixels did
const IDLE_MS = 1500; // a gap this long between reads counts as idle
const BLUR_PAD = 0.35; // fades count as change late, so a blur starts early and ends late

export class Footage {
  private video: HTMLVideoElement;
  private canvas = document.createElement("canvas");
  private probe = document.createElement("canvas");
  private queue: Promise<unknown> = Promise.resolve();
  private ready: Promise<void>;
  private lastSeek = 0;

  constructor(
    url: string,
    readonly duration: number,
  ) {
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.crossOrigin = "anonymous";
    v.playsInline = true;
    this.ready = mediaEvent(v, "loadeddata");
    this.ready.catch(() => undefined); // reported by the first call that needs it
    v.src = url;
    this.video = v;
  }

  // One element can only be at one moment, so seeks run one at a time.
  private run<T>(job: () => Promise<T>): Promise<T> {
    const next = this.queue.then(job, job);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async seek(t: number) {
    await this.ready;
    const v = this.video;
    const target = Math.min(Math.max(0, t), Math.max(0, this.duration - 0.04));
    const idle = performance.now() - this.lastSeek > IDLE_MS;
    if (Math.abs(v.currentTime - target) >= 0.001 || v.readyState < 2) await seekTo(v, target);
    if (idle) await this.settle();
    this.lastSeek = performance.now();
  }

  // A paused video left alone for a while can be put to sleep by the browser,
  // and the first frame read after waking may not be the one asked for. After
  // an idle spell, read until two looks a moment apart agree.
  private async settle() {
    const c = this.probe;
    c.width = 32;
    c.height = 18;
    const ctx = c.getContext("2d", { willReadFrequently: true })!;
    const look = () => {
      ctx.drawImage(this.video, 0, 0, 32, 18);
      return ctx.getImageData(0, 0, 32, 18).data;
    };
    let prev = look();
    for (let i = 0; i < 6; i++) {
      await new Promise((r) => setTimeout(r, 40));
      const next = look();
      let diff = 0;
      for (let k = 0; k < next.length; k += 4) diff += Math.abs(next[k] - prev[k]);
      if (diff / (next.length / 4) < 2) return;
      prev = next;
    }
  }

  // A JPEG of the original frame, for Claude to look at.
  frame(t: number, width = 480): Promise<string> {
    return this.run(async () => {
      await this.seek(t);
      const v = this.video;
      this.canvas.width = width;
      this.canvas.height = Math.round((v.videoHeight / v.videoWidth) * width);
      this.canvas.getContext("2d")!.drawImage(v, 0, 0, this.canvas.width, this.canvas.height);
      return this.canvas.toDataURL("image/jpeg", 0.7);
    });
  }

  // The box at time t as a small grayscale patch (about one sample per 4 video pixels).
  private patch(t: number, box: Box): Promise<Float32Array> {
    return this.run(async () => {
      await this.seek(t);
      const v = this.video;
      const sw = box.w * v.videoWidth;
      const sh = box.h * v.videoHeight;
      const cols = Math.max(8, Math.min(64, Math.round(sw / 4)));
      const rows = Math.max(4, Math.min(48, Math.round((cols * sh) / Math.max(1, sw))));
      this.canvas.width = cols;
      this.canvas.height = rows;
      const ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(v, box.x * v.videoWidth, box.y * v.videoHeight, sw, sh, 0, 0, cols, rows);
      const px = ctx.getImageData(0, 0, cols, rows).data;
      const grey = new Float32Array(cols * rows);
      for (let i = 0; i < grey.length; i++) grey[i] = (0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2]) / 255;
      return grey;
    });
  }

  // How long the content inside box stays as it is at time `at`.
  async span(box: Box, at: number): Promise<Span> {
    const ref = await this.patch(at, box);
    const same = async (t: number) => {
      const p = await this.patch(t, box);
      let changed = 0;
      for (let i = 0; i < p.length; i++) if (Math.abs(p[i] - ref[i]) > PIXEL) changed++;
      return changed / p.length < SHARE;
    };
    // Walk out in coarse steps, then narrow the change down to ~0.03 s.
    const edge = async (dir: 1 | -1): Promise<{ t: number; open: boolean }> => {
      const limit = dir > 0 ? Math.min(this.duration, at + REACH) : Math.max(0, at - REACH);
      let inside = at;
      for (let t = at + dir * STEP; dir > 0 ? t <= limit : t >= limit; t += dir * STEP) {
        if (!(await same(t))) {
          let a = inside;
          let b = t;
          for (let i = 0; i < 4; i++) {
            const m = (a + b) / 2;
            if (await same(m)) a = m;
            else b = m;
          }
          return { t: b, open: false };
        }
        inside = t;
      }
      return { t: limit, open: true };
    };
    const end = await edge(1);
    const start = await edge(-1);
    return { start: round(start.t), end: round(end.t), openStart: start.open, openEnd: end.open };
  }
}

const round = (t: number) => Math.round(t * 100) / 100;

// The area an overlay is about: its own box, or a box around the spot it points at.
export function boxOf(e: Edit): Box | null {
  const around = (x: number, y: number, w: number, h: number) => ({ x: Math.max(0, x - w / 2), y: Math.max(0, y - h / 2), w, h });
  switch (e.kind) {
    case "blur":
    case "highlight":
      return { x: e.x, y: e.y, w: e.w, h: e.h };
    case "callout":
      return around(e.x, e.y, 0.1, 0.08);
    case "zoom":
      return around(e.x, e.y, 0.3, 0.25);
    default:
      return null;
  }
}

// Keep fresh overlays on screen only while what they cover is there. A blur
// covers the whole time its content is visible; the others keep their chosen
// timing but are cut short where the content leaves.
export async function fitToFootage(
  footage: Footage,
  edits: Edit[],
  fresh: Set<string>,
  pinnedAt: (e: Edit) => number | undefined,
): Promise<{ edits: Edit[]; fitted: { before: Edit; after: Edit }[] }> {
  const fitted: { before: Edit; after: Edit }[] = [];
  const out: Edit[] = [];
  for (const e of edits) {
    const box = fresh.has(e.id) && "start" in e ? boxOf(e) : null;
    if (!box || !("start" in e)) {
      out.push(e);
      continue;
    }
    const pin = pinnedAt(e);
    const at = Math.min(e.end, Math.max(e.start, pin ?? (e.start + e.end) / 2));
    const span = await footage.span(box, at);
    let start = e.start;
    let end = e.end;
    if (span.end - span.start < 0.3) {
      // The content barely holds still (or a read went wrong): trust the timing Claude chose.
      out.push(e);
      continue;
    }
    if (e.kind === "blur") {
      start = span.openStart ? Math.min(e.start, span.start) : Math.max(0, span.start - BLUR_PAD);
      end = span.openEnd ? Math.max(e.end, span.end) : Math.min(footage.duration, span.end + BLUR_PAD);
    } else {
      start = Math.max(e.start, span.start);
      end = Math.min(e.end, span.end);
      if (end - start < 0.4) ({ start, end } = e);
    }
    const after = { ...e, start: round(start), end: round(end) };
    if (after.start !== e.start || after.end !== e.end) fitted.push({ before: e, after });
    out.push(after);
  }
  return { edits: out, fitted };
}
