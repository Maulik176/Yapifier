// Runs Yappy's tool calls in the browser, where the video is. Only
// the frames the agent asks to see leave the page.
import { formatTime } from "./timeline";
import type { Footage } from "./track";
import type { AgentStep } from "./types";

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

type ResultBlock = { type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: "image/jpeg"; data: string } };

export interface ToolResult {
  type: "tool_result";
  tool_use_id: string;
  content: ResultBlock[];
  is_error?: boolean;
}

const MAX_LOOKS = 6;
const num = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, typeof v === "number" && Number.isFinite(v) ? v : lo));
const text = (t: string): ResultBlock => ({ type: "text", text: t });
const secs = (t: number) => `${t.toFixed(2)} s`;

export async function runTool(footage: Footage, call: ToolCall, step: (s: AgentStep) => void): Promise<ToolResult> {
  const reason = typeof call.input.reason === "string" ? call.input.reason.trim().slice(0, 140) : "";
  try {
    if (call.name === "look") {
      const raw = Array.isArray(call.input.times) ? call.input.times : [];
      const times = raw.slice(0, MAX_LOOKS).map((t) => Math.round(num(t, 0, footage.duration) * 100) / 100);
      if (!times.length) throw new Error("No times were given.");
      step({ kind: "look", text: reason || "Looking at the video", detail: times.map(formatTime).join(", ") });
      const content: ResultBlock[] = [];
      for (const t of times) {
        const data = (await footage.frame(t)).split(",")[1];
        content.push(text(`Original frame at ${secs(t)}:`), { type: "image", source: { type: "base64", media_type: "image/jpeg", data } });
      }
      if (raw.length > MAX_LOOKS) content.push(text(`Only the first ${MAX_LOOKS} times were shown.`));
      return { type: "tool_result", tool_use_id: call.id, content };
    }
    if (call.name === "track") {
      const x = num(call.input.x, 0, 0.98);
      const y = num(call.input.y, 0, 0.98);
      const box = { x, y, w: num(call.input.w, 0.02, 1 - x), h: num(call.input.h, 0.02, 1 - y) };
      const at = num(call.input.at, 0, footage.duration);
      const s = await footage.span(box, at);
      step({ kind: "track", text: reason || "Tracking that spot", detail: `on screen ${formatTime(s.start)}–${formatTime(s.end)}` });
      const from = s.openStart ? (s.start <= 0 ? "the start of the video" : `${secs(s.start)} (search limit; unchanged that far)`) : secs(s.start);
      const to = s.openEnd ? (s.end >= footage.duration - 0.05 ? "the end of the video" : `${secs(s.end)} (search limit; unchanged that far)`) : secs(s.end);
      return {
        type: "tool_result",
        tool_use_id: call.id,
        content: [text(`The content in that box at ${secs(at)} stays unchanged from ${from} to ${to}. Outside that span it differs: the scene changed, or the content left, moved or changed.`)],
      };
    }
    throw new Error(`There is no tool called ${call.name}.`);
  } catch (e) {
    return { type: "tool_result", tool_use_id: call.id, is_error: true, content: [text(e instanceof Error ? e.message : String(e))] };
  }
}
