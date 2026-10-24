// Keeps the current project in this browser (IndexedDB), so a refresh or a
// closed tab doesn't lose notes and edits. An uploaded video is stored too when
// the browser has room; otherwise the viewer picks the same file again. Nothing
// here leaves the browser.
import type { Note, Source, Version } from "./edit/types";

export interface SavedProject {
  source: Omit<Source, "url">;
  versions: Version[];
  viewing: number;
  notes: Note[];
  savedAt: number;
  hasFile: boolean; // the uploaded video is stored alongside
  file?: { size: number; lastModified: number }; // to recognise the same upload when it's picked again
}

const STORE = "project";
let opened: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  opened ??= new Promise((resolve, reject) => {
    const req = indexedDB.open("yapifier", 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return opened;
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = work(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("Saving was cancelled."));
  });
}

export const loadProject = () => run<SavedProject | undefined>("readonly", (s) => s.get("current")).catch(() => undefined);
export const loadVideo = () => run<Blob | undefined>("readonly", (s) => s.get("video")).catch(() => undefined);
export const saveProject = (p: SavedProject) => run("readwrite", (s) => s.put(p, "current"));

// Stores the uploaded video, or clears it (for the sample). Resolves false when the browser refuses.
export async function saveVideo(file: Blob | null): Promise<boolean> {
  try {
    if (file) await run("readwrite", (s) => s.put(file, "video"));
    else await run("readwrite", (s) => s.delete("video"));
    return !!file;
  } catch {
    return false;
  }
}

export async function clearProject() {
  await run("readwrite", (s) => {
    s.delete("video");
    return s.delete("current");
  }).catch(() => undefined);
}

export function savedAgo(t: number): string {
  const min = Math.round((Date.now() - t) / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`;
}
