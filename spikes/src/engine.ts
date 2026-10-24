// Minimal film engine for the spikes: a film is data, and render(t) is a pure
// function of time. Closed-form springs only; no timers or carried state.

export type SpringName = "snappy" | "default" | "heavy" | "playful";
export type EnterPreset = "rise" | "pop" | "slide-left" | "wipe";

export interface Anim {
  preset: EnterPreset;
  at: number; // seconds from scene start
  spring: SpringName;
}

export interface El {
  id: string;
  name: string; // human label used in notes and the changelog
  type: "text" | "rect" | "image";
  x: number; // centre, in film pixels
  y: number;
  w: number;
  h: number;
  text?: string;
  size?: number;
  weight?: number;
  color?: string;
  fill?: string;
  radius?: number;
  src?: string;
  enter: Anim;
}

export interface Scene {
  id: string;
  start: number;
  duration: number;
  background: string;
  elements: El[];
}

export interface Film {
  width: number;
  height: number;
  duration: number;
  font: string;
  scenes: Scene[];
}

const SPRINGS: Record<SpringName, { zeta: number; omega: number }> = {
  snappy: { zeta: 0.85, omega: 22 },
  default: { zeta: 0.8, omega: 14 },
  heavy: { zeta: 1.0, omega: 9 },
  playful: { zeta: 0.45, omega: 14 },
};

// Step response of a damped spring from 0 to 1, closed form.
export function spring(t: number, name: SpringName): number {
  if (t <= 0) return 0;
  const { zeta, omega } = SPRINGS[name];
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return 1 - decay * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
}

export interface Pose {
  el: El;
  cx: number;
  cy: number;
  scale: number;
  alpha: number;
  reveal: number; // 0..1 horizontal clip for "wipe"
}

export function sceneAt(film: Film, t: number): Scene {
  const loopT = ((t % film.duration) + film.duration) % film.duration;
  return film.scenes.find((s) => loopT >= s.start && loopT < s.start + s.duration) ?? film.scenes[film.scenes.length - 1];
}

export function posesAt(film: Film, t: number): Pose[] {
  const scene = sceneAt(film, t);
  const local = (((t % film.duration) + film.duration) % film.duration) - scene.start;
  return scene.elements.map((el) => {
    const p = spring(local - el.enter.at, el.enter.spring);
    const appear = Math.min(1, Math.max(0, p * 1.6));
    let cx = el.x;
    let cy = el.y;
    let scale = 1;
    let reveal = 1;
    switch (el.enter.preset) {
      case "rise":
        cy = el.y + (1 - p) * 70;
        break;
      case "pop":
        scale = 0.55 + 0.45 * p;
        break;
      case "slide-left":
        cx = el.x + (1 - p) * 260;
        break;
      case "wipe":
        reveal = Math.min(1, Math.max(0, p));
        break;
    }
    return { el, cx, cy, scale, alpha: appear, reveal };
  });
}

const imageCache = new Map<string, HTMLImageElement>();

export function preloadImages(film: Film): Promise<void> {
  const srcs = new Set(film.scenes.flatMap((s) => s.elements.filter((e) => e.src).map((e) => e.src!)));
  return Promise.all(
    [...srcs].map(
      (src) =>
        new Promise<void>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            imageCache.set(src, img);
            resolve();
          };
          img.onerror = reject;
          img.src = src;
        }),
    ),
  ).then(() => undefined);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Paints frame t. The context must already be scaled so 1 unit = 1 film pixel.
export function render(ctx: CanvasRenderingContext2D, film: Film, t: number, highlightId?: string) {
  const scene = sceneAt(film, t);
  ctx.fillStyle = scene.background;
  ctx.fillRect(0, 0, film.width, film.height);
  for (const pose of posesAt(film, t)) {
    const { el } = pose;
    if (pose.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = pose.alpha;
    ctx.translate(pose.cx, pose.cy);
    ctx.scale(pose.scale, pose.scale);
    if (pose.reveal < 1) {
      ctx.beginPath();
      ctx.rect(-el.w / 2, -el.h / 2, el.w * pose.reveal, el.h);
      ctx.clip();
    }
    if (el.type === "rect") {
      ctx.fillStyle = el.fill ?? "#fff";
      roundRect(ctx, -el.w / 2, -el.h / 2, el.w, el.h, el.radius ?? 0);
      ctx.fill();
    } else if (el.type === "image" && el.src) {
      const img = imageCache.get(el.src);
      if (img) {
        ctx.save();
        roundRect(ctx, -el.w / 2, -el.h / 2, el.w, el.h, el.radius ?? 0);
        ctx.clip();
        ctx.drawImage(img, -el.w / 2, -el.h / 2, el.w, el.h);
        ctx.restore();
      }
    }
    if (el.text) {
      ctx.fillStyle = el.color ?? "#fff";
      ctx.font = `${el.weight ?? 600} ${el.size ?? 48}px ${film.font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(el.text, 0, 0);
    }
    if (highlightId === el.id) {
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#ffcc00";
      ctx.lineWidth = 4 / pose.scale;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(-el.w / 2 - 8, -el.h / 2 - 8, el.w + 16, el.h + 16);
    }
    ctx.restore();
  }
}

// Topmost visible element under a film-pixel point at time t.
export function hitTest(film: Film, t: number, x: number, y: number): El | null {
  const poses = posesAt(film, t);
  for (let i = poses.length - 1; i >= 0; i--) {
    const p = poses[i];
    if (p.alpha < 0.05) continue;
    const hw = (p.el.w / 2) * p.scale;
    const hh = (p.el.h / 2) * p.scale;
    if (x >= p.cx - hw && x <= p.cx + hw && y >= p.cy - hh && y <= p.cy + hh) return p.el;
  }
  return null;
}
