import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Landing from "./components/Landing";
import NotePopover from "./components/NotePopover";
import { NotesPanel, VersionsPanel } from "./components/Panels";
import Stage from "./components/Stage";
import Timeline from "./components/Timeline";
import { exportFormat, MAX_UPLOAD_MB, readSource, recordExport, snapshot, thumbnails, waveform } from "./edit/media";
import { applyOps, type Op } from "./edit/ops";
import { Player } from "./edit/player";
import { toSource } from "./edit/render";
import { SAMPLE, SAMPLE_NOTES } from "./edit/sample";
import { formatTime, srcToOut } from "./edit/timeline";
import type { Change, Edit, Note, Source, Version } from "./edit/types";

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
  const [pin, setPin] = useState<PendingPin | null>(null);
  const [ui, setUi] = useState({ outT: 0, srcT: 0, playing: false });
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [peaks, setPeaks] = useState<Float32Array | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<{ url: string; name: string } | null>(null);
  const [exporting, setExporting] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    if (videoRef.current && !player) setPlayer(new Player(videoRef.current));
  }, [player]);

  const latest = versions[versions.length - 1];
  const shown = versions.find((v) => v.n === viewing) ?? latest;
  const isLatest = shown.n === latest.n;
  const pending = notes.filter((n) => n.status === "pending");

  useEffect(() => {
    player?.setEdits(shown.edits);
  }, [player, shown]);

  const open = useCallback(
    async (url: string, name: string, isSample: boolean) => {
      if (!player) return;
      setOpening(true);
      setError(null);
      try {
        const src = await readSource(url, name, isSample);
        player.pause();
        player.video.src = url;
        player.video.preload = "auto";
        player.load(src.duration, []);
        player.seek(0);
        setVersions([{ n: 1, edits: [], changes: [] }]);
        setViewing(1);
        setNotes([]);
        setPin(null);
        setDownload(null);
        setThumbs([]);
        setPeaks(null);
        setSource(src);
        void thumbnails(url, src.duration, 24).then(setThumbs);
        void waveform(url).then(setPeaks);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setOpening(false);
      }
    },
    [player],
  );

  const openFile = (file: File) => {
    if (!file.type.startsWith("video/")) return setError("That isn't a video file. Try an MP4 or WebM.");
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return setError(`Please use a video under ${MAX_UPLOAD_MB} MB.`);
    void open(URL.createObjectURL(file), file.name, false);
  };

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
      if (!isLatest) {
        setError(`You're looking at ${shown.n === 1 ? "the original" : `v${shown.n}`}. Switch to v${latest.n} to leave notes.`);
        return;
      }
      player.pause();
      const srcT = ui.srcT;
      const at = toSource(player.edits, srcT, ox, oy);
      setPin({ outT: player.outT, srcT, x: at.x, y: at.y, px, py, stageW, stageH });
    },
    [player, exporting, isLatest, shown.n, latest.n, ui.srcT],
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
    const v = document.createElement("video");
    v.muted = true;
    v.src = source.url;
    await new Promise<void>((r) => (v.onloadeddata = () => r()));
    const c = document.createElement("canvas");
    c.width = 640;
    c.height = Math.round((source.height / source.width) * 640);
    const made: Note[] = [];
    for (const s of SAMPLE_NOTES) {
      v.currentTime = s.srcT;
      await new Promise<void>((r) => (v.onseeked = () => r()));
      c.getContext("2d")!.drawImage(v, 0, 0, c.width, c.height);
      made.push({ ...s, id: newId(), outT: srcToOut(player.segs, s.srcT), spoken: false, author: "Sample", status: "pending", frame: c.toDataURL("image/jpeg", 0.72) });
    }
    setNotes((all) => [...all, ...made]);
    setBusy(null);
  };

  const apply = useCallback(async () => {
    if (!player || !source || !pending.length || busy) return;
    setBusy(`Applying ${pending.length} note${pending.length > 1 ? "s" : ""}…`);
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          source: { duration: source.duration, width: source.width, height: source.height },
          edits: latest.edits,
          notes: pending.map(({ id, srcT, x, y, text, frame, question, answer }) => ({ id, srcT, x, y, text, frame, question, answer })),
        }),
      });
      const data = await res.json().catch(() => ({ error: "The server sent back something unreadable." }));
      if (!res.ok) throw new Error(data.error ?? `Apply failed (${res.status}).`);

      let edits: Edit[] = latest.edits;
      const changes: Change[] = [];
      const outcome = new Map<string, Pick<Note, "status" | "reply" | "question">>();
      for (const r of data.results as ApplyResult[]) {
        const result = applyOps(edits, r.ops ?? [], r.noteId, source.duration);
        edits = result.edits;
        changes.push(...result.changes);
        const skipped = result.rejected.length ? `Skipped: ${result.rejected.join("; ")}.` : "";
        const question = [r.question, skipped].filter(Boolean).join(" ");
        const reply = [result.changes.length ? r.summary : "", question || (result.changes.length ? "" : "Nothing could be changed for this note.")].filter(Boolean).join(" ");
        outcome.set(r.noteId, { status: question || !result.changes.length ? "question" : "applied", reply, question: question || undefined });
      }
      setNotes((all) => all.map((n) => (outcome.has(n.id) ? { ...n, ...outcome.get(n.id)! } : n.status === "pending" ? { ...n, status: "failed", reply: "No answer came back for this note." } : n)));
      if (changes.length) {
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
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }, [player, source, pending, busy, latest]);

  const doExport = async () => {
    if (!player || !source) return;
    const w = Math.min(1280, source.width - (source.width % 2));
    const h = Math.round((source.height / source.width) * w / 2) * 2;
    setDownload(null);
    setError(null);
    setPin(null);
    setViewing(latest.n);
    player.setEdits(latest.edits);
    setExporting({ w, h });
    await new Promise((r) => setTimeout(r, 50)); // let the export canvas mount
    try {
      const { blob, ext } = await recordExport(player, exportRef.current!, (p) => setBusy(`Exporting… ${Math.round(p * 100)}%`));
      const base = source.name.replace(/\.[^.]+$/, "").replace(/^Sample: /, "").replace(/\s*\(.*?\)/g, "").replace(/[^\w-]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
      setDownload({ url: URL.createObjectURL(blob), name: `${base}-yapified-v${latest.n}.${ext}` });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setExporting(null);
      setBusy(null);
    }
  };

  // Keyboard: Space play/pause, N note at the centre, arrows seek, Cmd/Ctrl+Enter apply.
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
        const r = canvasRef.current?.getBoundingClientRect();
        if (r) point(0.5, 0.5, r.width / 2, r.height / 2, r.width, r.height);
      } else if (e.key === "Escape") setPin(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, player, togglePlay, seek, apply, point]);

  const spokenShare = useMemo(() => {
    const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const total = notes.reduce((sum, n) => sum + words(n.text) + words(n.answer ?? ""), 0);
    const spoken = notes.reduce((sum, n) => sum + (n.spoken ? words(n.text) : 0) + (n.answerSpoken ? words(n.answer ?? "") : 0), 0);
    return total ? Math.round((spoken / total) * 100) : null;
  }, [notes]);

  (window as unknown as { __yap: unknown }).__yap = { player, versions, notes, source };

  const length = player?.length ?? 0;
  const fmt = exportFormat();

  return (
    <div className="app">
      <header className="topbar">
        <button className="brand" onClick={() => source && confirm("Start over with a new video? Your notes will be cleared.") && setSource(null)} disabled={!source}>
          <img className="logo-mark" src="/icon.svg" alt="" width={28} height={28} />
          Yapifier
        </button>
        {source && (
          <>
            <span className="file-chip" title={source.name}>
              {source.name}
            </span>
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
            <button className="secondary small" disabled={!!busy || !fmt} onClick={doExport} title={fmt ? `Exports ${fmt.ext.toUpperCase()} with sound` : "Export needs Chrome or Edge"}>
              {busy?.startsWith("Exporting") ? busy : `Export v${latest.n === 1 ? "" : latest.n}`.replace(/ v$/, "")}
            </button>
          </>
        )}
      </header>

      {!source && <Landing onFile={openFile} onSample={() => void open(SAMPLE.url, SAMPLE.name, true)} error={error} loading={opening || !player} />}

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
              {exporting && <div className="stage-banner">Recording your edit in real time, with sound. Keep this tab open.</div>}
            </Stage>
            <div className="transport">
              <button className="play" onClick={togglePlay} aria-label={ui.playing ? "Pause" : "Play"} disabled={!!exporting}>
                {ui.playing ? "❚❚" : "▶"}
              </button>
              <span className="clock">
                {formatTime(ui.outT)} <span className="muted">/ {formatTime(length)}</span>
              </span>
              {!isLatest && (
                <span className="viewing">
                  Viewing {shown.n === 1 ? "the original" : `v${shown.n}`} ·{" "}
                  <button className="link" onClick={() => setViewing(latest.n)}>
                    back to v{latest.n}
                  </button>
                </span>
              )}
              <span className="keys muted">
                <kbd>Space</kbd> play · <kbd>N</kbd> note · <kbd>←</kbd>
                <kbd>→</kbd> seek · <kbd>⌘</kbd>
                <kbd>↵</kbd> apply
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
            />
          </section>

          <aside className="side">
            <div className="panel notes-panel">
              <div className="panel-head">
                <h2>Notes</h2>
                {spokenShare !== null && <span className="chip chip-voice">{spokenShare}% spoken with Flow</span>}
              </div>
              {notes.length ? (
                <NotesPanel
                  notes={notes}
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
              <button className="primary" disabled={!pending.length || !!busy} onClick={() => void apply()}>
                {busy?.startsWith("Applying") ? busy : pending.length ? `Apply ${pending.length} note${pending.length > 1 ? "s" : ""}` : "Apply notes"}
              </button>
              {error && <p className="error">{error}</p>}
              {download && (
                <a className="download" href={download.url} download={download.name}>
                  ⬇ Download {download.name}
                </a>
              )}
            </div>
            <div className="panel">
              <div className="panel-head">
                <h2>Versions</h2>
                <span className="muted small">{latest.edits.length} edits</span>
              </div>
              <VersionsPanel versions={versions} viewing={shown.n} onView={setViewing} />
            </div>
          </aside>
        </main>
      )}

      <video ref={videoRef} className="hidden-video" playsInline crossOrigin="anonymous" />
      {exporting && <canvas ref={exportRef} width={exporting.w} height={exporting.h} className="hidden-canvas" />}
    </div>
  );
}
