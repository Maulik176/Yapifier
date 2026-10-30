// Speech to text for uploaded videos, in this browser: Whisper through
// transformers.js, loaded from jsDelivr, with the model from Hugging Face
// (downloaded once, then cached by the browser). The audio never leaves the page.
import type { Word } from "./types";

const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";
const MODEL = "Xenova/whisper-base"; // multilingual, so Hindi and Hinglish work too

type Chunk = { text: string; timestamp: [number, number | null] };
type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text: string; chunks?: Chunk[] }>;

let transcriber: Promise<Transcriber> | null = null;

// Whether the model's weights are already in the browser's cache (transformers.js
// keeps them in Cache Storage), so loading them downloads nothing.
async function cached(): Promise<boolean> {
  try {
    const urls = (await (await caches.open("transformers-cache")).keys()).map((r) => r.url).filter((u) => u.includes(MODEL));
    return ["encoder_model_quantized.onnx", "decoder_model_merged_quantized.onnx"].every((f) => urls.some((u) => u.endsWith(f)));
  } catch {
    return false;
  }
}

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

export async function transcribe(url: string, onStatus: (text: string) => void): Promise<Word[]> {
  onStatus("Reading the sound");
  const audio = await audio16k(url);
  transcriber ??= (async () => {
    // From an earlier visit the model is read from the browser's cache: say so, not "getting".
    const fromCache = await cached();
    onStatus(fromCache ? "Loading the speech model" : "Getting the speech model, once");
    const { pipeline } = await import(/* @vite-ignore */ LIB);
    // The model's files download side by side; show one figure for all of them.
    const files = new Map<string, { loaded: number; total: number }>();
    return pipeline("automatic-speech-recognition", MODEL, {
      dtype: "q8",
      device: "wasm",
      progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (fromCache || p.status !== "progress" || !p.file || !p.total) return;
        files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
        const all = [...files.values()].reduce((a, f) => ({ loaded: a.loaded + f.loaded, total: a.total + f.total }), { loaded: 0, total: 0 });
        onStatus(`Getting the speech model, once: ${Math.round((100 * all.loaded) / all.total)}% of ${Math.round(all.total / 1e6)} MB`);
      },
    }) as Promise<Transcriber>;
  })();
  let run: Transcriber;
  try {
    run = await transcriber;
  } catch (e) {
    transcriber = null;
    throw new Error(`Couldn't load the speech model (${e instanceof Error ? e.message : e}). Check the connection and try again.`);
  }
  onStatus("Transcribing in your browser");
  const long = { chunk_length_s: 30, stride_length_s: 5 };
  let out: { text: string; chunks?: Chunk[] };
  try {
    out = await run(audio, { ...long, return_timestamps: "word" });
  } catch {
    out = await run(audio, { ...long, return_timestamps: true }); // lines only; words get spread across them
  }
  const end = audio.length / 16000;
  return (out.chunks ?? []).flatMap((c) => {
    const start = c.timestamp[0];
    const stop = c.timestamp[1] ?? end;
    const parts = c.text.trim().split(/\s+/).filter(Boolean);
    // A line-level chunk: share its time between its words.
    return parts.map((text, i) => ({ text, start: start + ((stop - start) * i) / parts.length, end: start + ((stop - start) * (i + 1)) / parts.length }));
  });
}
