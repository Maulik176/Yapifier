import { useEffect, useRef, useState } from "react";
import { formatTime } from "../engine/timing";

interface Props {
  px: number;
  py: number;
  stageW: number;
  stageH: number;
  t: number;
  targetName: string;
  onSave: (text: string, spoken: boolean) => void;
  onCancel: () => void;
}

// The note box Flow types into. Flow inserts text as a paste, so a paste with
// no typed characters means the note was spoken.
export default function NotePopover({ px, py, stageW, stageH, t, targetName, onSave, onCancel }: Props) {
  const box = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [pasted, setPasted] = useState(false);
  const [typed, setTyped] = useState(false);

  useEffect(() => {
    box.current?.focus();
  }, []);

  const width = Math.min(380, stageW - 24);
  const left = Math.max(12, Math.min(px + 18, stageW - width - 12));
  const above = py > stageH * 0.55;
  const style = above ? { left, bottom: stageH - py + 18, width } : { left, top: Math.min(py + 18, stageH - 150), width };
  const spoken = pasted && !typed;

  return (
    <div className="note-popover" style={style} role="dialog" aria-label="Leave a note">
      <div className="note-target">
        {formatTime(t)} · {targetName}
      </div>
      <textarea
        ref={box}
        value={text}
        placeholder="Hold Fn and say what to change…"
        onChange={(e) => setText(e.target.value)}
        onPaste={() => setPasted(true)}
        onBeforeInput={(e) => {
          const type = (e.nativeEvent as InputEvent).inputType;
          if (type === "insertFromPaste") setPasted(true);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (text.trim()) onSave(text.trim(), spoken);
            return;
          }
          if (e.key === "Escape") {
            onCancel();
            return;
          }
          if (e.key.length === 1 && !e.metaKey && !e.ctrlKey) setTyped(true);
        }}
      />
      <div className="note-row">
        <span className={spoken ? "chip chip-voice" : "chip"}>{!text ? "listening for Flow" : spoken ? "spoken with Flow" : pasted ? "spoken + typed" : "typed"}</span>
        <span className="muted">Enter to save · Esc to cancel</span>
      </div>
    </div>
  );
}
