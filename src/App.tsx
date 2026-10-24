import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import NotePopover from "./components/NotePopover";
import { NotesPanel, Timeline, VersionsPanel } from "./components/Panels";
import Stage from "./components/Stage";
import { applyEdits, type Edit } from "./engine/edits";
import { canExport, exportMp4 } from "./engine/export";
import { hitTest, loadAssets } from "./engine/render";
import { filmDuration, formatTime, sceneAt, sceneStart } from "./engine/timing";
import type { AppliedChange, Film, Note, Pin, Version } from "./engine/types";
import { sampleFilm, sampleNotes } from "./film/sample";

interface PendingPin extends Pin {
  px: number;
  py: number;
  stageW: number;
  stageH: number;
  targetName: string;
}

interface ApplyResult {
  noteId: string;
  summary: string;
  question: string;
  edits: (Edit & { reason: string })[];
}

let nextId = 1;
const newId = () => `n${nextId++}`;

export default function App() {
  const [versions, setVersions] = useState<Version[]>([{ n: 1, film: sampleFilm, changes: [], createdAt: Date.now() }]);
  const [viewing, setViewing] = useState(1);
  const [notes, setNotes] = useState<Note[]>([]);
  const [pin, setPin] = useState<PendingPin | null>(null);
  const [playing, setPlaying] = useState(true);
  const [uiTime, setUiTime] = useState(0);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [download, setDownload] = useState<string | null>(null);
  const timeRef = useRef(0);

  const latest = versions[versions.length - 1];
  const shown = versions.find((v) => v.n === viewing) ?? latest;
  const film = shown.film;
  const duration = filmDuration(film);
  const isLatest = shown.n === latest.n;
  const pending = notes.filter((n) => n.status === "pending");

  useEffect(() => {
    loadAssets(sampleFilm).then(() => setReady(true));
  }, []);

  const elementName = useCallback(
    (f: Film, sceneId: string, elementId: string | null) =>
      f.scenes.find((s) => s.id === sceneId)?.elements.find((e) => e.id === elementId)?.name ?? `${f.scenes.find((s) => s.id === sceneId)?.name ?? "Scene"} background`,
    [],
  );

  const seek = (t: number) => {
    setPlaying(false);
    setPin(null);
    timeRef.current = Math.max(0, Math.min(t, duration - 0.001));
    setUiTime(timeRef.current);
  };

  const onPoint = (fx: number, fy: number, px: number, py: number, stageW: number, stageH: number) => {
    if (!isLatest) {
      setError(`You're viewing v${shown.n}. Switch to v${latest.n} to leave notes.`);
      return;
    }
    setPlaying(false);
    const t = timeRef.current;
    const el = hitTest(film, t, fx, fy);
    const { scene } = sceneAt(film, t);
    setPin({ t, x: fx, y: fy, sceneId: scene.id, elementId: el?.id ?? null, px, py, stageW, stageH, targetName: el?.name ?? `${scene.name} background` });
  };

  const saveNote = (text: string, spoken: boolean) => {
    if (!pin) return;
    const { px: _px, py: _py, stageW: _w, stageH: _h, targetName: _n, ...where } = pin;
    setNotes((all) => [...all, { ...where, id: newId(), text, spoken, author: "You", status: "pending" }]);
    setPin(null);
    setPlaying(true);
  };

  const loadSampleNotes = () => {
    setNotes((all) => [...all, ...sampleNotes.map((s) => ({ ...s, id: newId(), spoken: false, author: "Sample", status: "pending" as const }))]);
  };

  const apply = async () => {
    if (!pending.length) return;
    setBusy(`Applying ${pending.length} note${pending.length > 1 ? "s" : ""}…`);
    setError(null);
    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ film: latest.film, notes: pending.map(({ id, t, x, y, sceneId, elementId, text, question, answer }) => ({ id, t, x, y, sceneId, elementId, text, question, answer })) }),
      });
      const data = await res.json().catch(() => ({ error: "The server sent back something unreadable." }));
      if (!res.ok) throw new Error(data.error ?? `Apply failed (${res.status}).`);

      let next = latest.film;
      const changes: AppliedChange[] = [];
      const outcome = new Map<string, Pick<Note, "status" | "reply" | "question">>();
      for (const r of data.results as ApplyResult[]) {
        const result = applyEdits(next, r.edits, r.noteId);
        next = result.film;
        changes.push(...result.changes);
        const skipped = result.rejected.length ? `Skipped: ${result.rejected.join("; ")}.` : "";
        const question = [r.question, skipped].filter(Boolean).join(" ");
        const reply = [result.changes.length ? r.summary : "", question || (result.changes.length ? "" : "Nothing could be changed for this note.")].filter(Boolean).join(" ");
        outcome.set(r.noteId, { status: question || !result.changes.length ? "question" : "applied", reply, question: question || undefined });
      }
      setNotes((all) => all.map((n) => (outcome.has(n.id) ? { ...n, ...outcome.get(n.id)! } : n.status === "pending" ? { ...n, status: "failed", reply: "No answer came back for this note." } : n)));
      if (changes.length) {
        await loadAssets(next);
        const n = latest.n + 1;
        setVersions((all) => [...all, { n, film: next, changes, createdAt: Date.now() }]);
        setViewing(n);
        // Replay from the start of the first scene that changed.
        const firstScene = next.scenes.find((s) => changes.some((c) => c.targetId === s.id || s.elements.some((e) => e.id === c.targetId)));
        timeRef.current = firstScene ? sceneStart(next, firstScene.id) : 0;
        setPlaying(true);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const doExport = async () => {
    setError(null);
    setDownload(null);
    try {
      const blob = await exportMp4(latest.film, (p) => setBusy(`Exporting MP4… ${Math.round(p * 100)}%`));
      setDownload(URL.createObjectURL(blob));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const spokenShare = useMemo(() => {
    const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
    const total = notes.reduce((sum, n) => sum + words(n.text) + words(n.answer ?? ""), 0);
    const spoken = notes.reduce((sum, n) => sum + (n.spoken ? words(n.text) : 0) + (n.answerSpoken ? words(n.answer ?? "") : 0), 0);
    return total ? Math.round((spoken / total) * 100) : null;
  }, [notes]);

  // Exposed for automated checks.
  (window as unknown as { __dc: unknown }).__dc = { versions, notes, timeRef };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <img className="logo-mark" src="/icon.svg" alt="" width={28} height={28} />
          Yapifier
        </div>
        <ol className="steps" aria-label="How it works">
          <li>
            <b>1</b> Click a moment in the film
          </li>
          <li>
            <b>2</b> Hold <kbd>Fn</kbd> and say the change
          </li>
          <li>
            <b>3</b> Apply
          </li>
        </ol>
      </header>

      <main className="layout">
        <section className="player">
          <div className="film-title">
            <span>{film.title}</span>
            <span className="muted">
              v{shown.n}
              {!isLatest && (
                <>
                  {" "}
                  · <button className="link" onClick={() => setViewing(latest.n)}>back to v{latest.n}</button>
                </>
              )}
            </span>
          </div>
          {ready ? (
            <Stage film={film} playing={playing} timeRef={timeRef} highlightId={pin?.elementId ?? null} onTick={setUiTime} onPoint={onPoint}>
              {pin && (
                <>
                  <div className="pin" style={{ left: pin.px, top: pin.py }} />
                  <NotePopover
                    key={`${pin.t}-${pin.x}`}
                    px={pin.px}
                    py={pin.py}
                    stageW={pin.stageW}
                    stageH={pin.stageH}
                    t={pin.t}
                    targetName={pin.targetName}
                    onSave={saveNote}
                    onCancel={() => {
                      setPin(null);
                      setPlaying(true);
                    }}
                  />
                </>
              )}
            </Stage>
          ) : (
            <div className="stage loading">Loading the film…</div>
          )}
          <div className="controls">
            <button className="play" onClick={() => (setPin(null), setPlaying((p) => !p))} aria-label={playing ? "Pause" : "Play"}>
              {playing ? "❚❚" : "▶"}
            </button>
            <Timeline duration={duration} t={uiTime} notes={isLatest ? notes : []} onSeek={seek} />
            <span className="clock">
              {formatTime(uiTime)} / {formatTime(duration)}
            </span>
          </div>
        </section>

        <aside className="side">
          <div className="panel">
            <div className="panel-head">
              <h2>Notes</h2>
              {spokenShare !== null && <span className="chip chip-voice">{spokenShare}% spoken</span>}
            </div>
            <NotesPanel
              notes={notes}
              nameOf={(n) => elementName(latest.film, n.sceneId, n.elementId)}
              onSeek={seek}
              onDelete={(id) => setNotes((all) => all.filter((n) => n.id !== id))}
              onSample={loadSampleNotes}
              onAnswer={(id, text, spoken) =>
                setNotes((all) => all.map((n) => (n.id === id ? { ...n, answer: text, answerSpoken: spoken, status: "pending", reply: n.question ? `You were asked: ${n.question}` : n.reply } : n)))
              }
            />
            <button className="primary" disabled={!pending.length || !!busy} onClick={apply}>
              {busy?.startsWith("Applying") ? busy : `Apply ${pending.length || ""} note${pending.length === 1 ? "" : "s"}`.replace("  ", " ")}
            </button>
            {error && <p className="error">{error}</p>}
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Versions</h2>
            </div>
            <VersionsPanel versions={versions} viewing={shown.n} onView={setViewing} />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Export</h2>
            </div>
            <button className="secondary" disabled={!!busy || !canExport()} onClick={doExport}>
              {busy?.startsWith("Exporting") ? busy : `Export v${latest.n} as MP4 (1080p)`}
            </button>
            {!canExport() && <p className="muted small">Export needs Chrome or Edge.</p>}
            {download && (
              <a className="download" href={download} download={`${film.id}-v${latest.n}.mp4`}>
                Download MP4
              </a>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
