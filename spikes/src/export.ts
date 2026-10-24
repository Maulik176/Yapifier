import { ArrayBufferTarget, Muxer } from "mp4-muxer";
import { preloadImages, render } from "./engine";
import { sampleFilm as film } from "./sample-film";

const out = document.getElementById("out")!;
const dl = document.getElementById("dl") as HTMLAnchorElement;

interface ExportResult {
  ok: boolean;
  seconds?: number;
  bytes?: number;
  frames?: number;
  codec?: string;
  error?: string;
}

async function exportMp4(width = 1280, height = 720, fps = 30): Promise<ExportResult> {
  if (!("VideoEncoder" in window)) return { ok: false, error: "WebCodecs VideoEncoder not available in this browser" };
  await preloadImages(film);

  const codec = "avc1.4d0028"; // H.264 Main, level 4.0
  const support = await VideoEncoder.isConfigSupported({ codec, width, height, bitrate: 6_000_000, framerate: fps });
  if (!support.supported) return { ok: false, error: `codec ${codec} not supported` };

  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;
  const muxer = new Muxer({ target: new ArrayBufferTarget(), video: { codec: "avc", width, height }, fastStart: "in-memory" });
  let encodeError: unknown = null;
  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => (encodeError = e),
  });
  encoder.configure({ codec, width, height, bitrate: 6_000_000, framerate: fps });

  const started = performance.now();
  const frames = Math.round(film.duration * fps);
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    ctx.setTransform(width / film.width, 0, 0, height / film.height, 0, 0);
    render(ctx, film, t);
    const frame = new VideoFrame(canvas, { timestamp: Math.round((i * 1_000_000) / fps), duration: Math.round(1_000_000 / fps) });
    encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
    frame.close();
    if (encoder.encodeQueueSize > 30) await new Promise((r) => setTimeout(r, 0));
    if (i % 30 === 0) out.textContent = `encoding frame ${i}/${frames}…`;
  }
  await encoder.flush();
  encoder.close();
  if (encodeError) return { ok: false, error: String(encodeError) };
  muxer.finalize();

  const buffer = (muxer.target as ArrayBufferTarget).buffer;
  const seconds = (performance.now() - started) / 1000;
  const blob = new Blob([buffer], { type: "video/mp4" });
  dl.href = URL.createObjectURL(blob);
  dl.download = "directors-chair-spike.mp4";
  dl.style.display = "inline";
  return { ok: true, seconds: Number(seconds.toFixed(2)), bytes: buffer.byteLength, frames, codec };
}

const run = async () => {
  out.textContent = "starting…";
  const result = await exportMp4().catch((e) => ({ ok: false, error: String(e) }) as ExportResult);
  out.textContent = JSON.stringify(result, null, 2);
  return result;
};

document.getElementById("go")!.addEventListener("click", run);
(window as unknown as { __runExport: typeof run }).__runExport = run;
