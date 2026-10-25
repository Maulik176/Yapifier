import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { buildTimeline, formatTime, outDuration } from "../edit/timeline";
import type { Version } from "../edit/types";
import Modal from "./Modal";

const label = (n: number) => (n === 1 ? "Original" : `v${n}`);

// What a version is, in a few words: the original, or its latest change.
function summary(v: Version): string {
  if (v.n === 1) return "The video as you uploaded it";
  const first = v.changes[0]?.label ?? "";
  return v.changes.length > 1 ? `${v.changes.length} changes: ${first}, …` : first;
}

// A dropdown in the app's own style (a native one can't follow the theme).
function VersionPicker({ versions, value, length, onChange }: { versions: Version[]; value: number; length: (v: Version) => number; onChange: (n: number) => void }) {
  const newestFirst = [...versions].reverse();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, newestFirst.findIndex((v) => v.n === value)));
  const wrap = useRef<HTMLDivElement>(null);
  const chosen = versions.find((v) => v.n === value) ?? versions[versions.length - 1];

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !wrap.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, [open]);

  const choose = (i: number) => {
    onChange(newestFirst[i].n);
    setOpen(false);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return setOpen(true);
      setActive((i) => Math.min(newestFirst.length - 1, Math.max(0, i + (e.key === "ArrowDown" ? 1 : -1))));
    } else if ((e.key === "Enter" || e.key === " ") && open) {
      e.preventDefault();
      choose(active);
    } else if (e.key === "Escape" && open) {
      e.stopPropagation(); // close the list, not the dialog
      setOpen(false);
    }
  };

  return (
    <div ref={wrap} className="picker">
      <button
        type="button"
        className="picker-button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span className="picker-main">
          <b>{label(chosen.n)}</b>
          {chosen.n === versions[versions.length - 1].n && chosen.n !== 1 && <span className="picker-tag">latest</span>}
          <span className="muted"> · {formatTime(length(chosen))}</span>
        </span>
        <span className="picker-sub muted">{summary(chosen)}</span>
        <span className="picker-chevron" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <ul className="picker-list" role="listbox" aria-label="Version to export">
          {newestFirst.map((v, i) => (
            <li
              key={v.n}
              role="option"
              aria-selected={v.n === value}
              className={`picker-option${i === active ? " active" : ""}${v.n === value ? " chosen" : ""}`}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => e.preventDefault()} // keep focus on the button
              onClick={() => choose(i)}
            >
              <span className="picker-main">
                <b>{label(v.n)}</b>
                {i === 0 && v.n !== 1 && <span className="picker-tag">latest</span>}
                <span className="muted"> · {formatTime(length(v))}</span>
              </span>
              <span className="picker-sub muted">{summary(v)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Pick any version and export it, without restoring it first.
export default function ExportDialog({
  versions,
  initial,
  duration,
  format,
  onExport,
  onClose,
}: {
  versions: Version[];
  initial: number;
  duration: number; // of the source, in seconds
  format: string; // "MP4" or "WEBM"
  onExport: (n: number) => void;
  onClose: () => void;
}) {
  const [n, setN] = useState(initial);
  const length = (v: Version) => outDuration(buildTimeline(v.edits, duration));
  const chosen = versions.find((v) => v.n === n) ?? versions[versions.length - 1];
  return (
    <Modal
      title="Export a version"
      onClose={onClose}
      actions={
        <>
          <button className="secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="primary" onClick={() => onExport(n)}>
            Export {label(n)}
          </button>
        </>
      }
    >
      <VersionPicker versions={versions} value={n} length={length} onChange={setN} />
      <p className="muted small modal-note">
        {format} with sound, recorded in real time: about {Math.ceil(length(chosen))} s. Keep this tab in front until it's done; you can stop it any time.
      </p>
    </Modal>
  );
}
