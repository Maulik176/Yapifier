import { useRef, useState, type ReactNode } from "react";
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

// Line icons for the four steps, drawn in the card's own text colour.
const STEP_ICONS: Record<string, ReactNode> = {
  // See it: an eye with a play button for a pupil
  "1": (
    <>
      <path d="M2.5 12C5 7.5 8.3 5.5 12 5.5s7 2 9.5 6.5c-2.5 4.5-5.8 6.5-9.5 6.5S5 16.5 2.5 12z" />
      <path d="M10.6 9.6v4.8l3.9-2.4z" fill="currentColor" stroke="none" />
    </>
  ),
  // Point at it: a cursor clicking, with click marks at its tip
  "2": (
    <>
      <path d="M8.5 6v13.4l3.4-3.3 2.5 5.1 2.4-1.2-2.5-5h4.8z" />
      <path d="M6 6L4.2 4.2M5.4 9.4H3M9.4 5.4V3" />
    </>
  ),
  // Say it: a microphone
  "3": (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
    </>
  ),
  // Yappy edits it: a wand with sparkles
  "4": (
    <>
      <path d="M4 20L14.5 9.5M12.5 7.5l4 4" />
      <path d="M18 3l.8 1.9 1.9.8-1.9.8L18 8.4l-.8-1.9-1.9-.8 1.9-.8zM8.5 3.5l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5zM19.5 13.5l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" fill="currentColor" stroke="none" />
    </>
  ),
};

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
          <p className="drop-hint">Drop an MP4 or WebM here · up to {MAX_UPLOAD_MB} MB, 5 minutes · the file stays in your browser; Yappy only sees your notes, the frames you point at and the frames it checks</p>
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
            <div className="how-top">
              <span className="how-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  {STEP_ICONS[s.n]}
                </svg>
              </span>
              <span className="how-n">{s.n}</span>
            </div>
            <div>
              <b>{s.title}</b>
              <p>{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
      <p className="footnote">
        Built for the WeMakeDevs × Wispr Flow “No Hands” challenge; not an official Wispr Flow product. Works best in Chrome with{" "}
        <a href="https://wisprflow.ai" target="_blank" rel="noreferrer">Wispr Flow</a>; typing works too.
      </p>
    </main>
  );
}
