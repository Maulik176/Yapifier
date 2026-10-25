// Everything that touches raw media: reading an upload, thumbnails for the
// timeline, the audio waveform, a snapshot of the paused frame, and export.
import { Player } from "./player";
import type { Edit, Source } from "./types";

export const MAX_UPLOAD_MB = 500;
export const MAX_SECONDS = 5 * 60;

const CANT_DECODE = "This browser can't play that video. Try Chrome or Edge, or an MP4 (H.264) or WebM file.";

// Waits for one media event, failing on the element's error event or after a
// timeout, so a file the browser can't decode never leaves the editor stuck.
export function mediaEvent(el: HTMLMediaElement, event: "loadedmetadata" | "loadeddata" | "seeked", ms = 10_000): Promise<void> {
  return new Promise((resolve, reject) => {
    const finish = (fn: () => void) => {
      clearTimeout(timer);
      el.removeEventListener(event, ok);
      el.removeEventListener("error", fail);
      fn();
    };
    const ok = () => finish(resolve);
    const fail = () => finish(() => reject(new Error(CANT_DECODE)));
    const timer = setTimeout(() => finish(() => reject(new Error("The video stopped responding. Reload the page and try again, or try Chrome."))), ms);
    el.addEventListener(event, ok);
    el.addEventListener("error", fail);
  });
}

export function seekTo(el: HTMLMediaElement, t: number): Promise<void> {
  const seeked = mediaEvent(el, "seeked");
  el.currentTime = t;
  return seeked;
}

export async function readSource(url: string, name: string, isSample: boolean): Promise<Source> {
  const v = document.createElement("video");
  v.preload = "metadata";
  v.muted = true;
  const ready = mediaEvent(v, "loadedmetadata");
  v.src = url;
  await ready;
  if (!v.videoWidth) throw new Error("That file has no video track.");
  if (v.duration > MAX_SECONDS) throw new Error(`Please use a video under ${MAX_SECONDS / 60} minutes.`);
  return { name, url, duration: v.duration, width: v.videoWidth, height: v.videoHeight, isSample };
}

// Evenly spaced frames from the source, for the filmstrip.
export async function thumbnails(url: string, duration: number, count: number): Promise<string[]> {
  const v = document.createElement("video");
  v.muted = true;
  v.preload = "auto";
  const ready = mediaEvent(v, "loadeddata");
  v.src = url;
  await ready;
  const c = document.createElement("canvas");
  c.height = 72;
  c.width = Math.round((v.videoWidth / v.videoHeight) * 72);
  const ctx = c.getContext("2d")!;
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    await seekTo(v, ((i + 0.5) / count) * duration);
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

export interface ExportJob {
  url: string;
  duration: number; // of the source, in seconds
  edits: Edit[]; // a frozen copy of the version being exported
  width: number;
  height: number;
  audioContext: AudioContext; // the preview's, so the browser lets it play
}

// Records one version in real time, in the background: its own hidden video,
// player and canvas, so the editor stays free while it runs. The sound goes into
// the recording only, not the speakers. Stops with an error if the recorder
// fails or playback stalls (a hidden tab pauses it), and on cancel; always cleans up.
export async function recordExport(job: ExportJob, onProgress: (p: number) => void, signal: AbortSignal): Promise<{ blob: Blob; ext: string }> {
  const fmt = exportFormat();
  if (!fmt) throw new Error("This browser can't record video. Use Chrome or Edge to export.");
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  const ready = mediaEvent(video, "loadeddata");
  video.src = job.url;
  await ready;

  const player = new Player(video, { audible: false, audioContext: job.audioContext });
  player.load(job.duration, job.edits);
  const canvas = document.createElement("canvas");
  canvas.width = job.width;
  canvas.height = job.height;
  const ctx = canvas.getContext("2d")!;
  const videoTracks = canvas.captureStream(30).getVideoTracks();
  const stream = new MediaStream([...videoTracks, ...player.recordStream().getAudioTracks()]);
  const recorder = new MediaRecorder(stream, { mimeType: fmt.mime, videoBitsPerSecond: 5_000_000, audioBitsPerSecond: 160_000 });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  let frame = 0;
  let timer = 0;
  let cleanup = () => {};
  const paint = (now: number) => {
    player.draw(ctx, canvas.width, canvas.height, player.tick(now));
    frame = requestAnimationFrame(paint);
  };
  try {
    player.seek(0);
    frame = requestAnimationFrame(paint);
    await new Promise((r) => setTimeout(r, 300)); // let the first frame land
    recorder.start(500);
    await new Promise<void>((resolve, reject) => {
      let lastT = -1;
      let movedAt = performance.now();
      const fail = (error: Error) => {
        cleanup();
        reject(error);
      };
      const onAbort = () => fail(new DOMException("Export cancelled.", "AbortError"));
      cleanup = () => {
        clearInterval(timer);
        player.onEnd = null;
        signal.removeEventListener("abort", onAbort);
      };
      if (signal.aborted) return onAbort();
      signal.addEventListener("abort", onAbort);
      recorder.onerror = () => fail(new Error("The browser's recorder failed. Try exporting again."));
      player.onEnd = () => {
        cleanup();
        resolve();
      };
      timer = window.setInterval(() => {
        onProgress(player.outT / player.length);
        if (player.outT !== lastT) {
          lastT = player.outT;
          movedAt = performance.now();
        } else if (performance.now() - movedAt > 8000) fail(new Error("The export paused because Yapifier's tab was hidden. Keep it open in front while it records."));
      }, 250);
      player.play();
    });
    await new Promise((r) => setTimeout(r, 250));
    const stopped = new Promise<void>((r) => (recorder.onstop = () => r()));
    recorder.stop();
    await stopped;
    onProgress(1);
    return { blob: new Blob(chunks, { type: fmt.mime.split(";")[0] }), ext: fmt.ext };
  } finally {
    cleanup();
    cancelAnimationFrame(frame);
    if (recorder.state !== "inactive") recorder.stop();
    player.dispose();
    videoTracks.forEach((t) => t.stop());
    video.removeAttribute("src");
    video.load();
  }
}
