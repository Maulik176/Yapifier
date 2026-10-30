// Speech to text for uploaded videos, in this browser. The sound is decoded
// here (the browser does that off the main thread), then Whisper runs in a Web
// Worker (whisper.worker.ts), so playback stays smooth while it listens. The
// audio never leaves the page.
//
// It never hangs silently: loading the model must show progress at least once
// a minute, transcribing gets a time limit from the video's length, and the
// caller can stop it. Each of those ends the worker, so the next try starts fresh.
import type { Word } from "./types";
import type { Phase, WorkerMessage } from "./whisper.worker";

const STALL_MS = 60_000; // loading the model with no progress this long has stalled
const MIN_LIMIT_MS = 120_000; // transcribing takes at most this, or 4× the audio's length

let worker: Worker | null = null; // kept, so the model stays loaded for the next video
let queue: Promise<unknown> = Promise.resolve(); // one transcription at a time

// The video's sound as 16 kHz mono, what Whisper listens to.
async function audio16k(url: string): Promise<Float32Array> {
  const data = await (await fetch(url)).arrayBuffer();
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(data);
    const offline = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * 16000)), 16000);
    const src = offline.createBufferSource();
    src.buffer = decoded;
    src.connect(offline.destination);
    src.start();
    return (await offline.startRendering()).getChannelData(0);
  } catch {
    throw new Error("This video has no sound to caption.");
  } finally {
    void ctx.close();
  }
}

function listen(audio: Float32Array, onStatus: (text: string) => void, signal?: AbortSignal): Promise<{ text: string; timestamp: [number, number | null] }[]> {
  worker ??= new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  const limit = Math.max(MIN_LIMIT_MS, (audio.length / 16000) * 4000);
  return new Promise((resolve, reject) => {
    let phase: Phase | "start" = "start";
    let heard = Date.now(); // the worker's last word
    let began = Date.now(); // when transcribing started
    const end = () => {
      clearInterval(watch);
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
      signal?.removeEventListener("abort", onAbort);
    };
    // Stop the worker too, so a stuck download or run doesn't linger.
    const fail = (error: Error) => {
      end();
      w.terminate();
      if (worker === w) worker = null;
      reject(error);
    };
    const watch = setInterval(() => {
      if (phase === "transcribe" ? Date.now() - began > limit : Date.now() - heard > STALL_MS)
        fail(new Error(phase === "transcribe" ? "Transcribing took too long. Click CC to try again." : "The speech model stopped loading (no progress for a minute). Check the connection, then click CC to try again."));
    }, 5000);
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === "status") {
        heard = Date.now();
        if (m.phase === "transcribe" && phase !== "transcribe") began = Date.now();
        phase = m.phase;
        return onStatus(m.text);
      }
      end();
      if (m.type === "done") resolve(m.chunks);
      else reject(new Error(`${m.message} Click CC to try again.`));
    };
    const onError = () => fail(new Error("The speech model couldn't start in this browser. Click CC to try again."));
    const onAbort = () => fail(new DOMException("Stopped", "AbortError"));
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    signal?.addEventListener("abort", onAbort, { once: true });
    w.postMessage({ audio }, [audio.buffer as ArrayBuffer]); // handed over, not copied
  });
}

export function transcribe(url: string, onStatus: (text: string) => void, signal?: AbortSignal): Promise<Word[]> {
  const job = queue.then(async () => {
    signal?.throwIfAborted();
    onStatus("Reading the sound");
    const audio = await audio16k(url);
    signal?.throwIfAborted();
    const end = audio.length / 16000;
    const chunks = await listen(audio, onStatus, signal);
    return chunks.flatMap((c) => {
      const start = c.timestamp[0];
      const stop = c.timestamp[1] ?? end;
      const parts = c.text.trim().split(/\s+/).filter(Boolean);
      // A line-level chunk: share its time between its words.
      return parts.map((text, i) => ({ text, start: start + ((stop - start) * i) / parts.length, end: start + ((stop - start) * (i + 1)) / parts.length }));
    });
  });
  queue = job.catch(() => undefined);
  return job;
}
