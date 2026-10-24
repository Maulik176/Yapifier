# 02 — Developer pains, and is voice-first QA / bug reporting still open?

Researched Mon 19 Oct 2026. Every URL below was either opened this session ("verified") or only seen in a search snippet ("search-only"); section 5 marks each one. Anything that is my own judgement is marked "inferred".

## Limits of this research (read first)

- **Reddit and X could not be reached.** Reddit blocked search, direct fetch and the in-app browser. X was not tried, because it needs a login. There are no Reddit or X links in this file. The "how often" ranking therefore leans on surveys (Stack Overflow, Atlassian, JetBrains) and on Hacker News threads. If Maulik wants Reddit proof, he can search r/QualityAssurance, r/webdev and r/ExperiencedDevs himself for "bug report", "no QA" and "devs testing their own code".
- **Quote rule.** Only one quote appears word-for-word (section 1, pain 7). Everything else from forums is paraphrased and linked.
- **Pricing was read from vendors' own pages on 19 Oct 2026.** Several pages showed two price sets, or didn't say which plan includes which feature. Those cases are flagged, and every price should be re-checked before it goes into a public slide.

---

## 1. Top 10 developer pains, ranked

**How I ranked:** breadth first (what share of developers report it in a large survey), then intensity (does it top an "what costs you the most" list, or draw strong reactions in a thread). "Voice fit" is how well speaking beats typing for that pain, which is what matters for us. The order is my judgement, built from the evidence shown.

| # | Pain | Evidence | Voice fit |
|---|---|---|---|
| 1 | **Finding information**: docs, services, APIs, "who knows how this works" | Atlassian's 2025 DevEx report (3,500 developers and managers) ranks finding information first among causes of lost time. 50% of developers lose 10+ hours a week to organisational inefficiency, up from 33% a year earlier, and 90% lose 6+ hours [A]. Stack Overflow 2024: 61% spend over 30 minutes a day searching for answers (the page text says 61%; its chart adds up to 63.8%). 29.6% hit knowledge silos 10+ times a week [B]. | Low |
| 2 | **Technical debt** | Stack Overflow 2024: 62.4% name the amount of technical debt as a work frustration, the top item [B]. Not confirmed for 2025. Atlassian says tech debt dropped out of its top five in 2025 [A], so treat this as a long-running pain that may be easing. | Low |
| 3 | **Context switching and interruptions** | Atlassian ranks context switching between tools third among causes of lost time [A]. Gloria Mark's workplace study, often quoted: interrupted work resumes after about 23 minutes 15 seconds on average, and that includes time spent on other tasks in between, so it is not a pure recovery time [C]. | **High** (Flow works inside whatever app has focus) |
| 4 | **Waiting on other people**: answers, reviews, approvals | Stack Overflow 2024: 53% agree or strongly agree that waiting on answers disrupts their workflow; 62.8% spend 30+ minutes a day answering others' questions [B]. Atlassian adds that cross-team collaboration has moved up as a friction point [A]. | Medium |
| 5 | **Nearly-right AI code and the time spent debugging it** | Stack Overflow 2025 (new this year): the top AI frustration is answers that are close but not quite right, at 66%. 45.2% say debugging AI-generated code is more time-consuming. Only 3.1% highly trust AI accuracy; 84% use or plan to use AI tools [D]. | Medium (better corrections and prompts, spoken) |
| 6 | **Tool sprawl and unreliable tooling** | Stack Overflow 2024: complexity of the build stack 32.9%, of the deployment stack 32.3%, unreliable tools or systems 31.5%, number of tools 22.8% [B]. | Low |
| 7 | **Bug reports that bounce: missing steps, screenshots and logs** | Breadth is not measured in any survey I found, but intensity is clear. Jam's launch thread on Hacker News reached 886 points and 233 comments [E]. Commenters there say teaching non-technical people to write decent bug reports is among the hardest things in tech, and that getting good communication between support and engineering is a steep climb. A separate Show HN thread (335 points, 208 comments) is about users not reporting bugs unless it's made easy [F]. In it one commenter writes: "Reporting bugs is work, and is a two-way street" (cwillu). Others say they stop when reports vanish unanswered. Academic work also names poor reproduction steps as a documented cost in triage [G] (search-only). BugReel's guide claims 10–20 minutes per manual report and 40%+ returned for more information, but it is a vendor and I could not trace its sources [H]. | **Very high** |
| 8 | **Testing under time pressure, often with no QA** | Katalon's 2025 State of Quality survey of 1,400 QA professionals: insufficient time for thorough testing (55%) and heavy workload (44%) are the top obstacles [I] (search-only). That is a QA-professional sample. "Developers and BAs test without a QA" comes from Maulik's own context, and I did not find a survey that measures it (inferred). | High |
| 9 | **Documentation that is missing or stale** | GitHub's 2017 Open Source Survey: 93% say incomplete or outdated documentation is a problem, and 60% rarely or never contribute to it [J] (search-only, 9 years old, open-source setting). Atlassian's #1 pain, finding information, is the other side of the same problem [A]. | High |
| 10 | **Reporting upward: tracking work, status, metrics** | Stack Overflow 2024: tracking my work 27.1%, showing my contributions 19.6% [B]. JetBrains 2025: 36% don't believe their productivity metrics reflect their contribution, and a further 30% aren't sure [K]. Atlassian: 63% say leaders don't understand their pain points, up from 44% [A]. | High |

**What the ranking says about our idea.** By breadth, bug reporting (#7) is a mid-table pain. Pains 1–6 are bigger, but speaking does little for them. Pain 7 has the best voice fit, and the Jam thread proves strong demand for better bug capture. The best claim for our tool is "a pain that matters and where voice is the right input", not "the biggest pain".

**One supporting fact for the voice angle:** a 2016 Stanford, UW and Baidu study found speech input about 3.0x faster than typing for English on a phone, with 20.4% fewer errors [L] (search-only, mobile typing, so it does not transfer one-to-one to a keyboard).

---

## 2. Competitor table: QA and bug reporting

Prices are as read on 19 Oct 2026. "Auto" means captured without the user doing anything.

### 2a. Established tools

| Tool | Auto-captures | Voice | Pricing | Weak spots |
|---|---|---|---|---|
| **Jam.dev** [M] | Console and network logs, user events, device details attached to recordings; screenshots and screen recordings from the Chrome extension, a Mac app and an iOS app. AI suggests title, summary and repro steps. Has an MCP server for coding agents (search-only [N]). Claims 300,000+ users. | Transcription and captions appear in the feature list, so a mic narration is likely supported, but nothing is described as voice-first. | Free: 30 Jams/month, 5-minute recordings, 5 creator seats, 30 AI summaries. Team: $14 per creator per month (billed yearly), 15-minute recordings. Enterprise: custom. | Short free recordings. Per-seat pricing. On HN some commenters worried it feels like a keylogger and could be used to monitor employees. Extension is Chromium-only. No test-plan layer. |
| **Marker.io** [O] | Screenshot with annotation, browser and environment data; console logs and network requests are listed in the comparison table (plan not clear). Session replay on Team and above. AI title and rewrite. | None on the page. | Starter $39/mo (3 users, 10 projects), Team $149/mo (15 users, 50 projects), Business custom; billed yearly; 15-day trial. | Built for client and stakeholder feedback on websites. Costly for a small team. Page-view caps. Web only. |
| **BugHerd** [P] | Pinned screenshots, technical metadata (browser, OS, screen size), video feedback on all plans. | None on the page. | Standard $50/mo, Studio $80/mo, Premium $150/mo (5, 10 and 25 members); yearly billing is cheaper. | No console or network logs on the page. Aimed at agencies collecting client feedback. Deadlines only on Premium. |
| **BrowserStack Bug Capture** (appears to be the former Bird Eats Bug; both pages carry BrowserStack branding, but neither says so outright) [Q][R] | Screen recording, click and key events, console logs, network logs, system info; instant replay. The older Bird Eats Bug page also lists an end-to-end test generator on its higher plan. Integrations: GitHub, Jira, Slack, Linear, Trello, Zapier. | None. | The older Bird Eats Bug page: Free 15 uploads/month, Starter $50/mo, Premium $100 or $200/mo (two versions shown). The BrowserStack page lists no prices. | Plans and names are in flux after the merge. No voice or AI on the page. |
| **Userback** [S] | Annotated screenshots and video on all plans; session replay and console logs on Business and above; AI feedback insights on Business and above; MCP connectors on Team. | None on the page. | Free (2 sites, 2 seats, feedback kept 7 days); Team $29/mo; Business $79/mo; Business Plus $159/mo (billed yearly). | The depth sits in the $79+ tiers. Built for product feedback, so less developer-focused. |
| **Loom** [T] | Screen and camera video, unlimited screenshots, transcription and captions on every plan. AI summaries, chapters and filler-word removal on the AI plan. | **Yes: speech transcription on all plans.** | Starter $0 (25 videos, 5-minute screen recordings); Business $18/user/mo; Business + AI $24/user/mo. | No console, no network, no steps, no bug-tracker output. A video someone has to watch. |
| **Shake** [U] | Mobile SDK first: device, OS, network state, logs, session replay (the pricing page names screen recording and console and custom logs only in passing). A free Chrome extension covers websites. AI debugging, MCP server. | None. | Free (20 reports/month, 3 seats); Starter $160/mo; Premium $200–250/mo; Organization $420–520/mo. | Priced for mobile teams. Web is a side feature. |
| **Sentry User Feedback** [V] | A feedback widget collects description, email, URL and tags. The screenshot is supplied by the user, not auto-captured. If Session Replay is on, up to 60 seconds of replay before submission is attached. | None. | The docs page doesn't say which plans include it. | Console and network data aren't listed. It is a feedback box inside an error-monitoring product, not a tester's tool. |

### 2b. Voice-narrated and AI-written bug tools (new; this is our real competition)

All of these are small or young. Most vendor claims are not independently confirmed.

| Tool | Auto-captures | Voice | Pricing | Weak spots / maturity |
|---|---|---|---|---|
| **nicecatch** [W] | Screen recording, console logs with stack traces, network requests with status and timing, browser and OS data, performance metrics, replay. | **Yes: describe the bug aloud, it is transcribed, and AI writes steps, expected vs actual and console errors.** Chrome extension. | Not shown; the page only offers a demo booking. | Own mic and speech engine. Sales-led. No test plan. |
| **BugReel** [H][X] | Screen, mic audio, console and action capture (JS errors, clicks, URL changes), smart screenshots chosen from the recording. AI extracts steps, picks 3–6 screenshots and scores severity. | **Yes: mic audio transcribed with timestamps and matched to actions.** Chrome extension, self-hostable. | Community: free, up to 5 users, self-hosted. Team: $8/user/month. Business Source License. | Looks early: the product demo is marked as coming soon, and there are no user numbers. |
| **Tapt** [Y] | Screen, tab or window recording; screenshots (visible, full page, region, device presets, smart DOM capture); console and network logs via the Chrome extension; meeting audio. 18 AI analyses, including severity, priority, repro steps, root cause and duplicate detection. | Partly: records the mic and meeting audio and has a voice-note annotation option, but no narration-to-ticket flow is described. | Free (25 reports); Solo $30/mo; Custom. | Generalist issue tracker. Voice is incidental. |
| **TalkThrough** [Z] | macOS app. Screen recording, drawing on screen, screenshots, a live transcript, console and browser details. Creates Linear tickets with screenshots, or Markdown. | **Yes: narrate while testing, transcribed live; AI writes the report.** Posted on daily.dev on 18 Jan 2026. | Not found. | **I could only read a third-party summary; the product site returned just a one-line tagline about QA at speed**. It may already include test-plan features. Check this one by hand. |
| **Vibe Feedback** [AA] | Chrome extension: Shift+click an element to capture its CSS selector and XPath; console errors and network failures; navigation history with timestamps; Markdown export for Claude Code, Codex or GitHub Issues. | **Yes: speech transcribed live while you test, in the paid tier.** | Free: element picking, error capture, exports. Voice: pro tier (price not shown). | One person's project. Voice is paywalled. |
| **markupR** [AB] | Open source (MIT). Records the screen while you narrate, transcribes, picks frames at relevant moments, outputs AI-ready Markdown with inline screenshots. Bring your own key or local models. | **Yes, voice-first.** | Free. | A hobby-scale project. The dev.to post doesn't name platforms. |
| **Disbug** [AC] | Rebuilt as agent-first: one click grabs a screenshot, DOM selector, console errors, failed requests, user-event trail, browser metadata and local storage; exposes them to coding agents through MCP. | The current site doesn't mention voice. Older listings describe voice narration (secondary sources [AD]). | Free for solo developers; paid tiers and a lifetime deal exist, no prices shown. | In active rebuild. Voice seems to have dropped out of the pitch. |
| **PlayLog** [AD] | Chrome extension: timestamped actions, console, network, page state, OS and browser; AI-ready Markdown. | Not mentioned. | Free, then $19/mo (per a vendor roundup). | Chrome only. Aimed at feeding coding agents. |

Seen only in secondary or vendor-authored roundups, not opened directly: Gleap (replay, console and network, AI at $0.02 per response), Usersnap, LogRocket, Requestly, Bugasura, Luciq (formerly Instabug) and Bugsee [AD][AE]. None of them is described as voice-first.

### 2c. Test management and exploratory-testing tools (the "test run" side)

| Tool | What it does | Voice |
|---|---|---|
| **Tricentis qTest Explorer** [AF] | Windows desktop app. Captures screen activity and keystrokes during exploratory sessions, and lets the tester add plan text, audio or video notes mid-session. Exports to Word, PDF. | Audio notes, attached to the session. |
| **Xray Exploratory App** [AG] | Desktop app (Windows, Mac, Linux) with screen, audio and video recording, screenshots, charter timer, PDF export; integrates with Jira. Detail is from a Ministry of Testing list, not the vendor. | Audio recording. |
| **QMetry Exploratory** [AH] | Chrome extension. A mic icon adds a voice-over to the recording. | Voice-over on a recording. |
| TestRail, UiPath Test Manager, Testpad, BrowserStack Test Management and similar [AI] | Typed test cases, manual pass/fail clicks, some AI test generation (typed). | I found no speech input, voice commands or hands-free execution in any of them. |

---

## 3. The gap and how to differentiate

### Direct answers

**Is "voice-first test runs" unserved, or already done?**

- **Narrated bug reporting is done, and crowded.** At least seven products do "talk while you reproduce, get a structured bug report" (nicecatch, BugReel, TalkThrough, Vibe Feedback, markupR, Tapt in part, and older Disbug). Several launched in 2026. Building "voice bug report" alone would be a me-too, and a judge who has seen Jam will say so.
- **Voice-driven test runs look unserved, with moderate confidence.** I found no tool where you dictate a test plan, get a checklist, say pass or fail on each case, and have failures auto-captured with priority and deadline. The closest are exploratory tools (qTest, Xray, QMetry) where voice is a recording attached to a session, and the test-management tools, which have no speech at all. The caveats: my searches were not exhaustive, and I could not read TalkThrough's site (see above).
- **Every voice tool above runs its own mic and speech engine and records the whole session, then transcribes afterwards.** None is built to take dictated text from an outside dictation tool such as Wispr Flow, and none treats the spoken sentence as the trigger for evidence at that moment (inferred from their pages; I did not test them).

**Who would keep using it?** In order of how confident I am (all inferred from the evidence above, not from user research):

1. **The developer or BA who tests their own work with no QA** at a small SaaS or services team. The stickiness is a **saved test plan re-run before each release**, a recurring weekly or fortnightly use, which one-off bug reporters lack.
2. **UAT and regression testers at agencies and consultancies**, who owe a client a list of cases with pass/fail, a screenshot per failure and a deadline for the fix. Maulik's own context, and it matches Katalon's finding that time and workload are the QA obstacles [I].
3. **People building with AI agents** (Claude Code, Cursor) who test their own app and hand bugs to the agent as Markdown. Real demand (Disbug, markupR and Vibe Feedback all target them) but the most crowded segment.

Not a fit: designers and clients leaving feedback on websites. Marker.io, BugHerd and Userback already own that.

### How to differentiate (what I'd build the pitch on)

1. **Test-plan first, bug report second.** The unit is a test case, not a recording. Dictate or paste a plan, get a checklist, run it, and only failures cost effort. This is the part nobody ships.
2. **Wispr Flow is the input layer, not a bundled mic.** The tool has no speech recognition of its own. It exposes a focused text field, and Flow fills it. That is the right shape for the 30% "Wispr used meaningfully" question: the demo can show Flow's cleaned, filler-free text landing in the tool, and the tool being useless-but-typeable without it. It matches the sibling ideation note's rule of no Web Speech API [05-ideation.md].
3. **Capture at the moment of failure, not after you finish talking.** A hotkey or the first keystroke in the narration field snapshots the screenshot, console, network and last-N click steps right then. The record-then-transcribe tools capture a recording and let AI pick frames later.
4. **Spoken priority and deadline become fields.** "P1, fix by Friday" turns into severity and a due date. None of the tools above lists a deadline field apart from BugHerd's Premium tier [P].
5. **Zero setup for judges.** A hosted page with a built-in buggy sample app; the extension is the "real sites" bonus, not the judge path.

### Be honest about the risks

- **"Why not Jam plus Flow?"** Jam's description box is a text field, so Flow can probably fill it today (inferred; not tested). Our edge therefore cannot be capture depth. Jam has 300,000+ users [M] and we have days. The edge is the test-plan layer plus the failure-moment capture, and the pitch has to say so.
- **Don't compete on capture quality.** A solo build will not beat Jam's recordings. Do the minimum well: a good screenshot, the last errors, the last clicks.
- **Judges are product and growth people.** "A QA tool for people who aren't QA, run entirely by voice" lands better than a list of captured data types.

### Fit against the judging brief (my rough scoring, 1–5)

| Question | Weight | Score | Why |
|---|---|---|---|
| Real problem in your work | 30% | 4 | Real and frequent, but the market is crowded. Needs one anonymised real example. |
| Wispr used meaningfully | 30% | 4–5 | Flow as the only input while hands are busy. Risk: if it looks like an ordinary text box, the story is lost, so the demo must show the Fn press and the cleanup. |
| Works (live link) | 25% | 4 | Needs the hosted sample app. An extension alone would fail the "no sign-up, no install" test. |
| Clear demo | 15% | 5 | A visible before/after: dictated plan, one failure, one finished ticket. |

---

## 4. Technical notes: capturing screenshots and logs

Status key: **verified** = read on Chrome's docs this session; **known** = standard behaviour I'm confident about but did not check today; **test on day 1** = depends on Flow or Chrome behaviour I can't confirm from here.

### Screenshots

- `chrome.tabs.captureVisibleTab(windowId, {format, quality})` returns a data URL of the **visible area only**. It needs either `activeTab` or `<all_urls>`. It is limited to **2 calls per second** (`MAX_CAPTURE_VISIBLE_TAB_CALLS_PER_SECOND`) and the docs call it expensive. **Verified** [AJ].
- It doesn't capture the full page. For a full-page shot there are three routes, none verified today: (a) `chrome.debugger` with the DevTools command `Page.captureScreenshot` using `captureBeyondViewport` (**known**); (b) scroll-and-stitch with `captureVisibleTab`, which the 2-per-second limit makes slow (**known**); (c) a DOM-to-canvas library, which is not pixel-exact and misses some cross-origin content (**known**).
- **Trigger on the user's action, not on a timer.** Take the screenshot on the failure hotkey (`chrome.commands`) or on the first keystroke in the narration field, so the image shows the failure, not the tool's own window.
- Hosted-page route with no extension: `getDisplayMedia()` asks the user once to share a tab; grab a frame to a canvas. This is the approach in the sibling ideation note [05-ideation.md] and works for any tab, but gives no console or network data.

### Console errors and network failures

| Method | Gets | Cost |
|---|---|---|
| **`chrome.debugger`** (permission `debugger`) attached to the tab, then DevTools commands `Network.enable`, `Runtime.enable`, `Log.enable` | Full console, request and response events, response bodies, exceptions. The docs list Network, Runtime and Log as supported domains. **Verified** that `attach`, `sendCommand` and `onEvent` exist [AK]; the exact event names are **known**. | Chrome shows a "started debugging this browser" bar while attached (**known**). The permission triggers a scary install warning (**known**). It detaches when the tab closes or the user cancels, and enterprise policies can block it [AK]. |
| **Page-world script** injected at `document_start` (content script with `world: "MAIN"`, or `chrome.scripting.executeScript`) that wraps `console.*`, `fetch`, `XMLHttpRequest`, and listens for `error` and `unhandledrejection` | Console output, uncaught errors, request URL, status, timing and (if you choose) bodies. No infobar. | Misses anything before injection. Needs `all_frames` to see iframes. **Known**; this is how most "recorder" extensions work. |
| **`chrome.webRequest`** observation events | URL, method, status, and error codes for failed requests, with no bodies | Cheap and passive, good as a backstop for the network-failure list. **Known.** |

**Recommendation (inferred):** start with the page-world script, because it has no warning bar and no scary permission, and add `chrome.debugger` only for full-page screenshots or response bodies if time allows.

### Click steps

- Listen in the capture phase on `document` for `click`, `input`/`change`, `submit` and Enter, plus URL changes (History API patching and `chrome.webNavigation`). **Known.**
- Per event store: time, event type, a stable selector (prefer `data-testid`, then `id`, then ARIA label, then visible text, then a CSS path), the element's visible text, URL, and scroll position.
- **Keep a rolling buffer** of the last ~200 events or 30 seconds in memory; a failure freezes that window. BrowserStack Bug Capture sells the same idea (a passive capture of the moments before a bug) [Q].
- Turn raw events into plain steps ("Clicked 'Apply coupon' on /cart") in code, and use an LLM only to polish the wording; don't ask it to guess steps from video.

### Where Wispr Flow's text lands

- Flow types into whatever text field has focus. The extension needs **no microphone permission** at all. The sibling Wispr note reports that Flow delivers its text by pasting through the clipboard [04-wispr-capabilities.md], so a textarea should see one paste event per dictation. That event doubles as a trigger for "snapshot now" and as a way to count how much of a report was spoken. Browser event details are untested: **test on day 1**.
- **A normal extension popup closes when it loses focus**, which can eat dictation. Use the side panel API (`chrome.sidePanel`) or an in-page overlay in a shadow DOM instead. **Test on day 1**, together with whether Flow inserts into a side-panel textarea at all.
- Whether the page can see the Fn key being held is **unknown; assume not**. Trigger capture on the hotkey, on focus, or on the first `input` event.
- The sibling ideation note proposes a Document Picture-in-Picture pad for a hosted page [05-ideation.md]. That is compatible with all of the above, and its day-1 spikes cover the Flow-in-PiP question.

### Privacy (in both directions)

- Mask password fields and obvious secrets in click steps. Drop `Authorization`, `Cookie` and `Set-Cookie` headers. Don't store request or response bodies by default, or cap and redact them.
- Redact secrets in the dictated text too (tokens, keys, anything that looks like a password) before it is stored or sent to an LLM.
- Let the user blur a region of the screenshot before export. Keep everything in browser memory unless the user exports. This also answers the privacy objection that appeared in the Jam thread [E].
- Skip capture on domains the user excludes (banking, webmail).

### Shipping reality for a 30 Oct deadline (inferred)

- A Chrome Web Store review can take days and is outside our control, so plan for "load unpacked" plus the hosted sample app, and treat a store listing as a bonus.
- Chrome and Edge only; say so in the submission.

---

## 5. Sources

**Verified** = opened and read this session. **Search-only** = appeared in a search snippet and was not opened. **Inferred** = my own judgement, no source.

| Tag | Source | Status |
|---|---|---|
| A | Atlassian, State of DevEx 2025: https://www.atlassian.com/blog/developer/developer-experience-report-2025 | Verified |
| B | Stack Overflow Developer Survey 2024, professional developers: https://survey.stackoverflow.co/2024/professional-developers | Verified |
| C | Gallup Business Journal interview with Gloria Mark: https://news.gallup.com/businessjournal/23146/Too-Many-Interruptions-Work.aspx | Search-only |
| D | Stack Overflow Developer Survey 2025, AI: https://survey.stackoverflow.co/2025/ai | Verified |
| E | Hacker News, Jam launch thread: https://news.ycombinator.com/item?id=40318542 | Verified (via Algolia API; comments partly truncated) |
| F | Hacker News, "Most users won't report bugs unless you make it stupidly easy": https://news.ycombinator.com/item?id=44225352 | Verified (via Algolia API; comments partly truncated) |
| G | "Assessing the Quality of the Steps to Reproduce in Bug Reports": https://arxiv.org/abs/1906.07107 | Search-only |
| H | BugReel guide: https://bugreel.io/blog/ai-powered-bug-reporting-complete-guide | Verified (vendor; its statistics are untraced) |
| I | Katalon test automation statistics 2025 (cites its State of Quality report): https://www.katalon.com/resources-center/blog/test-automation-statistics-for-2025 | Search-only |
| J | GitHub Open Source Survey 2017, reported by InfoQ: https://www.infoq.com/news/2017/06/github-survey-open-source | Search-only |
| K | JetBrains, State of Developer Experience report: https://lp.jetbrains.com/devex-productivity-report-full-2025-dataviz/ | Verified |
| L | Stanford News, speech vs typing (2016): https://news.stanford.edu/stories/2016/08/stanford-study-speech-recognition-faster-texting | Search-only |
| M | Jam pricing and homepage: https://jam.dev/pricing , https://jam.dev/ | Verified |
| N | Jam MCP (six tools, endpoint mcp.jam.dev): https://www.remote-mcp.com/servers/jam | Search-only |
| O | Marker.io pricing: https://marker.io/pricing | Verified |
| P | BugHerd pricing: https://bugherd.com/pricing | Verified |
| Q | BrowserStack Bug Capture: https://www.browserstack.com/bug-capture | Verified |
| R | Bird Eats Bug pricing: https://www.birdeatsbug.com/pricing | Verified (two conflicting price sets on one page) |
| S | Userback pricing: https://userback.io/pricing | Verified |
| T | Loom pricing: https://www.loom.com/pricing | Verified |
| U | Shake pricing: https://www.shakebugs.com/pricing/ | Verified (two unlabeled price sets) |
| V | Sentry User Feedback docs: https://docs.sentry.io/product/user-feedback/ | Verified |
| W | nicecatch: https://nicecatch.dev/ | Verified (vendor claims) |
| X | BugReel homepage: https://bugreel.io/ | Verified (vendor claims) |
| Y | Tapt: https://www.tapt.dev/ | Verified (vendor claims) |
| Z | TalkThrough: https://talkthrough.app/ (tagline only); daily.dev summary: https://daily.dev/posts/talkthrough-lets-you-narrate-your-testing-session-while-drawing-on-screen-ai-transcribes-everything-jxklpzdp7 | Homepage verified but empty; feature details are third-party |
| AA | Vibe Feedback write-up: https://schappi.com/blog/what-if-bug-reports-wrote-themselves-while-you-talked | Verified |
| AB | markupR on DEV: https://dev.to/eddiesanjuan/i-built-an-open-source-tool-that-records-screen-voice-bug-reports-producing-ai-ready-markdown-3mmo | Verified |
| AC | Disbug: https://disbug.io/ | Verified |
| AD | PlayLog roundup of bug reporting tools: https://playlog.dev/blog/best-bug-reporting-tools-2026 | Verified (vendor-authored; secondary for the tools it lists) |
| AE | Shake's list of AI bug reporting tools (published 11 Jun 2026): https://www.shakebugs.com/blog/best-ai-bug-reporting-tools/ | Verified (vendor-authored) |
| AF | Tricentis qTest Desktop Explorer quick start: https://docs.tricentis.com/qtest-saas/content/explorer_sessions/overview/desktop_explorer_quick_start_guide.htm | Search-only |
| AG | Ministry of Testing, tools for exploratory testing: https://club.ministryoftesting.com/t/tools-to-aid-exploratory-testing-sessions/80384 | Search-only |
| AH | QMetry exploratory testing: https://qmetrysupport.atlassian.net/wiki/spaces/QTMS8171/pages/3831349705/Record+Test+Exploratory+Testing | Search-only |
| AI | TestRail's tools roundup and UiPath Test Manager: https://www.testrail.com/blog/popular-test-management-tools/ , https://docs.uipath.com/test-manager/automation-cloud/latest/user-guide/manual-test-cases | Search-only; "no voice" is an absence-of-evidence finding |
| AJ | Chrome `tabs` API: https://developer.chrome.com/docs/extensions/reference/api/tabs | Verified |
| AK | Chrome `debugger` API: https://developer.chrome.com/docs/extensions/reference/api/debugger | Verified |
| — | Sibling note: `planning/research/05-ideation.md` (capture tiers, Document PiP, day-1 spikes) | Read in full |
| — | Sibling note: `planning/research/04-wispr-capabilities.md` (Flow pastes via clipboard; MCP is read-only; Notetaker could supply a transcript) | Searched for paste and extension facts only, not read in full |

**Not found or not reachable:** Reddit (all subreddits), X, the PractiTest 2025 State of Testing challenges list, Stack Overflow's 2025 technical-debt figure, TalkThrough's product pages, and any independent test of any voice bug tool.
