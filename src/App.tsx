import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import EditHandles, { isSpatial } from "./components/EditHandles";
import Inspector, { type Adjustment } from "./components/Inspector";
import Landing from "./components/Landing";
import NotePopover from "./components/NotePopover";
import { AgentLog, EditsList, NotesPanel, VersionsPanel } from "./components/Panels";
import Stage from "./components/Stage";
import Timeline from "./components/Timeline";
import { runTool, type ToolCall } from "./edit/agent";
import { exportFormat, MAX_UPLOAD_MB, mediaEvent, readSource, recordExport, seekTo, snapshot, thumbnails, waveform } from "./edit/media";
import { applyOps, describe, type Op } from "./edit/ops";
import { Player } from "./edit/player";
import { toSource } from "./edit/render";
import { SAMPLE, SAMPLE_NOTES, sampleUrl } from "./edit/sample";
import { formatTime, locate, srcToOut } from "./edit/timeline";
import { Footage, fitToFootage } from "./edit/track";
import type { AgentStep, Change, Edit, Note, Source, Version } from "./edit/types";
import { clearProject, loadProject, loadVideo, saveProject, saveVideo, type SavedProject } from "./save";
import { useTheme } from "./theme";

interface PendingPin {
  outT: number;
  srcT: number;
  x: number;
  y: number;
  px: number;
  py: number;
  stageW: number;
  stageH: number;
}

interface ApplyResult {
  noteId: string;
  summary: string;
  question: string;
  ops: Op[];
}

// An undone version, with the notes it touched as they were, so redo can put both back.
interface Undone {
  version: Version;
  notes: Note[];
}

const MAX_NOTES_PER_RUN = 8; // matches MAX_NOTES in server/apply.ts
const APPLY_DEADLINE_MS = 150_000;
const WIDE = "(min-width: 1021px)"; // matches the two-column layout in styles.css

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const m = matchMedia(query);
    const change = () => setOn(m.matches);
    m.addEventListener("change", change);
    return () => m.removeEventListener("change", change);
  }, [query]);
  return on;
}

let nextId = 1;
const newId = () => `n${nextId++}`;

export default function App() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const exportRef = useRef<HTMLCanvasElement>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [opening, setOpening] = useState(false);
  const [versions, setVersions] = useState<Version[]>([{ n: 1, edits: [], changes: [] }]);
  const [viewing, setViewing] = useState(1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [agentLog, setAgentLog] = useState<AgentStep[]>([]);
  const [pin, setPin] = useState<PendingPin | null>(null);
  const [ui, setUi] = useState({ outT: 0, srcT: 0, playing: false });
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  // The export job: canvas size plus a frozen copy of the version being recorded.
  const [exporting, setExporting] = useState<{ w: number; h: number; n: number; edits: Edit[] } | null>(null);
  const exportJob = useRef<AbortController | null>(null);
  const applyJob = useRef<AbortController | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<Edit | null>(null); // an edit being dragged on the video
  const [redo, setRedo] = useState<Undone[]>([]);
  const [saved, setSaved] = useState<SavedProject | null>(null); // a project from an earlier visit, offered on the landing page
  const [hasVideo, setHasVideo] = useState(false); // the open upload is stored in the browser too
  const [fileInfo, setFileInfo] = useState<SavedProject["file"]>(undefined);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const wide = useMedia(WIDE);
  const [peeking, setPeeking] = useState(false); // showing the original while O is held

  useEffect(() => {
    void loadProject().then((p) => p && setSaved(p));
  }, []);

  useEffect(() => {
    if (videoRef.current && !player) setPlayer(new Player(videoRef.current));
  }, [player]);

  const footage = useMemo(() => (source ? new Footage(source.url, source.duration) : null), [source]);
  const latest = versions[versions.length - 1];
  const shown = versions.find((v) => v.n === viewing) ?? latest;
  const isLatest = shown.n === latest.n;
  const pending = notes.filter((n) => n.status === "pending");

  // The selected edit on the latest version, with any drag in progress applied.
  const selectedEdit = isLatest && selected ? ((draft?.id === selected ? draft : latest.edits.find((e) => e.id === selected)) ?? null) : null;
  // While a zoom is selected and paused, show the frame unzoomed so its window can be aimed.
  const aimingZoom = selectedEdit?.kind === "zoom" && !ui.playing && !exporting;
  const viewEdits = useMemo(() => {
    if (exporting) return exporting.edits; // nothing on screen can change what's being recorded
    let list = draft && isLatest ? shown.edits.map((e) => (e.id === draft.id ? draft : e)) : shown.edits;
    if (aimingZoom) list = list.filter((e) => e.id !== selected);
    return list;
  }, [exporting, shown.edits, draft, isLatest, aimingZoom, selected]);

  useEffect(() => {
    player?.setEdits(viewEdits);
  }, [player, viewEdits]);

  // Opens a video, fresh or with a saved project's notes and versions. Resolves true when it worked.
  const open = useCallback(
    async (url: string, name: string, isSample: boolean, restore?: SavedProject): Promise<boolean> => {
      if (!player) return false;
      setOpening(true);
      setError(null);
      try {
        const src = await readSource(url, name, isSample);
        if (restore && (Math.abs(src.duration - restore.source.duration) > 0.5 || src.width !== restore.source.width || src.height !== restore.source.height))
          throw new Error("That isn't the video from your saved project: its length or size is different.");
        player.pause();
        const decodes = mediaEvent(player.video, "loadeddata");
        player.video.preload = "auto";
        player.video.src = url;
        await decodes;
        player.load(src.duration, []);
        player.seek(0);
        setVersions(restore?.versions ?? [{ n: 1, edits: [], changes: [] }]);
        setViewing(restore?.viewing ?? 1);
        setNotes(restore?.notes ?? []);
        for (const n of restore?.notes ?? []) nextId = Math.max(nextId, Number(n.id.slice(1)) + 1 || 0);
        setSaved(null);
        setAgentLog([]);
        setSelected(null);
        setRedo([]);
        setPin(null);
        setDownload(null);
        setThumbs([]);
        setPeaks(null);
        setSource(src);
        thumbnails(url, src.duration, 24).then(setThumbs, () => setThumbs([]));
        void waveform(url).then(setPeaks);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return false;
      } finally {
        setOpening(false);
      }
    },
    [player],
  );

  const checkFile = (file: File) => {
    if (!file.type.startsWith("video/")) return "That isn't a video file. Try an MP4 or WebM.";
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return `Please use a video under ${MAX_UPLOAD_MB} MB.`;
    return null;
  };

  const openFile = async (file: File, restore?: SavedProject) => {
    const problem = checkFile(file);
    if (problem) return setError(problem);
    if (restore?.file && restore.file.size !== file.size)
      return setError(`That isn't the file from your saved project. Choose “${restore.source.name}” (${(restore.file.size / 1e6).toFixed(1)} MB).`);
    if (await open(URL.createObjectURL(file), restore?.source.name ?? file.name, false, restore)) {
      setFileInfo({ size: file.size, lastModified: file.lastModified });
      setHasVideo(await saveVideo(file));
    }
  };

  const openSample = async () => {
    if (await open(sampleUrl(), SAMPLE.name, true)) {
      setFileInfo(undefined);
      setHasVideo(await saveVideo(null));
    }
  };

  // Pick up a saved project: the sample reloads by itself, an upload from browser storage if it fit there.
  const resume = async () => {
    if (!saved) return;
    if (saved.source.isSample) return void open(sampleUrl(), saved.source.name, true, saved);
    const video = saved.hasFile ? await loadVideo() : undefined;
    if (!video) return setError(`Choose “${saved.source.name}” again to pick up where you left off.`);
    if (await open(URL.createObjectURL(video), saved.source.name, false, saved)) {
      setFileInfo(saved.file);
      setHasVideo(true);
    }
  };

  // Autosave: the project (not the undo history) shortly after anything changes.
  useEffect(() => {
    if (!source) return;
    const timer = setTimeout(() => {
      const { name, duration, width, height, isSample } = source;
      saveProject({ source: { name, duration, width, height, isSample }, versions, viewing, notes, savedAt: Date.now(), hasFile: hasVideo, file: fileInfo }).then(
        () => setSavedAt(Date.now()),
        () => setSavedAt(null),
      );
    }, 600);
    return () => clearTimeout(timer);
  }, [source, versions, viewing, notes, hasVideo, fileInfo]);

  const togglePlay = useCallback(() => {
    if (!player || exporting) return;
    setPin(null);
    if (player.playing) player.pause();
    else player.play();
  }, [player, exporting]);

  const seek = useCallback(
    (outT: number) => {
      if (!player || exporting) return;
      setPin(null);
      player.pause();
      player.seek(outT);
    },
    [player, exporting],
  );

  const point = useCallback(
    (ox: number, oy: number, px: number, py: number, stageW: number, stageH: number) => {
      if (!player || exporting) return;
      if (selected) {
        setSelected(null); // a click away from a selected edit just lets go of it
        return;
      }
      if (!isLatest) {
        setError(`You're looking at ${shown.n === 1 ? "the original" : `v${shown.n}`}. Switch to v${latest.n} to leave notes.`);
        return;
      }
      player.pause();
      const srcT = ui.srcT;
      const at = toSource(player.edits, srcT, ox, oy);
      setPin({ outT: player.outT, srcT, x: at.x, y: at.y, px, py, stageW, stageH });
    },
    [player, exporting, selected, isLatest, shown.n, latest.n, ui.srcT],
  );

  const saveNote = (text: string, spoken: boolean) => {
    if (!pin) return;
    const frame = canvasRef.current ? snapshot(canvasRef.current) : undefined;
    setNotes((all) => [...all, { id: newId(), outT: pin.outT, srcT: pin.srcT, x: pin.x, y: pin.y, text, spoken, frame, author: "You", status: "pending" }]);
    setPin(null);
    player?.play();
  };

  // Sample notes come with frames grabbed from the video, so Claude sees what a director would have.
  const loadSampleNotes = async () => {
    if (!player || !source) return;
    setBusy("Loading sample notes…");
    setError(null);
    try {
      const v = document.createElement("video");
      v.muted = true;
      const ready = mediaEvent(v, "loadeddata");
      v.src = source.url;
      await ready;
      const c = document.createElement("canvas");
      c.width = 640;
      c.height = Math.round((source.height / source.width) * 640);
      const made: Note[] = [];
      for (const s of SAMPLE_NOTES) {
        await seekTo(v, s.srcT);
        c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
        made.push({ ...s, id: newId(), outT: srcToOut(player.segs, s.srcT), spoken: false, author: "Sample", status: "pending", frame: c.toDataURL("image/jpeg", 0.72) });
      }
      setNotes((all) => [...all, ...made]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // Yappy, the editor agent: each request is one step. When Claude asks to look at
  // or track part of the video, the browser does it and sends the results back
  // with the next step, until Claude returns the edits.
  const apply = useCallback(async () => {
    if (!player || !source || !footage || !pending.length || busy) return;
    const started = performance.now();
    const count = `${pending.length} note${pending.length > 1 ? "s" : ""}`;
    setBusy(`Applying ${count}…`);
    setError(null);
    const log: AgentStep[] = [];
    const step = (s: AgentStep) => {
      log.push(s);
      setAgentLog([...log]);
    };
    let rounds = 0;
    // Stop button and a deadline; notes keep waiting if a run is stopped.
    const ctrl = new AbortController();
    applyJob.current = ctrl;
    const deadline = setTimeout(() => ctrl.abort("deadline"), APPLY_DEADLINE_MS);
    try {
      // The server takes up to 8 notes per run, so bigger sets go in batches,
      // each one building on the edits the last one made.
      const batches: Note[][] = [];
      for (let k = 0; k < pending.length; k += MAX_NOTES_PER_RUN) batches.push(pending.slice(k, k + MAX_NOTES_PER_RUN));
      let edits: Edit[] = latest.edits;
      const changes: Change[] = [];
      const outcome = new Map<string, Pick<Note, "status" | "reply" | "question">>();
      for (const [b, batch] of batches.entries()) {
        const what = `${batch.length} note${batch.length > 1 ? "s" : ""}`;
        step({ kind: "read", text: `Reading ${what} and the frames you paused on`, detail: batches.length > 1 ? `batch ${b + 1} of ${batches.length}` : undefined });
        const request = {
          source: { duration: source.duration, width: source.width, height: source.height },
          edits,
          notes: batch.map(({ id, srcT, x, y, text, frame, question, answer }) => ({ id, srcT, x, y, text, frame, question, answer })),
        };
        const transcript: unknown[] = [];
        let results: ApplyResult[] | null = null;
        while (!results) {
          const res = await fetch("/api/apply", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, transcript }), signal: ctrl.signal });
          const data = await res.json().catch(() => ({ error: "The server sent back something unreadable." }));
          if (!res.ok) throw new Error(data.error ?? `Apply failed (${res.status}).`);
          if (data.results) results = data.results as ApplyResult[];
          else {
            const toolResults = await Promise.all((data.calls as ToolCall[]).map((c) => runTool(footage, c, step)));
            ctrl.signal.throwIfAborted();
            const ids = batch.map((n) => n.id).join(", ");
            const reminder = { type: "text", text: `When you have what you need, return one result for every note: ${ids}.` };
            transcript.push({ role: "assistant", content: data.content }, { role: "user", content: [...toolResults, reminder] });
            rounds++;
          }
        }
        for (const r of results) {
          const result = applyOps(edits, r.ops ?? [], r.noteId, source.duration);
          edits = result.edits;
          changes.push(...result.changes);
          const skipped = result.rejected.length ? `Skipped: ${result.rejected.join("; ")}.` : "";
          const question = [r.question, skipped].filter(Boolean).join(" ");
          const reply = [result.changes.length ? r.summary : "", question || (result.changes.length ? "" : "Nothing could be changed for this note.")].filter(Boolean).join(" ");
          outcome.set(r.noteId, { status: question || !result.changes.length ? "question" : "applied", reply, question: question || undefined });
        }
      }

      // Safety net: newly added overlays stay on only while what they cover looks
      // unchanged. Changes to existing edits and timing the director asked for
      // on purpose are left exactly as Claude set them.
      const existing = new Set(latest.edits.map((e) => e.id));
      const fresh = new Set(edits.filter((e) => !existing.has(e.id) && !e.exact).map((e) => e.id));
      const pinnedAt = new Map(pending.map((n) => [n.id, n.srcT]));
      const fit = await fitToFootage(footage, edits, fresh, (e) => (e.noteId ? pinnedAt.get(e.noteId) : undefined));
      ctrl.signal.throwIfAborted();
      edits = fit.edits;
      for (const { before: b, after: a } of fit.fitted) {
        for (const c of changes) c.label = c.label.replace(describe(b), describe(a));
        if (!("start" in a) || !("start" in b) || Math.abs(a.start - b.start) + Math.abs(a.end - b.end) <= 0.3) continue;
        const range = `${formatTime(a.start)}–${formatTime(a.end)}`;
        step({ kind: "fit", text: `Suggested range for the ${a.kind}: while the boxed area looks unchanged`, detail: `${range}, check it` });
        // Say so on the note too, so its reply matches what was actually done.
        const o = a.noteId ? outcome.get(a.noteId) : undefined;
        if (o) o.reply = `${o.reply ?? ""} Yapifier set it to ${range}, while the boxed area looks unchanged. Moving content isn't followed, so check it.`.trim();
      }
      step({ kind: "done", text: `Done in ${((performance.now() - started) / 1000).toFixed(1)} s`, detail: rounds ? `checked the video ${rounds === 1 ? "once" : `${rounds} times`}` : undefined });
      // Only the notes sent in this run; notes written while Yappy worked stay waiting.
      const sent = new Set(pending.map((n) => n.id));
      setNotes((all) => all.map((n) => (outcome.has(n.id) ? { ...n, ...outcome.get(n.id)! } : sent.has(n.id) ? { ...n, status: "failed", reply: "No answer came back for this note." } : n)));
      if (changes.length) {
        setRedo([]);
        const n = latest.n + 1;
        setVersions((all) => [...all, { n, edits, changes }]);
        setViewing(n);
        // Play from just before the earliest change.
        const touched = edits.filter((e) => changes.some((c) => c.noteId === e.noteId));
        const first = Math.min(...touched.map((e) => ("start" in e ? e.start : e.at)));
        player.setEdits(edits);
        player.seek(Math.max(0, srcToOut(player.segs, Number.isFinite(first) ? first : 0) - 1));
        player.play();
      }
    } catch (e) {
      if (ctrl.signal.aborted) {
        const late = ctrl.signal.reason === "deadline";
        step({ kind: "error", text: late ? "Stopped: this took over 2 minutes. Your notes are still waiting; try fewer at once." : "Stopped. Your notes are still waiting." });
        if (late) setError("Yappy took too long. Try applying fewer notes at once.");
      } else {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        step({ kind: "error", text: message });
      }
    } finally {
      clearTimeout(deadline);
      applyJob.current = null;
      setBusy(null);
    }
  }, [player, source, footage, pending, busy, latest]);

  // Hand changes (remove, restore) become a new version too, so they can be undone.
  const commit = useCallback(
    (edits: Edit[], label: string) => {
      const n = latest.n + 1;
      setVersions((all) => [...all, { n, edits, changes: [{ noteId: "", label }] }]);
      setViewing(n);
      setRedo([]);
    },
    [latest.n],
  );

  const removeEdit = useCallback(
    (id: string) => {
      const gone = latest.edits.find((e) => e.id === id);
      if (!gone || busy) return;
      commit(latest.edits.filter((e) => e.id !== id), `Removed: ${describe(gone)}`);
      setSelected(null);
    },
    [latest.edits, busy, commit],
  );

  const restore = (n: number) => {
    const v = versions.find((v) => v.n === n);
    if (v && !busy) commit(v.edits.map((e) => ({ ...e })), `Restored ${n === 1 ? "the original" : `v${n}`}`);
  };

  // Undo drops the latest version. Notes it applied go back to waiting, so they can be re-applied or deleted.
  const undo = useCallback(() => {
    if (versions.length < 2 || busy) return;
    const ids = new Set(latest.changes.map((c) => c.noteId).filter(Boolean));
    setRedo((r) => [...r, { version: latest, notes: notes.filter((n) => ids.has(n.id)) }]);
    setVersions((all) => all.slice(0, -1));
    setNotes((all) => all.map((n) => (ids.has(n.id) ? { ...n, status: "pending", reply: undefined, question: undefined } : n)));
    setViewing(versions[versions.length - 2].n);
    setSelected(null);
  }, [versions, latest, notes, busy]);

  const redoLast = useCallback(() => {
    const last = redo[redo.length - 1];
    if (!last || busy) return;
    const back = new Map(last.notes.map((n) => [n.id, n]));
    setRedo((r) => r.slice(0, -1));
    setVersions((all) => [...all, last.version]);
    setNotes((all) => all.map((n) => back.get(n.id) ?? n));
    setViewing(last.version.n);
  }, [redo, busy]);

  // Select an edit and show it: title and freeze cards from their first frame,
  // boxes and labels a moment in (so they can be dragged), the rest just before they start.
  const pick = useCallback(
    (e: Edit | null) => {
      setSelected(e?.id ?? null);
      if (!e || !player) return;
      const stage = document.querySelector(".stage");
      if (!matchMedia(WIDE).matches && stage && stage.getBoundingClientRect().bottom < 80) stage.scrollIntoView({ block: "start", behavior: "smooth" });
      const hold = player.segs.find((s) => s.type === "hold" && s.edit.id === e.id);
      if (hold) return seek(hold.out0 + Math.min(0.9, (hold.out1 - hold.out0) * 0.4));
      if (!("start" in e)) return seek(srcToOut(player.segs, e.at));
      if (isSpatial(e)) return seek(srcToOut(player.segs, e.start + Math.min(0.5, (e.end - e.start) / 2)));
      seek(Math.max(0, srcToOut(player.segs, e.start) - (e.kind === "cut" ? 1 : 0.2)));
    },
    [player, seek],
  );

  // Hand adjustments to one edit fold into a single version, so one undo reverts them all.
  const tweak = useCallback(
    (next: Edit) => {
      if (busy) return;
      const edits = latest.edits.map((e) => (e.id === next.id ? next : e));
      const changes = [{ noteId: "", label: `Adjusted: ${describe(next)}` }];
      if (latest.tweak === next.id) setVersions((all) => [...all.slice(0, -1), { ...latest, edits, changes }]);
      else {
        const n = latest.n + 1;
        setVersions((all) => [...all, { n, edits, changes, tweak: next.id }]);
        setViewing(n);
        setRedo([]);
      }
    },
    [latest, busy],
  );

  // Typed and slider changes go through the same checks as Claude's ops.
  const adjust = (e: Edit, { solid, ...fields }: Adjustment) => {
    if (!source) return;
    let next: Edit | undefined = e;
    if (Object.keys(fields).length) {
      const op: Op = { op: "update", kind: e.kind, id: e.id, start: -1, end: -1, at: -1, duration: -1, x: -1, y: -1, w: -1, h: -1, scale: -1, rate: -1, level: -1, text: "", sub: "", exact: fields.start !== undefined || fields.end !== undefined || fields.at !== undefined, ...fields };
      if (Object.values(fields).some((v) => typeof v === "number" && !Number.isFinite(v))) return setError("Enter a number of seconds, like 12.5.");
      const result = applyOps(latest.edits, [op], e.noteId ?? "", source.duration);
      if (result.rejected.length) return setError(`Couldn't change that: ${result.rejected[0].replace(/^\w+: /, "")}.`);
      next = result.edits.find((x) => x.id === e.id);
    }
    if (next && solid !== undefined && next.kind === "blur") next = { ...next, solid };
    setError(null);
    if (next) tweak(next);
  };

  const doExport = async () => {
    if (!player || !source) return;
    const w = Math.min(1280, source.width - (source.width % 2));
    const h = Math.round((source.height / source.width) * w / 2) * 2;
    setDownload(null);
    setError(null);
    setPin(null);
    const job = { w, h, n: latest.n, edits: latest.edits };
    setViewing(job.n);
    setSelected(null);
    player.setEdits(job.edits);
    setExporting(job);
    setBusy("Exporting… 0%");
    const ctrl = new AbortController();
    exportJob.current = ctrl;
    await new Promise((r) => setTimeout(r, 50)); // let the export canvas mount
    try {
      const { blob, ext } = await recordExport(player, exportRef.current!, (p) => setBusy(`Exporting… ${Math.round(p * 100)}%`), ctrl.signal);
      const base = source.name.replace(/\.[^.]+$/, "").replace(/^Sample: /, "").replace(/\s*\(.*?\)/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      setDownload({ url: URL.createObjectURL(blob), name: `${base}-yapified-v${job.n}.${ext}` });
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      exportJob.current = null;
      setExporting(null);
      setBusy(null);
    }
  };

  // Hold O (or the Original button) to see the untouched footage at this same moment.
  const peek = useCallback(
    (on: boolean) => {
      if (!player || exporting || on === peeking) return;
      const srcT = locate(player.segs, player.outT).srcT;
      player.pause();
      player.setEdits(on ? [] : viewEdits);
      player.seek(on ? srcT : srcToOut(player.segs, srcT));
      setPeeking(on);
    },
    [player, exporting, peeking, viewEdits],
  );

  useEffect(() => {
    const release = (e: KeyboardEvent) => e.key.toLowerCase() === "o" && peek(false);
    const lost = () => peek(false);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", lost);
    return () => {
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", lost);
    };
  }, [peek]);

  // Keyboard: Space play/pause, N note at the centre, arrows seek, Cmd/Ctrl+Enter apply, hold O for the original.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!source || !player) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        seek(player.outT + (e.key === "ArrowRight" ? 1 : -1) * (e.shiftKey ? 5 : 1));
      } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        void apply();
      } else if (e.key.toLowerCase() === "n" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        const r = canvasRef.current?.getBoundingClientRect();
        if (r) point(0.5, 0.5, r.width / 2, r.height / 2, r.width, r.height);
      } else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
        e.preventDefault();
        redoLast();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        undo();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selected && isLatest) {
        e.preventDefault();
        removeEdit(selected);
      } else if (e.key.toLowerCase() === "o" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (!e.repeat) peek(true);
      } else if (e.key === "Escape") {
        setPin(null);
        setSelected(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, player, togglePlay, seek, apply, point, undo, redoLast, removeEdit, selected, isLatest, peek]);


  (window as unknown as { __yap: unknown }).__yap = { player, versions, notes, source, footage };

  // On wide screens, scroll the side panel to the inspector when an edit is picked (the video stays put).
  useEffect(() => {
    if (selected && wide) requestAnimationFrame(() => document.querySelector(".side .inspector")?.scrollIntoView({ block: "nearest", behavior: "smooth" }));
  }, [selected, wide]);

  const inspector = selectedEdit && (
    <Inspector
      key={selectedEdit.id}
      edit={selectedEdit}
      srcT={ui.srcT}
      inView={!("start" in selectedEdit) || (ui.srcT >= selectedEdit.start - 0.05 && ui.srcT <= selectedEdit.end + 0.05)}
      onAdjust={(a) => adjust(selectedEdit, a)}
      onJump={() => pick(selectedEdit)}
      onClose={() => setSelected(null)}
    />
  );

  const length = player?.length ?? 0;
  const [theme, toggleTheme] = useTheme();
  const fmt = exportFormat();

  return (
    <div className="app">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => {
            if (!source || !confirm("Start over with a new video? Your notes and edits will be cleared.")) return;
            void clearProject();
            setSource(null);
            setSavedAt(null);
          }}
          disabled={!source}
        >
          <img className="logo-mark" src="/icon.svg" alt="" width={28} height={28} />
          Yapifier
        </button>
        {source && (
          <>
            <span className="file-chip" title={source.name}>
              {source.name}
            </span>
            {savedAt && (
              <span className="saved-chip" title="Notes, edits and versions are kept in this browser, so a refresh doesn't lose them">
                ✓ Saved
              </span>
            )}
            <div className="spacer" />
            <ol className="steps" aria-label="How it works">
              <li>
                <b>1</b> Pause
              </li>
              <li>
                <b>2</b> Click the spot
              </li>
              <li>
                <b>3</b> Hold <kbd>Fn</kbd> &amp; say it
              </li>
              <li>
                <b>4</b> Apply
              </li>
            </ol>
            {exporting ? (
              <button className="secondary small" onClick={() => exportJob.current?.abort()} title="Stop recording; nothing is saved">
                Stop export · {busy?.replace(/^Exporting… /, "")}
              </button>
            ) : (
              <button className="secondary small" disabled={!!busy || !fmt} onClick={() => void doExport()} title={fmt ? `Exports ${fmt.ext.toUpperCase()} with sound` : "Export needs Chrome or Edge"}>
                {`Export v${latest.n === 1 ? "" : latest.n}`.replace(/ v$/, "")}
              </button>
            )}
          </>
        )}
        {!source && <div className="spacer" />}
        <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"} title={theme === "dark" ? "Light mode" : "Dark mode"}>
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      {!source && (
        <Landing
          onFile={(f) => void openFile(f)}
          onSample={() => void openSample()}
          saved={saved}
          onResume={() => void resume()}
          onResumeFile={(f) => saved && void openFile(f, saved)}
          onDiscard={() => {
            void clearProject();
            setSaved(null);
          }}
          error={error}
          loading={opening || !player}
        />
      )}

      {source && player && (
        <main className="editor">
          <section className="player-col">
            <Stage
              player={player}
              aspect={source.width / source.height}
              notes={isLatest ? notes : []}
              exportCanvas={exportRef}
              canvasRef={canvasRef}
              onTick={(outT, srcT, playing) => setUi({ outT, srcT, playing })}
              onPoint={point}
              onPin={(id) => document.getElementById(`note-${id}`)?.scrollIntoView({ block: "nearest" })}
              showPins={!ui.playing}
              srcT={ui.srcT}
            >
              {pin && (
                <>
                  <div className="pin" style={{ left: pin.px, top: pin.py }} />
                  <NotePopover
                    key={`${pin.srcT}-${pin.x}`}
                    px={pin.px}
                    py={pin.py}
                    stageW={pin.stageW}
                    stageH={pin.stageH}
                    t={pin.srcT}
                    targetName="this spot"
                    onSave={saveNote}
                    onCancel={() => setPin(null)}
                  />
                </>
              )}
              {selectedEdit && isSpatial(selectedEdit) && !ui.playing && !exporting && !peeking && "start" in selectedEdit && ui.srcT >= selectedEdit.start - 0.05 && ui.srcT <= selectedEdit.end + 0.05 && (
                <EditHandles
                  edit={selectedEdit}
                  viewEdits={viewEdits}
                  srcT={ui.srcT}
                  onDraft={setDraft}
                  onCommit={(e) => {
                    setDraft(null);
                    tweak(e);
                  }}
                />
              )}
              {peeking && <div className="stage-banner">Original footage · let go to see your edit</div>}
              {exporting && <div className="stage-banner">Recording your edit in real time, with sound. Keep this tab open.</div>}
            </Stage>
            <div className="transport">
              <button className="play" onClick={togglePlay} aria-label={ui.playing ? "Pause" : "Play"} disabled={!!exporting}>
                {ui.playing ? "❚❚" : "▶"}
              </button>
              <button
                className="secondary small peek"
                onPointerDown={() => peek(true)}
                onPointerUp={() => peek(false)}
                onPointerLeave={() => peek(false)}
                disabled={!!exporting || latest.edits.length === 0}
                title="Hold to see the original footage at this moment (or hold O)"
              >
                ◐ Hold for original
              </button>
              <span className="clock">
                {formatTime(ui.outT)} <span className="muted">/ {formatTime(length)}</span>
              </span>
              {!isLatest && (
                <span className="viewing">
                  Viewing {shown.n === 1 ? "the original" : `v${shown.n}`} ·{" "}
                  <button className="link" onClick={() => setViewing(latest.n)}>
                    back to v{latest.n}
                  </button>{" "}
                  or{" "}
                  <button className="link" onClick={() => restore(shown.n)}>
                    restore this one
                  </button>
                </span>
              )}
              <span className="keys muted">
                <kbd>Space</kbd> play · <kbd>N</kbd> note · <kbd>←</kbd>
                <kbd>→</kbd> seek · <kbd>⌘</kbd>
                <kbd>↵</kbd> apply · <kbd>⌘</kbd>
                <kbd>Z</kbd> undo · hold <kbd>O</kbd> original
              </span>
            </div>
            <Timeline
              segs={player.segs}
              length={length}
              sourceDuration={source.duration}
              outT={ui.outT}
              thumbs={thumbs}
              peaks={peaks}
              edits={shown.edits}
              notes={isLatest ? notes : []}
              onSeek={seek}
              selected={isLatest ? selected : null}
              onPick={pick}
              theme={theme}
            />
            {!wide && inspector}
          </section>

          <aside className="side">
            <div className="panel notes-panel">
              <div className="panel-head">
                <h2>Notes</h2>
              </div>
              {notes.length ? (
                <NotesPanel
                  notes={notes}
                  edits={latest.edits}
                  onJump={(n) => seek(srcToOut(player.segs, n.srcT))}
                  onDelete={(id) => setNotes((all) => all.filter((n) => n.id !== id))}
                  onAnswer={(id, text, spoken) =>
                    setNotes((all) => all.map((n) => (n.id === id ? { ...n, answer: text, answerSpoken: spoken, status: "pending", reply: n.question ? `You were asked: ${n.question}` : n.reply } : n)))
                  }
                />
              ) : (
                <div className="empty">
                  <p>
                    Pause where something's off, <b>click the spot</b>, hold <kbd>Fn</kbd> and say what to change: “zoom in here”, “blur this email”, “cut this pause”, “add an intro card”.
                  </p>
                  {source.isSample && (
                    <button className="ghost" onClick={() => void loadSampleNotes()} disabled={!!busy}>
                      No mic? Load {SAMPLE_NOTES.length} sample notes
                    </button>
                  )}
                </div>
              )}
              <AgentLog steps={agentLog} running={!!busy?.startsWith("Applying")} />
              {pending.length > 0 && !busy && (
                <p className="sends muted small">Apply sends Yappy (powered by Claude) your note text, the frames you paused on, and any frames it checks. The video file stays in your browser.</p>
              )}
              {busy?.startsWith("Applying") ? (
                <button className="secondary" onClick={() => applyJob.current?.abort()}>
                  Stop Yappy
                </button>
              ) : (
                <button className="primary" disabled={!pending.length || !!busy} onClick={() => void apply()}>
                  {pending.length ? `Apply ${pending.length} note${pending.length > 1 ? "s" : ""}` : "Apply notes"}
                </button>
              )}
              {error && <p className="error">{error}</p>}
              {download && (
                <a className="download" href={download.url} download={download.name}>
                  ⬇ Download {download.name}
                </a>
              )}
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>Edits</h2>
                <div className="history">
                  <button className="secondary small" onClick={undo} disabled={versions.length < 2 || !!busy} title="Undo (⌘Z)">
                    ↶ Undo
                  </button>
                  <button className="secondary small" onClick={redoLast} disabled={!redo.length || !!busy} title="Redo (⇧⌘Z)">
                    ↷ Redo
                  </button>
                </div>
              </div>
              {shown.edits.length ? (
                <EditsList edits={shown.edits} selected={isLatest ? selected : null} removable={isLatest && !busy} onPick={pick} onRemove={removeEdit} />
              ) : (
                <p className="muted small edits-empty">{isLatest ? "No edits yet. Apply a note and each edit shows up here, with × to remove it." : "No edits in this version."}</p>
              )}
              {wide && inspector}
              {!isLatest && (
                <button className="primary restore" onClick={() => restore(shown.n)} disabled={!!busy}>
                  Restore {shown.n === 1 ? "the original" : `v${shown.n}`}
                </button>
              )}
              <VersionsPanel versions={versions} viewing={shown.n} onView={setViewing} locked={!!exporting} />
            </div>
          </aside>
        </main>
      )}

      <video ref={videoRef} className="hidden-video" playsInline crossOrigin="anonymous" />
      {exporting && <canvas ref={exportRef} width={exporting.w} height={exporting.h} className="hidden-canvas" />}
    </div>
  );
}
