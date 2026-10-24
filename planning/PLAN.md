# Director's Chair: plan (locked Oct 19, 2026)

Claude's working notes. Everything here was also shown to Maulik in chat.

## One line
Point at any moment and any spot in a motion-graphics video, say the change through Wispr Flow, and the revision applies itself. Share a link so reviewers can do the same.

## Competitor check (Oct 19)
- Prompt → motion graphics plus chat edits: **Motion (motion.so)** (brief → storyboard → full video, chat edits, element-level manual edits, in-place edits, MCP/API), **Hera** (YC S25; prompts + on-canvas editing), Higgsfield Vibe Motion, HeyGen Motion Designer, VideoGen, ChatCut, Jitter AI. **iArt.ai** says "iterate by talking to it", but only on its own blog and without saying whether that means voice.
- Click an element, then prompt: Replit Canvas does this for web UI, not video.
- Region-aware edits to footage: Runway Aleph (text-described, localised).
- Review: Eddie AI (typed timestamped comments + AI notes), DirectorMode.AI (AI notes, human applies), Frame.io/VEED typed comments.
- **Not found:** spoken notes pinned to a moment *and* a spot that apply themselves, or a reviewer link where non-technical people point and speak. Generation is a commodity; **the hero is the direction/review loop.**

## Core loop (MVP)
1. The link opens a sample film playing (Canvas 2D renderer, `seek(t)`, closed-form springs).
2. Click the frame: it pauses and drops a pin (t, x, y), hit-tests the element and highlights it, and opens a focused note box.
3. Hold Fn and speak; the Flow paste becomes the note. Notes show as markers on the timeline and in a list.
4. Apply: Claude gets the scene JSON, element, pin, frame snapshot and note, and returns constrained edit ops. They're applied, v2 plays, and a changelog maps each op to its note. Ambiguous notes come back as a question.
5. Versions with A/B comparison at the same timestamp.
6. Review link (KV store, TTL): reviewers enter a name, point and speak, and their notes join the queue.
7. Export MP4 (WebCodecs, 16:9 + 9:16). Chrome/Edge.

Stretch: a brief → first cut (template fill); Wispr Notetaker review-call import via MCP; pointing while talking (cursor trail during dictation); music bed.

## Wispr integration
- Flow is the only voice input (no Web Speech API); the paste event closes the note.
- A "% spoken" meter.
- Hinglish notes, normalised to English ops, with the original kept.
- A starter Flow dictionary plus snippets (e.g. "brand blue" → hex).
- Command Mode to polish a note.
- Notetaker MCP import (stretch).
- Build side: dictate everything, with commit notes dictated by Maulik.

## Stack (default unless Maulik objects)
- Vite + React + TypeScript; Canvas 2D renderer (our own engine; **don't copy Motion Reel Kit code until its licence is checked**).
- Vercel serverless functions for Claude (Sonnet 5.5 for edits); Upstash Redis for review links (TTL 7 days).
- Per-IP rate limit and a daily spend cap.

## Judge path
- The link plays the sample instantly; coach marks: click → speak → Apply.
- Typing works too, and "Try sample notes" covers judges with no Flow and no mic.
- No sign-up.

## Baseline
The same 8 revision notes done three ways: (a) typed into Claude Code + kit in the terminal, (b) typed chat in our tool without pointing, (c) point + speak. Measure minutes per note and how many apply correctly on the first try.

## Schedule
| Day | Work |
|---|---|
| Mon 19 | Spikes: Flow → focused overlay textarea + paste event; canvas spring renderer; Claude edit-op round trip under 5 s; WebCodecs 10 s export |
| Tue 20 | Scene-graph schema + renderer + sample film |
| Wed 21 | Pins, hit-test, note box, timeline, % spoken |
| Thu 22 | Apply (Claude ops), changelog, versions, A/B, clarifying questions |
| Fri 23 | **Deploy live**, rate limits, judge path, sample notes |
| Sat 24 | Review link, Hinglish |
| Sun 25 | Week-1 check-in + post; minimal brief → first cut |
| Mon 26 | MP4 export, polish |
| Tue 27 | Notetaker MCP spike/build (stretch); baseline run |
| Wed 28 | Visual quality pass, privacy (TTL, redaction), README |
| **Thu 29** | **Freeze**: stranger test, demo video, description, Wispr feedback |
| Fri 30 | Submit by the afternoon |

## Open questions for Maulik
1. Who reviewed the work videos, and how did feedback arrive?
2. Sample film: Purrsona (his own) rather than an employer video (company brand)?
3. Motion Reel Kit licence.
4. Stack OK?
5. Product name.
