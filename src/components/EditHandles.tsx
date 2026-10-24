import { useRef, type PointerEvent } from "react";
import { toOutput, toSource } from "../edit/render";
import type { Edit } from "../edit/types";

type Mode = "move" | "nw" | "ne" | "sw" | "se";
type Spatial = Extract<Edit, { kind: "blur" | "highlight" | "callout" | "zoom" }>;

const MIN = 0.02; // smallest box, as a fraction of the frame
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const r3 = (v: number) => Math.round(v * 1000) / 1000;

export function isSpatial(e: Edit): e is Spatial {
  return e.kind === "blur" || e.kind === "highlight" || e.kind === "callout" || e.kind === "zoom";
}

// The area a zoom shows: a 1/scale window around its point, kept inside the frame.
function zoomBox(z: Extract<Edit, { kind: "zoom" }>) {
  const w = 1 / z.scale;
  return { x: clamp(z.x - w / 2, 0, 1 - w), y: clamp(z.y - w / 2, 0, 1 - w), w, h: w };
}

// Handles over the video for the selected edit. Positions are kept in source
// coordinates and mapped through whatever zoom is on screen, so dragging works
// on a zoomed frame too. onDraft fires while dragging; onCommit on release.
export default function EditHandles({
  edit,
  viewEdits,
  srcT,
  onDraft,
  onCommit,
}: {
  edit: Spatial;
  viewEdits: Edit[];
  srcT: number;
  onDraft: (e: Edit) => void;
  onCommit: (e: Edit) => void;
}) {
  const layer = useRef<HTMLDivElement>(null);
  const drag = useRef<{ mode: Mode; from: { x: number; y: number }; orig: Spatial; last: Spatial } | null>(null);

  const sourceAt = (clientX: number, clientY: number) => {
    const r = layer.current!.getBoundingClientRect();
    return toSource(viewEdits, srcT, (clientX - r.left) / r.width, (clientY - r.top) / r.height);
  };

  const moved = (orig: Spatial, mode: Mode, dx: number, dy: number): Spatial => {
    if (orig.kind === "callout") return { ...orig, x: r3(clamp(orig.x + dx, 0, 1)), y: r3(clamp(orig.y + dy, 0, 1)) };
    if (orig.kind === "zoom") {
      const half = 0.5 / orig.scale;
      return { ...orig, x: r3(clamp(orig.x + dx, half, 1 - half)), y: r3(clamp(orig.y + dy, half, 1 - half)) };
    }
    let { x, y, w, h } = orig;
    if (mode === "move") {
      x = clamp(x + dx, 0, 1 - w);
      y = clamp(y + dy, 0, 1 - h);
    } else {
      const right = x + w;
      const bottom = y + h;
      if (mode === "nw" || mode === "sw") x = clamp(x + dx, 0, right - MIN);
      if (mode === "nw" || mode === "ne") y = clamp(y + dy, 0, bottom - MIN);
      w = mode === "ne" || mode === "se" ? clamp(w + dx, MIN, 1 - x) : right - x;
      h = mode === "sw" || mode === "se" ? clamp(h + dy, MIN, 1 - y) : bottom - y;
    }
    return { ...orig, x: r3(x), y: r3(y), w: r3(w), h: r3(h) };
  };

  const start = (mode: Mode) => (e: PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, from: sourceAt(e.clientX, e.clientY), orig: edit, last: edit };
  };
  const move = (e: PointerEvent) => {
    e.stopPropagation(); // a corner's moves would otherwise reach the box too
    const d = drag.current;
    if (!d) return;
    const at = sourceAt(e.clientX, e.clientY);
    d.last = moved(d.orig, d.mode, at.x - d.from.x, at.y - d.from.y);
    onDraft(d.last);
  };
  const end = () => {
    const d = drag.current;
    drag.current = null;
    if (d && d.last !== d.orig) onCommit(d.last);
  };
  const handlers = { onPointerMove: move, onPointerUp: end, onPointerCancel: end };

  // Where to draw: a point for labels, the zoom window for zooms, the box otherwise.
  if (edit.kind === "callout") {
    const p = toOutput(viewEdits, srcT, edit.x, edit.y);
    return (
      <div ref={layer} className="edit-handles">
        {p && <div className="handle-point" style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }} onPointerDown={start("move")} {...handlers} title="Drag to move the label" />}
      </div>
    );
  }
  const box = edit.kind === "zoom" ? zoomBox(edit) : edit;
  const a = toOutput(viewEdits, srcT, box.x, box.y);
  const b = toOutput(viewEdits, srcT, box.x + box.w, box.y + box.h);
  return (
    <div ref={layer} className="edit-handles">
      {a && b && (
        <div
          className={`handle-box handle-${edit.kind}`}
          style={{ left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${(b.x - a.x) * 100}%`, height: `${(b.y - a.y) * 100}%` }}
          onPointerDown={start("move")}
          {...handlers}
          title={edit.kind === "zoom" ? "Drag to aim the zoom" : "Drag to move"}
        >
          {edit.kind !== "zoom" &&
            (["nw", "ne", "sw", "se"] as const).map((corner) => <span key={corner} className={`handle-corner ${corner}`} onPointerDown={start(corner)} {...handlers} />)}
          {edit.kind === "zoom" && <span className="handle-tag">{edit.scale.toFixed(1)}× zoom</span>}
        </div>
      )}
    </div>
  );
}
