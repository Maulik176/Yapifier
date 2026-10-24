# 00 — Synthesis of research 01–05 (Claude's notes, Oct 19)

Everything here was also shown to Maulik in chat.

## Cross-check verdicts
- Voice bug reporting alone is crowded: nicecatch, BugReel, TalkThrough, Vibe Feedback, markupR, plus Jam (300k users) (02). The ideation session's #1 "Instant Replay" is therefore a me-too on its own.
- The open gap is **voice-driven test runs**: dictate a plan, run a floating checklist, say pass or fail, have evidence captured at the moment of failure, and turn spoken priority and deadline into fields (01 G1, 02 §3). No tool found does this.
- Crowded at this hackathon: meeting/call notes → actions (Dictaflow + the organisers' sample + Notetaker), standup, release notes, code review, follow-up, inbox (03). That demotes Call Debrief.
- Voice + AI coding (Spec Interviewer) is saturated (01: Claude Code /voice, Devin Voice, Willow, Aqua...).
- Wispr layers: Flow as the only input, where each Flow paste triggers a capture; a Hinglish pipeline (the India growth hook); a starter dictionary and snippets; a "% spoken" meter; an optional Notetaker/Scratchpad import over MCP (DCR + PKCE are advertised, but it's untested and can't be the judge path) (04).
- The bar from the organisers' sample: real data (14 real call notes) plus words dictated (21,480) (03).

## Recommended direction (pending Maulik)
"Talk-through Tester": test-plan-first, voice-run QA for teams with no QA. Instant Replay capture is the failure step; an evidence pack is an export. The judge path is a built-in buggy sandbox app; any-tab mode and an extension are stretch goals.

## Day-1 spikes
1. Flow → textarea in a Document PiP window
2. A paste/beforeinput event on Flow insert
3. getDisplayMedia frames while focus sits in the PiP
4. Claude vision ticket in under ~6 s
5. Wispr MCP OAuth (DCR + PKCE) from FastAPI
6. Hinglish landing as Latin script
