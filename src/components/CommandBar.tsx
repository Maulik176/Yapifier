import { useState, type ClipboardEvent, type RefObject } from "react";
import { COMMAND_EXAMPLES } from "../edit/commands";
import { takePaste } from "./paste";

export interface CommandResult {
  said: string;
  ok: boolean;
  text: string;
  pending?: boolean; // Yappy is still working it out
  choices?: string[]; // answers to Yappy's question, each one a full command
}

// Talk to the timeline: click here (or press /), hold Fn and say anything,
// from "go to 0:42" to "blur the email and play from there". Flow types by
// pasting, so a paste runs at once; typed commands run on Enter. While the box
// is empty, Space and the arrows still play and seek.
export default function CommandBar({ inputRef, result, onRun }: { inputRef: RefObject<HTMLInputElement | null>; result: CommandResult | null; onRun: (said: string, spoken: boolean) => void }) {
  const [text, setText] = useState("");
  const [emptyPaste, setEmptyPaste] = useState(false);

  const run = (said: string, spoken: boolean) => {
    setEmptyPaste(false);
    if (!said.trim()) return;
    setText("");
    onRun(said.trim(), spoken);
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    const pasted = takePaste(e);
    setEmptyPaste(!pasted);
    if (pasted) run(pasted.next, true);
  };

  return (
    <div className="command-bar">
      <label className="command-field">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="9" y="3" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7" />
        </svg>
        <input
          ref={inputRef}
          value={text}
          data-pass-keys=""
          aria-label="Command for the editor"
          placeholder="Click, hold Fn and say anything: “go to the prize”, “blur the email”, “apply”"
          onChange={(e) => setText(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (!text && (e.key === " " || e.key === "ArrowLeft" || e.key === "ArrowRight")) return; // the editor's play and seek keys
            e.stopPropagation();
            if (e.key === "Enter") {
              e.preventDefault();
              run(text, false);
            } else if (e.key === "Escape") e.currentTarget.blur();
          }}
        />
        <kbd title="Press / to jump here">/</kbd>
      </label>
      <p className={`command-result${result && !result.ok ? " command-miss" : ""}${result?.pending ? " command-pending" : ""}`} role="status">
        {emptyPaste ? (
          <>
            Flow's paste arrived without text. Press <kbd>⌘</kbd>
            <kbd>⌃</kbd>
            <kbd>V</kbd> to paste your last dictation, or say it again.
          </>
        ) : result ? (
          <>
            <span className="muted">“{result.said}”</span> {result.ok && !result.pending && !result.choices?.length ? "✓ " : ""}
            {result.text}
          </>
        ) : (
          <span className="muted">Try {COMMAND_EXAMPLES.map((q) => `“${q}”`).join(" · ")}</span>
        )}
      </p>
      {!!result?.choices?.length && (
        <div className="command-choices">
          {result.choices.map((c) => (
            <button key={c} className="secondary small" onClick={() => onRun(c, false)}>
              {c}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
