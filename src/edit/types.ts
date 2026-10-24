// Yapifier edits any video without touching its pixels: every change is an
// entry in this list, laid over or around the source footage at play time.
// Times are in source seconds. Positions are fractions of the frame (0..1).

export type EditKind = "cut" | "speed" | "zoom" | "callout" | "highlight" | "blur" | "freeze" | "title" | "volume";
export const EDIT_KINDS: EditKind[] = ["cut", "speed", "zoom", "callout", "highlight", "blur", "freeze", "title", "volume"];

interface Base {
  id: string;
  noteId?: string; // the note that asked for it
}

export interface Cut extends Base { kind: "cut"; start: number; end: number }
export interface Speed extends Base { kind: "speed"; start: number; end: number; rate: number }
export interface Zoom extends Base { kind: "zoom"; start: number; end: number; x: number; y: number; scale: number }
export interface Callout extends Base { kind: "callout"; start: number; end: number; x: number; y: number; text: string }
export interface Highlight extends Base { kind: "highlight"; start: number; end: number; x: number; y: number; w: number; h: number }
export interface Blur extends Base { kind: "blur"; start: number; end: number; x: number; y: number; w: number; h: number }
export interface Freeze extends Base { kind: "freeze"; at: number; duration: number }
export interface Title extends Base { kind: "title"; at: number; duration: number; text: string; sub: string }
export interface Volume extends Base { kind: "volume"; start: number; end: number; level: number }

export type Edit = Cut | Speed | Zoom | Callout | Highlight | Blur | Freeze | Title | Volume;

export interface Source {
  name: string;
  url: string; // object URL for uploads, a path for the sample
  duration: number;
  width: number;
  height: number;
  isSample: boolean;
}

export interface Pin {
  outT: number; // time on the edited timeline, where the director paused
  srcT: number; // the matching moment in the source video
  x: number;
  y: number;
}

export interface Note extends Pin {
  id: string;
  text: string;
  author: string;
  spoken: boolean;
  frame?: string; // small JPEG of the paused frame, shown in the list and sent to Claude
  status: "pending" | "applied" | "question" | "failed";
  reply?: string;
  question?: string;
  answer?: string;
  answerSpoken?: boolean;
}

export interface Change {
  noteId: string;
  label: string; // plain words for the changelog
}

export interface Version {
  n: number;
  edits: Edit[];
  changes: Change[];
}
