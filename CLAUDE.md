# Yapifier

Voice-driven video editor, built for the WeMakeDevs × Wispr Flow "No Hands" hackathon (solo, Builders track; the official page now says submissions close Sat 31 Oct 2026, 11:59 pm IST; our target is Fri 30 Oct, freeze Thu 29 Oct). Brief, judging and dates: `planning/BRIEF.md`.

You pause any video, click the spot, hold Fn and say the change with Wispr Flow. Yappy, the editor agent, looks at the paused frame, checks the rest of the video with tools that run in the browser (`look` at frames, `track` how long a box's content stays on screen), and returns edit ops; the app re-renders the edit. **Edits never touch the footage's pixels:** they are laid over and around it (zoom, callout, highlight, blur, cut, speed, freeze, title card, volume).

- Live: https://yapifier.vercel.app (Vercel project `yapifier`). **Every push to `main` auto-deploys to production.**
- Repo: https://github.com/Maulik176/Yapifier (public). The build's commit id is on `<html data-build>`, not shown on the page.

## Commands

```bash
npm run dev        # http://localhost:5173, serves /api/apply through the Vite middleware
npm run typecheck  # tsc -b; delete tsconfig.tsbuildinfo afterwards (it's ignored)
npm run build      # typecheck + production build into dist/
node evals/talk/run.mjs   # command-bar eval: 99 utterances, accuracy, speed, cost (calls the API: ~$0.45 on Opus; TALK_MODEL=... to compare)
```

## Layout

- `src/edit/`: the engine, with no React in it.
  - `types.ts`: edits, source, notes, versions. Times are **source seconds**; positions are **fractions of the frame (0–1)**.
  - `timeline.ts`: turns edits into play/hold segments; maps edited time ↔ source time.
  - `ops.ts`: the only way edits change. It validates and clamps every op from Claude. It's shared with the server, so it has no DOM imports.
  - `render.ts`: paints one frame (zoom window, pixelated blur, spotlight, callouts, title cards); `toSource`/`toOutput` map clicks through a zoom.
  - `player.ts`: drives the `<video>` through cuts, speed changes and holds; routes audio through Web Audio for volume edits and recording.
  - `media.ts`: upload reading, filmstrip thumbnails, waveform, frame snapshots, real-time export (MediaRecorder, MP4 where supported).
  - `track.ts`: `Footage` (a second hidden `<video>` for reading original frames and grayscale patches) and box tracking. It estimates how long a **fixed box** looks unchanged; it does not follow moving content, so the UI calls its result a suggested range to check. `fitToFootage` only narrows **newly added** overlays whose op didn't set `exact` (timing the director asked for on purpose is kept as given).
  - `agent.ts`: runs the agent's `look` and `track` tool calls in the browser and builds the tool results.
  - `commands.ts`: the command bar's own parser. Exact commands (`isExact`: play, pause, "go to 0:42", undo, "export v3"…) run at once with no model call; everything else goes to Yappy.
  - `talk.ts`: asks `/api/talk` about anything else and runs its `see_video` (the keyframe strip) and `look` calls; `toCommand` turns Yappy's actions into commands.
  - `scenes.ts`: splits sampled frames into scenes for the keyframe strip (`Footage.keyframes`); shared with the eval so both build the same strip.
  - `sample.ts`: the sample video (MP4, with a WebM copy for browsers without H.264) and its 5 sample notes. **Their coordinates must match what is on screen in the sample.**
- `src/components/`: Landing (with the resume card), Stage (canvas + pins + note box), Timeline, Panels (notes, answer box, agent log, edits list, versions), NotePopover, Inspector (exact times, text, strength, blur style for the selected edit), EditHandles (drag and resize the selected edit on the video), CommandBar (talk to the timeline: `/` focuses it, Flow's paste runs at once, Yappy's questions come back as choice buttons).
- Export runs in the background (`recordExport` in `media.ts`): its own hidden video, player and canvas record a frozen copy of the chosen version, with the sound going to the recording only, so the editor stays fully usable. Stop cancels it; a hidden tab stalls it. Hold `O` (or the Original button) only swaps the picture to the untouched footage (`Player.showOriginal`); the edited timeline stays the clock.
- Note and answer boxes take Flow's paste themselves (`src/components/paste.ts`): plain text, or the words out of rich text; a paste with no text shows a hint to press ⌘⌃V (Flow's "paste last transcript"). Flow restores your old clipboard ~0.5 s after pasting.
- The stage only re-renders the editor when the clock moves, so a paused editor is idle.
- `src/save.ts`: autosave of the project (and the uploaded video, when it fits) in IndexedDB; the landing page offers to resume it. Hand adjustments to one edit fold into a single version (`Version.tweak`).
- `server/talk.ts`: the `/api/talk` handler. One step per request; the browser sends a short editor snapshot (never frames), the last 3 commands, and the keyframe strip once Yappy has asked for it (first in the message, so later commands read it from the cache). Logs token usage per step. Its own rate limits (`DAILY_TALK_CAP`).
- `evals/talk/`: the command-bar test set (`cases.mjs`) and runner (`run.mjs`); results and ffmpeg frames go to ignored `results/` and `.cache/`.
- `server/apply.ts`: the `/api/apply` handler, **one agent step per request** (prompt, tools, JSON schema, redaction, rate limits). The browser sends the run so far as `transcript` and must send assistant turns back unchanged (thinking blocks included); the first user message is rebuilt identically each step. Only the first step counts as an apply for rate limits. `api/apply.ts` is the Vercel wrapper; `vite.config.ts` mounts the same handler in dev.
- `public/samples/no-hands-sample.mp4`: the judges' sample (720p web copy).
- `sample-video/`: the HyperFrames project that makes the sample (see below).
- `planning/`: brief, plan, research and icon options. Not deployed.
- `spikes/`: day-1 experiments. Not deployed.

## Rules for this repo

- **Claude API:** official `@anthropic-ai/sdk`, model `claude-opus-5-5`, effort `low` (env `APPLY_MODEL`, `APPLY_EFFORT`; `TALK_MODEL`, `TALK_EFFORT` for the command bar, where the Oct 30 eval had Opus 5.5 at 97/99 and Haiku 5.5 at 92/99 with wrong blur targets), structured output via `output_config.format`, `fallbacks: "default"` with beta `server-side-fallback-2026-07-01`. The SDK is loaded lazily inside the handler.
- **Keys:** `ANTHROPIC_API_KEY` lives in `.env.local` for dev and in Vercel production env (sensitive). Never print, commit or paste it. `DAILY_APPLY_CAP` is optional.
- **Server-side imports use explicit `.js` extensions** (`../src/edit/ops.js`). Vercel runs the function as ESM and breaks on extensionless relative imports.
- **Privacy:** uploaded videos never leave the browser; only the note text, the pinned frame (JPEG, 640 px), any frames Yappy asks for with `look` (480 px) and, once a spoken command needs to find something on screen, the keyframe strip (one 320 px frame per scene) go to the model; the command bar says so the first time. Notes are redacted (emails, key-like strings, phone numbers) before the call. New blur boxes get a safety margin in `ops.ts`.
- **Note text is data:** the prompt wraps it in `<note>`/`<answer>` tags; keep that when changing the prompt.
- **Branding: the agent is Yappy.** Don't say or show that Yappy is Claude (or name the model or provider) in the app's UI, the README, the banner, diagrams or the demo. The provider shows up only where it must: code, the API key setup in "Run it locally", and how the project was built (Claude Code).
- **No company assets in public:** don't put material from Maulik's employer or other brands into the app, the sample or the repo.
- **Judges' path:** the landing's "Try it on a sample video" plus "No mic? Load 5 sample notes" must always work with zero setup. Typing works when Flow isn't installed. Export needs Chrome or Edge.
- **Commit messages:** use Maulik's dictated words when he gives a note (the hackathon scores how much writing went through Flow). End with the `Co-Authored-By` trailer.

## Gotchas on this machine

- **iCloud offloads files.** The project is on the iCloud-synced Desktop, and a full disk once turned 4,000+ files in `node_modules` into "dataless" placeholders, which hung node, Vite and tsc. `node_modules` is a symlink to `node_modules.nosync` (iCloud ignores `.nosync`), and `vite.config.ts` sets `resolve.preserveSymlinks: true`. `npm install` replaces the symlink with a real folder, so afterwards run:
  `rm -rf node_modules.nosync && mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules`
  If anything hangs for no reason, check `find node_modules/ -flags +dataless | wc -l` and `df -h` first.
- **The Bash sandbox can't read the macOS keychain,** so Vercel CLI commands (`npx vercel@65.2.0 …`) need the sandbox disabled. The Anthropic SDK test scripts are more reliable through the running dev server than through a sandboxed `node`.
- **The Mac has 8 GB of RAM.** Stop dev servers and previews you aren't using.
- **Node:** Vite 8 needs Node 22, but the shell's nvm default can be Node 18 (`styleText` import errors). Prefix commands with `PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"`; `.claude/launch.json` runs Vite with that Node directly.
- **Tests:** `npm test` (Node's test runner; Vite loads the TypeScript). Compare tests are in `tests/compare.test.mjs`.

## The sample video (`sample-video/`)

A 36 s HyperFrames film ("No Hands" teaser, marked as not official) with five planted fixes: dead air in the first 2 s, 22 px judging small print, a fake `team@example.com`, the ₹1,00,000 headline, the register button. `SPEC.md`, `STORYLINES.md` and `REVIEW.md` are inside.

- Voice: `npx hyperframes tts` (Kokoro). It needs `HYPERFRAMES_PYTHON=~/.cache/yapifier-venv/bin/python` (Python 3.13 venv with `kokoro-onnx`, kept outside iCloud).
- Music: synthesized with the motion-reel kit's `music.py` from a scratch folder; the result is `assets/audio/music.mp3`.
- Use `font-family:` (not the `font:` shorthand) for bundled fonts, or the renderer falls back to another face.
- Render: `npx hyperframes@0.8.191 render --output renders/no-hands-sample.mp4`. Then make the web copy:
  `ffmpeg -i sample-video/renders/no-hands-sample.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -af loudnorm=I=-15:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 160k public/samples/no-hands-sample.mp4`
  Then the WebM copy: `ffmpeg -i public/samples/no-hands-sample.mp4 -c:v libvpx-vp9 -b:v 0 -crf 34 -deadline good -cpu-used 4 -row-mt 1 -c:a libopus -b:a 128k public/samples/no-hands-sample.webm`
- If the sample changes, re-check the sample notes' `srcT`, `x` and `y` in `src/edit/sample.ts`.
