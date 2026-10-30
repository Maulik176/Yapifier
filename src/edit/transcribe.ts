// Speech to text for uploaded videos, in this browser. The sound is decoded
// here (the browser does that off the main thread), then Whisper runs in a Web
// Worker (whisper.worker.ts), so playback stays smooth while it listens. The
// audio never leaves the page.
import type { Word } from "./types";
import type { WorkerMessage } from "./whisper.worker";

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

function listen(audio: Float32Array, onStatus: (text: string) => void): Promise<{ text: string; timestamp: [number, number | null] }[]> {
  worker ??= new Worker(new URL("./whisper.worker.ts", import.meta.url), { type: "module" });
  const w = worker;
  return new Promise((resolve, reject) => {
    const stop = () => {
      w.removeEventListener("message", onMessage);
      w.removeEventListener("error", onError);
    };
    const onMessage = (e: MessageEvent<WorkerMessage>) => {
      const m = e.data;
      if (m.type === "status") return onStatus(m.text);
      stop();
      if (m.type === "done") resolve(m.chunks);
      else reject(new Error(m.message));
    };
    const onError = () => {
      stop();
      worker = null; // start a fresh one next time
      reject(new Error("The speech model couldn't start in this browser."));
    };
    w.addEventListener("message", onMessage);
    w.addEventListener("error", onError);
    w.postMessage({ audio }, [audio.buffer as ArrayBuffer]); // handed over, not copied
  });
}

export function transcribe(url: string, onStatus: (text: string) => void): Promise<Word[]> {
  const job = queue.then(async () => {
    onStatus("Reading the sound");
    const audio = await audio16k(url);
    const end = audio.length / 16000;
    const chunks = await listen(audio, onStatus);
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
