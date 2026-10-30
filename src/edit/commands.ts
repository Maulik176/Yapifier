// Talk to the timeline: the command bar's own parser. Exact commands ("pause",
// "go to 0:42", "undo", "export v3") run here at once, with no model call;
// anything else goes to Yappy (edit/talk.ts), which answers with the same
// commands. Flow writes what you said with capitals and punctuation, so
// everything is matched loosely.
import { describe } from "./ops.js";
import type { CaptionPosition, CaptionStyle, Edit, Note } from "./types.js";

export type VersionRef = number | "latest" | "current";
// time is on the edited timeline's clock; src is in video seconds (from Yappy).
export type Place = { time: number } | { src: number } | { here: true } | { edge: "start" | "end" } | { step: "next" | "previous" | "first" | "last" } | { what: string };

export type Command =
  | { kind: "play" }
  | { kind: "pause" }
  | { kind: "seek"; to: Place; play: boolean }
  | { kind: "nudge"; by: number } // seconds; negative goes back
  | { kind: "apply"; ids?: string[] } // every waiting note, or just these
  | { kind: "undo" }
  | { kind: "redo" }
  | { kind: "export"; version: VersionRef }
  | { kind: "view"; version: VersionRef }
  | { kind: "restore"; version: VersionRef }
  | { kind: "original" } // a look at the untouched footage
  | { kind: "remove"; what: string; ids?: string[] }
  | { kind: "note"; text: string; at?: number; now?: boolean } // at: video seconds; now: apply it at once
  // add: transcribe (lang: then translate to it); style; rewrite: replace lines by number (fixes, translation)
  | { kind: "captions"; op: "add" | "remove" | "style" | "rewrite"; lang?: string; style?: CaptionStyle; position?: CaptionPosition; size?: number; lines?: { n: number; text: string }[] }
  | { kind: "help" };

export const COMMAND_EXAMPLES = ["go to 0:42", "play from where it shows the prize", "blur the email", "apply the third note", "undo", "export v3"];

// Commands the parser can be sure of. Finding a moment or an edit by its words
// is left to Yappy, which can also look at the video.
export function isExact(c: Command): boolean {
  if (c.kind === "seek") return !("what" in c.to);
  return c.kind !== "remove";
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS: Record<string, number> = { twenty: 20, thirty: 30, forty: 40, fifty: 50 };

// "forty-two" → "42", "zero forty two" → "0 42". Only used on the part of a
// command that should be a time or a version, so "the one with the email" stays as said.
function numberWords(s: string): string {
  return s
    .replace(/\b(twenty|thirty|forty|fifty)(?:[\s-](one|two|three|four|five|six|seven|eight|nine))?\b/g, (_, t: string, o?: string) => String(TENS[t] + (o ? ONES.indexOf(o) : 0)))
    .replace(new RegExp(`\\b(${ONES.join("|")})\\b`, "g"), (w) => String(ONES.indexOf(w)));
}

// Seconds on the edited timeline, from "0:42", "42 seconds", "1 minute 5", "second 12" or "42".
export function parseTime(raw: string): number | null {
  const s = numberWords(raw)
    .replace(/\b(the|mark|point|timestamp|time)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let m = s.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (m) return +m[1] * 60 + +m[2];
  m = s.match(/^(\d+) (\d{2})$/);
  if (m) return +m[1] * 60 + +m[2];
  m = s.match(/^(second|minute) (\d+(?:\.\d+)?)$/);
  if (m) return +m[2] * (m[1] === "minute" ? 60 : 1);
  m = s.match(/^(?:(\d+(?:\.\d+)?) ?(?:minutes?|mins?|m)(?: and)? ?)?(?:(\d+(?:\.\d+)?) ?(?:seconds?|secs?|s)?)?$/);
  if (m && (m[1] || m[2])) return (m[1] ? +m[1] * 60 : 0) + (m[2] ? +m[2] : 0);
  return null;
}

// "v3", "version three", "the original", "the latest one"; "" or "this" is the version on screen.
export function parseVersion(raw: string): VersionRef | null {
  const s = numberWords(raw).replace(/^the /, "").trim();
  if (!s || /^(this|it|that|this one|this version|the video|video)$/.test(s)) return "current";
  let m = s.match(/^(?:v|version|ver)\s*(\d+)$/);
  if (m) return +m[1];
  if (/^original(?: video| version| one| footage)?$/.test(s)) return 1;
  if (/^(latest|last|newest|final|edited)(?: version| one| edit| cut| video)?$/.test(s)) return "latest";
  return null;
}

function parsePlace(raw: string): Place {
  const s = raw.replace(/ of the video$/, "").trim();
  if (/^(?:the )?(?:very )?(?:start|beginning|top)$/.test(s)) return { edge: "start" };
  if (/^(?:the )?(?:very )?(?:end|last frame)$/.test(s)) return { edge: "end" };
  const step = s.match(/^(?:the )?(next|previous|last|first) note$/);
  if (step) return { step: step[1] as "next" | "previous" | "first" | "last" };
  const time = parseTime(s);
  if (time !== null) return { time };
  return { what: s };
}

const SEEK = /^(?:go|jump|skip|move|seek|take me|head|scrub)(?: back| ahead| forward)? (?:to|until) (.+)$/;
const PLAY_FROM = /^(?:play|start|watch|resume|continue)(?: it| the video| playing)? (?:from|at) (.+)$/;
const NUDGE = /^(?:go |skip |jump |move )?(back|backward|backwards|rewind|forward|forwards|ahead|fast forward)(?: by)?(?: (.+))?$/;

function parseOne(t: string): Command | null {
  if (/^(?:help|commands|what can i say|what can you do)$/.test(t)) return { kind: "help" };
  if (/^(?:play|resume|start|continue|play it|play the video|start playing|keep playing|go)$/.test(t)) return { kind: "play" };
  if (/^(?:pause|stop|hold on|wait|pause it|stop it|pause the video|stop playing)$/.test(t)) return { kind: "pause" };
  if (/^(?:apply|apply (?:the |all |all the |my |these |those )?(?:notes?|changes|edits|it|them|everything)|send (?:it|them|the notes|my notes)(?: to yappy)?|do it|make (?:the|those|these) (?:changes|edits))$/.test(t)) return { kind: "apply" };
  if (/^undo(?: (?:that|it|the last (?:change|edit)|last (?:change|edit)))?$/.test(t)) return { kind: "undo" };
  if (/^redo(?: (?:that|it))?$/.test(t)) return { kind: "redo" };
  if (/^(?:compare|before and after|show (?:me )?(?:the )?(?:original|before)(?: footage| video)?)$/.test(t)) return { kind: "original" };
  if (/^(?:from the top|start from the top|play from the top|start again|play again)$/.test(t)) return { kind: "seek", to: { edge: "start" }, play: true };
  if (/^(?:(?:add|turn on|show|generate|make|create|put on|switch on)(?: some| the)? (?:captions?|subtitles?|subs)|(?:captions?|subtitles?) on)$/.test(t)) return { kind: "captions", op: "add" };
  if (/^(?:(?:remove|delete|turn off|hide|switch off|take off|get rid of)(?: the)? (?:captions?|subtitles?|subs)|(?:captions?|subtitles?) off)$/.test(t)) return { kind: "captions", op: "remove" };

  let m = t.match(/^(?:export|download|render)(?: (.+?))?(?: as (?:an? )?(?:mp4|webm|video|file))?$/);
  if (m) {
    const version = parseVersion(m[1] ?? "");
    return version === null ? null : { kind: "export", version };
  }
  m = t.match(/^restore (.+)$/);
  if (m) {
    const version = parseVersion(m[1]);
    return version === null || version === "current" ? null : { kind: "restore", version };
  }
  // "show v2" or "go to the original version" views a version; anything else after "go to" is a place.
  m = t.match(/^(?:show(?: me)?|view|open|switch to|go to|look at|see|watch|back to|go back to) (.+)$/);
  if (m) {
    const version = parseVersion(m[1]);
    if (version !== null && version !== "current" && !(version === 1 && !/version|v\s*1/.test(m[1]))) return { kind: "view", version };
  }
  m = t.match(PLAY_FROM);
  if (m) return { kind: "seek", to: parsePlace(m[1]), play: true };
  m = t.match(SEEK);
  if (m) return { kind: "seek", to: parsePlace(m[1]), play: false };
  m = t.match(/^(?:show me|find|where is|wheres|where's) (.+)$/);
  if (m) return { kind: "seek", to: parsePlace(m[1]), play: false };
  m = t.match(NUDGE);
  if (m) {
    const by = m[2] ? parseTime(m[2]) : 5;
    if (by === null) return null;
    return { kind: "nudge", by: /back|rewind/.test(m[1]) ? -by : by };
  }
  m = t.match(/^(?:skip|fast forward)(?: by)? (.+)$/);
  if (m) {
    const by = parseTime(m[1]);
    return by === null ? null : { kind: "nudge", by };
  }
  m = t.match(/^(?:remove|delete|drop|get rid of|take out|take off) (.+)$/);
  if (m) return { kind: "remove", what: m[1].replace(/^the /, "") };
  return null;
}

const FILLER = /^(?:(?:hey |ok |okay |so |now |and |please |yappy |can you |could you |would you |let's |lets |i want to |i'd like to |id like to )+)/;

function clean(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[“”"‘’!?;]/g, " ")
    .replace(/[.,]+(?=\s|$)/g, " ") // sentence punctuation, but not "1.5" or "0:42"
    .replace(/\s+/g, " ")
    .trim()
    .replace(FILLER, "")
    .replace(/ (?:please|for me|now)$/, "")
    .trim();
}

// One or more commands from what was said, or null when none was recognised.
// "go to 0:42 and play" is two commands; a note keeps its words as said.
export function parseCommands(raw: string): Command[] | null {
  const note = raw.trim().match(/^(?:please\s+)?(?:add (?:a )?note|new note|leave (?:a )?note|note)\s*[:,.-]?\s+(.+)$/i);
  if (note) return [{ kind: "note", text: note[1].trim() }];
  const t = clean(raw);
  if (!t) return null;
  const parts = t.split(/ (?:and then|then|and) /);
  if (parts.length > 1) {
    const all = parts.map((p) => parseOne(p.replace(FILLER, "")));
    if (all.every((c): c is Command => c !== null)) return all;
  }
  const one = parseOne(t);
  if (one) return [one];
  // "Yappy, blur this email" is a note for Yappy when it isn't a command.
  const forYappy = raw.trim().match(/^(?:hey\s+)?(?:tell\s+)?yappy\s*[:,.-]?\s+(.+)$/i);
  return forYappy ? [{ kind: "note", text: forYappy[1].trim() }] : null;
}

// Finding a moment by what's in it: the words of the notes and of the edits
// (their labels, text and kind). A match on an edit beats one on a note, then the earliest wins.
const STOP = new Set("the a an to from at of where it its is was this that there part bit moment scene shot screen section with says say said shows show me my our video one in on and for about when thing where's wheres".split(" "));
const KIND_WORDS: Record<Edit["kind"], string> = {
  cut: "cut trim removed",
  speed: "speed fast faster slow slower sped",
  zoom: "zoom zoomed punch close",
  callout: "label callout text",
  highlight: "spotlight highlight",
  blur: "blur blurred mask masked hide hidden",
  freeze: "freeze frozen hold",
  title: "title card intro heading",
  volume: "volume mute muted sound audio",
  captions: "captions caption subtitles subtitle subs",
};

const stem = (w: string) => (w.length > 4 ? w.replace(/(?:ing|ed|es|s)$/, "") : w);
const words = (s: string) => s.toLowerCase().match(/[a-z0-9@₹]+/g)?.map(stem) ?? [];

export interface Moment {
  srcT: number;
  label: string;
  edit?: Edit;
  note?: Note;
}

function edgeOf(e: Edit): number {
  return "start" in e ? e.start : e.at;
}

export function findMoment(query: string, notes: Note[], edits: Edit[]): Moment | null {
  const want = [...new Set(words(query).filter((w) => w.length > 1 && !STOP.has(w)))];
  if (!want.length) return null;
  const candidates: (Moment & { have: Set<string>; rank: number })[] = [
    ...edits.map((e) => ({
      srcT: edgeOf(e),
      label: describe(e),
      edit: e,
      have: new Set(words(`${describe(e)} ${KIND_WORDS[e.kind]} ${"text" in e ? e.text : ""} ${"sub" in e ? e.sub : ""}`)),
      rank: 0,
    })),
    ...notes.map((n) => ({ srcT: n.srcT, label: `note “${n.text.length > 40 ? `${n.text.slice(0, 40)}…` : n.text}”`, note: n, have: new Set(words(`${n.text} ${n.answer ?? ""}`)), rank: 1 })),
  ];
  let best: (typeof candidates)[number] | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = want.filter((w) => c.have.has(w)).length;
    if (!score) continue;
    if (!best || score > bestScore || (score === bestScore && (c.rank < best.rank || (c.rank === best.rank && c.srcT < best.srcT)))) {
      best = c;
      bestScore = score;
    }
  }
  if (!best) return null;
  return { srcT: best.srcT, label: best.label, edit: best.edit, note: best.note };
}
