// Scenes for the keyframe strip, from small grayscale frames sampled through
// the video. No DOM here: the browser feeds it frames from a hidden <video>
// (track.ts), the command-bar eval feeds it frames from ffmpeg.

export interface Sample {
  t: number;
  grey: Float32Array; // the whole frame, about 64 × 36
}

export interface Scene {
  from: number; // where the scene starts
  t: number; // the moment that shows it
}

// Seconds between samples: about 60 across a video.
export const stripStep = (duration: number) => Math.min(4, Math.max(0.5, duration / 60));

// At about 64 × 36 a line of text or a row of keys is only a faint smudge, so
// both thresholds are low: a pixel counts at 0.08 of a grey level, a scene at 2% of the frame.
const PIXEL = 0.08;
const SHARE = 0.02;

// Two frames differ when enough of their pixels changed noticeably.
export function differs(a: Float32Array, b: Float32Array, share: number, pixel = PIXEL): boolean {
  let changed = 0;
  for (let i = 0; i < a.length; i++) if (Math.abs(a[i] - b[i]) > pixel) changed++;
  return changed / a.length >= share;
}

// A new scene starts wherever the picture has moved away from the current
// scene's first frame. Each scene is shown 60% of the way through: after its
// titles have come in, before the next scene starts to arrive. More scenes
// than `max` are thinned to an even spread.
export function scenes(samples: Sample[], max: number): Scene[] {
  const runs: Sample[][] = [];
  for (const s of samples) {
    const run = runs[runs.length - 1];
    if (run && !differs(run[0].grey, s.grey, SHARE)) run.push(s);
    else runs.push([s]);
  }
  const all = runs.map((run) => ({ from: run[0].t, t: run[Math.floor((run.length - 1) * 0.6)].t }));
  if (all.length <= max) return all;
  return Array.from({ length: max }, (_, i) => all[Math.round((i * (all.length - 1)) / (max - 1))]);
}
