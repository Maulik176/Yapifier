import type { Film, Scene, SpringName } from "./types";

const SPRINGS: Record<SpringName, { zeta: number; omega: number }> = {
  snappy: { zeta: 0.82, omega: 24 },
  default: { zeta: 0.8, omega: 14 },
  heavy: { zeta: 1.0, omega: 8 },
  playful: { zeta: 0.42, omega: 15 },
};

// Step response of a damped spring from 0 to 1, in closed form, so any frame
// can be painted on its own (seek, export, scrubbing) with no carried state.
export function spring(t: number, name: SpringName): number {
  if (t <= 0) return 0;
  const { zeta, omega } = SPRINGS[name];
  if (zeta >= 1) return 1 - Math.exp(-omega * t) * (1 + omega * t);
  const wd = omega * Math.sqrt(1 - zeta * zeta);
  const decay = Math.exp(-zeta * omega * t);
  return 1 - decay * (Math.cos(wd * t) + ((zeta * omega) / wd) * Math.sin(wd * t));
}

export function filmDuration(film: Film): number {
  return film.scenes.reduce((sum, s) => sum + s.duration, 0);
}

export function sceneStart(film: Film, sceneId: string): number {
  let start = 0;
  for (const s of film.scenes) {
    if (s.id === sceneId) return start;
    start += s.duration;
  }
  return 0;
}

export function sceneAt(film: Film, t: number): { scene: Scene; local: number } {
  const total = filmDuration(film);
  let time = ((t % total) + total) % total;
  for (const scene of film.scenes) {
    if (time < scene.duration) return { scene, local: time };
    time -= scene.duration;
  }
  const last = film.scenes[film.scenes.length - 1];
  return { scene: last, local: last.duration };
}

export function formatTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
