import { useState } from "react";
import { describe } from "../edit/ops";
import { formatTime } from "../edit/timeline";
import type { Edit, Note, Version } from "../edit/types";
import { KIND_COLOR } from "./Timeline";

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
          e.stopPropagation();
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

const STATUS: Record<Note["status"], string> = { pending: "waiting", applied: "applied", question: "needs you", failed: "failed" };

export function NotesPanel({
  notes,
  onJump,
  onDelete,
  onAnswer,
}: {
  notes: Note[];
  onJump: (n: Note) => void;
  onDelete: (id: string) => void;
  onAnswer: (id: string, text: string, spoken: boolean) => void;
}) {
  return (
    <ol className="notes">
      {notes.map((n, i) => (
        <li key={n.id} id={`note-${n.id}`} className={`note note-${n.status}`}>
          <button className="note-frame" onClick={() => onJump(n)} title="Jump to this moment">
            {n.frame ? <img src={n.frame} alt="" /> : <span />}
            <span className="note-num">{i + 1}</span>
            <span className="note-time">{formatTime(n.srcT)}</span>
          </button>
          <div className="note-body">
            <div className="note-meta">
              <span className={n.spoken ? "chip chip-voice" : "chip"}>{n.spoken ? "🎙 spoken" : "typed"}</span>
              <span className={`chip chip-${n.status}`}>{STATUS[n.status]}</span>
              <span className="muted">{n.author}</span>
            </div>
            <p className="note-text">“{n.text}”</p>
            {n.reply && <p className={n.status === "question" ? "note-reply question" : "note-reply"}>{n.reply}</p>}
            {n.answer && n.status === "pending" && <p className="note-answer">Your answer{n.answerSpoken ? " (spoken)" : ""}: “{n.answer}”</p>}
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

export function VersionsPanel({ versions, viewing, onView }: { versions: Version[]; viewing: number; onView: (n: number) => void }) {
  return (
    <div className="versions">
      <div className="version-chips" role="tablist" aria-label="Versions">
        {versions.map((v) => (
          <button key={v.n} role="tab" aria-selected={viewing === v.n} className={viewing === v.n ? "vchip active" : "vchip"} onClick={() => onView(v.n)}>
            {v.n === 1 ? "Original" : `v${v.n}`}
          </button>
        ))}
      </div>
      {[...versions].reverse().map((v) =>
        v.changes.length ? (
          <div key={v.n} className="changelog">
            <h4>v{v.n}</h4>
            <ul>
              {v.changes.map((c, i) => (
                <li key={i}>{c.label}</li>
              ))}
            </ul>
          </div>
        ) : null,
      )}
    </div>
  );
}

// Every edit in the version on screen, in time order. Click one to jump to it; × removes it.
export function EditsList({
  edits,
  selected,
  removable,
  onPick,
  onRemove,
}: {
  edits: Edit[];
  selected: string | null;
  removable: boolean;
  onPick: (e: Edit) => void;
  onRemove: (id: string) => void;
}) {
  const at = (e: Edit) => ("start" in e ? e.start : e.at);
  return (
    <ul className="edits">
      {[...edits]
        .sort((a, b) => at(a) - at(b))
        .map((e) => (
          <li key={e.id} className={e.id === selected ? "edit-row selected" : "edit-row"}>
            <button className="edit-pick" onClick={() => onPick(e)}>
              <span className="swatch" style={{ background: KIND_COLOR[e.kind] }} />
              <span>{describe(e)}</span>
            </button>
            {removable && (
              <button className="icon" aria-label={`Remove: ${describe(e)}`} title="Remove this edit (Delete)" onClick={() => onRemove(e.id)}>
                ×
              </button>
            )}
          </li>
        ))}
    </ul>
  );
}
