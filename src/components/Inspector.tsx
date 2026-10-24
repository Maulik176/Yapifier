import { useEffect, useState, type ReactNode } from "react";
import type { Op } from "../edit/ops";
import { formatTime } from "../edit/timeline";
import type { Edit } from "../edit/types";
import { KIND_COLOR } from "./Timeline";

// Fields of an update op, plus the blur style, which isn't an op field.
export type Adjustment = Partial<Pick<Op, "start" | "end" | "at" | "duration" | "scale" | "rate" | "level" | "text" | "sub">> & { solid?: boolean };

const TITLE: Record<Edit["kind"], string> = {
  cut: "Cut",
  speed: "Speed change",
  zoom: "Zoom",
  callout: "Label",
  highlight: "Spotlight",
  blur: "Blur",
  freeze: "Freeze frame",
  title: "Title card",
  volume: "Volume",
};

const ON_VIDEO = new Set<Edit["kind"]>(["zoom", "callout", "highlight", "blur"]);

// A field that commits on Enter or when it loses focus, so half-typed values
// never reach the edit.
function Field({ label, value, type, onCommit, children }: { label: string; value: string; type: "number" | "text"; onCommit: (v: string) => void; children?: ReactNode }) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = () => text !== value && onCommit(text);
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type={type}
          step={type === "number" ? 0.1 : undefined}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            e.stopPropagation(); // keep Space, arrows and Delete for the field
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setText(value);
          }}
        />
        {children}
      </span>
    </label>
  );
}

function Slider({ label, value, min, max, step, show, onChange }: { label: string; value: number; min: number; max: number; step: number; show: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span className="field-label">
        {label} <b>{show(value)}</b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export default function Inspector({
  edit,
  srcT,
  inView,
  onAdjust,
  onJump,
  onClose,
}: {
  edit: Edit;
  srcT: number; // the playhead, in source seconds
  inView: boolean; // the playhead is inside this edit, so its box can be dragged
  onAdjust: (a: Adjustment) => void;
  onJump: () => void;
  onClose: () => void;
}) {
  const secs = (v: string) => Number.parseFloat(v);
  const now = (key: "start" | "end" | "at") => (
    <button type="button" className="now" title={`Set to the playhead (${formatTime(srcT)})`} onClick={() => onAdjust({ [key]: Math.round(srcT * 100) / 100 })}>
      ⌖ now
    </button>
  );

  return (
    <div className="inspector" aria-label={`Adjust ${TITLE[edit.kind]}`}>
      <div className="inspector-head">
        <span className="swatch" style={{ background: KIND_COLOR[edit.kind] }} />
        <b>{TITLE[edit.kind]}</b>
        <button className="icon" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>

      {"start" in edit ? (
        <div className="field-row">
          <Field label="Start (s)" type="number" value={String(edit.start)} onCommit={(v) => onAdjust({ start: secs(v) })}>
            {now("start")}
          </Field>
          <Field label="End (s)" type="number" value={String(edit.end)} onCommit={(v) => onAdjust({ end: secs(v) })}>
            {now("end")}
          </Field>
        </div>
      ) : (
        <div className="field-row">
          <Field label="At (s)" type="number" value={String(edit.at)} onCommit={(v) => onAdjust({ at: secs(v) })}>
            {now("at")}
          </Field>
          <Field label="Length (s)" type="number" value={String(edit.duration)} onCommit={(v) => onAdjust({ duration: secs(v) })} />
        </div>
      )}

      {edit.kind === "callout" && <Field label="Label" type="text" value={edit.text} onCommit={(v) => onAdjust({ text: v })} />}
      {edit.kind === "title" && (
        <>
          <Field label="Title" type="text" value={edit.text} onCommit={(v) => onAdjust({ text: v })} />
          <Field label="Sub line" type="text" value={edit.sub} onCommit={(v) => onAdjust({ sub: v || " " })} />
        </>
      )}
      {edit.kind === "zoom" && <Slider label="Zoom" value={edit.scale} min={1.1} max={4} step={0.1} show={(v) => `${v.toFixed(1)}×`} onChange={(v) => onAdjust({ scale: v })} />}
      {edit.kind === "speed" && <Slider label="Speed" value={edit.rate} min={0.25} max={4} step={0.05} show={(v) => `${v.toFixed(2)}×`} onChange={(v) => onAdjust({ rate: v })} />}
      {edit.kind === "volume" && <Slider label="Volume" value={edit.level} min={0} max={1.5} step={0.05} show={(v) => (v === 0 ? "muted" : `${Math.round(v * 100)}%`)} onChange={(v) => onAdjust({ level: v })} />}
      {edit.kind === "blur" && (
        <div className="segmented" role="radiogroup" aria-label="Blur style">
          <button role="radio" aria-checked={!edit.solid} className={!edit.solid ? "on" : ""} onClick={() => onAdjust({ solid: false })}>
            Pixelate
          </button>
          <button role="radio" aria-checked={!!edit.solid} className={edit.solid ? "on" : ""} onClick={() => onAdjust({ solid: true })}>
            Solid mask
          </button>
        </div>
      )}

      {ON_VIDEO.has(edit.kind) && (
        <p className="muted small inspector-hint">
          {inView ? (
            edit.kind === "zoom" ? (
              "Drag the frame on the video to aim the zoom. Play to see it zoomed."
            ) : edit.kind === "callout" ? (
              "Drag the dot on the video to move the label."
            ) : (
              "Drag the box on the video to move it, or a corner to resize it."
            )
          ) : (
            <>
              Pause inside this edit to adjust it on the video.{" "}
              <button className="link" onClick={onJump}>
                Jump there
              </button>
            </>
          )}
        </p>
      )}
    </div>
  );
}
