import { useRef, useState } from "react";
import { MAX_UPLOAD_MB } from "../edit/media";
import { savedAgo, type SavedProject } from "../save";

interface Props {
  onFile: (file: File) => void;
  onSample: () => void;
  saved: SavedProject | null;
  onResume: () => void;
  onResumeFile: (file: File) => void;
  onDiscard: () => void;
  error: string | null;
  loading: boolean;
}

// The project from an earlier visit. An upload that didn't fit in browser storage has to be chosen again.
function ResumeCard({ saved, onResume, onResumeFile, onDiscard, loading }: Pick<Props, "onResume" | "onResumeFile" | "onDiscard" | "loading"> & { saved: SavedProject }) {
  const pickAgain = useRef<HTMLInputElement>(null);
  const latest = saved.versions[saved.versions.length - 1];
  const edits = latest.edits.length;
  const ready = saved.source.isSample || saved.hasFile;
  return (
    <div className="resume">
      <div className="resume-text">
        <b>Pick up where you left off</b>
        <span className="muted small">
          {saved.source.name} · {saved.notes.length} note{saved.notes.length === 1 ? "" : "s"} · {edits} edit{edits === 1 ? "" : "s"} · saved {savedAgo(saved.savedAt)}
        </span>
      </div>
      <div className="resume-actions">
        <button className="primary" disabled={loading} onClick={() => (ready ? onResume() : pickAgain.current?.click())}>
          {ready ? "Resume" : "Choose the video again"}
        </button>
        <button className="link" onClick={onDiscard}>
          Discard
        </button>
      </div>
      <input
        ref={pickAgain}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onResumeFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

const STEPS = [
  { n: "1", title: "See it", body: "Play your video. Pause where something's off." },
  { n: "2", title: "Point at it", body: "Click the exact spot: a button, a line of text, an email." },
  { n: "3", title: "Say it", body: "Hold Fn and talk with Wispr Flow: “zoom in here”, “blur this”, “cut this pause”." },
  { n: "4", title: "Yappy edits it", body: "Checks the video, applies every note." },
];

export default function Landing({ onFile, onSample, saved, onResume, onResumeFile, onDiscard, error, loading }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  return (
    <main className="landing">
      <section className="hero">
        <img src="/icon.svg" alt="" className="hero-icon" width={72} height={72} />
        <p className="kicker">A video editor you talk to</p>
        <h1>
          See it. Point at it. <span className="accent">Say it.</span>
        </h1>
        <p className="lede">
          Yapifier edits your demo videos and screen recordings by voice. Pause anywhere, click the spot, and tell it what to change with Wispr Flow. No timeline wrangling, no typing.
        </p>

        {saved && <ResumeCard saved={saved} onResume={onResume} onResumeFile={onResumeFile} onDiscard={onDiscard} loading={loading} />}

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
          <p className="drop-hint">Drop an MP4 or WebM here · up to {MAX_UPLOAD_MB} MB, 5 minutes · the file stays in your browser; Yappy (Claude) only gets your notes, the frames you point at and the frames it checks</p>
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
        Built for the WeMakeDevs × Wispr Flow “No Hands” challenge; not an official Wispr Flow product · build {__BUILD__}. Works best in Chrome with{" "}
        <a href="https://wisprflow.ai" target="_blank" rel="noreferrer">Wispr Flow</a>; typing works too.
      </p>
    </main>
  );
}
