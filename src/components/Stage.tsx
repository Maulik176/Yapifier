import { useEffect, useRef, type MutableRefObject, type ReactNode } from "react";
import { render } from "../engine/render";
import { filmDuration } from "../engine/timing";
import type { Film } from "../engine/types";

interface Props {
  film: Film;
  playing: boolean;
  timeRef: MutableRefObject<number>;
  highlightId: string | null;
  onTick: (t: number) => void;
  onPoint: (filmX: number, filmY: number, px: number, py: number, width: number, height: number) => void;
  children?: ReactNode; // overlays: the pin and the note box
}

export default function Stage({ film, playing, timeRef, highlightId, onTick, onPoint, children }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const live = useRef({ film, playing, highlightId, onTick });
  live.current = { film, playing, highlightId, onTick };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let last = performance.now();
    let lastTick = 0;
    let frame = 0;

    const loop = (now: number) => {
      const { film, playing, highlightId, onTick } = live.current;
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(canvas.clientWidth * dpr);
      const h = Math.round(canvas.clientHeight * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      if (playing) timeRef.current = (timeRef.current + (now - last) / 1000) % filmDuration(film);
      last = now;
      ctx.setTransform(w / film.width, 0, 0, h / film.height, 0, 0);
      render(ctx, film, timeRef.current, highlightId);
      if (now - lastTick > 80) {
        onTick(timeRef.current);
        lastTick = now;
      }
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [timeRef]);

  return (
    <div
      className="stage"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest(".note-popover")) return;
        const rect = canvasRef.current!.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        onPoint((px / rect.width) * film.width, (py / rect.height) * film.height, px, py, rect.width, rect.height);
      }}
    >
      <canvas ref={canvasRef} aria-label="Film preview. Click a spot to leave a note." />
      {children}
    </div>
  );
}
