// Whisper in a Web Worker, so the page keeps drawing frames while captions are
// made: on the main thread one transcription was a single 12 s task that froze
// playback. transformers.js comes from jsDelivr, the model from Hugging Face
// (downloaded once, then read from the browser's cache).
const LIB = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.1";
const MODEL = "Xenova/whisper-base"; // multilingual, so Hindi and Hinglish work too

type Chunk = { text: string; timestamp: [number, number | null] };
type Transcriber = (audio: Float32Array, options: Record<string, unknown>) => Promise<{ text: string; chunks?: Chunk[] }>;
export type WorkerMessage = { type: "status"; text: string } | { type: "done"; chunks: Chunk[] } | { type: "error"; message: string };

const post = (m: WorkerMessage) => (self as unknown as { postMessage: (m: WorkerMessage) => void }).postMessage(m);
let transcriber: Promise<Transcriber> | null = null;

// Whether the model's weights are already in the browser's cache, so loading them downloads nothing.
async function cached(): Promise<boolean> {
  try {
    const urls = (await (await caches.open("transformers-cache")).keys()).map((r) => r.url).filter((u) => u.includes(MODEL));
    return ["encoder_model_quantized.onnx", "decoder_model_merged_quantized.onnx"].every((f) => urls.some((u) => u.endsWith(f)));
  } catch {
    return false;
  }
}

async function load(): Promise<Transcriber> {
  const fromCache = await cached();
  post({ type: "status", text: fromCache ? "Loading the speech model" : "Getting the speech model, once" });
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
      post({ type: "status", text: `Getting the speech model, once: ${Math.round((100 * all.loaded) / all.total)}% of ${Math.round(all.total / 1e6)} MB` });
    },
  }) as Promise<Transcriber>;
}

self.addEventListener("message", async (e: MessageEvent<{ audio: Float32Array }>) => {
  try {
    transcriber ??= load();
    let run: Transcriber;
    try {
      run = await transcriber;
    } catch (err) {
      transcriber = null;
      throw new Error(`Couldn't load the speech model (${err instanceof Error ? err.message : err}). Check the connection and try again.`);
    }
    post({ type: "status", text: "Transcribing in the background" });
    const long = { chunk_length_s: 30, stride_length_s: 5 };
    let out: { text: string; chunks?: Chunk[] };
    try {
      out = await run(e.data.audio, { ...long, return_timestamps: "word" });
    } catch {
      out = await run(e.data.audio, { ...long, return_timestamps: true }); // lines only; words get spread across them
    }
    post({ type: "done", chunks: out.chunks ?? [] });
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err) });
  }
});
