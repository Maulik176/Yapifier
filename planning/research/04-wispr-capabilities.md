# 04 — Wispr Flow: what it can do and what we can plug into (as of Mon 19 Oct 2026)

Scope: map Flow's features, platforms, Insights and developer surface so our tool can make Flow part of its workflow, not only a way to type. Written for the Wispr "No Hands" challenge (Builders track, solo, due Fri 30 Oct 11:59 pm IST).

**Evidence tags used below:** **[V]** verified on an official Wispr page (wisprflow.ai, docs.wisprflow.ai, api-docs.wisprflow.ai, the raw OAuth JSON) or in this session's connector. **[V-3P]** from a reputable third party (TechCrunch, Computerworld, Scalekit). **[I]** inferred or untested, with the reason.

---

## 0. The five things that matter most

1. **A third-party web app can be an MCP client for Flow. [V metadata, I end-to-end].** Wispr's auth server advertises Dynamic Client Registration, Client ID Metadata Documents, PKCE (S256) and public clients (`none` auth). So our app can register itself and run a normal OAuth 2.1 flow, then call `https://api.wisprflow.ai/connect/mcp` with a bearer token. I read the raw JSON from the live `.well-known` URLs (section 3.3). I did **not** register a client or sign in: that would touch Wispr's systems and Maulik's account, so the 60-minute spike in section 5 is still Maulik's to run.
2. **The MCP is read-only. [V]** Nothing can be written back to Flow through official surfaces. It cannot read dictation history or Notetaker chat history either. It can read meetings (notes, summary, transcript, attendees, tasks), Scratchpad notes, calendar events, upcoming-meeting pre-reads, folders and shared-note links.
3. **The Voice API (speech-to-text for your own app) is closed. [V]** "Flow API is only available by exclusive access"; the org must be approved; contact enterprise@wisprflow.ai. Do not plan around it.
4. **Judges can't use an OAuth-to-Flow feature live. [I, but follows from V facts].** Consent is account-wide on the judge's own Flow account, which is probably empty of meetings, and it needs Google/Apple/Microsoft/SSO sign-in. So the MCP path must be an optional "Connect your Flow Notetaker" button, with a recorded sample session as the default. This matches the 25% "works without signing up" criterion.
5. **The cheapest, safest "Flow in the workflow" is zero-API: design the tool around dictation.** Flow types into any text box without plugins [V], and it pastes through the clipboard [V], so a web textarea receives the text as a paste. We can build voice-first input, Command Mode edits, a starter dictionary and snippets around that, and show the dictation share inside the app.

**Our account state today (probed with 3-row list calls only, no content read):** the Flow connector works, but `search_meetings` and `search_scratchpad_notes` both return **zero rows**. Maulik has no Notetaker meetings or Scratchpad notes yet, so the transcript format is still unseen. Record one 1-minute Notetaker session on day 1 to see it.

---

## 1. Feature inventory

### 1.1 Dictation core

| Feature | What it does | Notes | Evidence |
|---|---|---|---|
| Push-to-talk dictation | Hold a key, talk, release; cleaned text is pasted into the focused field. Works in any app with a standard text field, "no plugins required" | Mac `Fn`, Windows `Ctrl+Win`. Hands-free: `Fn+Space` / `Ctrl+Win+Space`, or double-tap push-to-talk. Cancel `Esc`. Sessions up to 20 minutes (warning at 19) | [V] docs shortcuts article, What's new 31 Mar |
| Cleanup ("Flow edits as you speak") | Removes fillers, repetitions, handles self-corrections, adds punctuation, makes lists and paragraphs | **Auto Cleanup** replaces Smart Formatting: None / Light / Medium / High, with "Undo AI edit" to restore raw text (24 Apr) | [V] wisprflow.ai, What's new |
| Paste mechanism | Pastes via clipboard, restores your previous clipboard about 0.5 s later. "Paste last transcript" `Cmd+Ctrl+V` / `Shift+Alt+Z` | Means a browser textarea sees a paste. Browser event details are **[I]**: test `paste` / `beforeinput` `insertFromPaste` | [V] IDE article for paste/restore; [I] event type |
| Context awareness | Reads surrounding text and the active app to format and spell better | Mac needs Accessibility permission; password fields are excluded. Detail page ("Context Awareness") exists but not read | [V] IDE article, Android 1.4.1 note |
| Voice Profile / "Your Voice" | Communication profile built after 2,000 words | In Insights | [V] What's new 24 Apr |
| Speech model "Canto" | Wispr's own model, rolled out to everyone 17 Sep. Claimed lowest WER in their test; latency down 30% since January | Vendor claim | [V] What's new (claim) |
| History | Audio playback of dictations from the last 14 days (desktop); local storage options: keep, auto-delete after 24 h, never store | | [V] What's new 5 Aug, 24 Apr |
| Cloud Sync / Privacy | Cloud Sync is separate from Privacy Mode. Dictionary, snippets and custom prompts sync regardless; Scratchpad sync is now independent of dictation cloud storage (28 Sep) | Free/Pro: "Improve the model" is a user choice. Teams/Growth/Enterprise: training off | [V] What's new |

### 1.2 Voice editing and rewriting

| Feature | What it does | Notes | Evidence |
|---|---|---|---|
| **Command Mode** | Hold `Fn+Ctrl` (Mac) / `Ctrl+Win+Alt` (Windows), speak an instruction, release. Edits the text in the focused box or the selected text, drafts replies, opens Perplexity search, "build apps" opens in browser | **Off by default** (Settings → Experimental). **Paid or trial plan only**; Free accounts get no response. Mac/Windows only; iOS can't edit in place. Sends the box contents to the model. English trigger phrases only, hotkey works in any dictation language. No "Hey Flow" prefix | [V] docs |
| **Transforms (Beta)** | Select text, press a shortcut, text is rewritten in place. Built-ins **Polish** (`Opt+1`) and **Prompt Engineer** (`Opt+2`, formats AI prompts); up to 9 slots, slots 2–9 custom prompts; `View Diff` `Opt+O`; can also run after every dictation. Windows: `Win+Alt+1/2/O`. Undo within 40 s | Shortcuts stay inactive until you visit the Transforms tab once. Admins can disable | [V] docs (June 2026 version), What's new 1 May |
| Backtrack / Smart Formatting | Self-corrections and spoken punctuation commands | Punctuation commands followed more reliably since 24 Jun | [V] docs list, What's new |

### 1.3 Personalisation

| Feature | What it does | Evidence |
|---|---|---|
| **Personal dictionary** | Learns names and jargon automatically or on "Add to vocabulary"; starred terms and usage-based ranking (31 Mar); share org-wide or by department (4 Sep); **bulk import** of dictionary items and snippets is documented. Notetaker also uses it for names/terms | [V] |
| **Snippets** | Speak a cue, a saved block expands (emails, links, addresses). Rich text since 29 Jul (bold, italic, links, lists) on desktop; mobile pastes plain text. Wispr's developer page lists "PR checklists, bug reports, onboarding steps, naming conventions, API doc links" as snippet uses. Any dictionary or snippet substitution disables IDE file tagging for that dictation | [V] |
| **Styles** | Per-app tone: Formal / Casual / Very casual; recognises apps such as Instagram, Discord, Signal, LinkedIn (31 Mar). iOS 26.4 removed app-specific styles: one default style everywhere plus a Quick Style Switcher | [V] What's new, wisprflow.ai |
| Shortcuts | Rebindable, up to 3 keys and 4 shortcuts per action; mouse buttons (Mouse 4/5, middle click, Logitech MX) via "Mouse Flow" | [V] docs |

### 1.4 Notes, meetings

| Feature | What it does | Evidence |
|---|---|---|
| **Scratchpad (Beta)** | Replaced "Flow Notes" on 1 May. Opens with `Option+S` on Mac, rich text, tabs, version history, images, syncs with iPhone (iPhone is a plain-text "Notes" editor). **Not on Android.** Readable over MCP. Org admins can disable it | [V] What's new, docs list |
| **Notetaker** | Launched Mac 5 Aug 2026; Windows 15 Sep. **No bot joins**: it records your mic and system audio. Zoom, Meet, Teams, Slack huddles, in-person. Live transcript, "What did I miss?", topic-based summary with decisions and next steps, pre-meeting brief, cross-meeting questions with citations, `@` mentions in notes, folders (shareable), calendar (Google, Outlook), imports from Otter and Granola, 21 transcription languages including Hindi, consent notice, admin controls. Included in plans incl. Free | [V] What's new, wisprflow.ai; [V-3P] Computerworld, Digital Trends |
| Dictating during a meeting | Start a Notetaker recording, then dictate into any field. Your dictated words **do not enter the transcript**; one "Dictated" marker is added. Dictation takes the mic, so your own voice is missing from the recording while you dictate. Notetaker uses the system default mic | [V] docs |
| Audio file upload | **Not supported.** Flow transcribes live speech only. Text-transcript import only (Otter, Granola) | [V] docs |
| Ask Wispr | Chat over your meetings and shared notes, answers link back to the moment said | [V] docs list; [V-3P] |
| Retention | Completed audio default 7 days; transcript retention deletes transcripts and audio but not summaries, notes or tasks | [V] MCP article |

### 1.5 Languages

| Item | Detail | Evidence |
|---|---|---|
| Dictation languages | "100+", auto-detect on Mac, Windows and iOS (**not Android**). One language per dictation, not per word. Pick only the languages you speak | [V] docs |
| **Hindi / Hinglish** | "Hinglish" is a selectable option: mixed Hindi-English, **written in Latin script**. **Not auto-detected**: select it explicitly. Selecting Hindi + English does *not* give Latin-script Hindi. Hindi (Devanagari) is also listed; the article doesn't spell out its script | [V] multi-language article; [V-3P] TechCrunch 23 Feb and 9 May |
| Notetaker languages | 21, including Hindi | [V] What's new 15 Sep |
| App UI languages | Desktop adds German, Spanish, Italian, Portuguese (10 Jun). Hindi UI not announced | [V] |
| Conflicting detail | Docs say the desktop Flow Bar has no language picker; the 31 Mar release notes say a language picker was added to the Flow Bar. Check in the app | [V] both, they disagree |

### 1.6 Quiet speech

| Item | Detail | Evidence |
|---|---|---|
| Whisper mode | Official positioning: Flow "can handle speech as quiet as a whisper". Current docs only give mic advice (mic within a few inches, speak softly but clearly, wired or boom mic). The Aug 2024 changelog described a "whispering mode (beta)" toggle; no current toggle is documented. Warning in docs: quiet speech does not stop people nearby from hearing you | [V] wisprflow.ai FAQ, mic guide; [V] roadmap.wisprflow.ai (2024); toggle today **[I]** |

### 1.7 Platforms

| Platform | What's there | Gaps | Evidence |
|---|---|---|---|
| **Mac** | Everything: dictation, Command Mode, Transforms, Scratchpad, Notetaker, MCP | Needs Accessibility + mic permission | [V] |
| **Windows** | Same set; Notetaker since 15 Sep | IDE variable recognition "may be lower quality"; Flow pastes with Shift+Insert in IDE terminals | [V] |
| **iPhone** | Custom keyboard, Action Button shortcut ("Quick Dictation to Notes"), Siri shortcuts, Notes/Scratchpad sync, Styles collapsed to one default | No in-place Command Mode; no Notetaker | [V] |
| **Android** | Floating bubble (launched 23 Feb 2026), Hinglish model, custom dictionary, context-aware dictation, pauses in 50+ banking apps | No auto-detect language, no Scratchpad, dictation sounds can't be turned off | [V] What's new, docs; [V-3P] TechCrunch |
| Web | `wisprflow.ai/demo` browser demo | Demo only, not a way to dictate into our app | [V] |
| Linux | No official app. A community port exists | | [V-3P] search result |

**Challenge note:** the challenge requires "a Mac or Windows computer with a microphone" (WeMakeDevs blog), so desktop-only features (Command Mode, Notetaker, Transforms) are fair game.

### 1.8 Insights and the usage card

The submission form asks for **Insights → Your usage → Share** image (from `planning/BRIEF.md`, read from the live form). The help article (June 2026 version, [V]) describes the Your Usage tab as five tiles:

1. **Words per minute**, with "Top X%" against a published typing study (not other Flow users). Excludes silence.
2. **Fixes made by Flow**: words corrected (fillers etc.) plus dictionary/snippet fixes.
3. **Total words dictated**, desktop + mobile, with a split bar.
4. **Desktop usage** by six categories: personal messages, work messages, emails, **AI prompts**, documents, other. Bars show word share. Emails count half, documents one-fifth. Levels Power (10,000+), Moderate (1,000–9,999), Light.
5. **Activity heatmap with streaks**, day-by-day word bands, apps used, top app.

Other Insights tabs: **Your Voice** (needs 2,000 words) and **Leaderboard** (Pro teams since 29 Jul; Enterprise). The June article does not mention a Share button; an April 2026 version described a carousel of branded share cards (copy, download, share to X/LinkedIn) [V-3P via search snippet, then **[I]** that it still exists, which the live form supports].

**Why it matters for scoring:** the card will show an "AI prompts" bar if we dictate into Claude Code or Cursor, plus apps used, WPM and streak. That is the "Flow was part of the build" evidence. Dictate prompts, docs and commit notes every day and upload the card weekly.

---

## 2. Developer surface

| Surface | Status | What it gives | Evidence |
|---|---|---|---|
| **Remote MCP server** `https://api.wisprflow.ai/connect/mcp` | Public, official, **read-only** | See section 3 | [V] |
| **Voice Interface API** (`api-docs.wisprflow.ai`, `platform.wisprflow.ai`) | **Exclusive access, approval only** | Speech-to-text: WebSocket `/client_ws` (recommended), REST `/client_api`, token minting `/generate_access_token`, `/revoke_client_tokens`. Org key (`fl-…`) mints short-lived JWTs per user. Audio must be 16 kHz 16-bit mono PCM WAV, base64; REST max 25 MB or 6 min. Billing is token-based. No meeting or note endpoints | [V] api-docs quickstart + llms.txt; [V-3P] Scalekit comparison |
| Webhooks | None found in any official doc | | [V] (absence, searched docs index and llms.txt) |
| SDK | None found for Flow itself | | [V] (absence) |
| Deep links / URL schemes | None documented. iOS Siri shortcuts exist ("Take Flow note", "Quick dictate with Flow", "Turn Flow on or off") | | [V] docs search snippet |
| Share links | `https://notes.wisprflow.ai/shared/<slug>` pages for shared meeting notes. The MCP can resolve them; the page itself does not carry the transcript (per the tool description) | | [V] connector tool description |
| Plugin repo | `Wispr-AI/wispr-flow-plugin` (official): installs the MCP in Claude, ChatGPT, Gemini, Cursor, Grok Build, Antigravity. Claude Code: `claude mcp add --transport http wispr-flow https://api.wisprflow.ai/connect/mcp`. Contains no server code | | [V] GitHub README |
| Unofficial write companion | `abhaymettu/wispr-flow-write-mcp`: writes dictionary, snippets, notes, todos, meetings by calling Wispr's **undocumented** cloud API with the desktop app's local session token. Fragile, local-only, plaintext token, not endorsed | Shows write-back is *possible technically* but not offered. **Do not ship this in a judged product** | [V-3P] GitHub README |
| Audio upload | Not supported | | [V] docs |
| Bug bounty | Exists (wisprflow.ai footer) | | [V] |

**What "tasks" and "calendar" mean here:** the MCP article says clients can read "meeting summaries, notes, transcripts, attendees, and tasks". The tasks appear to be the action items in the summary's next-steps section (tool description: "whose next-steps section holds the meeting's action items"). Calendar means Google and Outlook events Flow has synced.

---

## 3. The MCP server in detail

### 3.1 Tools (17 live in this session, [V] by listing; Scalekit documented 14 earlier, so the server has grown)

| Tool | Does |
|---|---|
| `get_account_info` | Your name and calendar display-name aliases |
| `search_meetings` | Recorded meetings by keyword (titles, summaries, notes; **not transcripts**), attendee email, date window. Returns `has_transcript`, `folders`, `share_link`, up to 5 attendees |
| `get_meeting` | Notes (paged markdown), full summary (next steps = action items), attendees (no emails), optional transcript in bounded ranges (default 12,000 chars, max 40,000) |
| `get_meeting_by_calendar_id` | Recorded meeting linked to a calendar event |
| `get_meeting_participants_enriched` | Participants with relationship labels; which one is the user |
| `get_participant_contacts` | Name, email, title, company, LinkedIn. Only when Wispr Contacts is enabled |
| `list_meeting_series` | Occurrences of a recurring meeting |
| `list_folders` / `list_folder_meetings` | Notetaker folders (shared ones too); notes in a folder (other members' notes: summary only) |
| `list_upcoming_meetings` / `get_upcoming_meeting` | Calendar events in a window (max 168 h); a single event with its pre-read if the desktop app made one |
| `get_calendar_event` / `search_calendar_events` / `resolve_calendar_link` | Event metadata, search, map a pasted Google Calendar/Meet/Zoom link to an event |
| `search_scratchpad_notes` / `get_scratchpad_note` | List/search Scratchpad notes by keyword or date; read note text in bounded ranges |
| `resolve_share_link` | Read a shared note from its link (transcript only for the owner or an invited recipient, if the org allows) |

All idempotent, none destructive. Paginated by `next_cursor`, capped at 1,000 results per query. Results are timestamped in UTC.

### 3.2 Limits that shape our design [V]

- **Read-only**: no create, edit, share or delete; no dictation history; no Notetaker chat history.
- **Account-wide consent**: authorising gives the client read access to *every* meeting, past ones included. There is no per-meeting or time-range consent. Wispr's own advice is to be careful. We should read only what the user picks, keep tokens server-side and in session only, and say so on the connect screen.
- **Transcripts** only for notes you own or were invited to by email, and only if the owner's org allows transcript sharing. Anyone-with-link or team access gives summaries only.
- **Search doesn't search transcripts.** Fetch by id, then read the transcript.
- **Cloud Sync** must be on for meeting/calendar reads (Scratchpad has no such requirement). Meetings recorded while it was off never upload.
- **Sign-in:** Google, Apple, Microsoft or enterprise SSO. Email+password accounts can't finish authorisation. Must complete within 5 minutes.
- **Blocked entirely** for HIPAA-covered accounts or when the org disables MCP.
- **Rate limit:** "Too many requests" means wait about a minute.
- **Cost:** the 17 tool descriptions are long (Scalekit measured ~2,200 words for 14 tools), so cost context on every LLM call if we pass them all. Expose only 3 or 4 to our own model.
- **Transcript format unknown [I]**: the tool says "normalized plaintext transcript" and "who-said-what", so speaker labels likely exist; timestamps unconfirmed. Check on day 1.
- **Plan tier:** Scalekit says MCP is included on Free; one tl;dv page says Pro. Wispr's docs say Notetaker is "included in plans". Treat as **[I]**; check in Settings → MCP on Maulik's account.

### 3.3 Can a third-party web app connect as an MCP client? Yes, here is how. [V metadata; I end-to-end]

Raw JSON read from the live endpoints on 19 Oct 2026:

1. **Resource metadata** `https://api.wisprflow.ai/.well-known/oauth-protected-resource/connect/mcp`: `resource` = `https://api.wisprflow.ai/connect/mcp`; `authorization_servers` = `["https://mcp-auth.wisprflow.com"]`; `scopes_supported` = `openid`, `offline_access`; bearer in header.
2. **Authorization server metadata** `https://mcp-auth.wisprflow.com/.well-known/oauth-authorization-server`:
   - `authorization_endpoint` `/oauth2/authorize`, `token_endpoint` `/oauth2/token`, `jwks_uri` `/oauth2/jwks`, `introspection_endpoint`, `device_authorization_endpoint`.
   - **`registration_endpoint` = `https://mcp-auth.wisprflow.com/oauth2/register`** (Dynamic Client Registration).
   - **`client_id_metadata_document_supported` = true** (host a JSON metadata doc at an HTTPS URL and use that URL as `client_id`, which the 2026 MCP spec now prefers over DCR).
   - `code_challenge_methods_supported` = `S256`; `grant_types` = authorization_code, refresh_token, device_code; `token_endpoint_auth_methods` = `none`, `client_secret_post`, `client_secret_basic`; scopes `openid email profile offline_access`.
3. The `openid-configuration` document on the same host is a generic OIDC view (it also lists `client_credentials`, and omits `registration_endpoint` and PKCE). MCP clients should use the OAuth AS metadata above. The two documents differ; flag it as a loose end if the spike fails.

**What this means:** any web app can discover, register and run authorization-code + PKCE, with no pre-approval from Wispr. Redirect-URI rules (HTTPS and localhost allowed? wildcards?) are **not documented**; test with both `http://localhost:<port>/callback` and the deployed HTTPS URL. CORS on these endpoints is unknown, so do the OAuth and MCP calls from a small **FastAPI backend** (Maulik's stack), not from browser JS. The official Python MCP SDK ships an OAuth client provider that handles discovery + DCR + PKCE [I, from the SDK docs, not verified here].

---

## 4. Integration options for our tool

Ranked below by **depth** ("Flow is part of the workflow", judged under the 30% Wispr criterion) and **feasibility** (solo, ten days to a 29 Oct freeze, must work without sign-up). They stack: A is the base, B or C is the headline add-on.

### Summary table

| # | Option | Depth | Feasibility | Needs from judge | Verdict |
|---|---|---|---|---|---|
| A | **Voice-first input surface** (dictation into our app, Command Mode edits, starter dictionary + snippets, "% by voice" meter) | Medium | **Very high** (1–2 days) | Flow installed, or a sample button | **Build, always** |
| B | **Notetaker → MCP import** ("record your session, we turn it into the report") | **High** | Medium (3–4 days incl. spike) | A Flow account with a recorded meeting, or the built-in sample | **Headline add-on if the day-1 spike passes** |
| C | **Scratchpad → MCP import** (talk notes into Scratchpad, pull them in) | Medium-high | Medium, slightly easier than B | A Flow account with a note, or sample | Fallback if B's transcript or consent is awkward |
| D | **Calendar-aware pre-fill** (upcoming meeting → session name, attendees as reporters, agenda) | Medium | Medium, reuses B's OAuth (+0.5 day) | Same as B | Optional garnish |
| E | **Hinglish-aware pipeline** (Latin-script Hindi-English in, clean English out) | Medium (feature of A) | **High** (hours) | Flow with "Hinglish" selected | **Add to A; it's the India-judge hook** |
| F | **Build-side proof** (dictate every prompt/doc/commit; Notetaker + Scratchpad for decisions; weekly card) | High for the 30% criterion | **Very high** (discipline, not code) | None | **Do from day 1** |
| G | Voice Interface API in our app | High | **Very low** (approval-gated) | | Skip. At most send the email below |
| H | Write-back to Flow | n/a | **Not possible officially** | | Skip. Say so plainly in the feedback field |

### A. Voice-first input surface (no API) — the base

- **What:** the main screen is one large text area with a "Hold Fn and talk" hint, plus a live strip showing each dictation as a card. Flow's paste arrives as one chunk; we process it as one "utterance". Page text states the hands-free shortcut (`Fn+Space`) for long narration.
- **Make Flow better for our domain (all [V] features):**
  - **Starter dictionary** of our terms (file bulk-import documented), e.g. role names, "P1", "UAT", component names.
  - **Snippets** such as "bug template" → expands to Steps / Expected / Actual / Severity, "repro steps" → numbered block (Wispr lists "bug reports" as a snippet use).
  - **Command Mode** (Pro/trial) to edit in place: "make this P2 and shorten it", "add the browser as Chrome".
  - **Transforms**: a custom slot named e.g. "Defect formatter" so a selected rough note becomes a structured defect.
- **"How much of this was spoken" meter (inferred technique):** count input arriving as a single large paste with no preceding keystrokes as "voice", versus typed characters. Test whether Flow's paste fires `beforeinput` with `inputType: 'insertFromPaste'`. This gives an in-app proof of voice share without any Wispr API, and pairs with the usage card. Mark it "approximate" in the UI. **[I]** until tested.
- **2-minute demo:** 0:00–0:20 hold Fn, say a messy defect out loud, structured result appears, the voice-share meter shows 100%. 0:20–0:40 `Fn+Ctrl` "make it P1, add the Chrome version" and the text rewrites in place. Keep Command Mode in the video only, because judges on the Free plan can't use it.
- **Risk:** a judge without Flow can't try voice on the live link, so the sample button and an ordinary keyboard path must work (the brief already requires this).

### B. Notetaker → MCP import — the deep one

- **What:** the tester starts a Notetaker recording (no bot, one click), narrates what they see while testing, then ends. In our app they press "Connect Flow" (one OAuth screen), pick the meeting from a list, and our server calls `search_meetings` → `get_meeting` (summary + transcript) and turns it into a structured list of findings with severity and owner. Action items come from the summary's next-steps section.
- **Why it's deep:** it uses Flow's newest product, the one Wispr says takes them "beyond dictation", and Wispr's own launch note names MCP access for "your own agents". Our tool is such an agent.
- **Constraints to design around (all [V]):**
  - Read-only: we can't push results back into Flow. We export to CSV/Markdown/clipboard instead.
  - Notetaker takes the mic when you dictate, and dictated words never enter the transcript. So choose one capture mode per session: **narrate into Notetaker** (continuous) or **hold-Fn dictation** (per defect, option A). Don't plan both at once.
  - Transcript might lack timestamps **[I]**: can't align it to screenshots by time unless the tester states markers aloud ("screenshot now"). Test first.
  - Account-wide consent: show exactly which meeting we read, and say no data is kept after the session.
- **Judge path:** a **"Try the sample session"** button replays a recorded Notetaker output (Maulik's own 1-minute test session, anonymised, stored as a fixture of the real `get_meeting` JSON). The connect button is labelled optional.
- **2-minute demo:** 0:00 Notetaker bar with "recording"; 0:05–0:35 narrate a test of a dummy app ("approve button missing for the legal role…"); 0:40 click **Connect Wispr Flow**, consent screen, meeting list; 1:00 the structured defects appear with severity; 1:20 the screenshots (if the screenshot feature exists, see 4.1 below); 1:40 export. Close on the usage card.
- **Feasibility:** run the day-1 spike (section 5). If registration, consent and the first `tools/list` work in under an hour, commit. If not, drop to C.

### C. Scratchpad → MCP import

- **What:** the tester dictates short notes into Scratchpad (`Option+S`) during testing; our app reads them with `search_scratchpad_notes` and `get_scratchpad_note`. There is no Cloud Sync requirement for Scratchpad reads, which removes one failure mode.
- **Downside:** focus switching to the Scratchpad window while testing is clumsy **[I]**, and notes are free text with no structure or timestamps. Good as a fallback and as a "decisions log" for build-side proof (option F).
- **2-minute demo:** talk three notes into Scratchpad, press "Pull from Flow", get three structured items.

### D. Calendar-aware pre-fill

- **What:** `list_upcoming_meetings` + `get_upcoming_meeting` (pre-read) pre-fill the session title, attendees as reporters, and agenda as the test charter. Shows the calendar link of the MCP.
- **Value:** small, visual, but most Wispr users don't have pre-reads on every event (the field is null unless the desktop app generated one). Add only if B works and time remains.

### E. Hinglish pipeline — the India hook

- **What:** the user selects "Hinglish" in Flow and talks the way they actually talk ("approve button missing hai for the legal role, severity high rakhna"). Flow writes Latin script. Our model normalises to clean English and keeps the original line next to it.
- **Why:** Wispr's India page promotes prompts "in Hindi, English, and Hinglish", and India is their fastest-growing market (TechCrunch, May 2026). A judge from Wispr India growth will notice a tool that treats Hinglish as a first-class input.
- **Caveats:** Hinglish isn't auto-detected, so our onboarding must say "select Hinglish in Flow → Settings → General → Languages". Only claim Hinglish accuracy that we test ourselves.
- **Demo:** 10 seconds: speak one Hinglish sentence, show the Latin-script dictation next to the clean English output.

### F. Build-side proof

- Dictate every Claude Code/Cursor prompt (Flow shows dictated text in AI coding terminals since 1 May; pastes long dictations to Claude Code and Codex in chunks on Mac).
- In Cursor/Windsurf use **file tagging** ("tag server.py"); variable recognition needs Screen Reader Optimized mode on.
- Dictate docs, commit notes (Wispr's vibe-coding page lists "commit messages").
- Use Notetaker for a 2-minute end-of-day decision log and Scratchpad for the backlog; mention them in the demo.
- Upload the usage card weekly; keep a running "feedback for Wispr" list (section 6).
- Note the "Most Wispr usage" prize is rank 1 by words dictated (BRIEF): all of the above also feeds that.

### G. Voice Interface API (not recommended)

Closed to new partners per the generate-token page; the quickstart says exclusive access. The cost of asking is one email (`enterprise@wisprflow.ai`), so it's optional. Even if granted, it needs WAV conversion, a JWT backend and an uncapped billing key. Doesn't beat typing into Flow's own app.

### 4.1 Where screenshots fit (Maulik's concern)

Flow cannot capture screenshots **[V]**: no such feature in the docs, What's new or product pages. Notetaker records audio only. But Flow gives us something better than a transcript for QA: **each hold-Fn dictation lands as one discrete paste event at a known moment**. Pair that with a screen-capture step on our side:

- **Web app:** `getDisplayMedia()` (user picks a tab or window once) kept as a short rolling frame buffer; on each dictation paste, attach the frame from a few seconds earlier. Works in a plain browser, no install **[I]**, needs a one-time permission prompt, which interacts with the "no setup" rule, so offer it as optional.
- **Chrome extension** (Maulik's strength): `chrome.tabs.captureVisibleTab` on message from the web app.
- The tab URL / path comes free from the extension or from the app under test, which covers "path". That is a design for the QA idea only; skip it if the chosen idea isn't QA.

---

## 5. Day-1 spike, exactly (for Maulik to run; I did not run it)

Goal: prove or kill option B in about an hour. Use Maulik's own Google-signed account.

1. In Flow: Settings → MCP; confirm MCP and Notetaker are on and note "Cloud Sync" state. Record a 1-minute Notetaker session narrating a fake test. Wait for the summary.
2. In a throwaway script (FastAPI or the Python MCP SDK's OAuth client): fetch the two `.well-known` documents above, POST a client registration to `https://mcp-auth.wisprflow.com/oauth2/register` with `token_endpoint_auth_method: none`, `grant_types: [authorization_code, refresh_token]`, your redirect URIs (`http://localhost:8000/callback` plus the prod HTTPS one), scopes `openid offline_access`.
3. Run authorization-code + PKCE S256 (include the `resource` parameter set to the MCP URL). Complete the browser consent. Expect Google/Apple/Microsoft sign-in.
4. Call the MCP (Streamable HTTP) with `Authorization: Bearer <token>`: `initialize`, `tools/list`, `search_meetings`, `get_meeting` with `view_transcript: {}`.
5. Record: redirect-URI rules; whether the consent screen names our app; whether the token refreshes; the transcript format (speaker labels, timestamps); latency; the exact error strings for "Cloud Sync must be enabled".
6. Pass criteria: tools/list works and the transcript is usable. Fail criteria: registration rejected for our redirect, or consent blocked. Then go to C or drop MCP and say in the feedback form what blocked it.

Also test in the same hour (cheap): does Flow's dictated text arrive as a paste event in a `<textarea>` on our own page (option A's meter), and does Hinglish land as Latin script.

---

## 6. What Wispr would love to see showcased

Based on what Wispr itself markets (sources in section 7).

1. **Beyond dictation** (Notetaker + MCP with your own agent). Wispr's CTO framed Notetaker as "the second product" on a path beyond dictation, and the launch note names MCP access for "your own agents". A custom tool built on Notetaker data via MCP is the story they want told. (Depth B.)
2. **Hinglish and Indian-language voice use.** India page: "Don't type, just speak", prompts in Hindi, English and Hinglish; Tanay Kothari credits Hinglish for the growth jump; first India brand film "Bologe Toh Tum Dikhoge" (3 Sep 2026): "Typing makes us edit ourselves down; speaking lets us be more of who we are" (Nimisha Mehta, India lead). Show a person speaking naturally and being understood. (Option E.)
3. **Prompting AI by voice.** India page has a "Prompt your AI" section and prompting guide: speak detailed context so AI gives better answers. The developers page: "Ship 4x faster", prompts for Cursor, PR summaries, release notes. Show a rough, messy spoken input becoming a precise output, with a side-by-side against a typed one-liner. (Fits the baseline rule.)
4. **Speed numbers.** 4x faster than typing; India page graphic 45 wpm keyboard vs 220 wpm Flow; the usage card's WPM tile and "Top X%". Our baseline (time to write by hand vs dictating) should quote the same unit.
5. **Developer-specific features they built:** file tagging in Cursor/Windsurf, variable recognition, snippets for bug reports and PR checklists, dictating into Claude Code/Codex, Command Mode, Transforms (Prompt Engineer). Use at least two on camera.
6. **Real workflow, not a gimmick.** Weekly social is judged on "how clearly a post shows a real workflow" (BRIEF). Wispr's testimonials are workflow stories (inbox 2.5x faster, 1.5 hours saved a week). A before/after on a real week beats feature tours.
7. **Voice-first tools for non-desk, mobile and WhatsApp-style use.** Wispr says India usage is ~50:50 desktop/mobile and personal messaging is the growth area. A tool the user can also drive from the Flow iPhone/Android keyboard is a bonus; the challenge requires desktop, so keep it secondary.
8. **Honest product feedback.** The submission has a field that goes to the Wispr team. Collected so far (all [V] facts, written as asks):
   - MCP is read-only: no way for an agent to write a summary, task or note back.
   - Notetaker/MCP transcript timestamps not documented; no export API; no audio-file upload.
   - Hinglish needs manual selection (no auto-detect); Android has no auto-detect at all.
   - Voice API is closed to new partners, so web developers can't build voice input on Flow; the Flow web demo can't dictate into third-party pages.
   - Docs conflict on whether the desktop Flow Bar has a language picker; the India page says the Free plan has "unlimited dictation" while the main site says 2,000 words a week.
   - Command Mode is off by default and paid-only, so judges on Free can't test tools built around it.
   - Consent is account-wide, no per-meeting scopes for MCP clients.

### What Wispr India growth is promoting right now (as of 19 Oct 2026)

- **Brand film "Bologe Toh Tum Dikhoge"** with Move Over (Only Much Louder), 3 Sep 2026 [V-3P MxM India]. Emotional, family-and-friends framing, Instagram-led.
- **Founder-led launch** of Flow in India, 27 Apr 2026, "with Hinglish and Android support" (Tanay Kothari's X post; date decoded from the post ID) plus offline campaigns in Bengaluru [V-3P TechCrunch 9 May].
- **Pricing and offers:** Flow Pro ₹400/month or ₹320/month billed annually, UPI accepted, students/educators 50% off; partner promos: **CRED: 10 months Pro free**, **Zepto: 3 months Pro free** [V] (docs billing list, India page). "12,308 signed up in India this week", "1,10,871 hours saved" (page counters).
- **Targets:** India as second-largest and fastest-growing market, growth claimed ~60% → ~100% month on month after the launch campaign (Kothari, unverified); expanding beyond white-collar users to students and older users via family; plans for more Indian languages in 12 months; India team growing to ~30 people under Nimisha Mehta [V-3P TechCrunch].
- **Community events:** a "Speakeasy w/ Wispr Flow" event listed for 8 Aug 2026 on a startup-grants site, and a Wispr track at another hackathon ("Prompt Roulette") [V-3P, details not verified].
- **Creator/sponsorship collaborations are paused**; business and co-marketing partnerships go to enterprise@wisprflow.ai [V] docs. Referral credit program is open to everyone.
- **About Rohan Kochhar:** the brief names him as Wispr Flow India growth. I found **nothing** public about him (no LinkedIn or X post surfaced), so no claims about his taste. Safe assumption: he cares about Indian users, Hinglish and visible India adoption, because that's the team's stated mandate **[I]**.

---

## 7. Sources

### Verified (official Wispr pages, the raw OAuth JSON, this session's connector)

- Home: https://wisprflow.ai
- Developers page: https://wisprflow.ai/developers
- Vibe coding page: https://wisprflow.ai/vibe-coding
- India page: https://wisprflow.ai/india
- What's new (release notes, read in full 19 Oct): https://wisprflow.ai/whats-new
- Prompting Cursor with Wispr Flow: https://wisprflow.ai/post/prompting-cursor-with-wispr-flow
- Help Center index: https://docs.wisprflow.ai and full article list https://docs.wisprflow.ai/llms.txt
- MCP connection guide: https://docs.wisprflow.ai/articles/4759919286-how-to-connect-wispr-flow-to-claude-chatgpt-and-other-ai-tools-mcp
- MCP: keep all notetakers in one place: https://docs.wisprflow.ai/articles/5166327995-switching-to-wispr-flow-keep-all-your-notetakers-in-one-place-mcp
- Command Mode: https://docs.wisprflow.ai/articles/4816967992-how-to-use-command-mode
- Shortcuts: https://docs.wisprflow.ai/articles/2612050838-supported-unsupported-keyboard-hotkey-shortcuts
- Transforms (via search result snippet, June 2026 version): https://docs.wisprflow.ai/articles/8068950331-how-to-use-transforms-beta
- Languages: https://docs.wisprflow.ai/articles/3191899797-use-flow-with-multiple-languages
- Cursor, VS Code and IDEs: https://docs.wisprflow.ai/articles/6434410694-use-flow-with-cursor-vs-code-and-other-ides
- Your Usage tab: https://docs.wisprflow.ai/articles/8760230576-your-usage-tab-track-your-dictation-stats-in-wispr-flow
- Dictating during a Notetaker meeting: https://docs.wisprflow.ai/articles/8175153619-dictating-during-a-meeting-with-notetaker-beta
- Audio file upload not supported: https://docs.wisprflow.ai/articles/7689167034-can-i-upload-audio-files-to-wispr-flow-for-transcription
- Discreet use / mic guide: https://docs.wisprflow.ai/articles/9192039587-using-wispr-flow-discreetly-microphone-guide
- Partnership and creator inquiries: https://docs.wisprflow.ai/articles/7890073756-partnership-and-creator-collaboration-inquiries
- Voice API docs index: https://api-docs.wisprflow.ai/llms.txt, quickstart https://api-docs.wisprflow.ai/quickstart.md, client auth https://api-docs.wisprflow.ai/client_side_auth_basics.md, generate token https://api-docs.wisprflow.ai/generate_access_token
- OAuth protected-resource metadata (raw JSON): https://api.wisprflow.ai/.well-known/oauth-protected-resource/connect/mcp
- OAuth authorization-server metadata (raw JSON): https://mcp-auth.wisprflow.com/.well-known/oauth-authorization-server
- OIDC configuration (raw JSON, differs, see 3.3): https://mcp-auth.wisprflow.com/.well-known/openid-configuration
- Official plugin repo: https://github.com/Wispr-AI/wispr-flow-plugin
- Challenge pages: https://www.wemakedevs.org/blogs/wispr and https://www.wemakedevs.org/wispr/ideas (plus `planning/BRIEF.md`)
- Connector tool list and descriptions: this session (17 tools, listed 19 Oct)

### Third-party, reputable (checked, still marked [V-3P])

- TechCrunch, Android launch, 23 Feb 2026: https://techcrunch.com/2026/02/23/wispr-flow-launches-an-android-app-for-ai-powered-dictation/
- TechCrunch, India, 9 May 2026: https://techcrunch.com/2026/05/09/voice-ai-in-india-is-hard-wispr-flow-is-betting-on-it-anyway/
- Computerworld, Notetaker, 7 Aug 2026: https://www.computerworld.com/article/4206765/wispr-moves-beyond-ai-dictation-with-note-taking-assistant.html
- MxM India, "Bologe Toh Tum Dikhoge", 3 Sep 2026: https://www.mxmindia.com/marketing/wispr-flow-and-move-over-launch-brand-film-championing-voice-led-expression/
- Scalekit MCP connector (14 tools, DCR): https://docs.scalekit.com/agentkit/connectors/wisprflowmcp/ and comparison https://www.scalekit.com/blog/wispr-flow-mcp-vs-api
- Tanay Kothari's India launch post (date decoded from post ID, content seen only as a search snippet): https://x.com/tankots/status/2048605683969396844
- Unofficial write MCP (shows undocumented API): https://github.com/abhaymettu/wispr-flow-write-mcp

### Inferred or not confirmed

- Browser paste-event behaviour of Flow's insertion; the "% by voice" meter. Test day 1.
- Notetaker transcript timestamps and exact format. Our account has no meetings yet.
- Whether MCP is on the Free plan (3P sources disagree).
- Redirect-URI rules and CORS on Wispr's OAuth endpoints. Not tested: no registration made.
- Whisper-mode toggle on desktop today; only the 2024 changelog and mic-advice docs.
- Whether the Insights **Share** button still exists in the June layout (the live submission form says it does).
- Everything about Rohan Kochhar's preferences; the speakeasy and megathon events.
- Searches of X/LinkedIn found only Tanay's launch post; no wider social calendar was reachable.
