// Everything that touches raw media: reading an upload, thumbnails for the
// timeline, the audio waveform, a snapshot of the paused frame, and export.
import type { Player } from "./player";
import type { Source } from "./types";

export const MAX_UPLOAD_MB = 500;
export const MAX_SECONDS = 5 * 60;

export function readSource(url: string, name: string, isSample: boolean): Promise<Source> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      if (!v.videoWidth) return reject(new Error("That file has no video track."));
      if (v.duration > MAX_SECONDS) return reject(new Error(`Please use a video under ${MAX_SECONDS / 60} minutes.`));
      resolve({ name, url, duration: v.duration, width: v.videoWidth, height: v.videoHeight, isSample });
    };
    v.onerror = () => reject(new Error("This browser can't play that file. Try an MP4 (H.264) or WebM."));
    v.src = url;
  });
}

// Evenly spaced frames from the source, for the filmstrip.
export async function thumbnails(url: string, duration: number, count: number): Promise<string[]> {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  v.src = url;
  await new Promise<void>((r) => (v.onloadeddata = () => r()));
  const c = document.createElement("canvas");
  c.height = 72;
  c.width = Math.round((v.videoWidth / v.videoHeight) * 72);
  const ctx = c.getContext("2d")!;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    v.currentTime = ((i + 0.5) / count) * duration;
    await new Promise<void>((r) => (v.onseeked = () => r()));
    ctx.drawImage(v, 0, 0, c.width, c.height);
    out.push(c.toDataURL("image/jpeg", 0.6));
  }
  v.removeAttribute("src");
  return out;
}

// Peak amplitude per bucket across the whole file; null when there's no decodable audio.
export async function waveform(url: string, buckets = 800): Promise<Float32Array | null> {
  try {
    const buf = await (await fetch(url)).arrayBuffer();
    const ctx = new OfflineAudioContext(1, 2, 44100);
    const audio = await ctx.decodeAudioData(buf);
    const data = audio.getChannelData(0);
    const size = Math.floor(data.length / buckets) || 1;
    const peaks = new Float32Array(buckets);
    let max = 0;
    for (let b = 0; b < buckets; b++) {
      let m = 0;
      for (let i = b * size; i < (b + 1) * size && i < data.length; i += 8) m = Math.max(m, Math.abs(data[i]));
      peaks[b] = m;
      max = Math.max(max, m);
    }
    if (max > 0) for (let b = 0; b < buckets; b++) peaks[b] /= max;
    return peaks;
  } catch {
    return null;
  }
}

// What the director was looking at, small enough to send to Claude.
export function snapshot(canvas: HTMLCanvasElement, width = 640): string {
  const c = document.createElement("canvas");
  c.width = width;
  c.height = Math.round((canvas.height / canvas.width) * width);
  c.getContext("2d")!.drawImage(canvas, 0, 0, c.width, c.height);
  return c.toDataURL("image/jpeg", 0.72);
}

export function exportFormat(): { mime: string; ext: string } | null {
  if (typeof MediaRecorder === "undefined") return null;
  const options = [
    { mime: "video/mp4;codecs=avc1.42E01E,mp4a.40.2", ext: "mp4" },
    { mime: "video/mp4", ext: "mp4" },
    { mime: "video/webm;codecs=vp9,opus", ext: "webm" },
    { mime: "video/webm", ext: "webm" },
  ];
  return options.find((o) => MediaRecorder.isTypeSupported(o.mime)) ?? null;
}

// Records the edited timeline in real time: the export canvas for picture,
// the player's audio graph for sound.
export async function recordExport(player: Player, canvas: HTMLCanvasElement, onProgress: (p: number) => void): Promise<{ blob: Blob; ext: string }> {
  const fmt = exportFormat();
  if (!fmt) throw new Error("This browser can't record video. Use Chrome or Edge to export.");
  const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...player.recordStream().getAudioTracks()]);
  const recorder = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 160_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  const done = new Promise<void>((r) => (recorder.onstop = () => r()));
  player.pause();
  player.seek(0);
  await new Promise((r) => setTimeout(r, 300)); // let the first frame land
  recorder.start(500);
  const timer = setInterval(() => onProgress(player.outT / player.length), 250);
  await new Promise<void>((resolve) => {
    player.onEnd = () => resolve();
    player.play();
  });
  player.onEnd = null;
  await new Promise((r) => setTimeout(r, 250));
  recorder.stop();
  await done;
  clearInterval(timer);
  stream.getVideoTracks().forEach((t) => t.stop());
  onProgress(1);
  return { blob: new Blob(chunks, { type: fmt.mime.split(";")[0] }), ext: fmt.ext };
}
