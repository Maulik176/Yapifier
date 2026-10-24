// The only way a film changes: a list of field edits, each checked and clamped
// here before it lands. Shared by the browser and the server (no DOM imports).
import { ENTER_PRESETS, SPRING_NAMES, type AppliedChange, type El, type Film, type Scene } from "./types";

export interface Edit {
  targetId: string; // an element id, or a scene id for scene_* fields
  field: string;
  value: string;
}

export const ELEMENT_FIELDS = ["text", "size", "weight", "color", "fill", "x", "y", "w", "h", "radius", "enter_preset", "enter_spring", "enter_at", "hidden", "copy_to_scene"] as const;

// A copy made by copy_to_scene gets a predictable id, so later edits in the
// same list can position it.
export const copyId = (sourceId: string, sceneId: string) => `${sourceId}@${sceneId}`;
export const SCENE_FIELDS = ["scene_duration", "scene_background"] as const;
export const ALL_FIELDS: string[] = [...ELEMENT_FIELDS, ...SCENE_FIELDS];

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function resolveColor(film: Film, value: string): string | null {
  const v = value.trim();
  if (HEX.test(v)) return v.toLowerCase();
  const key = Object.keys(film.brand).find((k) => k.toLowerCase() === v.toLowerCase().replace(/^brand\s+/, ""));
  return key ? film.brand[key] : null;
}

function num(value: string, min: number, max: number): number | null {
  const n = Number(String(value).replace(/[^0-9.\-]/g, ""));
  if (!Number.isFinite(n)) return null;
  return Math.round(Math.min(max, Math.max(min, n)) * 100) / 100;
}

function findElement(film: Film, id: string): { el: El; scene: Scene } | null {
  for (const scene of film.scenes) {
    const el = scene.elements.find((e) => e.id === id);
    if (el) return { el, scene };
  }
  return null;
}

function show(v: unknown): string {
  return v === undefined ? "—" : String(v);
}

export function applyEdits(film: Film, edits: Edit[], noteId: string): { film: Film; changes: AppliedChange[]; rejected: string[] } {
  const next: Film = structuredClone(film);
  const changes: AppliedChange[] = [];
  const rejected: string[] = [];

  for (const edit of edits) {
    const reject = (why: string) => rejected.push(`${edit.field.replace(/_/g, " ")} “${edit.value}” (${why})`);

    if (edit.field.startsWith("scene_")) {
      const scene = next.scenes.find((s) => s.id === edit.targetId);
      if (!scene) {
        reject("no such scene");
        continue;
      }
      if (edit.field === "scene_duration") {
        const v = num(edit.value, 1, 30);
        if (v === null) {
          reject("not a number");
          continue;
        }
        changes.push({ noteId, targetId: scene.id, targetName: scene.name, field: "scene length (s)", from: show(scene.duration), to: show(v) });
        scene.duration = v;
      } else if (edit.field === "scene_background") {
        const c = resolveColor(next, edit.value);
        if (!c) {
          reject("unknown colour");
          continue;
        }
        changes.push({ noteId, targetId: scene.id, targetName: scene.name, field: "background", from: scene.background, to: c });
        scene.background = c;
      } else reject("unknown scene field");
      continue;
    }

    const found = findElement(next, edit.targetId);
    if (!found) {
      reject("no such element");
      continue;
    }
    const { el, scene } = found;
    // Edits that set a value to what it already was don't belong in the changelog.
    const record = (field: string, from: unknown, to: unknown) =>
      show(from) !== show(to) && changes.push({ noteId, targetId: el.id, targetName: el.name, field, from: show(from), to: show(to) });

    switch (edit.field) {
      case "text": {
        const v = edit.value.trim().slice(0, 80);
        if (!v) {
          reject("empty text");
          break;
        }
        record("text", el.text, v);
        el.text = v;
        break;
      }
      case "color":
      case "fill": {
        const c = resolveColor(next, edit.value);
        if (!c) {
          reject("unknown colour");
          break;
        }
        record(edit.field === "color" ? "text colour" : "fill", el[edit.field], c);
        el[edit.field] = c;
        break;
      }
      case "size":
      case "weight":
      case "x":
      case "y":
      case "w":
      case "h":
      case "radius": {
        const limits: Record<string, [number, number]> = {
          size: [12, 260],
          weight: [300, 900],
          x: [0, next.width],
          y: [0, next.height],
          w: [20, next.width * 1.2],
          h: [20, next.height * 1.2],
          radius: [0, 240],
        };
        const [min, max] = limits[edit.field];
        let v = num(edit.value, min, max);
        if (v === null) {
          reject("not a number");
          break;
        }
        if (edit.field === "weight") v = Math.round(v / 100) * 100;
        const key = edit.field as "size" | "weight" | "x" | "y" | "w" | "h" | "radius";
        const label = { size: "text size", weight: "font weight", x: "left–right position", y: "up–down position", w: "width", h: "height", radius: "corner radius" }[key];
        record(label, el[key], v);
        el[key] = v;
        break;
      }
      case "enter_preset": {
        const v = edit.value.trim() as El["enter"]["preset"];
        if (!ENTER_PRESETS.includes(v)) {
          reject("unknown entrance");
          break;
        }
        record("entrance", el.enter.preset, v);
        el.enter.preset = v;
        break;
      }
      case "enter_spring": {
        const v = edit.value.trim() as El["enter"]["spring"];
        if (!SPRING_NAMES.includes(v)) {
          reject("unknown spring");
          break;
        }
        record("motion feel", el.enter.spring, v);
        el.enter.spring = v;
        break;
      }
      case "enter_at": {
        const v = num(edit.value, 0, Math.max(0, scene.duration - 0.2));
        if (v === null) {
          reject("not a number");
          break;
        }
        record("enters at (s)", el.enter.at, v);
        el.enter.at = v;
        break;
      }
      case "hidden": {
        const v = /^(true|yes|1)$/i.test(edit.value.trim());
        record("hidden", el.hidden ?? false, v);
        el.hidden = v;
        break;
      }
      case "copy_to_scene": {
        const dest = next.scenes.find((s) => s.id === edit.value.trim());
        if (!dest) {
          reject("no such scene");
          break;
        }
        const id = copyId(el.id, dest.id);
        if (dest.elements.some((e) => e.id === id)) {
          reject("already in that scene");
          break;
        }
        const copy: El = { ...structuredClone(el), id, name: `${el.name} (in ${dest.name})`, hidden: false };
        copy.enter.at = Math.min(copy.enter.at, Math.max(0, dest.duration - 0.5));
        dest.elements.push(copy);
        changes.push({ noteId, targetId: id, targetName: copy.name, field: "added to scene", from: "—", to: dest.name });
        break;
      }
      default:
        reject("unknown field");
    }
  }
  return { film: next, changes, rejected };
}
