import { useRef, useState } from "react";
import { MAX_UPLOAD_MB } from "../edit/media";

interface Props {
  onFile: (file: File) => void;
  onSample: () => void;
  error: string | null;
  loading: boolean;
}

const STEPS = [
  { n: "1", title: "See it", body: "Play your video. Pause where something's off." },
  { n: "2", title: "Point at it", body: "Click the exact spot: a button, a line of text, an email." },
  { n: "3", title: "Say it", body: "Hold Fn and talk with Wispr Flow: “zoom in here”, “blur this”, “cut this pause”." },
  { n: "4", title: "It's edited", body: "Yapifier applies every note. Watch the new version and export with sound." },
];

export default function Landing({ onFile, onSample, error, loading }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <main className="landing">
      <section className="hero">
        <img src="/icon.svg" alt="" className="hero-icon" width={72} height={72} />
        <h1>
          See it. Point at it. <span className="accent">Say it.</span>
        </h1>
        <p className="lede">
          Yapifier edits your demo videos and screen recordings by voice. Pause anywhere, click the spot, and tell it what to change with Wispr Flow. No timeline wrangling, no typing.
        </p>

        <div
          className={over ? "drop over" : "drop"}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onFile(file);
          }}
        >
          <button className="primary big" onClick={onSample} disabled={loading}>
            {loading ? "Opening…" : "▶  Try it on a sample video"}
          </button>
          <span className="or">or</span>
          <button className="secondary big" onClick={() => input.current?.click()} disabled={loading}>
            Upload your own video
          </button>
          <p className="drop-hint">Drop an MP4 or WebM here · up to {MAX_UPLOAD_MB} MB, 5 minutes · it never leaves your browser</p>
          <input
            ref={input}
            type="file"
            accept="video/mp4,video/webm,video/quicktime"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onFile(file);
              e.target.value = "";
            }}
          />
        </div>
        {error && <p className="error">{error}</p>}
      </section>

      <ol className="how">
        {STEPS.map((s) => (
          <li key={s.n}>
            <span className="how-n">{s.n}</span>
            <div>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="footnote">
        Built for the WeMakeDevs × Wispr Flow “No Hands” challenge. Works best in Chrome with <a href="https://wisprflow.ai" target="_blank" rel="noreferrer">Wispr Flow</a>; typing works too.
      </p>
    </main>
  );
}
