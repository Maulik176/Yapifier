# 05 — Ideation: voice-first tools for developers and product teams

Written Mon 19 Oct 2026 from first principles, with no market research. The scores are my judgement against the brief's four questions. The "real problem" scores still need Maulik to confirm which of these pains he actually hits each week, and how long they take today.

## How to read the scores

| Score | Real problem (30%) | Wispr used meaningfully (30%) | Works: live link (25%) | Clear demo (15%) |
|---|---|---|---|---|
| 5 | Weekly pain, one clear user, Maulik can show his own example | Voice is the only free input (hands or eyes busy), and a long spoken narrative drives the output | Pure web, zero setup, sample one click away, works without Flow or a mic | One visual before/after in 20 seconds that a product person gets instantly |
| 4 | Common pain and a clear user; Maulik hits it now and then | Speaking is clearly richer than typing, and the tool is designed around spoken input | Web, but needs one browser permission (screen share) or a Chrome-only API; a sandbox fallback covers judges | Clear, but needs one sentence of context |
| 3 | Real but occasional, or the user is fuzzy | Voice is a prompt box; typing would work about as well | Core value needs an extension or a token; a demo mode covers judges | Text in, document out |
| 2 | Nice to have | Voice is incidental | Install or CLI only | Hard to show |

**Weighted total** = 0.30 × Real + 0.30 × Wispr + 0.25 × Works + 0.15 × Demo (maximum 5.00).

**Build risk** = the chance that a solo developer, building by voice with Claude Code, ships a judge-proof version by our Thu 29 Oct freeze (about 9 build days). Low, Medium or High.

## The key insight: Flow can't take screenshots, but your voice can be the shutter

Maulik's worry is that screenshots matter most in bug reporting and Flow can't capture them. It doesn't need to. Flow writes text into whatever text field has focus, so the tool only needs two things:

1. **A text field that's always within reach while your hands test.** The Document Picture-in-Picture API (Chrome and Edge 116+) lets an ordinary web page open a small always-on-top window holding any HTML, such as a narration pad. You click the pad, hold Fn, speak and let go. Nothing to install.
2. **A capture that fires when that field is used.** The browser does the capturing, in three tiers:
   - **Built-in sandbox app (same origin): full capture, no prompts.** We ship a small demo app with planted bugs. Because it's on our origin we get a DOM screenshot, console errors, failed requests and the click trail. This is the judges' default path.
   - **Any browser tab, zero install.** `getDisplayMedia()` asks once per session to share a tab. The tool keeps a rolling buffer of about 15 seconds of frames. When the pad gets focus, it keeps the frames from just before, which gives a screenshot plus a short replay. Claude vision reads the frames and the narration to write the steps. There's no console or network data here. Share a *tab* rather than a window: on macOS, window and screen capture need Chrome's Screen Recording permission (and a Chrome restart), but tab capture doesn't.
   - **Optional Chrome extension for real sites.** `captureVisibleTab`, plus console and network data from a content script or `chrome.debugger`. This is a stretch goal or roadmap item, never the judge path.

So **every time you speak, evidence is captured.** That's the Wispr story judges want: Flow is the only input while your hands are on the mouse, and every Flow triggers a capture.

**Day-1 spikes** (all four must pass before we commit to the capture family):
1. Flow inserts text into a textarea inside a Document PiP window.
2. Whether the page can see Fn being held. Assume it can't, and trigger the capture on pad focus and on the `input` event instead.
3. `getDisplayMedia` keeps delivering frames from the shared tab while focus is in the PiP pad. A grab at about 1 fps and 1280 px wide should be cheap.
4. Claude vision returns a ticket from 3–5 frames plus the narration in under about 6 seconds.

If spike 1 fails, the fallback is a pad docked next to the sandbox in the same page. The judge path still works; only "test any tab" gets clunkier.

## 1. All ideas

Sorted by weighted total. R = real problem, W = Wispr used meaningfully, Wk = works (live link), D = demo. The seed idea and its variants are marked.

| # | Idea (family) | One-line pitch | Problem → clear user | Where Flow sits every day | Live link for judges | Strongest 20-second demo moment | Build risk | R | W | Wk | D | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **Instant Replay Bug Report** (seed variant A; capture) | Spot a bug, say what's wrong, and get a ticket with the last 15 seconds attached | Bug reports arrive as "checkout broken" with no steps, because reporting means stopping to screenshot and type → devs, BAs and architects testing their own builds without QA; PMs on staging | Every bug is a 10–40 second Flow into the floating pad, and the Flow is the capture trigger | Hosted web app with a built-in buggy shop; "play sample session" button; any-tab mode via one screen-share prompt | Say one sentence about a wrong total, and a P1 ticket appears with the total boxed in red, the console error, the failed request, the steps and a replay strip | Medium | 5 | 5 | 4 | 5 | **4.75** |
| 2 | **Talk-through Tester** (seed; capture) | Dictate a test plan, run it with a floating checklist, narrate failures, and finish with prioritised tickets | Test plans never get written and bugs get logged thin → same users as #1 | The feature description, then every test result ("pass", or a narrated failure) | Same as #1, with a sample feature prefilled | A 20-second ramble about coupon codes becomes 12 test cases, including edge cases nobody types out | High | 5 | 5 | 4 | 4 | **4.60** |
| 3 | **Evidence Pack** (seed variant B; capture) | Run your UAT cases while talking, and the test-evidence document writes itself | Clients and auditors want a screenshot per step, pass/fail and sign-off, and people paste screenshots into Word for hours → consultants and BAs running UAT or regression in services delivery; regulated SaaS teams | One Flow per test step: the spoken result becomes the evidence caption | Same as #1; .docx and PDF export happens in the browser | Run three cases by talking, click Export, scroll a 9-page Word doc full of screenshots, captions and a pass/fail table | Medium | 5 | 5 | 4 | 4 | **4.60** |
| 4 | **Call Debrief → Stories** (Scope Catcher, generalised; debrief) | Talk for two minutes after a stakeholder call: get stories, open questions and a scope-change flag | Writing up calls eats the evening, and scope creep nobody flagged becomes a missed date → tech leads, BAs, freelance devs, agency PMs | The daily post-call spoken debrief; stretch goal: import the call from Flow Notetaker | Pure web; sample scope and sample debrief one click away | A 30-second ramble becomes 4 stories, 3 open questions and a red "not in agreed scope: raise a change request" flag | Low | 5 | 4 | 5 | 4 | **4.55** |
| 5 | **Narrated Guide** (capture) | Do the task once while talking, and get a step-by-step guide with screenshots | Runbooks, setup guides and client user guides never get written, because typing and cropping each step is slow → devs writing runbooks; BAs writing user guides and training | One Flow per step | Same capture engine as #1; Markdown, HTML or .docx export | Five clicks with narration become a polished guide with 5 annotated screenshots and a warning box taken from an offhand remark | Medium | 4 | 5 | 4 | 5 | **4.45** |
| 6 | **Incident Scribe** (live ops) | Speak while you firefight: get the timeline, stakeholder updates and the postmortem draft | Nobody writes anything down during an outage, so the timeline gets rebuilt from Slack scraps → on-call devs, incident leads, go-live hypercare leads | Short spoken one-liners while your hands are in terminals | Pure web; "replay sample incident" button | Three spoken lines become a timestamped timeline and a ready-to-send status update | Low | 3 | 5 | 5 | 4 | **4.25** |
| 7 | **Spec Interviewer** (planning) | Ramble a feature idea, answer its sharp questions by voice, and get a spec your AI coding agent can follow | Vague prompts to Claude Code or Cursor produce wrong code and rework → devs who build with AI agents | The idea and every answer are spoken | Pure web | A 30-second ramble, then 5 questions you didn't think of, then spec.md with acceptance criteria and tasks | Low (crowd risk: High) | 4 | 4 | 5 | 4 | **4.25** |
| 8 | **Support Call → Dev Ticket** (debrief) | While the customer talks, narrate the problem, and get a dev-ready ticket plus what to ask before you hang up | Support tickets lack environment, steps and impact, so devs bounce them back → support, customer success, solution consultants | Narration during or right after the call | Pure web | A messy narration becomes a ticket with a red "missing: browser, account ID, since when" checklist | Low | 4 | 4 | 5 | 4 | **4.25** |
| 9 | **Point-and-Speak Review** (capture) | Click a spot on the staging UI and say what's off, and get a pinned comment with a crop and the element | UI feedback is scattered across Slack with vague screenshots → designers, PMs, devs reviewing staging | One Flow per pin | Works on the sandbox; real sites need an extension, because most block iframes | Three pins on a page become a fix list with crops and CSS selectors | Medium–High | 4 | 5 | 3 | 5 | **4.20** |
| 10 | **Estimate Out Loud** (planning) | Talk through a feature, and get a task breakdown, an effort range and the assumptions you'd forget | Estimates are given on the spot with no written assumptions, and then the date slips → leads and architects in services | Thinking aloud | Pure web | 40 seconds of talk becomes a task table, a 3-point estimate and an assumptions list | Low | 4 | 4 | 5 | 3 | **4.10** |
| 11 | **Handover Dump** (docs) | A 5-minute guided voice interview before you roll off or go on leave, and out comes the handover doc | Handovers get skipped or stay thin, and the knowledge leaves with the person → devs rolling off projects; shift handovers | You answer the interview prompts by voice | Pure web | Three spoken answers become a doc with in-flight work, gotchas, contacts and next steps | Low | 4 | 4 | 5 | 3 | **4.10** |
| 12 | **PR Storyteller** (code) | Paste a PR and say why you did it, and get the description reviewers wish they had | PR descriptions are empty or just restate the diff, while the "why" stays in the author's head → devs | A 60-second spoken "why" | A public PR via the unauthenticated GitHub API (60 requests/hour per IP), or a pasted diff | A diff plus a spoken "why" becomes context, risk, test notes and a reviewer guide | Low (crowd risk: High) | 4 | 4 | 5 | 3 | **4.10** |
| 13 | **Rubber Duck Log** (debug) | Think out loud while debugging, and get a hypothesis log, then the fix summary and commit message | Dead ends get lost, and the next person repeats them → devs | Spoken thoughts between attempts | Pure web | Four spoken notes become a tried/ruled-out timeline, a commit message and a lessons note | Low | 3 | 4 | 5 | 3 | **3.80** |
| 14 | **Voice ADR** (docs) | Say what you decided and why; it asks about the alternatives and consequences, then writes the ADR | Decisions go undocumented, and "why did we pick X?" comes up months later → architects, leads | Spoken decision and answers | Pure web | 30 seconds of talk becomes an ADR with an options table | Low | 3 | 4 | 5 | 3 | **3.80** |
| 15 | **Interview Synthesiser** (product) | After each user interview, talk through what you heard, and get insights clustered across interviews | Research notes pile up and never get synthesised → PMs, founders | A spoken debrief after each interview | Pure web | Three debriefs become an affinity map with quotes | Low | 3 | 4 | 5 | 3 | **3.80** |
| 16 | **Bug → Failing Test** (seed variant C; capture) | Narrate a failure, and get the ticket plus a Playwright test that reproduces it | "Can't reproduce", and devs rewrite the steps as tests by hand → devs, SDETs | The narration becomes the test name and assertion | The sandbox records clicks; real sites need an extension | One narration becomes a Playwright test that fails on the planted bug | High | 4 | 4 | 3 | 4 | **3.75** |
| 17 | **Accessibility Walk** (capture) | Keyboard through your app and say what breaks, and get issues mapped to WCAG | Accessibility issues get logged vaguely, and mapping them to WCAG needs an expert → devs before a release | Narration while you keyboard through the app | Sandbox plus tab share | "Tab skips the Pay button" becomes an issue tagged WCAG 2.4.3 Focus Order, with a fix | Medium | 3 | 4 | 4 | 4 | **3.70** |
| 18 | **Triage by Voice** (planning) | Read down the bug list and say your decisions aloud, and priorities, owners and duplicates update in bulk | Triage meetings are slow clicking → PMs, leads | Spoken decisions | Sample board; real Jira needs a token | One sentence updates five tickets | Medium | 3 | 4 | 4 | 4 | **3.70** |
| 19 | **Postmortem Room** (live ops) | Everyone involved narrates their side, and it merges them into one blameless timeline | Postmortems get written by one person from memory → teams after an incident | Each person dictates their account | Share-link rooms, no sign-up | Three accounts become one merged timeline, with conflicts flagged | Medium | 3 | 4 | 4 | 3 | **3.55** |
| 20 | **Voice Code Review** (code) | Walk a PR diff and speak your comments, and get kind, categorised comments on the right lines | Reviewers leave terse comments or none → devs | One Flow per comment | Reading a public PR works; posting needs a token | A blunt spoken comment becomes a polite, line-anchored comment tagged "blocking" | Medium | 3 | 4 | 4 | 3 | **3.55** |
| 21 | **Codebase Tour** (docs) | A senior dev talks through the repo, and new joiners get a guided tour with file links | Onboarding gets repeated live and is never written down → tech leads, new joiners | Narration per file | Public GitHub repo | Three narrated files become a tour page | Medium | 3 | 4 | 4 | 3 | **3.55** |
| 22 | **Release Notes Talker** (docs) | Say what matters to users this release, and commits plus your words become notes for users, support and sales | Release notes are late or written in dev-speak → PMs, devs | A spoken "what matters" | Pure web | Commit list plus 20 seconds of speech gives three audience versions | Low (crowd risk: High) | 3 | 3 | 5 | 3 | **3.50** |
| 23 | **Status from Voice** (docs) | Weekly status or stand-up from a spoken ramble | Status writing is a chore → everyone | A spoken ramble | Pure web | A ramble becomes a status email | Low (the organisers' own example idea: very crowded) | 3 | 3 | 5 | 3 | **3.50** |
| 24 | **vcommit** (code) | Dictate commit messages in the terminal, and it merges your words with the staged diff | Commit messages like "fix" and "wip" → devs | A Flow in the terminal at every commit | CLI only; the web fallback is a pasted diff, which is weak | Spoken "why" plus the diff becomes a conventional commit | Low | 3 | 4 | 2 | 3 | **3.05** |
| 25 | **Why-Comments** (code) | Paste a weird function and say why it's like that, and get the code comment and a README note | Tribal knowledge never reaches the code → devs | A spoken explanation | Pure web | Spoken reason becomes a comment | Low | 2 | 3 | 5 | 2 | **3.05** |
| 26 | **Spoken API Tester** (code) | Say the request and the expected response, and it runs the call and checks the result | Writing quick API checks → devs | Voice as a prompt box only | Pure web, but limited to CORS-friendly APIs | "POST a user, expect 201" turns green | Low | 2 | 2 | 4 | 3 | **2.65** |

### What the table says

- **One engine wins.** Four of the top five ideas are the same capture engine (a floating pad, voice as the shutter, frames plus sandbox telemetry) with a different output: a bug ticket (#1, #2), a test-evidence document (#3) or a how-to guide (#5). Build the engine once, and pick the output by which pain Maulik has every week. The other outputs become a single roadmap slide.
- **Debrief ideas** (#4, #8, #10, #11, #14) are low risk and pure web, but their "no hands" story is weaker (your hands aren't busy), and they sit close to Flow's own Notetaker. Present them as building on Notetaker, never replacing it.
- **Avoid:** anything that duplicates Flow itself (meeting summaries, dictating into an IDE), the organisers' example (status updates), and voice-as-a-prompt-box ideas (#26). They all lose points on the 30% Wispr question.
- **Most Wispr usage prize:** the capture ideas make Maulik speak all day while testing, which also feeds the ₹1 lakh word-count prize.

## 2. Top 7

### 1. Instant Replay Bug Report — 4.75 (seed variant A)

**Pitch.** Spot a bug, say what's wrong, and get a ready ticket with a screenshot, the last 15 seconds, console errors and the steps. Your hands never leave the mouse.

**Problem and user.** Developers, BAs and architects who test their own builds because there's no QA, which is common in services delivery and small SaaS teams, plus PMs clicking through staging. Today a bug found mid-flow costs about 3–5 minutes: stop, screenshot, crop, open the tracker, and type the steps from memory. So people either skip it ("I'll remember") or send a one-line Slack message ("coupon broken on staging?") that bounces back with "steps?".

**How it works.**
1. Open the link and pick what to test: the built-in demo shop, or "any tab" (one screen-share prompt).
2. A small floating pad opens on top of everything (Document PiP).
3. Use the app normally. The tool keeps a rolling 15-second frame buffer, and in the sandbox it also records clicks, console output and network calls.
4. When something's wrong, click the pad, hold Fn, and say what you see and what you expected. Let go.
5. Within seconds a ticket appears: a title, a severity with a reason, steps to reproduce (from recorded clicks in the sandbox, or inferred from the frames by Claude vision), expected vs actual, an annotated screenshot, a replay strip, console errors, failed requests and the environment.
6. Correct it by voice ("make it P2, it only affects admins"), then export as Markdown, a Jira CSV, or a prefilled GitHub or Linear new-issue link (those need no OAuth on our side).
7. At the end of the session you get every ticket sorted by priority, plus a one-paragraph summary for stand-up.

**Where Flow sits every day.** Every bug report is a Flow, so a one-hour testing session means 15–30 Flows of 20–60 words each. Flow is the only free input while your hands are on the mouse and your eyes are on the app, and each Flow triggers a capture. Onboarding links to Flow with the code `WEMAKEDEVS` (the Wispr growth judge will notice), and the tool deliberately has no speech recognition of its own: it's built for Flow. Small extra: the setup screen suggests adding the app's component names to Flow's dictionary, so they come out spelled right (check that the feature exists as I remember it).

**Live link for judges.** A hosted web app (for example on Vercel) plus one serverless function that holds the Claude key, with a per-IP rate limit and a daily spend cap. The default path is the built-in "Brokenly Shop", which has 5 planted bugs (a coupon that doesn't apply, a wrong total, a button that dies on the second click, a console `TypeError`, and a 500 on checkout). A "Play sample session" button covers judges without Flow or a mic, and typing into the pad also works. "Any tab" mode is Chrome and Edge only, needs one share prompt, and needs no extension.

**Strongest 20-second moment.** In the demo shop, apply `SAVE20`; the total stays at ₹1,499. Hold Fn: "Applied SAVE20, total didn't change, should be ₹1,199, this blocks every promo checkout." Three seconds later: a P1 ticket with the total boxed in red on the screenshot, the `TypeError` from the console, `POST /api/coupon 500`, four steps and a 15-second replay. Cut to the Slack message people send today: "coupon broken?".

**Baseline to prove it.** Log the same 5 planted bugs three ways: typed into Jira by hand, through a plain ChatGPT prompt with a pasted screenshot, and with the tool. Measure minutes per bug and a completeness score from 0 to 6 (steps, expected, actual, severity, evidence, environment).

**Privacy.** Frames stay in browser memory. Only the 3–5 frames around a report go to Claude, downscaled. Nothing is stored on the server. You can blur a region before export, and the pad flags anything in the narration that looks like a password or token and redacts it before sending.

**Build plan and risk: Medium.**
- Day 1: the four spikes.
- Days 2–3: demo shop and sandbox capture (console, fetch, clicks, DOM screenshot).
- Days 4–5: ticket generation (Claude vision with a fixed JSON schema) and the ticket UI.
- Day 6: voice corrections and exports.
- Day 7: "any tab" mode.
- Day 8: session summary and polish.
- Thu 29 Oct: freeze, stranger test, video.

The risky part is the zero-install chain (PiP + Flow + capturing a tab in the background). Steps inferred from frames on real apps may also be vague; sandbox steps are exact.

**Scores.** R5 (a weekly pain with a clear user; it's Maulik's own seed) · W5 (hands are busy, and voice is the shutter) · Wk4 (the sandbox path needs zero setup; "any tab" needs a prompt and is Chrome-only) · D5 (one sentence, one full ticket). Maulik fit: high.

**Cut first if behind:** "any tab" mode (keep the sandbox), voice corrections, Linear export.

### 2. Talk-through Tester — 4.60 (the seed)

**Pitch.** Dictate a test plan, run it with a checklist floating on top, narrate failures, and finish with prioritised tickets and a pass/fail report.

**Problem and user.** The same users as #1, plus a second pain: test plans never get written because typing one feels like paperwork, so coverage gaps show up in production.

**How it works.**
1. Describe the feature by voice ("we added coupon codes, one per order, they expire, admins can create them…").
2. Get 10–15 test cases covering the happy path, edge cases and negative cases.
3. Reorder or delete them by voice.
4. Run them with the checklist floating on top. For each case, say "pass" or describe the failure; failures go through the Instant Replay capture from #1.
5. Get a report: a pass/fail matrix, tickets by priority, and the cases you didn't test.

**Where Flow sits every day.** The plan and every result go through Flow, which means even more Flows than #1.

**Live link for judges.** Same as #1, with a sample feature description prefilled.

**Strongest 20-second moment.** A 20-second ramble about coupons becomes 12 test cases, including "expired code" and "two codes in one order", which nobody bothers to write when typing.

**Baseline to prove it.** Test cases written by hand in 10 minutes vs by the tool, and defects found with each set.

**Build risk: High.** It's #1 plus a plan generator, a runner and a report: three more screens to polish in 9 days. Build #1 first, and add the plan front end only if #1 is done by Mon 26 Oct.

**Scores.** R5 · W5 · Wk4 · D4 (a two-part story is harder to fit into 2 minutes). Maulik fit: high.

### 3. Evidence Pack — 4.60 (seed variant B)

**Pitch.** Run your UAT or regression cases while talking, and the test-evidence document writes itself.

**Problem and user.** In services delivery and regulated SaaS, clients, auditors or release managers ask for test evidence: for each test case, the steps, a screenshot per step, expected vs actual, pass/fail, the tester, the date and a sign-off. People build it in Word: run a step, take a screenshot, paste it, type a caption, repeat. A 20-case UAT can cost a full day of paperwork on top of the testing itself. The user is the consultant, BA or developer running UAT or regression for a client, and the release manager who collects the evidence.

**How it works.**
1. Import the test cases (paste from Excel or CSV, or dictate them).
2. The floating pad shows the current case and step.
3. Do the step, then Flow: "logged in as approver, approve button visible, matches expected." The screenshot is captured, the step is marked pass, and the caption is cleaned up.
4. A failure becomes a defect row (an Instant Replay ticket) linked to its case.
5. Export .docx and PDF in the browser (with the `docx` library): a cover page, a summary table, one page per case, a defect log and a sign-off block.

**Where Flow sits every day.** Every step result. The evidence captions are spoken, never typed. Because Flow already strips filler words, a **local-only mode** (no LLM call: captions go in exactly as dictated) is viable for confidential client UAT. That's a privacy story and a Wispr story in one.

**Live link for judges.** A sample test pack for the demo shop. Export runs entirely in the browser, with no sign-up.

**Strongest 20-second moment.** Three cases run in 40 seconds of talking (sped up in the video). Click Export and scroll a 9-page Word document with screenshots, captions, a pass/fail table and one defect: "this used to take me an afternoon."

**Baseline to prove it.** Take one of Maulik's real evidence documents (anonymised) and time the same 5 cases by hand vs with the tool.

**Privacy.** Real UAT has client data on screen, so it gets region blur, the local-only mode, and no storage on the server.

**Build risk: Medium.** The .docx layout is fiddly. And product and growth judges may read "evidence document" as paperwork, so the video has to lead with the time saved.

**Scores.** R5 (if Maulik confirms he produces these documents) · W5 · Wk4 · D4. Maulik fit: high, if confirmed. It's the same engine as #1, so it can also ship as an "Export as evidence pack" button on #1's session; the only decision is which output leads the story.

### 4. Call Debrief → Stories — 4.55 (Scope Catcher, generalised)

**Pitch.** Right after a stakeholder call, talk for two minutes. Get user stories with acceptance criteria, open questions, a scope-change flag against what's already agreed, and the follow-up email.

**Problem and user.** In client-facing development work, requirements from a call live in someone's head until evening. Writing them up takes 30–60 minutes, and new asks slip in without anyone saying "that's a change request", until they turn into missed dates. The user is the tech lead, BA, architect, freelance developer or agency PM.

**How it works.**
1. Once per project, paste the agreed scope (statement-of-work bullets or the backlog). It's kept in the browser.
2. After a call, give a 1–3 minute debrief with Flow.
3. Get a summary; stories in "As a… I want… so that…" form with Given/When/Then criteria; open questions to send back; items flagged as new compared with the agreed scope, each with a reason; a rough effort range; and a draft follow-up email.
4. Correct anything by voice, then copy it to Jira, Linear or email.

**Where Flow sits every day.** The post-call spoken debrief is the daily habit. Stretch goal: import the transcript from Flow Notetaker (if Wispr's MCP is reachable from our backend) and combine it with your debrief. The transcript says what was said; the debrief says what you think it means.

**Live link for judges.** Pure web, with a sample project scope and a sample debrief one click away. No mic needed.

**Strongest 20-second moment.** A 30-second ramble becomes 4 stories, 3 open questions, one red flag ("Not in agreed scope: bulk export to SAP. Raise a change request.") and an email ready to send.

**Baseline to prove it.** How long Maulik takes to write up one real (anonymised) call by hand vs with the tool, and how many open questions a plain chat prompt misses compared with ours.

**Build risk: Low.** The risks are strategic. Meeting-to-tasks tools are a crowded category. Your hands aren't busy, so the "No Hands" story is weaker. And it sits next to Flow's own Notetaker summaries, so it has to be positioned as building on Notetaker, not competing with it. Lead with the scope-change flag, because that's the part nobody else does.

**Scores.** R5 · W4 · Wk5 · D4. Maulik fit: high (several times a week).

### 5. Narrated Guide — 4.45

**Pitch.** Do the task once while talking, and get a step-by-step guide with annotated screenshots.

**Problem and user.** Runbooks, environment setup, deployment steps, release checks and client user guides are never written, or are out of date, because typing and cropping a screenshot for every step is slow. The users are developers writing runbooks and onboarding docs, and BAs writing client user guides and training material.

**How it works.** It uses the same capture engine as #1, and each Flow is one step. The frame at that moment, plus the click location in the sandbox, becomes an annotated screenshot. Claude turns the spoken steps into clear instructions and pulls asides ("careful, this clears the cache") into Note and Warning boxes. Export as Markdown, HTML or .docx.

**Where Flow sits every day.** One Flow per step.

**Live link for judges.** A sandbox task ("invite a teammate in the demo admin") plus "any tab" mode.

**Strongest 20-second moment.** Five narrated clicks become a polished guide with 5 screenshots, numbered steps, and a warning box taken from an offhand remark.

**Build risk: Medium.** It shares the engine with #1. There's also crowd risk: screenshot-guide tools already exist (though not voice-first), and judges may know them.

**Scores.** R4 (Maulik probably writes guides less often than he reports bugs) · W5 · Wk4 · D5. Maulik fit: medium. It's the cheapest second output to add on top of #1.

### 6. Incident Scribe — 4.25

**Pitch.** Speak while you firefight, and get a timestamped timeline, stakeholder updates on schedule, and the postmortem draft.

**Problem and user.** During an outage or a go-live issue, your hands are in terminals and your eyes are on dashboards. Nobody writes anything down, managers keep pinging for updates, and the postmortem timeline gets rebuilt from Slack scraps. The users are on-call developers, incident leads and go-live hypercare leads.

**How it works.**
1. Start an incident with a title and a severity.
2. Flow one-liners as you go: "error rate 12% on payments", "rolled back to 4.2", "error rate falling".
3. Each line is timestamped and tagged automatically as an observation, action, hypothesis or decision.
4. Every 15–30 minutes, the tool drafts a plain-language stakeholder update you can copy with one click.
5. At the end, you get a blameless postmortem draft: timeline, impact, root-cause hypotheses, and action items with owners.

**Where Flow sits every day.** It's the only input during the incident.

**Live link for judges.** Pure web, with a "replay sample incident" button.

**Strongest 20-second moment.** Three spoken lines become a timeline and a ready-to-send update: "Payments degraded since 14:02; rollback in progress; next update 14:30."

**Build risk: Low.** The risk is that Maulik's own incidents are rare, which weakens the "your own work" claim, and the demo needs a staged incident.

**Scores.** R3 · W5 · Wk5 · D4. Maulik fit: low to medium (go-live hypercare only).

### 7. Spec Interviewer — 4.25

**Pitch.** Ramble a feature idea. It asks the questions a senior engineer would, you answer by voice, and out comes a spec and task list your AI coding agent can follow.

**Problem and user.** When building with Claude Code or Cursor, vague prompts produce wrong code and rework. Writing a full spec by typing feels slow, so people skip it. The user is any developer working with AI coding agents, including Maulik during this hackathon.

**How it works.**
1. Speak the idea.
2. Get 5–7 targeted questions (edge cases, data, auth, non-goals).
3. Answer each one by voice.
4. Get spec.md: goal, non-goals, stories with acceptance criteria, data model, API, test plan and task list, plus a "Copy for Claude Code" button and an optional CLAUDE.md snippet.

**Where Flow sits every day.** The idea and every answer. Maulik can use it on this hackathon's own build, which is a strong story: "I built this tool with this tool."

**Live link for judges.** Pure web.

**Strongest 20-second moment.** A 30-second ramble, then questions you hadn't thought of, then a clean spec.

**Build risk: Low.** The strategic risk is high: voice plus AI coding is the obvious idea at this hackathon, and Flow already markets dictating into Cursor, so it's hard to stand out.

**Scores.** R4 · W4 · Wk5 · D4. Maulik fit: high, but crowded.

## 3. Top-3 recommendation

### Pick 1: Instant Replay Bug Report (4.75)
**Why.** It has the highest score. It answers the screenshot worry head-on, it's the most literal "No Hands" story (hands on the mouse, voice as the shutter), and its before/after ("coupon broken?" vs a full ticket) lands with product and growth judges in seconds. It's Maulik's seed idea, sharpened, and it can grow into Evidence Pack or Narrated Guide by adding an export, without a rewrite.
**Biggest risk.** The zero-install capture chain (Document PiP + Flow inserting into it + background tab capture) is unproven and Chrome-only. Mitigation: run the four spikes on day 1. The sandbox path depends on neither PiP nor screen share, so the judge path stays safe even if "any tab" mode slips.

### Pick 2: Evidence Pack (4.60)
**Why.** It's the sharpest "real problem in my own work" if Maulik confirms he produces test evidence for clients. It's far less crowded than bug reporting. It shares the engine with Pick 1, so the choice between them can wait until day 3 with no wasted work. And the local-only mode built on Flow's cleanup is a privacy story and a Wispr story at once.
**Biggest risk.** Product and growth judges may not feel the pain of "test evidence documents", which sound like paperwork. The video has to open with the number (one afternoon down to about 10 minutes) and a real, anonymised before/after document.

### Pick 3: Call Debrief → Stories (4.55)
**Why.** It has the lowest build risk, it's pure web (Works 5), and it fits Maulik's most frequent pain. It's the safe fallback if the capture spikes fail.
**Biggest risk.** It's a crowded category with a weaker "no hands" story, and it overlaps with Flow's own Notetaker. Mitigation: lead with the scope-change flag, and build on Notetaker (import the transcript) rather than beside it.

### Where I'd push back
- **Don't submit the full seed loop (#2) as the product.** The test-plan front end adds a third set of screens and doubles the risk without raising any score. Treat it as a stretch goal after Mon 26 Oct.
- **Spec Interviewer is tempting** because Maulik lives in Claude Code, but it's the crowd's idea.
- **Give the tool no speech recognition of its own** (no Web Speech API). It would sideline Flow and cost points on the 30% Wispr question. A text field plus Flow is the design; typing is only the fallback for judges.

### Questions for Maulik (answer by Tue 20 Oct)
1. In a normal week, which do you do most, and roughly how many minutes does each take: reporting bugs you hit while clicking through a build, producing test evidence for a client, or writing up calls?
2. Can you anonymise one real example of that output (a bug ticket, an evidence document or a call write-up) to use as the baseline?
3. Can I spend the first half-day on the four capture spikes before we lock the idea?
