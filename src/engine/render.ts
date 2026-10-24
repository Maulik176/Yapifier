import { sceneAt, spring } from "./timing";
import type { El, Film } from "./types";

export interface Pose {
  el: El;
  cx: number;
  cy: number;
  scale: number;
  alpha: number;
  reveal: number; // 0..1 horizontal clip used by "wipe"
}

export function posesAt(film: Film, t: number): Pose[] {
  const { scene, local } = sceneAt(film, t);
  return scene.elements
    .filter((el) => !el.hidden)
    .map((el) => {
      const p = el.enter.preset === "none" ? 1 : spring(local - el.enter.at, el.enter.spring);
      const appear = el.enter.preset === "none" ? 1 : Math.min(1, Math.max(0, p * 1.8));
      let cx = el.x;
      let cy = el.y;
      let scale = 1;
      let reveal = 1;
      switch (el.enter.preset) {
        case "rise":
          cy += (1 - p) * 80;
          break;
        case "drop":
          cy -= (1 - p) * 80;
          break;
        case "pop":
          scale = 0.5 + 0.5 * p;
          break;
        case "slide-left":
          cx += (1 - p) * 300;
          break;
        case "slide-right":
          cx -= (1 - p) * 300;
          break;
        case "wipe":
          reveal = Math.min(1, Math.max(0, p));
          break;
      }
      return { el, cx, cy, scale, alpha: appear, reveal };
    });
}

const images = new Map<string, HTMLImageElement>();

export async function loadAssets(film: Film): Promise<void> {
  const srcs = new Set(film.scenes.flatMap((s) => s.elements.flatMap((e) => (e.src ? [e.src] : []))));
  await Promise.all(
    [...srcs].filter((src) => !images.has(src)).map(
      (src) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            images.set(src, img);
            resolve();
          };
          img.onerror = () => resolve(); // a missing image draws as an empty card, not a crash
          img.src = src;
        }),
    ),
  );
  await Promise.all([500, 700, 800].map((w) => document.fonts.load(`${w} 48px ${film.font}`)));
}

function drawImageCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) {
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

// Paints frame t. The context must already map 1 unit to 1 film pixel.
export function render(ctx: Ctx, film: Film, t: number, highlightId?: string | null) {
  const c = ctx as CanvasRenderingContext2D;
  const { scene } = sceneAt(film, t);
  c.fillStyle = scene.background;
  c.fillRect(0, 0, film.width, film.height);

  for (const pose of posesAt(film, t)) {
    const { el } = pose;
    if (pose.alpha <= 0.001) continue;
    c.save();
    c.globalAlpha = pose.alpha;
    c.translate(pose.cx, pose.cy);
    c.scale(pose.scale, pose.scale);
    if (pose.reveal < 1) {
      c.beginPath();
      c.rect(-el.w / 2, -el.h / 2, el.w * pose.reveal, el.h);
      c.clip();
    }
    const r = el.radius ?? 0;
    if (el.type === "box" || el.type === "image") {
      if (el.shadow) {
        c.shadowColor = "rgba(0,0,0,0.45)";
        c.shadowBlur = 40;
        c.shadowOffsetY = 18;
      }
      c.beginPath();
      c.roundRect(-el.w / 2, -el.h / 2, el.w, el.h, r);
      c.fillStyle = el.fill ?? "#ffffff";
      c.fill();
      c.shadowColor = "transparent";
      if (el.type === "image" && el.src) {
        const img = images.get(el.src);
        if (img) {
          c.save();
          c.clip();
          drawImageCover(c, img, el.w, el.h);
          c.restore();
        }
      }
    }
    if (el.text) {
      c.fillStyle = el.color ?? "#ffffff";
      c.font = `${el.weight ?? 700} ${el.size ?? 48}px ${film.font}`;
      c.textBaseline = "middle";
      if (el.align === "left") {
        c.textAlign = "left";
        c.fillText(el.text, -el.w / 2, 0);
      } else {
        c.textAlign = "center";
        c.fillText(el.text, 0, 0);
      }
    }
    if (highlightId === el.id) {
      c.globalAlpha = 1;
      c.strokeStyle = "#ffd23f";
      c.lineWidth = 4 / pose.scale;
      c.setLineDash([14, 10]);
      c.strokeRect(-el.w / 2 - 10, -el.h / 2 - 10, el.w + 20, el.h + 20);
    }
    c.restore();
  }
}

// Topmost visible element under a film-pixel point at time t.
export function hitTest(film: Film, t: number, x: number, y: number): El | null {
  const poses = posesAt(film, t);
  for (let i = poses.length - 1; i >= 0; i--) {
    const p = poses[i];
    if (p.alpha < 0.05) continue;
    const hw = (p.el.w / 2) * p.scale + 12;
    const hh = (p.el.h / 2) * p.scale + 12;
    if (x >= p.cx - hw && x <= p.cx + hw && y >= p.cy - hh && y <= p.cy + hh) return p.el;
  }
  return null;
}
