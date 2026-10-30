// Asks Yappy about anything the command bar can't place by itself (see
// server/talk.ts), and runs Yappy's see_video and look calls here, where the
// video is. Yappy answers with actions; toCommand turns each into a command
// the editor already knows how to carry out.
import { runTool, type ToolCall, type ToolResult } from "./agent.js";
import type { Command } from "./commands.js";
import type { Footage, Keyframe } from "./track.js";
import type { CaptionPosition, CaptionStyle, Edit } from "./types.js";

export interface TalkState {
  clock: number; // the playhead on the edited timeline
  length: number; // of the edited timeline
  playing: boolean;
  duration: number; // of the source video
  viewing: number;
  latest: number;
  selected: string | null;
  versions: { n: number; label: string }[];
  notes: { id: string; at: number; text: string; status: string }[];
  edits: Edit[];
  // The edited timeline: pieces of the video, and title or freeze cards held in between.
  map: ({ clock: [number, number]; video: [number, number]; rate: number } | { clock: [number, number]; hold: string; at: number })[];
}

export interface TalkAction {
  do: "seek" | "play" | "pause" | "nudge" | "apply" | "undo" | "redo" | "view" | "restore" | "export" | "original" | "remove" | "note" | "edit" | "captions";
  t: number;
  clock: boolean;
  play: boolean;
  by: number;
  version: number;
  ids: string[];
  text: string;
  captions: { op: "add" | "remove" | "style" | "rewrite" | ""; lang: string; style: CaptionStyle | ""; position: CaptionPosition | ""; size: number; lines: { n: number; text: string }[] };
}

export interface Usage {
  input: number;
  cacheRead: number;
  cacheWrite: number;
  output: number;
}

export interface TalkAnswer {
  actions: TalkAction[];
  reply: string;
  question: string;
  choices: string[];
  usage: Usage; // summed over every step
  steps: number;
  looked: number; // keyframes made and sent for this command, 0 when they were already there or not needed
}

export interface Exchange {
  said: string;
  did: string;
}

const sum = (a: Usage, b: Usage): Usage => ({ input: a.input + b.input, cacheRead: a.cacheRead + b.cacheRead, cacheWrite: a.cacheWrite + b.cacheWrite, output: a.output + b.output });

// One spoken command, start to finish. `strip` is whatever keyframes are
// already built; it goes first in every step, so the cache keeps it.
export async function talk(
  request: { said: string; state: TalkState; recent: Exchange[]; strip: Keyframe[] },
  footage: Footage,
  signal: AbortSignal,
  onStatus: (text: string) => void,
  onStrip: (strip: Keyframe[]) => void,
): Promise<TalkAnswer> {
  const transcript: unknown[] = [];
  let usage: Usage = { input: 0, cacheRead: 0, cacheWrite: 0, output: 0 };
  let looked = 0;
  let haveStrip = request.strip.length > 0; // the keyframes are already in this conversation
  for (let step = 1; ; step++) {
    const res = await fetch("/api/talk", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...request, strip: request.strip.map(({ t, from, jpeg }) => ({ t, from, jpeg })), transcript }),
      signal,
    });
    const data = await res.json().catch(() => ({ error: "The server sent back something unreadable." }));
    if (!res.ok) throw new Error(data.error ?? `Yappy couldn't answer (${res.status}).`);
    if (data.usage) usage = sum(usage, data.usage);
    if (!data.calls) return { actions: data.actions ?? [], reply: data.reply ?? "", question: data.question ?? "", choices: data.choices ?? [], usage, steps: step, looked };
    const results: ToolResult[] = [];
    for (const call of data.calls as ToolCall[]) {
      if (call.name === "see_video" && haveStrip) {
        results.push({ type: "tool_result", tool_use_id: call.id, content: [{ type: "text", text: "The keyframes are already above; use look for a closer view." }] });
      } else if (call.name === "see_video") {
        onStatus("Looking through the video");
        haveStrip = true;
        const strip = await footage.keyframes();
        onStrip(strip);
        if (!request.strip.length) looked = strip.length;
        results.push({
          type: "tool_result",
          tool_use_id: call.id,
          content: strip.flatMap((f) => [
            { type: "text" as const, text: `Video ${f.t.toFixed(1)} s${f.from < f.t - 0.2 ? ` (scene from ${f.from.toFixed(1)} s)` : ""}:` },
            { type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: f.jpeg.split(",")[1] } },
          ]),
        });
      } else results.push(await runTool(footage, call, (s) => onStatus(s.text)));
    }
    signal.throwIfAborted();
    transcript.push({ role: "assistant", content: data.content }, { role: "user", content: results });
  }
}

// Yappy's action as a command for the editor.
export function toCommand(a: TalkAction): Command | null {
  const version = a.version > 0 ? a.version : a.version === 0 ? "latest" : "current";
  switch (a.do) {
    case "seek":
      return { kind: "seek", to: a.t < 0 ? { here: true } : a.clock ? { time: a.t } : { src: a.t }, play: a.play };
    case "nudge":
      return Number.isFinite(a.by) && a.by ? { kind: "nudge", by: a.by } : null;
    case "apply":
      return { kind: "apply", ids: a.ids.length ? a.ids : undefined };
    case "view":
    case "restore":
    case "export":
      return { kind: a.do, version };
    case "remove":
      return a.ids.length ? { kind: "remove", what: "", ids: a.ids } : null;
    case "note":
    case "edit":
      return a.text.trim() ? { kind: "note", text: a.text.trim(), at: a.t >= 0 ? a.t : undefined, now: a.do === "edit" } : null;
    case "captions": {
      const c = a.captions;
      if (!c?.op) return null;
      return { kind: "captions", op: c.op, lang: c.lang || undefined, style: c.style || undefined, position: c.position || undefined, size: c.size > 0 ? c.size : undefined, lines: c.lines?.length ? c.lines : undefined };
    }
    default:
      return { kind: a.do };
  }
}
