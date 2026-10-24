import { useState } from "react";
import { formatTime } from "../engine/timing";
import type { Note, Version } from "../engine/types";

// Reply to the editor's question. Same Flow detection as the note box.
function AnswerBox({ onAnswer }: { onAnswer: (text: string, spoken: boolean) => void }) {
  const [text, setText] = useState("");
  const [pasted, setPasted] = useState(false);
  const [typed, setTyped] = useState(false);
  const send = () => text.trim() && onAnswer(text.trim(), pasted && !typed);
  return (
    <div className="answer">
      <textarea
        value={text}
        rows={2}
        placeholder="Hold Fn and answer…"
        aria-label="Answer the question"
        onChange={(e) => setText(e.target.value)}
        onPaste={() => setPasted(true)}
        onBeforeInput={(e) => (e.nativeEvent as InputEvent).inputType === "insertFromPaste" && setPasted(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
            return;
          }
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) setTyped(true);
        }}
      />
      <button className="answer-send" disabled={!text.trim()} onClick={send}>
        Answer
      </button>
    </div>
  );
}

export function Timeline({ duration, t, notes, onSeek }: { duration: number; t: number; notes: Note[]; onSeek: (t: number) => void }) {
  return (
    <div className="timeline">
      <input
        type="range"
        min={0}
        max={duration}
        step={0.01}
        value={Math.min(t, duration)}
        aria-label="Scrub the film"
        onChange={(e) => onSeek(Number(e.target.value))}
      />
      <div className="markers" aria-hidden>
        {notes.map((n) => (
          <button
            key={n.id}
            className={`marker marker-${n.status}`}
            style={{ left: `${(n.t / duration) * 100}%` }}
            title={`${formatTime(n.t)} · ${n.text}`}
            onClick={() => onSeek(n.t)}
          />
        ))}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<Note["status"], string> = {
  pending: "waiting",
  applied: "applied",
  question: "needs you",
  failed: "failed",
};

export function NotesPanel({
  notes,
  nameOf,
  onSeek,
  onDelete,
  onSample,
  onAnswer,
}: {
  notes: Note[];
  nameOf: (n: Note) => string;
  onSeek: (t: number) => void;
  onDelete: (id: string) => void;
  onSample: () => void;
  onAnswer: (id: string, text: string, spoken: boolean) => void;
}) {
  if (!notes.length) {
    return (
      <div className="empty">
        <p>No notes yet. Click anything in the film, hold <kbd>Fn</kbd> and say what should change.</p>
        <button className="ghost" onClick={onSample}>
          No mic? Load 3 sample notes
        </button>
      </div>
    );
  }
  return (
    <ol className="notes">
      {notes.map((n) => (
        <li key={n.id} className={`note note-${n.status}`}>
          <button className="note-time" onClick={() => onSeek(n.t)} title="Jump to this moment">
            {formatTime(n.t)}
          </button>
          <div className="note-body">
            <div className="note-meta">
              <span>{nameOf(n)}</span>
              <span className={n.spoken ? "chip chip-voice" : "chip"}>{n.spoken ? "spoken" : "typed"}</span>
              <span className={`chip chip-${n.status}`}>{STATUS_LABEL[n.status]}</span>
              <span className="muted">{n.author}</span>
            </div>
            <p className="note-text">“{n.text}”</p>
            {n.reply && <p className={n.status === "question" ? "note-reply question" : "note-reply"}>{n.reply}</p>}
            {n.answer && n.status === "pending" && (
              <p className="note-answer">
                Your answer{n.answerSpoken ? " (spoken)" : ""}: “{n.answer}”
              </p>
            )}
            {n.status === "question" && <AnswerBox onAnswer={(text, spoken) => onAnswer(n.id, text, spoken)} />}
          </div>
          {n.status === "pending" && (
            <button className="icon" aria-label="Delete note" onClick={() => onDelete(n.id)}>
              ×
            </button>
          )}
        </li>
      ))}
    </ol>
  );
}

// Colours read better as a swatch than as a hex code.
function Value({ v, muted }: { v: string; muted?: boolean }) {
  const isColour = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(v);
  return (
    <span className={muted ? "muted" : undefined}>
      {isColour && <span className="swatch" style={{ background: v }} aria-hidden />}
      {v}
    </span>
  );
}

export function VersionsPanel({ versions, viewing, onView }: { versions: Version[]; viewing: number; onView: (n: number) => void }) {
  return (
    <div className="versions">
      <div className="version-chips" role="tablist" aria-label="Versions">
        {versions.map((v) => (
          <button key={v.n} role="tab" aria-selected={viewing === v.n} className={viewing === v.n ? "vchip active" : "vchip"} onClick={() => onView(v.n)}>
            v{v.n}
          </button>
        ))}
      </div>
      {[...versions].reverse().map((v) =>
        v.changes.length ? (
          <div key={v.n} className="changelog">
            <h4>v{v.n} changes</h4>
            <ul>
              {v.changes.map((c, i) => (
                <li key={i}>
                  <b>{c.targetName}</b> · {c.field}: <Value v={c.from} muted /> → <Value v={c.to} />
                </li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}
