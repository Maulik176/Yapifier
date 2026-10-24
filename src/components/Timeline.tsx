import { useEffect, useMemo, useRef, useState } from "react";
import { describe } from "../edit/ops";
import { locate, srcToOut, formatTime, type Segment } from "../edit/timeline";
import type { Edit, EditKind, Note } from "../edit/types";

export const KIND_COLOR: Record<EditKind, string> = {
  zoom: "#7c5cff",
  callout: "#ffd23f",
  highlight: "#ff9f43",
  blur: "#9aa0b4",
  cut: "#ff6b6b",
  speed: "#57d68d",
  freeze: "#5ac8fa",
  title: "#c792ea",
  volume: "#8ee6ad",
};

const ROWS = { ruler: 20, film: 46, wave: 34, track: 26, notes: 18 };
const HEIGHT = ROWS.ruler + ROWS.film + ROWS.wave + ROWS.track + ROWS.notes + 10;

interface Props {
  segs: Segment[];
  length: number;
  sourceDuration: number;
  outT: number;
  thumbs: string[];
  peaks: Float32Array | null;
  edits: Edit[];
  notes: Note[];
  onSeek: (outT: number) => void;
}

export default function Timeline({ segs, length, sourceDuration, outT, thumbs, peaks, edits, notes, onSeek }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(800);
  const [images, setImages] = useState<HTMLImageElement[]>([]);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(200, Math.round(e.contentRect.width))));
    if (box.current) ro.observe(box.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.all(
      thumbs.map(
        (src) =>
          new Promise<HTMLImageElement>((r) => {
            const img = new Image();
            img.onload = () => r(img);
            img.src = src;
          }),
      ),
    ).then((imgs) => alive && setImages(imgs));
    return () => {
      alive = false;
    };
  }, [thumbs]);

  // Edit blocks positioned on the edited timeline.
  const blocks = useMemo(() => {
    const x = (t: number) => (t / Math.max(0.001, length)) * width;
    return edits.map((e): { e: Edit; x0: number; x1: number } | null => {
      if (e.kind === "freeze" || e.kind === "title") {
        const seg = segs.find((s) => s.type === "hold" && s.edit.id === e.id);
        return seg ? { e, x0: x(seg.out0), x1: x(seg.out1) } : null;
      }
      if (e.kind === "cut") {
        const at = x(srcToOut(segs, e.start));
        return { e, x0: at - 2, x1: at + 2 };
      }
      return { e, x0: x(srcToOut(segs, e.start)), x1: x(srcToOut(segs, e.end)) };
    }).filter((b): b is { e: Edit; x0: number; x1: number } => b !== null);
  }, [edits, segs, length, width]);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = width * dpr;
    c.height = HEIGHT * dpr;
    const ctx = c.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, HEIGHT);
    const x = (t: number) => (t / Math.max(0.001, length)) * width;

    // Ruler
    ctx.fillStyle = "#9790b3";
    ctx.font = "500 10px Inter, system-ui, sans-serif";
    const step = [1, 2, 5, 10, 15, 30, 60].find((s) => (s / length) * width > 70) ?? 120;
    for (let t = 0; t <= length + 0.001; t += step) {
      ctx.fillRect(x(t), 13, 1, 6);
      ctx.fillText(formatTime(t).replace(/\.0$/, ""), x(t) + 3, 11);
    }

    // Filmstrip
    let y = ROWS.ruler;
    const slotW = images[0] ? (images[0].width / images[0].height) * ROWS.film : 80;
    for (let sx = 0; sx < width; sx += slotW) {
      const t = ((sx + slotW / 2) / width) * length;
      const { seg, srcT } = locate(segs, t);
      if (seg.type === "hold" && seg.edit.kind === "title") {
        ctx.fillStyle = "#2a2244";
        ctx.fillRect(sx, y, slotW - 1, ROWS.film);
        ctx.fillStyle = "#c792ea";
        ctx.fillText("Title", sx + 6, y + ROWS.film / 2 + 3);
        continue;
      }
      const img = images[Math.min(images.length - 1, Math.floor((srcT / sourceDuration) * images.length))];
      if (img) ctx.drawImage(img, sx, y, slotW - 1, ROWS.film);
      else {
        ctx.fillStyle = "#1d1930";
        ctx.fillRect(sx, y, slotW - 1, ROWS.film);
      }
    }

    // Waveform
    y += ROWS.film + 4;
    ctx.fillStyle = "#3b3463";
    ctx.fillRect(0, y + ROWS.wave / 2, width, 1);
    if (peaks) {
      ctx.fillStyle = "#8a77ff";
      for (let px = 0; px < width; px += 2) {
        const { seg, srcT } = locate(segs, (px / width) * length);
        if (seg.type === "hold") continue;
        const p = peaks[Math.min(peaks.length - 1, Math.floor((srcT / sourceDuration) * peaks.length))] ?? 0;
        const h = Math.max(1, p * (ROWS.wave - 4));
        ctx.fillRect(px, y + (ROWS.wave - h) / 2, 1.4, h);
      }
    } else {
      ctx.fillStyle = "#6b6488";
      ctx.fillText("no audio track", 6, y + ROWS.wave / 2 + 3);
    }

    // Edit track
    y += ROWS.wave + 3;
    for (const b of blocks) {
      ctx.fillStyle = KIND_COLOR[b.e.kind];
      ctx.globalAlpha = hover === b.e.id ? 1 : 0.85;
      ctx.beginPath();
      ctx.roundRect(b.x0, y, Math.max(4, b.x1 - b.x0), ROWS.track - 4, 5);
      ctx.fill();
      ctx.globalAlpha = 1;
      if (b.x1 - b.x0 > 34) {
        ctx.fillStyle = "#120f1d";
        ctx.font = "700 10px Inter, system-ui, sans-serif";
        ctx.fillText(b.e.kind === "cut" ? "" : b.e.kind, b.x0 + 6, y + 15, b.x1 - b.x0 - 10);
      }
    }

    // Notes
    y += ROWS.track + 2;
    for (const n of notes) {
      const nx = x(srcToOut(segs, n.srcT));
      ctx.fillStyle = { pending: "#ffd23f", applied: "#57d68d", question: "#ffb347", failed: "#ff6b6b" }[n.status];
      ctx.beginPath();
      ctx.arc(nx, y + 7, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [width, images, peaks, segs, length, sourceDuration, blocks, notes, hover]);

  const seekAt = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    onSeek(Math.max(0, Math.min(1, (clientX - r.left) / r.width)) * length);
  };

  const trackY = ROWS.ruler + ROWS.film + 4 + ROWS.wave + 3;
  return (
    <div
      ref={box}
      className="timeline"
      style={{ height: HEIGHT }}
      onPointerDown={(e) => {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        seekAt(e.clientX);
      }}
      onPointerMove={(e) => {
        if (e.buttons) seekAt(e.clientX);
        const r = box.current!.getBoundingClientRect();
        const py = e.clientY - r.top;
        const px = e.clientX - r.left;
        const hit = py >= trackY && py <= trackY + ROWS.track ? blocks.find((b) => px >= b.x0 - 3 && px <= b.x1 + 3) : undefined;
        setHover(hit ? hit.e.id : null);
      }}
      onPointerLeave={() => setHover(null)}
      title={hover ? describe(edits.find((e) => e.id === hover)!) : undefined}
      role="slider"
      aria-label="Timeline"
      aria-valuemin={0}
      aria-valuemax={Math.round(length * 10) / 10}
      aria-valuenow={Math.round(outT * 10) / 10}
    >
      <canvas ref={canvas} style={{ width: "100%", height: HEIGHT }} />
      <div className="playhead" style={{ left: `${(outT / Math.max(0.001, length)) * 100}%` }} />
    </div>
  );
}
