import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { render, loadAssets } from "./render";
import { filmDuration } from "./timing";
import type { Film } from "./types";

export function canExport(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window;
}

// Paints every frame and encodes H.264 in the browser (WebCodecs). No server.
export async function exportMp4(film: Film, onProgress: (done: number) => void, width = 1920, height = 1080, fps = 30): Promise<Blob> {
  if (!canExport()) throw new Error("This browser can't encode video. Use Chrome or Edge to export.");
  await loadAssets(film);
  const codec = "avc1.640028"; // H.264 High, level 4.0 (1080p30)
  const config: VideoEncoderConfig = { codec, width, height, bitrate: 8_000_000, framerate: fps };
  const support = await VideoEncoder.isConfigSupported(config);
  if (!support.supported) throw new Error("H.264 encoding isn't supported in this browser.");

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d")!;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height }, fastStart: "in-memory" });
  let failure: unknown = null;
  const encoder = new VideoEncoder({ output: (chunk, meta) => muxer.addVideoChunk(chunk, meta), error: (e) => (failure = e) });
  encoder.configure(config);

  const frames = Math.round(filmDuration(film) * fps);
  for (let i = 0; i < frames; i++) {
    ctx.setTransform(width / film.width, 0, 0, height / film.height, 0, 0);
    render(ctx, film, i / fps);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 20) await new Promise((r) => setTimeout(r, 0));
    if (i % 15 === 0) onProgress(i / frames);
  }
  await encoder.flush();
  encoder.close();
  if (failure) throw failure;
  muxer.finalize();
  onProgress(1);
  return new Blob([(muxer.target as ArrayBufferTarget).buffer], { type: "video/mp4" });
}
