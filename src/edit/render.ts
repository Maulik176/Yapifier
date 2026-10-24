// Paints one output frame: the video (zoomed if asked) plus every overlay
// active at this source moment, or a title card during a title hold.
import { spring } from "./timeline";
import type { Callout, Edit, Title } from "./types";

type Ctx = CanvasRenderingContext2D;

const FONT = "Inter, system-ui, -apple-system, sans-serif";
const YELLOW = "#ffd23f";

// 0→1 near the start of a span, 1→0 near its end, eased.
function envelope(t: number, start: number, end: number, ramp = 0.35): number {
  if (t < start || t > end) return 0;
  const k = Math.min(1, (t - start) / ramp, (end - t) / ramp);
  return k * k * (3 - 2 * k);
}

function active<K extends Edit["kind"]>(edits: Edit[], kind: K, t: number) {
  return edits.filter((e): e is Extract<Edit, { kind: K }> => e.kind === kind && "start" in e && t >= e.start && t <= e.end);
}

interface View {
  sx: number;
  sy: number;
  sw: number;
  sh: number; // crop window in normalized source units
}

function viewAt(edits: Edit[], srcT: number): View {
  const zoom = active(edits, "zoom", srcT).pop();
  if (!zoom) return { sx: 0, sy: 0, sw: 1, sh: 1 };
  const k = envelope(srcT, zoom.start, zoom.end, 0.45);
  const scale = 1 + (zoom.scale - 1) * k;
  const sw = 1 / scale;
  const cx = 0.5 + (zoom.x - 0.5) * k;
  const cy = 0.5 + (zoom.y - 0.5) * k;
  return { sx: Math.min(1 - sw, Math.max(0, cx - sw / 2)), sy: Math.min(1 - sw, Math.max(0, cy - sw / 2)), sw, sh: sw };
}

let pixelCanvas: HTMLCanvasElement | null = null;

function drawTitle(ctx: Ctx, W: number, H: number, title: Title, local: number) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, "#1a1530");
  g.addColorStop(1, "#0c0a12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const out = Math.max(0, local - (title.duration - 0.35)) / 0.35; // fade at the end
  const p = spring(local - 0.1, 0.9, 11);
  const q = spring(local - 0.35, 0.9, 11);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - out);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha *= Math.min(1, p * 1.5);
  ctx.font = `800 ${Math.round(H * 0.085)}px ${FONT}`;
  ctx.fillText(title.text, W / 2, H * 0.47 + (1 - p) * H * 0.05);
  if (title.sub) {
    ctx.globalAlpha = Math.max(0, 1 - out) * Math.min(1, q * 1.5);
    ctx.fillStyle = "#b9a8ff";
    ctx.font = `500 ${Math.round(H * 0.038)}px ${FONT}`;
    ctx.fillText(title.sub, W / 2, H * 0.58 + (1 - q) * H * 0.04);
  }
  ctx.restore();
}

function drawCallout(ctx: Ctx, W: number, H: number, c: Callout, px: number, py: number, k: number) {
  const pop = Math.min(1, k * 1.4);
  ctx.save();
  ctx.globalAlpha = pop;
  const r = H * 0.012;
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.arc(px, py, r * (0.6 + 0.4 * pop), 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,210,63,0.45)";
  ctx.lineWidth = r * 0.8;
  ctx.beginPath();
  ctx.arc(px, py, r * 2.2, 0, Math.PI * 2);
  ctx.stroke();

  const fs = Math.round(H * 0.034);
  ctx.font = `700 ${fs}px ${FONT}`;
  const tw = ctx.measureText(c.text).width;
  const bw = tw + fs * 1.2;
  const bh = fs * 1.9;
  const right = px + bw + H * 0.06 < W;
  const up = py - bh - H * 0.06 > 0;
  const bx = right ? px + H * 0.05 : px - H * 0.05 - bw;
  const by = up ? py - H * 0.05 - bh : py + H * 0.05;
  ctx.strokeStyle = YELLOW;
  ctx.lineWidth = Math.max(2, H * 0.004);
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(right ? bx : bx + bw, up ? by + bh : by);
  ctx.stroke();
  ctx.fillStyle = YELLOW;
  ctx.beginPath();
  ctx.roundRect(bx, by + (1 - pop) * 10, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "#14101f";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillText(c.text, bx + bw / 2, by + bh / 2 + (1 - pop) * 10);
  ctx.restore();
}

export interface FrameState {
  srcT: number;
  title?: { edit: Title; local: number };
}

export function renderFrame(ctx: Ctx, W: number, H: number, video: HTMLVideoElement, edits: Edit[], state: FrameState) {
  if (state.title) return drawTitle(ctx, W, H, state.title.edit, state.title.local);
  const t = state.srcT;
  const vw = video.videoWidth || 1;
  const vh = video.videoHeight || 1;
  const v = viewAt(edits, t);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, W, H);
  if (video.readyState >= 2) ctx.drawImage(video, v.sx * vw, v.sy * vh, v.sw * vw, v.sh * vh, 0, 0, W, H);
  // Source (normalized) → output pixels, through the zoom window.
  const ox = (nx: number) => ((nx - v.sx) / v.sw) * W;
  const oy = (ny: number) => ((ny - v.sy) / v.sh) * H;

  for (const b of active(edits, "blur", t)) {
    const x = ox(b.x);
    const y = oy(b.y);
    const w = (b.w / v.sw) * W;
    const h = (b.h / v.sh) * H;
    if (video.readyState < 2 || w < 2 || h < 2) continue;
    pixelCanvas ??= document.createElement("canvas");
    const cells = Math.max(4, Math.round(w / 18));
    pixelCanvas.width = cells;
    pixelCanvas.height = Math.max(2, Math.round((h / w) * cells));
    const pc = pixelCanvas.getContext("2d")!;
    pc.drawImage(video, b.x * vw, b.y * vh, b.w * vw, b.h * vh, 0, 0, pixelCanvas.width, pixelCanvas.height);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(w, h) * 0.12);
    ctx.clip();
    ctx.drawImage(pixelCanvas, x, y, w, h);
    ctx.restore();
  }

  for (const hl of active(edits, "highlight", t)) {
    const k = envelope(t, hl.start, hl.end);
    const x = ox(hl.x);
    const y = oy(hl.y);
    const w = (hl.w / v.sw) * W;
    const h = (hl.h / v.sh) * H;
    const pad = H * 0.012;
    ctx.save();
    ctx.fillStyle = `rgba(8,6,14,${0.62 * k})`;
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, H * 0.02);
    ctx.fill("evenodd");
    ctx.strokeStyle = YELLOW;
    ctx.globalAlpha = k;
    ctx.lineWidth = Math.max(2, H * 0.005);
    ctx.beginPath();
    ctx.roundRect(x - pad, y - pad, w + pad * 2, h + pad * 2, H * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  for (const c of active(edits, "callout", t)) drawCallout(ctx, W, H, c, ox(c.x), oy(c.y), envelope(t, c.start, c.end, 0.25));
}

// A click on the (possibly zoomed) output frame, as a point in the source frame.
export function toSource(edits: Edit[], srcT: number, ox: number, oy: number): { x: number; y: number } {
  const v = viewAt(edits, srcT);
  return { x: v.sx + ox * v.sw, y: v.sy + oy * v.sh };
}

// A source-frame point, as a position on the output frame (null when zoomed out of view).
export function toOutput(edits: Edit[], srcT: number, x: number, y: number): { x: number; y: number } | null {
  const v = viewAt(edits, srcT);
  const ox = (x - v.sx) / v.sw;
  const oy = (y - v.sy) / v.sh;
  return ox < 0 || ox > 1 || oy < 0 || oy > 1 ? null : { x: ox, y: oy };
}

// Volume multiplier at a source moment (the last matching edit wins).
export function volumeAt(edits: Edit[], srcT: number): number {
  const v = active(edits, "volume", srcT).pop();
  return v ? v.level : 1;
}
