// A film is plain data. Everything on screen is computed from it at time t,
// so an edit is a change to this data and nothing else.

export type SpringName = "snappy" | "default" | "heavy" | "playful";
export type EnterPreset = "rise" | "drop" | "pop" | "slide-left" | "slide-right" | "wipe" | "none";

export const SPRING_NAMES: SpringName[] = ["snappy", "default", "heavy", "playful"];
export const ENTER_PRESETS: EnterPreset[] = ["rise", "drop", "pop", "slide-left", "slide-right", "wipe", "none"];

export interface Enter {
  preset: EnterPreset;
  at: number; // seconds from the start of the scene
  spring: SpringName;
}

export interface El {
  id: string;
  name: string; // what people call it in notes and the changelog
  type: "text" | "box" | "image";
  x: number; // centre, in film pixels
  y: number;
  w: number;
  h: number;
  text?: string;
  size?: number;
  weight?: number;
  color?: string;
  align?: "center" | "left";
  fill?: string;
  radius?: number;
  src?: string;
  shadow?: boolean;
  hidden?: boolean;
  enter: Enter;
}

export interface Scene {
  id: string;
  name: string;
  duration: number;
  background: string;
  elements: El[];
}

export interface Film {
  id: string;
  title: string;
  width: number;
  height: number;
  font: string;
  brand: Record<string, string>; // named colours the director can say out loud
  scenes: Scene[];
}

export interface Pin {
  t: number;
  x: number;
  y: number;
  sceneId: string;
  elementId: string | null;
}

export interface Note extends Pin {
  id: string;
  text: string;
  author: string;
  spoken: boolean; // arrived as a Flow paste rather than keystrokes
  status: "pending" | "applied" | "question" | "failed";
  reply?: string; // the change summary, or the question back to the director
  question?: string; // what the editor asked, kept so the answer has context
  answer?: string; // the director's reply to that question
  answerSpoken?: boolean;
}

export interface AppliedChange {
  noteId: string;
  targetId: string;
  targetName: string;
  field: string;
  from: string;
  to: string;
}

export interface Version {
  n: number;
  film: Film;
  changes: AppliedChange[];
  createdAt: number;
}
