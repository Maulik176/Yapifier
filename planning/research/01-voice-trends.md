# Voice-first and voice-AI products for developers, 2025–2026

Researched Mon 19 Oct 2026 for the Wispr "No Hands" challenge (Builders track). Sources: Product Hunt pages, Hacker News (via the Algolia API), GitHub API, Wispr/Anthropic/TechCrunch coverage, vendor blogs.

**Evidence tags used throughout**
- **[V]** verified: I opened the page or API and saw the number myself on 19 Oct 2026.
- **[R]** reported: it came from a search summary, an aggregator (hunted.space, aitoolly) or a vendor page I did not open. Treat as likely, not certain.
- **[I]** my inference.

**Not covered:** X/Twitter (no usable access from this session; the Karpathy tweet is known only through Superwhisper's page). YC launches were checked only through Launch HN threads and one directory search. Product Hunt was scanned through product pages and the monthly leaderboards for Apr, Aug, Sep and Oct 2026, not every daily board.

---

## 0. The picture in five lines

1. **Plain dictation is now a commodity.** Wispr has a $2B valuation [V], while free local clones keep arriving: Handy has 34k GitHub stars [V], and Hacker News search shows 95 "Show HN" posts with "voice dictation" since Jan 2025, most under 5 points [V].
2. **The 2026 energy moved to "voice as the control layer for coding agents".** Anthropic shipped `/voice` in Claude Code (Mar 2026), Cognition shipped Devin Voice (Sep 2026), Omnara added a voice agent, and a long tail of "talk to Claude Code" tools appeared.
3. **Voice launches reliably rank on Product Hunt.** Wispr (3 times), Typeless (2 times), Claude Code Voice Mode, Aqua, Willow, Voiskey and others hit #1–#3 of the day [V].
4. **Nobody owns voice-first QA or bug reporting.** The voice bug-report extensions I found have 0–18 users [R], and Hacker News has no Show HN for it [V]. Jam (bug reports with logs and an MCP server) has a reported 250–300k users, but it is video-first, not voice-first [R].
5. **For us:** a tool whose *output* is a ticket, test log or document will stand out from the 100 tools whose output is text.

---

## 1. The 15 most relevant products

Numbers on Product Hunt (PH) pages: where a launch card shows two numbers, the larger is almost certainly upvotes and the smaller comments. The page doesn't label them, but Typeless Android's "206" matches hunted.space's 215 upvotes [I].

| # | Product and URL | What it is | Traction | Why it resonated | Gap it leaves open |
|---|---|---|---|---|---|
| 1 | **Wispr Flow** — https://wisprflow.ai | System-wide AI dictation (hold a key, text appears in any field). Dev features: file tagging in Cursor/Windsurf, variable recognition, Warp partnership. Notetaker (Aug 2026), Android, read-only MCP connector. | PH: 5 launches, #1 of the day on Sep 2024 (~2,706 votes), Mar 2025 (786) and Aug 2026 Notetaker (585); 4.7 from 81 reviews, 9K followers [V]. Series B $280M at $2B, 17 Aug 2026; "millions of users, 125k businesses, revenue +150% for 4 quarters" (company claims) [V]. | Works everywhere with no setup; cleans filler words; developers asked for file tagging (Wispr says 90% of messages did) [V, vendor claim]. | General-purpose: output is text, not a ticket, test log or PR. Cloud-based and pricey for some on HN (BetterWispr thread) [V]. A third-party blog alleges heavy local data collection (unverified, no Wispr reply shown) [V]. |
| 2 | **Typeless** — https://www.producthunt.com/products/typeless-2 | Cross-platform AI voice keyboard ("dictation that's actually intelligent"). | PH: #1 of the day Nov 2025 (574) and Dec 2025 iOS (571), #3 Android Jan 2026 (206); 4.9 from 11 reviews, 2.3K followers [V]. | Turns rough speech into clean writing on phone and desktop; the phone launches did well. | Generic writer's tool; per-app style control requested by reviewers [V]. Nothing dev-specific. |
| 3 | **Willow Voice** (YC) — https://willowvoice.com | Dictation across Mac/iOS with a "Willow for Developers" angle ("Dictation for Cursor & AI IDEs"). | 5 PH launches in 8 months: Developers 11 Feb 2026 (144), Teams 5 Mar (152), Scribe 26 May (154), Frontier Pro 8 Jul (278, #3 of day), Knowledge 6 Oct (147); 4.8 from 12, 1.8K followers [V]. Funding ~$4.2–4.5M [R]. Its 2025 Show HN got 3 points [V]. | Relentless cadence of themed launches. | Same gap: dictation, not workflow. Shows that vendors now chase developers, so "dictate into Cursor" is no longer novel. |
| 4 | **Aqua Voice** (YC) — https://withaqua.com | Fast dictation for Mac/Windows; own speech model "Avalon". | Show HN Apr 2025: 140 points, 83 comments [V]. PH 15 Apr 2025: #2 of day, 570 votes, 5.0 from 16 [V]. Vendor benchmark of 97% on technical terms is self-published [R]. | Speed and accuracy on coding/AI vocabulary. | Cloud-only (reviewers) [R]. No output beyond text. |
| 5 | **Superwhisper** — https://superwhisper.com | Mac/iPhone dictation, runs Whisper locally; custom modes. | PH 4.9 from 22 reviews [V]; Show HN Aug 2023 [R]. Its page credits Karpathy's Feb 2025 "vibe coding" post for the "just talk to Composer" habit [R]. | Local processing plus power-user modes. | Mac-centric and configuration-heavy; dictation only. |
| 6 | **Claude Code voice mode (`/voice`)** — https://support.claude.com/en/articles/11101966-using-voice-mode | Built into Claude Code: hold space, speak, release; transcript lands at the cursor. Free, does not use rate limits. | Rolled out 3 Mar 2026 to about 5% of users [V, implicator.ai]. HN: 24 points and 11 points on two submissions [V]. A separate PH listing "Claude Code Voice Mode" got 397 votes, #1 of the day on 2 Apr 2026 [V]. | Zero install for people already in Claude Code. | Terminal only, text only, not in the Agent SDK [V]. No screenshots, no structured output. The PH listing describes spoken replies, which the implicator.ai report says the official feature lacks, so the two may not be the same product [V]. |
| 7 | **Devin Voice** (Cognition) — https://www.producthunt.com/products/devin-voice | Speak a task; Devin plans, codes and ships it. Uses GPT-Live plus Cognition's SWE-2 model. | PH: 120 votes, #8 of the day, free, 81 followers; launch around 10 Sep 2026 (PH says "1 month ago") [V]. | Big-name agent with a voice front door. | Delegation only; no reporting, QA or review. Smaller reception than Claude Code's built-in voice. |
| 8 | **Omnara** (YC S25) — Launch HN thread | Run Claude Code/Codex from your phone; voice agent added because users wanted hands-free use while walking or driving. | Launch HN 12 Feb 2026: 147 points, 161 comments [V]. $20/month after 10 free sessions. | Real "away from the desk" use case; polished UI. | No end-to-end encryption; "it's a wrapper" and price objections; commenters name free alternatives (Happy, Tailscale+tmux) [V]. |
| 9 | **VoiceMode MCP** — https://github.com/mbailey/voicemode | MCP server for two-way voice conversation with Claude Code and other agents. | 1,404 GitHub stars (created Jun 2025, pushed 17 Oct 2026) [V]. Its Show HN got only 8 points [V]. | Early, open, works with any MCP client. | Setup-heavy (local speech services); a known break with Claude Code 2.1.105+ [R]. |
| 10 | **"Talk to your agent" long tail** — Ski (heyski.io), Luke, Atticus, AgentWire, Nura Dev | On-device voice front-ends for Claude Code/Codex, voice planning, hold-to-talk Mac assistant on `claude -p`. | Atticus: Show HN 12 Oct 2026, 116 points, 30 comments (maker is a 9th grader) [V]. Ski: 15 points, 14 comments, Jul 2026 [V]. Luke: 5 points, 7 Oct 2026 [V]. Most others 1–7 points [V]. | Hold-to-talk, free, local; "Siri that actually works". | Crowded, copy-able, all desktop installs. None reports a result a non-developer could grasp in 10 seconds. |
| 11 | **Open-source dictation wave** — Handy (github.com/cjpais/Handy), VoiceInk, FreeFlow, Ghost Pepper, Whispering, BetterWispr | Free, offline or BYO-key Wispr alternatives. | GitHub stars [V]: Handy 34,116; VoiceInk 6,853; Whispering/epicenter 4,823; Ghost Pepper 3,208; FreeFlow 2,939. HN: Whispering 591 points (Aug 2025), Ghost Pepper 467 (Apr 2026), FreeFlow 277 (Feb 2026), BetterWispr 220 (11 Oct 2026) [V]. | Free, private, no subscription; commenters say rambling prompts work fine because the LLM tidies them [V]. | All stop at "text in a box". Commenters themselves ask "what sets this apart?" [V]. |
| 12 | **Trace** — https://traceapp.info | Offline Mac meeting recorder; a hotkey flags "key moments" with a typed note, inline in the transcript. $9.99 one-off. | Show HN 13 Jun 2026: 205 points, 84 comments [V]. | One unobtrusive hotkey to mark the moment while you stay in flow; one-time price; local audio. | No summary or ticket output; markdown transcript only. Users asked for calendar integrations and non-English [V]. |
| 13 | **VoiceDraw** — https://voicedraw.com | Talk through a system design and the diagram draws itself (Excalidraw-based), with trade-offs and open questions beside it. | Show HN 16 Jun 2026: 49 points, 20 comments [V]. | A visible artifact appears while you talk; web, no install. | Accessibility (a blind developer found the descriptions unusable), mobile bugs, privacy questions; only diagrams [V]. |
| 14 | **Granola** (plus Spinach, Circleback, Earmark) — https://granola.ai | Meeting notes that push action items to Jira/Linear/Asana after human review. | Series C $125M at $1.5B, Mar 2026 [R]. Cursor and Gusto named as bottom-up adopters [R]. | Notes you review before anything syncs. | Vendor posts say many notetakers stop at a summary and leave ticket-writing to you [R]. |
| 15 | **Voice-style bug reporting** — Jam (jam.dev), QA Mode, BugReporter, Voice2Bug, Disbug | Jam: bug reports with console/network logs, plus a Jam MCP server (Mar 2026) that hands the context to coding agents. The rest are small Chrome extensions: push-to-talk plus screenshot plus AI-written ticket. | Jam: 250k–300k users, figures conflict [R]; Jam MCP page shows no adoption numbers [V]. QA Mode: 18 users, v1.3.0 dated 9 May 2026; Voice2Bug: 0 users [R]. Disbug: PH about five years ago, 44 / 162 (labels unclear) [V]. Replay QA (AI QA, not voice): 412 PH votes on 20 Jul 2026 [V]. | Jam proves teams want agent-ready bug context. Disbug showed voice narration plus Jira years ago. | **Open lane.** Jam is video-first, so voice is only a transcript. The voice-first extensions have effectively no users, and nobody pairs voice with a *test-run checklist* where a spoken "fail" triggers the screenshot and the ticket [I]. |

**Also seen (not in the table):** Voiskey (PH #2 of day, 553, mid-Sep 2026; "voice typing that sounds right in every app", tone per audience) [V]; NovaVoice (PH Apr 2026, 560, #8; dictation plus app control by voice) [V]; Dograh (PH Aug 2026, 586, #3; open-source VAPI alternative for voice agents) [V]; CursorTalk (PH, 83, #23; local lifetime-price dictation) [V]; Google AI Studio's build-by-voice launch (PH 11 Oct 2025, #1, 371–499 votes depending on source) [R]; Standuply (voice/video async standups) and Kollabe (mic button for standups plus an MCP server that drafts standups from GitHub/Jira) [R]; Talon (hands-free coding) not researched.

---

## 2. Coverage by developer workflow

| Workflow | What exists | Voice-first gap |
|---|---|---|
| Bug reporting and QA | Jam, Marker-style tools, tiny voice extensions (row 15) | Spoken test-run with auto screenshot, no recorder to watch afterwards |
| Standups | Standuply (voice/video), Kollabe (mic + MCP) [R] | Spoken standup *checked against* real git/ticket activity; no strong product found |
| PR descriptions and commit notes | Diff-only generators (gpr, commitbot, mercury, gitta) [R]; dictation blog posts | Combine *spoken intent* ("why") with the diff; the generators have no voice and the dictators have no diff |
| Code review | AI reviewers (e.g. Kilo Code Reviewer, Jan 2026) [R], none voice-first | Spoken review comments turned into inline suggestions; unverified demand [I] |
| Docs and design | VoiceDraw (49 pts), Dicty "dev documentation" (2 pts) [V] | Voice to ADR, runbook or postmortem; the only visual one has accessibility and mobile issues |
| Debugging | Voice conversation with agents (VoiceMode MCP, Ski) | Nothing found that captures the *error plus screenshot plus spoken hypothesis* together [I] |
| Vibe coding / prompting | Everything in rows 1–11; Cursor has voice only in its Agent prompt [R, vendor blog]; Copilot reportedly none [R] | Saturated |
| Meeting to ticket | Granola, Spinach, Circleback, Earmark [R] | Review gate, dedupe against existing tickets, acceptance criteria |
| Voice agents for dev workflows | Devin Voice, Omnara, Ski, Atticus | Lots of control surfaces, few *outputs* anyone can verify |

---

## 3. Patterns that make voice-first products take off

1. **One key, text where the cursor is.** Wispr, Claude Code (hold space), Ghost Pepper, Atticus and Trace all start from a hold-to-talk or single hotkey with no mode change. Claude Code's built-in version arrived with zero install and ranked #1 on PH. Anything needing a window switch loses.
2. **The output is an artifact, not a transcript.** VoiceDraw draws a diagram, Granola makes action items, Typeless makes clean prose, Google AI Studio turns speech into an app, Devin ships code. Transcript-only tools are what the 95 forgotten Show HNs are.
3. **Product Hunt rewards voice; Hacker News rewards free, local and open.** Wispr, Typeless, Aqua, Willow and Voiskey all hit the PH top 3, while Willow's Show HN got 3 points and the free clones got 220–591. A judge from a product/growth background will behave like PH, not HN [I].
4. **Privacy and price are the live grievance.** Local and BYO-key clones ride on "no subscription, nothing leaves my machine" (Whispering, Ghost Pepper, BetterWispr). Omnara lost points for no E2EE. Someone alleged Wispr collects more than expected, and a commenter said a Wispr cleanup turned "don't" into "do" [V]. Showing the transcript, a review step and redaction is an advantage.
5. **Voice became the interface for long-running agents.** Omnara added a voice agent because people wanted to walk and drive. HN commenters say rambling spoken prompts work because the model organises them [V]. The demand is real, but many near-identical launches (rows 9–10) already serve it.
6. **A narrow job in a named app beats generic dictation.** Wispr's own dev story is file tagging in Cursor, Willow launched "for Developers", Trace does one thing (flag a moment mid-call). The job-specific wins are the ones that get a second launch.
7. **No-install and one-URL demos get spread.** VoiceDraw (web, no install) and Atticus (free, open, a plain demo) drew far more discussion than their feature lists suggest. The same ask came up on Product Hunt: "does it work over SSH, without a local mic?" [V]. Our rule of a live link with a "try a sample" button is consistent with this.
8. **Human-in-the-loop review is what makes AI tickets trusted.** Granola asks for approval before syncing; vendor posts warn that auto-pushed summaries fill boards with tickets nobody trusts [R]. Atticus asks before risky actions [V]. A review screen is a feature, not friction.

---

## 4. Gaps a solo developer could fill in 10 days with a live web demo

Scored against the judging weights (30 real problem / 30 Wispr in the workflow / 25 works as a live link / 15 demo), 1–5 each. **These scores are my estimates [I].**

| Gap | Evidence it is open | Real | Wispr | Works | Demo | Weighted |
|---|---|---|---|---|---|---|
| **G1. Talk-through bug capture plus test-run log.** Paste or drop a screenshot (or share a tab), narrate, and a spoken "fail" produces a structured bug (title, steps, expected vs actual, severity, priority, deadline) with the annotated screenshot, plus a running pass/fail list and export (Jira/Linear/GitHub markdown, CSV). | Voice extensions have 0–18 users [R]; no Show HN [V]; Jam shows demand and agents want the context [R]. | 4 | 5 | 4 | 5 | **4.45** |
| **G2. Voice note or transcript to tickets, with a review gate.** Paste or dictate; get stories with acceptance criteria, duplicate warnings, one-click approve. | Notetakers stop at action items [R]; crowded (Granola, Spinach, Earmark) so differentiation must be the review gate and quality [I]. | 4 | 4 | 5 | 3 | **4.10** |
| **G3. Voice to dev document or diagram** (postmortem, ADR, runbook, sequence diagram). | Only VoiceDraw (49 pts) and it has known accessibility and mobile gaps [V]. | 3 | 4 | 5 | 5 | **4.10** |
| **G4. Spoken intent plus diff to PR description or commit notes.** Paste a diff, dictate the why, get the PR in your team's format. | Generators take only the diff and none takes voice [R]. | 3 | 4 | 5 | 3 | **3.80** |
| G5. Spoken standup checked against git/ticket activity. | Closest is Kollabe [R], and it is the organisers' own example idea (see BRIEF.md idea D). | 3 | 3 | 3 | 3 | 3.00 |

**How I'd reason about the top gaps**
- **G1 and G2 share a backend.** A bug is a ticket; G1 is the voice-first front end and G2 is the batch path. One app can cover both.
- **Screenshots are solvable on the web without Flow.** [I] A browser can take an image by paste, drag-and-drop, or the screen-capture prompt (`getDisplayMedia`), none of which needs an account. Flow types into any text field, so a plain textarea is already the Flow integration; add a "try a sample" button and a text-only fallback so judges without a mic or Flow still see it work.
- **Push back on the obvious path.** Bug reporting is not empty: Jam has hundreds of thousands of users. The differentiation must be *hands-free testing with a checklist and an immediate structured ticket*, not "another recorder". Judges (product and growth people) will compare it to Loom and Jam in their heads.
- **Wispr's MCP connector is not a shortcut.** It is read-only, covers meetings, transcripts, summaries, calendar and Scratchpad notes but not dictation history, needs Notetaker plus Cloud Sync, and signs in through browser OAuth [R]. A no-sign-up web demo cannot depend on it; offer "paste your Notetaker export" instead.
- **Privacy both ways.** Redact names, emails and tokens before sending text to an LLM, say so on screen, and keep nothing after the session (see the privacy rule in BRIEF.md).
- **Baseline to prove:** minutes to write a bug by hand vs by voice, and missing fields in a one-line typed ticket vs ours, as the BRIEF asks.

---

## 5. Sources

### Verified: opened and checked on 19 Oct 2026 [V]
Product Hunt
- Claude Code Voice Mode — https://www.producthunt.com/posts/claude-code-voice-mode
- Devin Voice — https://www.producthunt.com/products/devin-voice
- Typeless — https://www.producthunt.com/products/typeless-2
- Wispr Flow — https://www.producthunt.com/products/wisprflow
- Willow Voice — https://www.producthunt.com/products/willow-voice
- Aqua Voice — https://www.producthunt.com/products/aqua-voice
- Voiskey — https://www.producthunt.com/products/voiskey
- CursorTalk — https://www.producthunt.com/products/cursortalk-for-macos
- Disbug — https://www.producthunt.com/p/disbug
- Wispr file-tagging post — https://www.producthunt.com/p/wisprflow/introducing-file-tagging-with-flow-in-cursor-windsurf
- AI dictation apps category — https://www.producthunt.com/categories/ai-dictation-apps
- Monthly leaderboards — https://www.producthunt.com/leaderboard/monthly/2026/4, /2026/8, /2026/9, /2026/10
- Launchrs, top 10 of 20 Jul 2026 (Replay QA) — https://launchrs.com/launch-lessons/product-hunts-top-10-launches-on-2026-07-20-ai-workflows-agent-context-and-founder-tooling/

Hacker News (Algolia API, queries run 19 Oct 2026)
- https://hn.algolia.com/api/v1/search?query=voice%20dictation&tags=show_hn (95 hits since Jan 2025)
- https://hn.algolia.com/api/v1/search?query=voice%20coding&tags=show_hn
- https://hn.algolia.com/api/v1/search?query=voice&tags=show_hn&numericFilters=points>40
- https://hn.algolia.com/api/v1/search?query=Wispr%20Flow&tags=story
- Threads opened: Trace https://news.ycombinator.com/item?id=48521236, VoiceDraw ?id=48560454, Atticus ?id=50049588, BetterWispr ?id=50042333, Ski ?id=49113559, FreeFlow ?id=47040375, Omnara ?id=46991591

GitHub API (stars as of 19 Oct 2026)
- https://api.github.com/repos/cjpais/Handy (34,116)
- https://api.github.com/repos/Beingpax/VoiceInk (6,853)
- https://api.github.com/repos/epicenter-so/epicenter (4,823)
- https://api.github.com/repos/matthartman/ghost-pepper (3,208)
- https://api.github.com/repos/zachlatta/freeflow (2,939)
- https://api.github.com/repos/mbailey/voicemode (1,404)

News and vendor pages
- Claude Code voice mode rollout (3 Mar 2026) — https://www.implicator.ai/anthropic-adds-voice-mode-to-claude-code-starting-with-5-of-users/
- Wispr $280M Series B (17 Aug 2026) — https://pulse2.com/wispr-raises-280-million-at-2-billion-valuation-as-revenue-grows-150-quarterly-and-voice-ai-push-accelerates
- Canto model and enterprise claims — https://www.reworked.co/ai-platforms/wispr-hits-2b-valuation-launches-canto-voice-model/
- Wispr Notetaker (5 Aug 2026) — https://techcrunch.com/2026/08/05/wispr-flow-is-preparing-to-launch-a-meeting-notetaker-updated-terms-suggest/
- Wispr developer claims — https://wisprflow.ai/vibe-coding
- Jam MCP listing — https://aitoolsatlas.ai/tools/jam-mcp
- Third-party Wispr data-collection post (the author's claims, unverified, no Wispr reply shown) — https://wensenwu.com/thoughts/wispr-flow-investigation

### Reported only: search summaries or pages I did not open [R]
- Granola Series C — https://thenextweb.com/news/granola-series-c-meeting-ai-enterprise-context and https://www.implicator.ai/granola-raises-125-million-at-1-5-billion-valuation-for-ai-notetaker.md
- Willow funding and growth — https://techcrunch.com/2025/11/12/willows-voice-keyboard-lets-you-type-across-all-your-ios-apps-and-actually-edit-what-you-said
- Aqua Avalon benchmark and Cursor voice scope (vendor blogs) — https://aquavoice.com/blog/voice-coding-cursor-claude-code
- Karpathy's "vibe coding" post, via Superwhisper — https://superwhisper.com/vibe-coding
- QA Mode, BugReporter, Voice2Bug (Chrome Web Store results; the store pages did not load for me) — https://chromeboard.com/extension/qa-mode-bmfipfnnoopneendkphalgaobfbjflod
- Jam user counts and funding (conflicting) — https://www.everydev.ai/developers/jam-inc
- Standuply, Kollabe — https://standuply.com/voice-messages-in-slack, https://kollabe.com/product-updates/meet-your-standup-assistant
- Wispr MCP connector docs — https://docs.wisprflow.ai/articles/4759919286
- Google AI Studio on PH — https://www.hunted.space/dashboard/google/launches/google-ai-studio-2
- Meeting-to-ticket vendor guides — https://www.granola.ai/blog/meeting-action-items-to-task-manager, https://www.spinach.ai/blog/automatically-create-jira-tickets-from-zoom-meeting-notes

### Inferred [I]
- Which PH number is upvotes (larger one) and the reading of HN vs PH audiences.
- All gap scores in section 4, and the claim that no voice-first product pairs a spoken test-run checklist with auto-screenshots (absence of evidence from the searches above, not proof).
- The browser screen-capture and clipboard route for screenshots (standard web APIs; not tested in this session).
