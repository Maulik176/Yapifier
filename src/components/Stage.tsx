import { useEffect, useRef, type ReactNode, type RefObject } from "react";
import type { Player } from "../edit/player";
import { toOutput } from "../edit/render";
import type { FrameState } from "../edit/render";
import type { Note } from "../edit/types";

interface Props {
  player: Player;
  aspect: number; // width / height of the source
  notes: Note[];
  exportCanvas: RefObject<HTMLCanvasElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  onTick: (outT: number, srcT: number, playing: boolean) => void;
  onPoint: (x: number, y: number, px: number, py: number, stageW: number, stageH: number) => void;
  onPin: (id: string) => void;
  showPins: boolean;
  srcT: number;
  children?: ReactNode;
}

export default function Stage({ player, aspect, notes, exportCanvas, canvasRef, onTick, onPoint, onPin, showPins, srcT, children }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const tickRef = useRef(onTick);
  tickRef.current = onTick;

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let frame = 0;
    let lastUi = 0;
    const loop = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const state: FrameState = player.tick(now);
      player.draw(ctx, w, h, state);
      const ex = exportCanvas.current;
      if (ex) player.draw(ex.getContext("2d")!, ex.width, ex.height, state);
      if (now - lastUi > 60) {
        tickRef.current(player.outT, state.srcT, player.playing);
        lastUi = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [player, canvasRef, exportCanvas]);

  // Pins for notes made at (about) this moment, drawn where the director clicked.
  const pins = showPins
    ? notes
        .filter((n) => Math.abs(n.srcT - srcT) < 0.35)
        .map((n) => ({ n, at: toOutput(player.edits, srcT, n.x, n.y) }))
        .filter((p): p is { n: Note; at: { x: number; y: number } } => p.at !== null)
    : [];

  return (
    <div
      ref={wrap}
      className="stage"
      style={{ aspectRatio: String(aspect) }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".note-popover, .pin-dot")) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        onPoint(px / rect.width, py / rect.height, px, py, rect.width, rect.height);
      }}
    >
      <canvas ref={canvasRef} aria-label="Video preview. Click a spot to leave a note there." />
      {pins.map(({ n, at }) => (
        <button
          key={n.id}
          className={`pin-dot pin-${n.status}`}
          style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }}
          title={n.text}
          onClick={() => onPin(n.id)}
        >
          {notes.indexOf(n) + 1}
        </button>
      ))}
      {children}
    </div>
  );
}
