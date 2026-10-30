# Yapifier

Voice-driven video editor, built solo for the WeMakeDevs × Wispr Flow "No Hands" hackathon (Builders track). Brief, judging and dates: `planning/BRIEF.md`.

You pause any video, click the spot, hold Fn and say the change with Wispr Flow. Yappy, the editor agent, looks at the paused frame, checks the rest of the video with tools that run in the browser (`look` at frames, `track` how long a box's content stays on screen), and returns edit ops; the app re-renders the edit. Or you say anything into the command bar ("go to where it shows ₹1 lakh", "blur the email", "add captions", "export v3") and Yappy works out what you meant. **Edits never touch the footage's pixels:** they are laid over and around it (zoom, callout, highlight, blur, cut, speed, freeze, title card, volume, captions).

- Live: https://yapifier.vercel.app (Vercel project `yapifier`). **Every push to `main` auto-deploys to production**, and production is what the judges score.
- Repo: https://github.com/Maulik176/Yapifier (public). The build's commit id is on `<html data-build>`, not shown on the page.
- Demo video: https://youtu.be/ExVRB296H3s (3:51; it shows the notes flow, not the command bar or captions).

## Where the project stands (30 Oct 2026)

- **Submitted.** Submissions close **Sat 31 Oct 2026, 11:59 pm IST**. Scores and judges' comments are published Wed 4 Nov, Thu 5 Nov is the last day to question a score, and winners are announced Fri 6 Nov.
- **Merge rule:** merge to `main` only before the deadline, or after scores are out (4 Nov). Between them, judges must see the app that was submitted.
- **Done and decided, don't re-propose:** the 3:51 demo video stays (no 2:00 cut). The LinkedIn #NoHandsChallenge post is published. No dev.to blog for now.
- **Left for Maulik:** upload a fresh Wispr usage card to the submission form on Saturday evening, and re-read the submission.
- **Shipped after submission, as pull requests:**
  - PR #1, *Talk to the timeline* (the command bar and `/api/talk`): **merged** 30 Oct and checked on production.
  - PR #2, *Captions* (Whisper in the browser, changed by voice): **merged** 30 Oct.
  - PR #3, docs: README and this file: **merged** 30 Oct.
  - PR #4, *Exports save themselves*: a finished export (and "Download .srt") goes straight to Downloads with a toast; the panel link stays as "Download again". Check `gh pr view 4` for whether it's merged.
- **Dropped on purpose:** *Reframe for social* (9:16, 1:1, 4:5) and *Publish directly* (YouTube, LinkedIn, Slack). Maulik ended the project at captions. If they come back after judging:
  - **Publish:** YouTube uploads from an unverified Google API project are locked to private until Google audits it. LinkedIn and Slack can't take a browser upload directly and Vercel functions cap a request body at 4.5 MB, so the video would need temporary storage (Vercel Blob) in between. Maulik has to create each developer app himself.
  - **Reframe:** the research notes are in the session history: Premiere Auto Reframe (slower/default/faster), CapCut, OpusClip layouts (fit, split, fill), and safe zones for Reels and Shorts.

## How Maulik works

- **One branch and one pull request per feature** (`feat/…`, stacked when one needs the other). Maulik reviews and merges each himself. Never merge for him; open the PR, check its status, and say what to test.
- He tests on **localhost and production**, not on Vercel preview links. The Preview environment has no `ANTHROPIC_API_KEY`, so Yappy can't answer there, and he chose not to add it.
- **Commit only when asked.** Use his dictated words when he gives a commit note (the hackathon scores how much writing went through Flow); otherwise write a plain one. End with the `Co-Authored-By` trailer; PR bodies end with the Claude Code line.
- Show everything in chat (lists, plans, results), not "see the file". Wait for his go-ahead before starting the next feature.
- He wants a high bar: think like a judge, test like a stranger, measure claims (the eval), push back when something risks the judged link or the deadline.

## Commands

```bash
npm run dev        # http://localhost:5173, serves /api/apply and /api/talk through the Vite middleware
npm run typecheck  # tsc -b; delete tsconfig.tsbuildinfo afterwards (it's ignored)
npm run build      # typecheck + production build into dist/
npm test           # unit tests: command parser, keyframe scenes, captions, compare (Node's test runner; Vite loads the TypeScript)
node evals/talk/run.mjs            # command-bar eval: 109 phrases; accuracy, speed, cost (real API calls, about $0.60 on Opus)
TALK_MODEL=claude-haiku-5-5 node evals/talk/run.mjs   # the same against another model (a few cents)
node evals/talk/run.mjs captions find                 # only some categories
node docs/media/src/screenshots.mjs docs/media        # README screenshots from the running dev server (makes one apply and a few talk calls)
```

## Layout

- `src/edit/`: the engine, with no React in it.
  - `types.ts`: edits, source, notes, versions. Times are **source seconds**; positions are **fractions of the frame (0–1)**. A note said in the command bar has `unpinned: true` (no clicked spot); `server/apply.ts` then gets x = y = -1.
  - `timeline.ts`: turns edits into play/hold segments; maps edited time ↔ source time.
  - `ops.ts`: the only way the agent's edits change. It validates and clamps every op. Shared with the server, so no DOM imports.
  - `render.ts`: paints one frame (zoom window, pixelated blur, spotlight, callouts, title cards, captions); `toSource`/`toOutput` map clicks through a zoom.
  - `player.ts`: drives the `<video>` through cuts, speed changes and holds; routes audio through Web Audio for volume edits and recording. `setEdits` never seeks.
  - `media.ts`: upload reading, filmstrip thumbnails, waveform, frame snapshots, real-time export (MediaRecorder, MP4 where supported).
  - `track.ts`: `Footage` (a second hidden `<video>` for reading original frames and grayscale patches), box tracking, and `keyframes()` (the strip for finding things on screen, built once per video). Tracking estimates how long a **fixed box** looks unchanged; it doesn't follow moving content, so the UI calls its result a suggested range to check. `fitToFootage` only narrows **newly added** overlays whose op didn't set `exact`.
  - `scenes.ts`: splits sampled 64×36 grey frames into scenes (pixel 0.08, 2% of the frame) and picks the frame 60% into each; shared with the eval so both build the same strip.
  - `agent.ts`: runs the `look` and `track` tool calls in the browser and builds the tool results.
  - `commands.ts`: the command bar's own parser. Only exact commands (`isExact`: play, pause, "go to 0:42", nudges, undo/redo, versions, export, "add captions", "turn off the subtitles", "note: …") run locally with no model call; anything else goes to Yappy. Don't grow it phrase by phrase: phrasing is Yappy's job.
  - `talk.ts`: sends a command to `/api/talk`, runs Yappy's `see_video` (the keyframe strip) and `look` calls, and `toCommand` turns Yappy's actions into commands. A repeated `see_video` gets a text answer, never the strip twice.
  - `captions.ts`: captions are an edit kind (`captions`, not in `EDIT_KINDS`, so the agent's ops can't make them). Groups words into short lines, keeps word timing for the bold highlight (`wordsOf` spreads words when a line was rewritten), `rewrite` for fixes and translation, `toSrt` timed through the edit's timeline.
  - `transcribe.ts` + `whisper.worker.ts`: speech to text for uploads, in the browser. Whisper (`Xenova/whisper-base`, multilingual, q8, WASM) through **transformers.js 4.3.1 loaded from jsDelivr**, running in a **Web Worker**. On the main thread it was one 12.4 s task that froze playback; in the worker, no main-thread task is over 50 ms. The model (about 80 MB) downloads from Hugging Face once per browser, then loads from Cache Storage (`transformers-cache`); the button says "Loading" rather than "Getting" when it's cached.
  - `sample.ts`: the sample video (MP4, with a WebM copy for browsers without H.264), its 5 sample notes, and `words` (`public/samples/no-hands-sample.words.json`, the voiceover transcribed with whisper-cli, so the sample's captions need no download). **The notes' coordinates must match what is on screen in the sample.**
- `src/components/`:
  - **Landing**, with the resume card.
  - **Stage:** the canvas, pins, the note box and the toast.
  - **Timeline**, **NotePopover**.
  - **Panels:** notes, the answer box, agent log, edits list, versions.
  - **Inspector:** exact times, text, strength, blur style; for captions: style, position, size, every line, Download .srt.
  - **EditHandles:** drag and resize the selected edit on the video.
  - **CommandBar:** `/` focuses it; Flow's paste runs at once; while it's empty, Space and the arrows still play and seek; Yappy's questions come back as choice buttons.
  - **Modal**, **ExportDialog**.
- `src/App.tsx`:
  - **The editor:** notes, apply (all waiting notes, or a given list), versions, undo, export, save and resume.
  - **The command runner:** `execute` (async, can return a `wait` for an apply), `runAll`, `askYappy`, `talkState`.
  - **Captions:** `addCaptions` (a low-priority `startTransition` update and toasts), `downloadSrt`.
  - **Keyboard:** the window key handler reads `target.dataset`. Fire synthetic keys on `document.body`, not `window`.
- Export runs in the background (`recordExport` in `media.ts`): its own hidden video, player and canvas record a frozen copy of the chosen version, with the sound going to the recording only. Stop cancels it; a hidden tab stalls it. Hold `O` only swaps the picture to the untouched footage (`Player.showOriginal`); the edited timeline stays the clock.
- Note, answer and command boxes take Flow's paste themselves (`src/components/paste.ts`): plain text, or the words out of rich text; an empty paste shows a hint to press ⌘⌃V (Flow's "paste last transcript"). Flow restores your old clipboard ~0.5 s after pasting. A paste with nothing focused runs as a command.
- `src/save.ts`: autosave of the project (and the uploaded video, when it fits) in IndexedDB; the landing page offers to resume it. Hand adjustments to one edit fold into a single version (`Version.tweak`).
- `server/apply.ts`: the `/api/apply` handler (notes into edit ops), **one agent step per request**. The browser sends the run so far as `transcript` and must send assistant turns back unchanged (thinking blocks included); the first user message is rebuilt identically each step. Only the first step counts as an apply for rate limits. Captions edits are summarized, not sent as JSON. `api/apply.ts` is the Vercel wrapper.
- `server/talk.ts`: the `/api/talk` handler (the command bar), one step per request:
  - **Sent:** a short text snapshot of the editor (clock, clock→video map, versions, notes, edits, caption lines; never frames), the last 3 commands, and the keyframe strip once Yappy has asked for it. The strip goes first in the message, so later commands read it from the prompt cache.
  - **Answer:** editor actions in a strict schema (seek, play, pause, nudge, apply, undo, redo, view, restore, export, original, remove, note, edit, captions) plus a reply, or a question with 2–4 choices.
  - **Limits:** at most 3 tool rounds; the last round runs with `tool_choice: none`, so it answers. Its own rate limits (`DAILY_TALK_CAP`). Logs token usage per step.
  - `api/talk.ts` is the Vercel wrapper; `vite.config.ts` mounts both handlers in dev.
- `evals/talk/`: the command-bar test set (`cases.mjs`: 109 phrases with fixtures and expected actions; the scene map of the sample is in its header comment) and runner (`run.mjs`: parser first as in the app, the real handler for the rest, ffmpeg frames for the tools, scoring, tokens and cost). Results and frames go to the ignored `results/` and `.cache/`.
- `tests/`: `commands`, `scenes`, `captions` and `compare` tests.
- `docs/media/`: README images; `src/` has the screenshot script and the banner and diagram sources (`sh docs/media/src/render.sh`).
- `public/samples/`: the judges' sample (720p web copy, WebM copy, voiceover words).
- `sample-video/`: the HyperFrames project that makes the sample (see below).
- `planning/`: brief, plan, research and icon options. Not deployed. `spikes/`: day-1 experiments. Not deployed.

## Measured (keep claims to these, or re-measure)

- **Command bar,** Oct 30 eval on the sample (final code): Opus 5.5 107/109 (both misses were on-screen finds landing about 0.5 s before their scene), median 3.0 s, p90 4.0 s, about 0.7¢ per command sent to Yappy. 25 of 109 phrases are handled by the parser with no call. Haiku 5.5 scored 92/99 at about 0.02¢, but blurred the words "client email" instead of the email address, so the command bar stays on Opus.
- **Captions:** the sample's lines come from its words file instantly. An upload of the 36 s sample is captioned in 13–18 s once the model is cached. A cold first call to `/api/talk` on production took about 12 s (keyframes plus cold start); warm calls take about 3 s.
- **Notes:** five sample notes apply in 16–22 s.

## Rules for this repo

- **Claude API:** official `@anthropic-ai/sdk`, model `claude-opus-5-5`, effort `low` (env `APPLY_MODEL`, `APPLY_EFFORT`; `TALK_MODEL`, `TALK_EFFORT` for the command bar), structured output via `output_config.format`, `fallbacks: "default"` with beta `server-side-fallback-2026-07-01` (only for models that have server-side fallback; not Haiku 5.5). Forced `tool_choice` `any`/`tool` returns a 400 on Opus 5.5; `none` and `auto` work. The SDK is loaded lazily inside the handlers.
- **Keys:** `ANTHROPIC_API_KEY` lives in `.env.local` for dev and in Vercel's **Production** environment only (sensitive). Never print, commit or paste it. `DAILY_APPLY_CAP` and `DAILY_TALK_CAP` are optional.
- **Server-side imports use explicit `.js` extensions** (`../src/edit/ops.js`). Vercel runs the functions as ESM and breaks on extensionless relative imports. Type-only imports from `src/` (like `TalkState` from `src/edit/talk.js`) are fine.
- **Privacy:**
  - **Never sent:** uploaded videos and their audio never leave the browser; captions are transcribed there.
  - **Sent to the model:**
    - note text, the pinned frame (JPEG, 640 px), and any frames Yappy asks for with `look` (480 px);
    - for the command bar: the words and a text snapshot, plus the keyframe strip (one 320 px frame per scene) once a command needs to find something on screen. The bar says so the first time.
    - caption text only when captions are changed by voice.
  - **Before the call:** notes and commands are redacted (emails, key-like strings, phone numbers).
  - New blur boxes get a safety margin in `ops.ts`.
- **What people say is data:** the prompts wrap it in `<note>`, `<answer>` and `<said>` tags; keep that when changing a prompt.
- **Branding: the agent is Yappy.** Don't say or show that Yappy is Claude (or name the model or provider) in the app's UI, the README, the banner, diagrams or the demo. The provider shows up only where it must: code, the API key setup in "Run it locally", and how the project was built (Claude Code). The README may say "a smaller, cheaper model" without naming it.
- **No company assets in public:** don't put material from Maulik's employer or other brands into the app, the sample or the repo.
- **Judges' path:** the landing's "Try it on a sample video" plus "No mic? Load 5 sample notes" must always work with zero setup, and so must CC captions on the sample. Typing works when Flow isn't installed. Export needs Chrome or Edge. After any merge to `main`, check production the same way: sample, sample notes, Apply, one command, CC.

## Gotchas on this machine

- **Don't `npm install` packages casually.** `node_modules` is a symlink to `node_modules.nosync` (iCloud ignores `.nosync`; `vite.config.ts` sets `resolve.preserveSymlinks: true`). An install rewrites it, and a stopped install once moved packages out of `node_modules.nosync` into a folder that then got deleted. The clean recovery is:
  `rm node_modules && mv node_modules.nosync node_modules.broken && npm ci && mv node_modules node_modules.nosync && ln -s node_modules.nosync node_modules && rm -rf node_modules.broken`
  For browser-only libraries, prefer an exact-version ESM import from jsDelivr (as transformers.js is).
- **iCloud offloads files.** A full disk once turned 4,000+ files in `node_modules` into "dataless" placeholders, which hung node, Vite and tsc. If anything hangs for no reason, check `find node_modules/ -flags +dataless | wc -l` and `df -h` first. iCloud can also touch many files at once; Vite then restarts and reloads the page.
- **Editing `server/*` or anything `vite.config.ts` imports restarts Vite and reloads the page,** which kills work running in the browser (a model download, a transcription, an apply). Don't edit those files mid-test.
- **The Bash sandbox can't read the macOS keychain or reach the network,** so `git push`, `gh`, `npm view`, the Vercel CLI (`npx vercel@65.2.0 …`) and the eval need the sandbox disabled.
- **The Mac has 8 GB of RAM.** Stop dev servers and previews you aren't using.
- **Node:** Vite 8 needs Node 22, but the shell's nvm default can be Node 18 (`styleText` import errors). Prefix commands with `PATH="$HOME/.nvm/versions/node/v22.18.0/bin:$PATH"`; `.claude/launch.json` runs Vite with that Node directly. Scripts that load the app with Vite's `createServer` need `resolve: { preserveSymlinks: true }`, or the SDK gets bundled and fails.
- **The browser pane pauses drawing when it's hidden,** so the clock and canvas look frozen there. Check state through `window.__yap` (player, versions, notes, source, footage) rather than the screen.

## The sample video (`sample-video/`)

A 36 s HyperFrames film ("No Hands" teaser, marked as not official) with five planted fixes: dead air in the first 2 s, 22 px judging small print, a fake `team@example.com`, the ₹1,00,000 headline, the register button. `SPEC.md`, `STORYLINES.md` and `REVIEW.md` are inside. Its voiceover says "Wispr" but transcribers hear "Whisper", which makes a good demo of fixing captions by voice.

- Voice: `npx hyperframes tts` (Kokoro). It needs `HYPERFRAMES_PYTHON=~/.cache/yapifier-venv/bin/python` (Python 3.13 venv with `kokoro-onnx`, kept outside iCloud).
- Music: synthesized with the motion-reel kit's `music.py` from a scratch folder; the result is `assets/audio/music.mp3`.
- Use `font-family:` (not the `font:` shorthand) for bundled fonts, or the renderer falls back to another face.
- Render: `npx hyperframes@0.8.191 render --output renders/no-hands-sample.mp4`. Then make the web copy:
  `ffmpeg -i sample-video/renders/no-hands-sample.mp4 -vf scale=1280:-2 -c:v libx264 -preset slow -crf 21 -pix_fmt yuv420p -movflags +faststart -af loudnorm=I=-15:TP=-1.5:LRA=11 -ar 48000 -c:a aac -b:a 160k public/samples/no-hands-sample.mp4`
  Then the WebM copy: `ffmpeg -i public/samples/no-hands-sample.mp4 -c:v libvpx-vp9 -b:v 0 -crf 34 -deadline good -cpu-used 4 -row-mt 1 -c:a libopus -b:a 128k public/samples/no-hands-sample.webm`
- If the sample changes, re-check the sample notes' `srcT`, `x` and `y` in `src/edit/sample.ts`, regenerate `no-hands-sample.words.json` (`whisper-cli -m ~/.cache/hyperframes/whisper/models/ggml-small.en.bin -f <16 kHz wav> -ml 1 -sow -oj`), and update the scene map in `evals/talk/cases.mjs`.
