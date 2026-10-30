import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import CommandBar, { type CommandResult } from "./components/CommandBar";
import EditHandles, { isSpatial } from "./components/EditHandles";
import ExportDialog from "./components/ExportDialog";
import Inspector, { type Adjustment } from "./components/Inspector";
import Landing from "./components/Landing";
import Modal from "./components/Modal";
import NotePopover from "./components/NotePopover";
import { AgentLog, EditsList, NotesPanel, VersionsPanel } from "./components/Panels";
import Stage from "./components/Stage";
import Timeline from "./components/Timeline";
import { runTool, type ToolCall } from "./edit/agent";
import { makeCaptions, rewrite, toSrt, wordsToCues } from "./edit/captions";
import { COMMAND_EXAMPLES, findMoment, isExact, parseCommands, type Command, type VersionRef } from "./edit/commands";
import { exportFormat, MAX_UPLOAD_MB, mediaEvent, readSource, recordExport, seekTo, snapshot, thumbnails, waveform } from "./edit/media";
import { applyOps, describe, type Op } from "./edit/ops";
import { Player } from "./edit/player";
import { toSource } from "./edit/render";
import { SAMPLE, SAMPLE_NOTES, SAMPLE_WORDS, sampleUrl } from "./edit/sample";
import { formatTime, locate, srcToOut } from "./edit/timeline";
import { settleSeeks, talk, toCommand, type Exchange, type TalkState } from "./edit/talk";
import { Footage, fitToFootage, type Keyframe } from "./edit/track";
import { transcribe } from "./edit/transcribe";
import type { AgentStep, Captions, Change, Edit, Note, Source, Version, Word } from "./edit/types";
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
  // The background export: which version, and how far along (0–1).
  const [exporting, setExporting] = useState<{ n: number; progress: number } | null>(null);
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
  const [dialog, setDialog] = useState<"export" | "restart" | null>(null);
  const commandRef = useRef<HTMLInputElement>(null);
  const [command, setCommand] = useState<CommandResult | null>(null); // the last spoken or typed command and what it did
  const peekTimer = useRef(0);
  const talkJob = useRef<AbortController | null>(null); // Yappy working out a spoken command
  const stripRef = useRef<Keyframe[]>([]); // the video's keyframes, once Yappy has needed them
  const recentRef = useRef<Exchange[]>([]); // the last few commands, so "no, the other one" makes sense
  const [captioning, setCaptioning] = useState<string | null>(null); // making captions: what it's doing now
  const captionJob = useRef<AbortController | null>(null); // so making captions can be stopped
  const [toast, setToast] = useState<{ text: string; detail?: string; id: number } | null>(null); // a short message over the video

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
  const aimingZoom = selectedEdit?.kind === "zoom" && !ui.playing;
  const viewEdits = useMemo(() => {
    let list = draft && isLatest ? shown.edits.map((e) => (e.id === draft.id ? draft : e)) : shown.edits;
    if (aimingZoom) list = list.filter((e) => e.id !== selected);
    return list;
  }, [shown.edits, draft, isLatest, aimingZoom, selected]);

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
        setCommand(null);
        talkJob.current?.abort();
        stripRef.current = [];
        recentRef.current = [];
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
    if (!player) return;
    setPin(null);
    if (player.playing) player.pause();
    else player.play();
  }, [player]);

  const seek = useCallback(
    (outT: number) => {
      if (!player) return;
      setPin(null);
      player.pause();
      player.seek(outT);
    },
    [player],
  );

  const point = useCallback(
    (ox: number, oy: number, px: number, py: number, stageW: number, stageH: number) => {
      if (!player) return;
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
    [player, selected, isLatest, shown.n, latest.n, ui.srcT],
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
  const apply = useCallback(async (only?: Note[]) => {
    const todo = only ?? pending;
    if (!player || !source || !footage || !todo.length || busy) return;
    const started = performance.now();
    const count = `${todo.length} note${todo.length > 1 ? "s" : ""}`;
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
      for (let k = 0; k < todo.length; k += MAX_NOTES_PER_RUN) batches.push(todo.slice(k, k + MAX_NOTES_PER_RUN));
      let edits: Edit[] = latest.edits;
      const changes: Change[] = [];
      const outcome = new Map<string, Pick<Note, "status" | "reply" | "question">>();
      for (const [b, batch] of batches.entries()) {
        const what = `${batch.length} note${batch.length > 1 ? "s" : ""}`;
        step({ kind: "read", text: `Reading ${what} and the frames you paused on`, detail: batches.length > 1 ? `batch ${b + 1} of ${batches.length}` : undefined });
        const request = {
          source: { duration: source.duration, width: source.width, height: source.height },
          edits,
          // A note said without clicking has no spot (-1); the agent finds what it means in the frame.
          notes: batch.map(({ id, srcT, x, y, unpinned, text, frame, question, answer }) => ({ id, srcT, x: unpinned ? -1 : x, y: unpinned ? -1 : y, text, frame, question, answer })),
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
      const pinnedAt = new Map(todo.map((n) => [n.id, n.srcT]));
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
      const sent = new Set(todo.map((n) => n.id));
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

  // A finished file goes straight to the browser's Downloads (saying "export v3"
  // should end with the file on disk, not another click); the link stays to save it again.
  const deliver = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    setDownload({ url, name });
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    showToast("Saved to your Downloads", name);
  };

  // Export any version in the background: it records from its own hidden player,
  // so you can keep watching, editing and applying notes meanwhile.
  const doExport = async (n: number) => {
    const version = versions.find((v) => v.n === n);
    if (!player || !source || !version || exporting) return;
    const audioContext = player.audioContext(); // during the click, so the browser lets it play
    const width = Math.min(1280, source.width - (source.width % 2));
    const height = Math.round((source.height / source.width) * width / 2) * 2;
    setDownload(null);
    setError(null);
    setExporting({ n: version.n, progress: 0 });
    const ctrl = new AbortController();
    exportJob.current = ctrl;
    try {
      const { blob, ext } = await recordExport(
        { url: source.url, duration: source.duration, edits: version.edits, width, height, audioContext },
        (progress) => setExporting({ n: version.n, progress }),
        ctrl.signal,
      );
      const base = source.name.replace(/\.[^.]+$/, "").replace(/^Sample: /, "").replace(/\s*\(.*?\)/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      deliver(blob, `${base}-yapified-${version.n === 1 ? "original" : `v${version.n}`}.${ext}`);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      exportJob.current = null;
      setExporting(null);
    }
  };

  // Captions: the sample's words were transcribed ahead of time; an upload is
  // transcribed here in the browser. They land as a new version on top of the
  // latest one (it may have moved on while Whisper was listening), and a
  // language asked for is handed to Yappy to translate the lines.
  const versionsRef = useRef(versions);
  versionsRef.current = versions;
  const addCaptions = async (lang?: string) => {
    if (!source || captioning) return;
    setCaptioning(source.isSample ? "Adding captions" : "Transcribing in the background");
    setError(null);
    if (!source.isSample) showToast("Making captions in the background", "Keep watching: they appear on their own when ready");
    const ctrl = new AbortController();
    captionJob.current = ctrl;
    try {
      const words: Word[] = source.isSample ? SAMPLE_WORDS : await transcribe(source.url, setCaptioning, ctrl.signal);
      const cues = wordsToCues(words);
      if (!cues.length) throw new Error("No speech was found to caption.");
      const all = versionsRef.current;
      const last = all[all.length - 1];
      const n = last.n + 1;
      // A low-priority update: the video keeps its frames while the editor takes in the new version.
      startTransition(() => {
        setVersions([...all, { n, edits: [...last.edits.filter((e) => e.kind !== "captions"), makeCaptions(cues)], changes: [{ noteId: "", label: `Captions added (${cues.length} lines)` }] }]);
        setViewing(n);
        setRedo([]);
      });
      showToast("Captions added", `${cues.length} lines · click CC to style or fix them`);
      if (lang) {
        await new Promise((ready) => setTimeout(ready, 50)); // let the editor show the new version first
        await askYappyRef.current(`Translate every caption line to ${lang}.`, false);
      }
    } catch (e) {
      if (ctrl.signal.aborted) showToast("Captions stopped", "Click CC to start again");
      else {
        const message = e instanceof Error ? e.message : String(e);
        setError(message);
        showToast("Captions didn't finish", "Click CC to try again");
      }
    } finally {
      captionJob.current = null;
      setCaptioning(null);
    }
  };

  // A short message over the video that fades out by itself.
  const showToast = (text: string, detail?: string) => {
    const id = Date.now();
    setToast({ text, detail, id });
    setTimeout(() => setToast((t) => (t?.id === id ? null : t)), 2400);
  };

  // The captions as a subtitle file, timed to the version on screen.
  const downloadSrt = () => {
    if (!source) return;
    const srt = toSrt(shown.edits, source.duration);
    if (!srt) return;
    const base = source.name.replace(/\.[^.]+$/, "").replace(/^Sample: /, "").replace(/\s*\(.*?\)/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
    deliver(new Blob([srt], { type: "application/x-subrip" }), `${base}-${shown.n === 1 ? "original" : `v${shown.n}`}.srt`);
  };

  // Hold O (or the Original button) to see the untouched footage at this moment.
  // Only the picture swaps: the edited timeline keeps running (or stays paused)
  // underneath, so letting go never moves the playhead or stops playback.
  const peek = useCallback(
    (on: boolean) => {
      if (!player || on === peeking) return;
      player.showOriginal = on;
      setPeeking(on);
    },
    [player, peeking],
  );

  useEffect(() => {
    const release = (e: KeyboardEvent) => e.key.toLowerCase() === "o" && peek(false);
    const lost = () => peek(false);
    window.addEventListener("keyup", release);
    window.addEventListener("blur", lost);
    document.addEventListener("visibilitychange", lost);
    return () => {
      window.removeEventListener("keyup", release);
      window.removeEventListener("blur", lost);
      document.removeEventListener("visibilitychange", lost);
    };
  }, [peek]);

  // One command, from the parser or from Yappy: does it and says what it did,
  // in a few words. `wait` is set when it started an apply that later commands
  // should wait for ("blur the email, then export").
  const execute = async (c: Command, spoken: boolean): Promise<{ ok: boolean; text: string; wait?: Promise<unknown> }> => {
    if (!player || !source || !footage) return { ok: false, text: "Open a video first." };
    const ok = (text: string, wait?: Promise<unknown>) => ({ ok: true, text, wait });
    const fail = (text: string) => ({ ok: false, text });
    const name = (n: number) => (n === 1 ? "the original" : `v${n}`);
    const find = (ref: VersionRef) => (ref === "current" ? shown : ref === "latest" ? latest : versions.find((v) => v.n === ref));
    const missing = (ref: VersionRef) => `There's no ${typeof ref === "number" ? `v${ref}` : "such version"}; the latest is v${latest.n}.`;
    switch (c.kind) {
      case "help":
        return ok(`Say ${COMMAND_EXAMPLES.map((q) => `“${q}”`).join(", ")}, or just say what you want.`);
      case "play":
        setPin(null);
        player.play();
        return ok("Playing");
      case "pause":
        player.pause();
        return ok(`Paused at ${formatTime(player.outT)}`);
      case "nudge": {
        const to = Math.max(0, Math.min(player.length, player.outT + c.by));
        seek(to);
        return ok(`${c.by < 0 ? "Back" : "Forward"} ${Math.abs(c.by)} s, at ${formatTime(to)}`);
      }
      case "seek": {
        const to = c.to;
        let outT: number;
        let what = "";
        if ("time" in to) {
          outT = to.time;
          if (to.time > player.length) what = ` (the video is ${formatTime(player.length)} long)`;
        } else if ("src" in to) outT = srcToOut(player.segs, to.src);
        else if ("here" in to) outT = player.outT;
        else if ("edge" in to) outT = to.edge === "start" ? 0 : player.length;
        else if ("step" in to) {
          const times = (isLatest ? notes : []).map((n) => srcToOut(player.segs, n.srcT)).sort((a, b) => a - b);
          const now = player.outT;
          const t = to.step === "first" ? times[0] : to.step === "last" ? times[times.length - 1] : to.step === "next" ? times.find((x) => x > now + 0.05) : [...times].reverse().find((x) => x < now - 0.05);
          if (t === undefined) return fail(times.length ? `There's no ${to.step} note.` : "There are no notes yet.");
          outT = t;
        } else {
          const found = findMoment(to.what, isLatest ? notes : [], shown.edits);
          if (!found) return fail(`Couldn't find “${to.what}” in your notes or edits.`);
          // Playing from a moment starts a second early, so you see it arrive.
          outT = srcToOut(player.segs, found.srcT) - (c.play ? 1 : 0);
          what = ` · ${found.label}`;
        }
        const at = Math.max(0, Math.min(player.length, outT));
        seek(at);
        if (c.play) player.play();
        return ok(`${c.play ? "Playing from" : "At"} ${formatTime(at)}${what}`);
      }
      case "apply": {
        const todo = c.ids ? pending.filter((n) => c.ids!.includes(n.id)) : pending;
        if (busy) return fail("Yappy is already working.");
        if (!todo.length) return fail(c.ids ? "Those notes aren't waiting to be applied." : "No notes are waiting. Say what to change, or click the video to leave a note.");
        return ok(`Applying ${todo.length} note${todo.length > 1 ? "s" : ""}…`, apply(c.ids ? todo : undefined));
      }
      case "undo":
        if (busy) return fail("Wait for Yappy to finish first.");
        if (versions.length < 2) return fail("Nothing to undo.");
        undo();
        return ok(`Undid v${latest.n}`);
      case "redo": {
        const last = redo[redo.length - 1];
        if (busy) return fail("Wait for Yappy to finish first.");
        if (!last) return fail("Nothing to redo.");
        redoLast();
        return ok(`Redid v${last.version.n}`);
      }
      case "view": {
        const v = find(c.version);
        if (!v) return fail(missing(c.version));
        setViewing(v.n);
        setSelected(null);
        return ok(`Showing ${name(v.n)}`);
      }
      case "restore": {
        const v = find(c.version);
        if (!v) return fail(missing(c.version));
        if (busy) return fail("Wait for Yappy to finish first.");
        if (v.n === latest.n) return fail(`${name(v.n)} is already the latest.`);
        restore(v.n);
        return ok(`Restored ${name(v.n)} as v${latest.n + 1}`);
      }
      case "export": {
        const v = find(c.version);
        if (!v) return fail(missing(c.version));
        if (!exportFormat()) return fail("Export needs Chrome or Edge.");
        if (exporting) return fail("An export is already running.");
        void doExport(v.n);
        return ok(`Exporting ${name(v.n)} in the background`);
      }
      case "original":
        if (!shown.edits.length) return fail("There are no edits yet, so this is the original.");
        peek(true);
        clearTimeout(peekTimer.current);
        peekTimer.current = window.setTimeout(() => {
          player.showOriginal = false;
          setPeeking(false);
        }, 3000);
        return ok("Original footage for 3 seconds");
      case "remove": {
        if (!isLatest) return fail(`Switch to v${latest.n} to remove edits.`);
        if (busy) return fail("Wait for Yappy to finish first.");
        if (c.ids) {
          const gone = latest.edits.filter((e) => c.ids!.includes(e.id));
          if (!gone.length) return fail("Those edits aren't in this version.");
          commit(latest.edits.filter((e) => !gone.includes(e)), gone.length === 1 ? `Removed: ${describe(gone[0])}` : `Removed ${gone.length} edits`);
          setSelected(null);
          return ok(gone.length === 1 ? `Removed: ${describe(gone[0])}` : `Removed ${gone.length} edits`);
        }
        const pointed = /^(?:this|it|that)(?: edit| one)?$|^(?:the )?selected(?: edit| one)?$/.test(c.what);
        const target = pointed ? latest.edits.find((e) => e.id === selected) : findMoment(c.what, [], latest.edits)?.edit;
        if (!target) return fail(pointed ? "Pick an edit first, or say which one: “remove the blur”." : `No edit matches “${c.what}”.`);
        removeEdit(target.id);
        return ok(`Removed: ${describe(target)}`);
      }
      case "captions": {
        if (!isLatest) return fail(`Switch to v${latest.n} to change captions.`);
        const cap = latest.edits.find((e): e is Captions => e.kind === "captions");
        const swap = (next: Captions, label: string) => commit(latest.edits.map((e) => (e === cap ? next : e)), label);
        if (c.op === "add") {
          if (cap && !c.lang) return ok("Captions are already on. Say how to change them, or click CC.");
          if (cap) return ok(`Translating the captions to ${c.lang}…`, askYappyRef.current(`Translate every caption line to ${c.lang}.`, false));
          if (captioning) return fail("Captions are already being made.");
          return ok(source.isSample ? "Adding captions…" : "Transcribing in your browser…", addCaptions(c.lang));
        }
        if (!cap) return fail("There are no captions yet. Say “add captions”.");
        if (c.op === "remove") {
          commit(latest.edits.filter((e) => e !== cap), "Removed captions");
          return ok("Captions removed");
        }
        if (c.op === "style") {
          const next = { ...cap, style: c.style ?? cap.style, position: c.position ?? cap.position, size: Math.round(Math.min(1.8, Math.max(0.6, c.size ?? cap.size)) * 10) / 10 };
          swap(next, `Captions: ${next.style}, ${next.position}, ${Math.round(next.size * 100)}%`);
          return ok(`Captions now ${next.style}, at the ${next.position}, ${Math.round(next.size * 100)}% size`);
        }
        if (!c.lines?.length) return fail("Say which caption lines to change.");
        swap(rewrite(cap, c.lines, c.lang), c.lang && c.lang !== cap.lang ? `Captions in ${c.lang}` : `Captions: fixed ${c.lines.length} line${c.lines.length > 1 ? "s" : ""}`);
        return ok(c.lang && c.lang !== cap.lang ? `Captions translated to ${c.lang}` : `Fixed ${c.lines.length} caption line${c.lines.length > 1 ? "s" : ""}`);
      }
      case "note": {
        if (!isLatest) return fail(`Switch to v${latest.n} to ${c.now ? "make changes" : "leave notes"}.`);
        player.pause();
        // Said without clicking, so there's no spot: the editor's agent finds what it means in the frame.
        const here = locate(player.segs, player.outT).srcT;
        const srcT = c.at !== undefined && Number.isFinite(c.at) ? Math.max(0, Math.min(source.duration, c.at)) : here;
        const frame = Math.abs(srcT - here) < 0.1 && canvasRef.current ? snapshot(canvasRef.current) : await footage.frame(srcT, 640);
        const note: Note = { id: newId(), outT: srcToOut(player.segs, srcT), srcT, x: 0.5, y: 0.5, unpinned: true, text: c.text, spoken, frame, author: "You", status: "pending" };
        setNotes((all) => [...all, note]);
        if (!c.now) return ok(`Note added at ${formatTime(note.outT)}. Say “apply” when you're ready.`);
        if (busy) return ok("Added as a note; it'll wait until Yappy finishes the current apply.");
        return ok(`Making the change at ${formatTime(note.outT)}…`, apply([note]));
      }
    }
  };

  // Always the latest render's execute, for commands that run after a wait.
  const executeRef = useRef(execute);
  executeRef.current = execute;

  // Runs a list of commands in order, stopping at the first that can't be done.
  // After an apply, the next command waits for it and for the editor to catch up.
  const runAll = async (commands: Command[], spoken: boolean): Promise<{ ok: boolean; text: string }> => {
    const done: string[] = [];
    for (const [i, c] of commands.entries()) {
      const r = await executeRef.current(c, spoken);
      done.push(r.text);
      if (!r.ok) return { ok: false, text: done.join(" · ") };
      if (r.wait && i < commands.length - 1) {
        await r.wait;
        await new Promise((ready) => setTimeout(ready, 50));
      }
    }
    return { ok: true, text: done.join(" · ") };
  };

  const remember = (said: string, did: string) => (recentRef.current = [...recentRef.current, { said, did }].slice(-3));

  // The editor as Yappy sees it: a few numbers and lines, never the video.
  const talkState = (): TalkState | null =>
    player && source
      ? {
          clock: player.outT,
          length: player.length,
          playing: player.playing,
          duration: source.duration,
          viewing: shown.n,
          latest: latest.n,
          selected: isLatest ? selected : null,
          versions: versions.map((v) => ({ n: v.n, label: v.changes.map((c) => c.label).join("; ") })),
          notes: (isLatest ? notes : []).map(({ id, srcT, text, status }) => ({ id, at: srcT, text, status })),
          edits: shown.edits,
          map: player.segs.map((s) => (s.type === "play" ? { clock: [s.out0, s.out1], video: [s.src0, s.src1], rate: s.rate } : { clock: [s.out0, s.out1], hold: s.edit.kind, at: s.src })),
        }
      : null;

  // Anything the parser can't be sure of goes to Yappy, which answers with commands.
  const askYappy = async (said: string, spoken: boolean) => {
    const state = talkState();
    if (!state || !footage) return;
    talkJob.current?.abort();
    const ctrl = new AbortController();
    talkJob.current = ctrl;
    const status = (text: string) => !ctrl.signal.aborted && setCommand({ said, ok: true, text: `${text}…`, pending: true });
    status("Yappy is on it");
    try {
      const answer = await talk({ said, state, recent: recentRef.current, strip: stripRef.current }, footage, ctrl.signal, status, (strip) => (stripRef.current = strip));
      if (ctrl.signal.aborted) return;
      const seen = answer.looked ? ` (Yappy looked at ${answer.looked} keyframes of your video)` : "";
      if (answer.question) {
        remember(said, `asked: ${answer.question}`);
        return setCommand({ said, ok: true, text: answer.question + seen, choices: answer.choices.slice(0, 4) });
      }
      const commands = settleSeeks(answer.actions, stripRef.current).map(toCommand).filter((c): c is Command => c !== null);
      const r = commands.length ? await runAll(commands, spoken) : { ok: !!answer.reply, text: "" };
      if (ctrl.signal.aborted) return;
      // Yappy's own words when it gave some; what the editor did only adds a step that failed.
      const text = (r.ok ? answer.reply || r.text : [answer.reply, r.text].filter(Boolean).join(" · ")) || "Yappy didn't find anything to do for that.";
      remember(said, text);
      setCommand({ said, ok: r.ok, text: text + seen });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setCommand({ said, ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      if (talkJob.current === ctrl) talkJob.current = null;
    }
  };

  const askYappyRef = useRef(askYappy);
  askYappyRef.current = askYappy;

  // Exact commands run at once; everything else goes to Yappy.
  const runCommand = (said: string, spoken: boolean) => {
    const commands = parseCommands(said);
    if (!commands || !commands.every(isExact)) return void askYappy(said, spoken);
    talkJob.current?.abort(); // a newer command wins over one Yappy is still thinking about
    void runAll(commands, spoken).then((r) => {
      remember(said, r.text);
      setCommand({ said, ok: r.ok, text: r.text });
    });
  };

  // A dictation that lands with nothing focused is taken as a command too.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!source || dialog) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT" || el.isContentEditable)) return;
      const said = e.clipboardData?.getData("text/plain").trim();
      if (!said) return;
      e.preventDefault();
      runCommand(said, true);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  // Keyboard: Space play/pause, N note at the centre, arrows seek, Cmd/Ctrl+Enter apply, hold O for the original, / for a command.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!source || !player || dialog) return;
      const target = e.target as HTMLElement;
      // The command bar lets Space and the arrows through while it's empty.
      const passed = target.dataset.passKeys !== undefined && !(target as HTMLInputElement).value && [" ", "ArrowLeft", "ArrowRight"].includes(e.key);
      if ((target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) && !passed) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        commandRef.current?.focus();
      } else if (e.key === " ") {
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
  }, [source, player, dialog, togglePlay, seek, apply, point, undo, redoLast, removeEdit, selected, isLatest, peek]);


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
      onReplace={tweak}
      onSrt={downloadSrt}
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
            if (source) setDialog("restart");
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
              <button className="secondary small exporting" onClick={() => exportJob.current?.abort()} title="Exporting in the background; click to stop (nothing is saved)">
                <span className="export-bar" style={{ width: `${Math.round(exporting.progress * 100)}%` }} aria-hidden />
                <span>
                  Exporting {exporting.n === 1 ? "original" : `v${exporting.n}`} · {Math.round(exporting.progress * 100)}% · Stop
                </span>
              </button>
            ) : (
              <button className="secondary small" disabled={!fmt} onClick={() => setDialog("export")} title={fmt ? `Export any version as ${fmt.ext.toUpperCase()} with sound` : "Export needs Chrome or Edge"}>
                Export
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
              notes={isLatest ? notes.filter((n) => !n.unpinned) : []}
              canvasRef={canvasRef}
              onTick={(outT, srcT, playing) => setUi({ outT, srcT, playing })}
              onPoint={point}
              onPin={(id) => document.getElementById(`note-${id}`)?.scrollIntoView({ block: "nearest" })}
              showPins={!ui.playing && !peeking}
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
              {selectedEdit && isSpatial(selectedEdit) && !ui.playing && !peeking && "start" in selectedEdit && ui.srcT >= selectedEdit.start - 0.05 && ui.srcT <= selectedEdit.end + 0.05 && (
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
              {toast && (
                <div key={toast.id} className="toast" role="status">
                  <b>{toast.text}</b>
                  {toast.detail && <span>{toast.detail}</span>}
                </div>
              )}
            </Stage>
            <div className="transport">
              <button className="play" onClick={togglePlay} aria-label={ui.playing ? "Pause" : "Play"}>
                {ui.playing ? "❚❚" : "▶"}
              </button>
              <button
                className="secondary small peek"
                onPointerDown={(e) => {
                  try {
                    e.currentTarget.setPointerCapture(e.pointerId); // a release anywhere still reaches the button
                  } catch {
                    // no live pointer to capture (synthetic event); keyup, blur and pointerup still release
                  }
                  peek(true);
                }}
                onPointerUp={() => peek(false)}
                onPointerCancel={() => peek(false)}
                onLostPointerCapture={() => peek(false)}
                disabled={latest.edits.length === 0}
                title="Hold to see the original footage at this moment (or hold O)"
              >
                ◐ Hold for original
              </button>
              <button
                className="secondary small"
                disabled={!captioning && !!busy}
                onClick={() => {
                  if (captioning) return captionJob.current?.abort(); // the button stops it while it works
                  const cap = latest.edits.find((e) => e.kind === "captions");
                  if (cap) {
                    if (!isLatest) setViewing(latest.n);
                    pick(cap);
                  } else void addCaptions();
                }}
                title={captioning ? "Stop making captions" : source.isSample ? "Captions from the voiceover" : "Captions from the speech, transcribed in your browser: the audio never leaves it"}
              >
                {captioning ? `${captioning}… · Stop` : latest.edits.some((e) => e.kind === "captions") ? "CC Captions" : "CC Add captions"}
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
                <kbd>Z</kbd> undo · hold <kbd>O</kbd> original · <kbd>/</kbd> command
              </span>
            </div>
            <CommandBar inputRef={commandRef} result={command} onRun={runCommand} />
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
                <p className="sends muted small">Apply sends Yappy your note text, the frames you paused on, and any frames it checks. The video file stays in your browser.</p>
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
                <a className="download" href={download.url} download={download.name} title="It's in your Downloads already; this saves another copy">
                  ⬇ Download again: {download.name}
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
              <VersionsPanel versions={versions} viewing={shown.n} onView={setViewing} />
            </div>
          </aside>
        </main>
      )}

      {dialog === "restart" && (
        <Modal
          title="Start over?"
          onClose={() => setDialog(null)}
          actions={
            <>
              <button className="secondary" onClick={() => setDialog(null)}>
                Keep editing
              </button>
              <button
                className="primary danger"
                onClick={() => {
                  setDialog(null);
                  exportJob.current?.abort();
                  player?.pause();
                  void clearProject();
                  setSource(null);
                  setSavedAt(null);
                }}
              >
                Start over
              </button>
            </>
          }
        >
          <p>
            You'll go back to the start page to open a new video. The notes, edits and versions for <b>{source?.name}</b> will be cleared from this browser.
          </p>
        </Modal>
      )}
      {dialog === "export" && source && fmt && (
        <ExportDialog
          versions={versions}
          initial={shown.n}
          duration={source.duration}
          format={fmt.ext.toUpperCase()}
          onClose={() => setDialog(null)}
          onExport={(n) => {
            setDialog(null);
            void doExport(n);
          }}
        />
      )}
      <video ref={videoRef} className="hidden-video" playsInline crossOrigin="anonymous" />
    </div>
  );
}
