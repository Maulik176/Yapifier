# What wins: lessons from past hackathons for No Hands (Builders track)

Researched Mon 19 Oct 2026. Scope: Wispr-linked contests, voice-AI hackathons, WeMakeDevs winners 2024–2026, and a scan of #NoHandsChallenge posts.

**How to read the evidence tags.** *Verified* = I opened the page and read it. *Snippet* = seen only in a search-result summary, so treat as a lead. *Inferred* = my reasoning from the verified facts. Where a source gave no reason for a win, I say so instead of inventing one.

---

## 0. The short version

1. **No past WeMakeDevs × Wispr event exists.** WeMakeDevs' hackathon list (30 events, 2021–2026) shows Wispr only on this one. Wispr's own earlier contests were run with Lovable, Contra and NexHacks, and were judged very differently (community vote, creative/social, a sponsor track). *Verified.*
2. **WeMakeDevs archive pages publish winners but no judge comments.** Every winner page I read (15 events) had none. So "why it won" below is mostly inferred from what the winners were. *Verified.*
3. **This rubric is unusual for WeMakeDevs.** Their usual six criteria (impact, creativity, learning, technical, UX, best use of sponsor) become four: real problem 30 / Wispr use 30 / works live 25 / demo 15. Technical depth and creativity are not scored at all. *Verified.*
4. **The judges are product and growth people, and the rules say they may repost the demo video.** Wispr's Contra challenge, judged by Wispr's Head of Growth and CMO, required a short social walkthrough video. Treat the demo as a piece of content the CMO would post. *Verified (rules, judges); the "treat it as content" part is inferred.*
5. **The organisers show what "good" looks like:** their sample submission is a sales follow-up tool tested on **14 real call notes** with **21,480 words dictated**. Real data plus a words-dictated number is the bar. *Verified.*
6. **The crowded spaces are the organisers' own example ideas** (standup bot, release notes, code review assistant, follow-up writer, PRD from call notes, inbox sorter). Winners in this org's past events were often serial, fast, sponsor-fit builders, so expect strong competition in any obvious lane. *Verified examples; "crowded" is inferred.*

---

## 1. Winners table

### 1A. Wispr-linked contests (2026)

| Event | Winner / project | Link | Why it won |
|---|---|---|---|
| **NexHacks 2026**, CMU, Jan 17–18, 1,000+ hackers. Wispr Flow add-on track (prize: 1 year Pro + swag) | **Vectr** (Usman Khan, Rishabh Srinivas, Charles Bielawa, Fardeen Bablu): turns chaotic 911 voice calls into continuously updated insights for EMS crews | [winner's LinkedIn post](https://www.linkedin.com/posts/usman-khan-7a7407284_vanderbilt-hackathon-engineering-activity-7424122890629079040-imN_) | The track asked for speech-to-text built on Flow (*snippet*, [CompeteHub](https://www.competehub.dev/en/competitions/devpost26155)). Vectr used Flow's speech-to-text plus Gemini. No judge comment is public. *Inferred:* voice was the product's input in a high-stakes, hands-busy job, with a clear user (EMS crews) and clear pain (paperwork, burnout). |
| **Lovable × Wispr "Built for Moms"**, May 8–13, 2026, about 250 builders, **community vote** | 1st **Heart Melodies** (moms preserve their stories through music). 2nd **Home Table** (stay-at-home moms share menus and earn from cooking). 3rd **Atlas** (platform for an Afghan nonprofit teaching sewing to 30+ women; prize donated back) | [Lovable winners post](https://www.linkedin.com/posts/lovable-dev_last-week-we-asked-you-to-build-for-the-activity-7461081092146720768-Hbbh), [Atlas gallery page](https://builtformoms.lovable.app/gallery/35e3d94d-35ff-48af-8c09-cc672753ca1c) | Voted by the community, so no judge reasons. All three are specific-person, emotional stories. The contest page says shared builds get more votes, and entries needed a 1–5 minute demo showing the Wispr-voiced prompting ([contest page](https://builtformoms.lovable.app/)). *Verified facts; the reading is inferred.* |
| **Wispr Flow Challenge × Contra**, Feb 2026, $5K, Valentine's theme | Grand **Oleksandra Marchenko**, 2nd **Divan Raj**, 3rd **Silvia Pinho** (project names not on the public post) | [results post](https://contra.com/community/FI5PB7L6-explore-winning-projects-wispr-flow-challenge) | Criteria: creativity with Wispr Flow, quality of execution, interesting combinations with other tools, unique take on the theme. Judges included Wispr's Head of Growth and CMO. Required: a demo video of the process with Wispr, a link, and a social post with a 30-second walkthrough ([guidelines](https://contra.com/community/topic/wisprflowchallenge/guidelines)). A commenter on the results post claims "the product doesn't matter" and a marketing video wins. That is one person's opinion, but it fits the required social video. |
| **Megathon × Wispr "Prompt DJ"** (date not found) | Not a build contest: a booth where you dictate a random 60-second answer; prepaid-card prizes. Winners not published | [GitHub repo](https://github.com/WisprGoBetween/prompt-roulette) | *Snippet.* Shows Wispr's marketing taste: playful, "beat the keyboard". |
| **Speakeasy w/ Wispr Flow**, Bengaluru, Sat 8 Aug 2026 | No prizes, no winners: "Voice Notes Wall", "Smash the Keyboard", "Beat the Keyboard" | [event page](https://www.startupgrantsindia.com/events/speakeasy-w-wispr-flow) | Not a hackathon. Useful only as tone: Wispr India sells "speak beats keyboard" through hands-on, human, slightly funny moments. *Verified.* |
| **Earlier WeMakeDevs × Wispr events** | None found | [WeMakeDevs hackathon list](https://www.wemakedevs.org/hackathons) | This is the first. The challenge page names no past winners. *Verified.* |

Not found: the NexHacks Devpost gallery (blocked), any Wispr-run hackathon in India before this one, and any list of "best use of Wispr Flow" winners beyond the rows above.

### 1B. Voice-AI hackathons

| Event | Winner / project | Link | Why it won (organiser's own words where they exist) |
|---|---|---|---|
| **ElevenLabs Worldwide Hackathon** (300+ projects per a search summary; judges incl. ElevenLabs CEO, Vercel's Guillermo Rauch, Lovable's Anton Osika, a16z; year not on page, probably Feb 2025, *inferred*) | **GibberLink**: two AI agents on a call detect each other and switch to a faster audio protocol | [Devpost](https://elevenlabs-worldwide-hackathon.devpost.com/submissions/622017-gibber-link) | "The judges unanimously agreed", and the demo went viral. *Verified* ([results blog](https://elevenlabs.io/blog/announcing-the-winners-of-the-elevenlabs-worldwide-hackathon)). |
| same | Online 1st **Hugo Tour Guide** (travel companion); 2nd **Pep** (voice + vision physical-therapy coach); NYC 2nd **Procuro** (calls suppliers to find delayed parts); SF 1st **Dealwise** (calls local businesses for quotes) | [Pep](https://elevenlabs-worldwide-hackathon.devpost.com/submissions/622274-pep-your-compassionate-physical-therapy-agent), [Procuro](https://elevenlabs-worldwide-hackathon.devpost.com/submissions/622443-procuro), [Dealwise](https://elevenlabs-worldwide-hackathon.devpost.com/submissions/621762-dealwise) | Pep: "shows how AI can improve people's lives". Hugo: feature-rich, personalised, location-aware. Procuro: judges "blown away" by the demo after a 1 a.m. pivot. Most other placements: no reason given. |
| **Vapi Build Challenge 2025** (300+ submissions) | Real-world: **Lavar** (reading companion), **Talvin** (AI recruiter already in production). Creative: **FROSTai** (hands-free step-by-step help for field technicians), **Jiffly**. Community picks: **Candling**, **JobGenie**, **Vapinception**, others | [winners post](https://vapi.ai/blog/meet-the-winners-of-the-vapi-build-challenge-2025) | Vapi: real-world picks "solved specific, high-friction problems"; community picks applied voice "thoughtfully to one well-defined problem". *Verified.* |
| **SF Voice Agent Hackathon** (AssemblyAI + LiveKit + Rime, 19 Sep 2025) | **Voxy** (grand, $1,500): enter a company name, get a working voice agent. Also **Podweaver** (technical complexity), **Deep Fried Learning** (hands-free cooking), **Hands-Free Podcast**, **Work Daddy** (most fun) | [recap](https://www.assemblyai.com/blog/voice-agent-hackathon-sept-19) | Judges on Voxy: "The platform just works" and "accessible to any business, not just those with technical teams". *Verified.* |
| **AssemblyAI Voice Agent Hackathon** on lablab.ai (2026) | 5 winners ($1,000 cash + $1,000 credits each); names not retrieved | [page](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon) | Criteria: application of technology, presentation, business value, originality. *Verified criteria; no winners read.* |
| **OpenAI × Cerebral Valley "Voice Hack Night"** | Agentic OS for a Phone (1st), Wagner, Surgical Triage, Curo | [aggregator](https://www.traeai.com/en/entities/voice-hack-night) | *Snippet only* (secondary site, unconfirmed). No reasons. |
| **ElevenLabs hackathon site** (Mar 2026 listing) | **Kleos**: speak a topic, get an audio documentary | [hacks.elevenlabs.io](https://hacks.elevenlabs.io/hackathons/0) | *Snippet only.* |

**What the voice winners share** (*inferred from the rows above*): (1) voice fits a moment where hands or eyes are busy or the phone is the interface (FROSTai, Vectr, Deep Fried Learning, Roadmate); (2) a demo that shows an unmistakable moment (GibberLink's two agents, Procuro's phone calls); (3) one specific user and pain (Candling, Talvin); (4) "it just works" for a non-technical person (Voxy); (5) real people helped (Pep).

### 1C. WeMakeDevs winners, 2025–2026 (the org that is judging)

No judge comments exist on any of these pages. "Why" is therefore *inferred* from the project and the prize name unless stated.

| Event | Winner / project | Link | Why (inferred) |
|---|---|---|---|
| **Cognee "Hangover Part AI"**, Jun 29–Jul 5 2026 | **Lethe**: self-hosted on-call triage assistant that can verifiably forget decommissioned systems (Track 1 grand) | [repo](https://github.com/vinayaksonthalia/lethe), [live](https://vinayaksonthalia-lethe.hf.space/), [demo](https://youtu.be/3840gxTZWxY) | Sharp developer pain, a memorable claim ("verifiable forgetting"), live link, video. |
| same | **Classroom Memory** (Track 2 grand); **RealtyRecall** (Best Blog; always-on **voice** receptionist that remembers callers) | [live](https://classroom-memory.vercel.app/), [RealtyRecall blog](https://mahimairaja.medium.com/your-voice-agent-forgets-you-the-moment-you-hang-up-i-gave-it-a-memory-90ef8fdc8327), [live](https://realtyrecall.mahimai.ca/) | Each had repo, live site and video. A voice project won the blog prize on its story. |
| **Scrape-Verse** (Bright Data, Port, SigNoz), Aug 17–23 2026 | **Research Factory** (grand); **ScrapeSentry** (Best UI); **PriceGuardAI** (Best Clean Code); plus Best-Use prizes; **Best LinkedIn Post** | [Research Factory](https://github.com/bgoconnor/port-brightdata-signoz-hackathon-kit), [ScrapeSentry](https://scrapesentry.vercel.app), [LinkedIn winner](https://www.linkedin.com/posts/shankar70_wemakedevs-scrapeverse-brightdata-activity-7496239490600943618-bmkb) | Separate prizes for UI, clean code, sponsor depth **and a social post**. Almost every winner has a live URL. |
| **Zerops Challenge**, Aug 5–10 2026 | **Deplot AI** (best overall); **FlowForge AI** (top social post) | [Deplot live](https://web-2a39-3000.prg1.zerops.app/), [FlowForge](https://frontend-1e3.ny1.zerops.app) | Deploy-your-repo tool on the sponsor's platform; a social-post prize again. |
| **Agents of SigNoz**, Jul 20–27 2026 | Track grand winners: Srinjoy Roy (**OTel for CrewAI**), Dhruv Sachdev (**DebugProof**), Shashwat Pratap Singh (**RootCause**); 350+ projects, 500+ blogs | [winners page](https://archive.wemakedevs.org/hackathons/signoz/projects), [DebugProof demo](https://youtu.be/f3-xbrvceFY) | Scale benchmark: a sponsor hackathon here can draw 350+ projects. |
| **Pirates of the Coral-bean**, May 25–31 2026 | **Manthan** (Track 1); **GSoC and Open-Source Matchmaker** (Track 2) | [Manthan live](https://www.manthan.quest), [Matchmaker live](https://open-source-matchmaker-seven.vercel.app) | Both with live URL and demo video. |
| **Vision Possible**, Feb 23–Mar 1 2026 | 1st **ETMS** (privacy-first safety system for falls/wandering); 2nd **OceanWatch**; 3rd **Watcher** (posture coach) | [ETMS](https://github.com/Pavankumar07s/Vision-Possible.git) | Real-world safety use of the sponsor's vision tech. |
| **2 Fast 2 MCP**, Feb 8–15 2026 | 1st **TrendOps**; 2nd **Preffer**; 3rd **AgriBot** (farmers) | [TrendOps](https://github.com/anish-maheshwari/TrendOps-) | Governance and safety angle suited the sponsor (Archestra). |
| **The UI Strikes Back** (Tambo), Feb 2–7 2026 | 1st **DealDesk-Tambo**; 2nd **Fireflow**; 3rd **Brilliant** (conversational calendar) | [DealDesk](https://github.com/wafflebytes/DealDesk-Tambo) | Deep use of the sponsor's generative-UI feature on familiar work tools. |
| **AI Agents Assemble** (Dec 2025) | **InFoundry** (CodeRabbit prize), **InfuseAI**, **Vriksha AI**, **Tria** (Gmail sorter on Kestra), **Cadara** | [InFoundry](https://github.com/crypticsaiyan/infoundry), [Tria](https://github.com/Shivam-Katare/tria) | One prize per sponsor tool: depth of sponsor use wins prizes. |
| **Backend Reloaded** (Motia), Dec 15–21 2025 | 1st **Orchestrix**; 2nd **SocialOps**; 3rd **OpsGuard** | [Orchestrix](https://github.com/AymaanPathan/Orchestrix) | Plain-English-to-API builder, workflow for creators, SRE with human approval. |
| **Lingo MultilingualHack**, Nov 13–16 2025 | 1st **Podcastify**; 2nd **SignLingua**; 3rd **GlobSEO**. (Maulik's *GlobalOnboard* is in the "All Projects" list) | [Podcastify](https://github.com/HoneyPaptan/podcastify) | Clear single-sentence idea, a visible output (audio), strong sponsor fit. |
| **FutureStack 2025**, Sep 29–Oct 5 | **VoiceGraph** (Best Use of Cerebras: voice-driven automation), **Sure AI**, **SRE Sentinel** | [VoiceGraph](https://github.com/HoneyPaptan/voicegraph) | Prizes are per sponsor, not one grand prize. |
| **AgentHack 2025**, Aug 20–25 | **DCRCA Agent**, **Anti Money Laundering Agent**, **YouTube Companion Agent** | [AML agent](https://github.com/asquare14/portia-agent-examples/tree/aml-agent/anti-money-laundering-agent) | Serious-domain agents with several cooperating agents. |

**Patterns across these pages** (*verified lists, inferred meaning*):
- **Serial winners.** The same handles recur: Honey Paptan (VoiceGraph, Podcastify, Startup Autopilot), Rahul Joshi (GlobSEO, InFoundry), Aryan Kumar (SRE Sentinel, MCP Guardian, OmniReel), Aymaan Pathan (Orchestrix, InfraPilot, DevBuddy), Himanshu (ScrapeSentry; EmbodiWeave and DecisionDebt at Graph Hacks per the local notes). They ship small, working, sponsor-fit tools fast, with a public repo and demo. Expect a few of them here.
- **Prizes follow sponsor depth.** Most events give a "Best use of [sponsor]" prize per tool. This rubric replaces that with "Wispr used meaningfully" at 30%, so depth of Flow use is the equivalent lever.
- **Social is paid for.** Best Blog (Cognee), Best LinkedIn Post (Scrape-Verse), Top Social Post (Zerops), top social posts (SigNoz, Tambo). The Wispr "Social" prize continues this.
- **Live link is the norm for winners.** Lethe, Classroom Memory, Manthan, Matchmaker, ScrapeSentry, PriceGuardAI, Deplot all list a live URL.
- **Most winning projects are tools for the builder's own world** (incident triage, deploy, email, scraping), not consumer apps. That matches "fix a problem in your own work".

Missing from this table: Graph Hacks (results not announced; see 1D), Back to the Metadata (winners listed by name only, no project names), Accomplish and Mergetober (contribution-based). 2024: only HackFrost (Nov 29–Dec 2, 2024) is on the list and I did not read its results.

### 1D. Local files from Graph Hacks (read only)

From `PAST-WINNERS.md`, `OTHER-SUBMISSIONS.md`, `RETROSPECTIVE.md` (Maulik's own notes, same organiser, FalkorDB's judges, not Wispr's):
- FalkorDB's people praised: an answer the simpler tool can't give, evidence on every answer, safety discipline, privacy by design, learning from human corrections, honest failure modes, real data at scale.
- Strong rivals all shipped a **baseline with numbers** (graph vs vector search, 5/5 vs 0/5), proof the product **breaks without the sponsor tech**, a **live link with a key per judge**, and videos near 3 minutes. Maulik's own video was ~11 minutes with the best moment at minute 9.
- Misses to avoid here: the extension defaulted to a local server so the judge path failed; the freeze slipped; the blog was posted at 9:30 pm on the last night with tags added at 11:30 pm; features crowded out the brief's must-haves.

---

## 2. Twelve to fifteen winning qualities, mapped to this rubric

Rubric: **Real problem 30 · Wispr use 30 · Works 25 · Demo 15.**

| # | Quality | Rubric | Evidence it wins | Do this |
|---|---|---|---|---|
| 1 | **A problem from your own week, with a named user and a before/after number** | Real 30 | Rubric: "a specific problem, a clear user, a tool that person would keep using." Ideas page: "The best entry fixes a problem from your own work." Vapi's real-world winners "solved specific, high-friction problems." *Verified* | State the user and the pain in one sentence. Give one "before" measure (minutes per task or items missed). |
| 2 | **One real output from real use, shown** | Real 30, Demo 15 | Every example on the ideas page ends in "Show: the working tool and a result from a real [day/call/review]." The sample submission used 14 real call notes. *Verified* | Run it on your own anonymised data and put one real result in the demo and the page. |
| 3 | **A tool they would keep using (repeat use, not a one-shot)** | Real 30 | Rubric wording; Voxy: "the platform just works." *Verified* | Make the second use easier than the first (saved projects, history, export). Say how often the pain occurs. |
| 4 | **Narrow scope, one well-defined problem** | Real 30, Demo 15 | Vapi community picks: "one well-defined problem." Maulik's Graph Hacks notes flag Allevia (13 agents, all three tracks) as "spreading thins the story" (no results announced yet, so this is a judgment, not an outcome). *Verified / local file* | Cut anything that doesn't serve the one user story. |
| 5 | **Voice is the natural input, not an add-on** | Wispr 30 | Voice winners fit hands-busy moments: FROSTai, Vectr, Deep Fried Learning, Roadmate. The brief's own hook is "No Hands". *Verified examples; reading inferred* | Pick a moment where the user's hands or eyes are busy. Show the typed version being worse. |
| 6 | **Flow is in the build, and you can prove it** | Wispr 30 | Rules: "Judges look at how much of your writing went through Flow"; usage card is required; sample submission quotes 21,480 words. *Verified* | Dictate every prompt, doc, issue and commit note. Keep a weekly usage card. Record a short Flow clip. |
| 7 | **Flow is in the product's workflow, shown in the demo** | Wispr 30, Demo 15 | Rubric: "Flow is part of the build and workflow, shown in the demo and usage card." *Verified* | Put the Fn-hold in the first 20 seconds of the video. Don't make Flow the prompt box only. |
| 8 | **A short "where my voice went" note plus honest feedback** | Wispr 30 | Form: "How you used Wispr Flow… is 30% of the score" and a required feedback field that goes to Wispr. *Verified* | Keep running notes (what worked, what broke, what you'd want next) from day 1. Give 2–3 specific bugs or wishes. |
| 9 | **Live link, no sign-up, one-click sample, works without a mic** | Works 25 | Rule: "a live link judges can open and use without signing up." Most WeMakeDevs winners have a live URL (Lethe, Classroom Memory, Manthan, ScrapeSentry…). Graph Hacks retro: the judge path failed by default. *Verified / local file* | Host it. Add "Try a sample" and a typed fallback. Test it in a fresh browser profile with only the link. |
| 10 | **Defaults beat docs; stranger test before freeze** | Works 25 | Retro: "Defaults beat docs: judges don't read setup notes." *Local file* | Freeze 29 Oct. Have someone else try it while you watch silently. |
| 11 | **A hard-capped demo with the payoff in the first 20 seconds** | Demo 15 | Limit is 2 minutes. GibberLink and Procuro won on demo moments. Graph Hacks' strongest videos were 2:50–3:00 and Maulik's 11-minute video buried its best moment. *Verified / local file* | Script: pain (10 s) → one spoken command → result → number. Under 2:00, captions on, no jargon. |
| 12 | **Repost-ready and shareable** | Demo 15, Social prize | Rules: WeMakeDevs and Wispr "may feature the project and demo video on their channels." Wispr's earlier contests required a 30-second social walkthrough. Lovable's page: shared builds get more votes. *Verified; implication inferred* | Make the video good enough for the CMO to post as is. |
| 13 | **Build in public, weekly, showing a real workflow** | Wispr 30, Social prize | Social prize is "based on how clearly a post shows a real workflow." WeMakeDevs repeatedly pays for posts and blogs (Scrape-Verse Best LinkedIn Post, Zerops top social post, Cognee Best Blog). *Verified* | Post by Sun 25 Oct with #NoHandsChallenge, tag WeMakeDevs and Wispr Flow, one before/after clip. Publish the write-up well before the deadline. |
| 14 | **A baseline with one number a non-specialist understands** | Real 30, Works 25 | Graph Hacks rivals won credibility with baselines (80.0 vs 19.2; 5/5 vs 0/5). The judges here are product people, so one clear number, not a benchmark suite. *Local file; adaptation inferred* | Typed vs dictated time, and plain-chat vs the tool on the same input. |
| 15 | **Trust: privacy both ways and honest limits** | Real 30, Works 25 | FalkorDB's people praised privacy by design and honest failure modes; Maulik's retro flags that "nothing filters private text." *Local file* | Redact before any LLM call; store nothing past the session by default; say what it gets wrong. |

Not on the list on purpose: technical depth, architecture and "creativity" are not scored by this rubric. Use them only if they serve rows 1–11.

**Where the points actually are** (*inferred*): the 30+30 for problem and Wispr use is decided by what you write and show, not by code. The 25 for "works" is decided by one stranger test. The 15 for demo is a 2-minute script. All three are cheap compared with extra features.

---

## 3. Competition scan (as of Mon 19 Oct 2026)

### What I could see

The searchable web shows **very little** this early. X and LinkedIn require a login for hashtag feeds, so a hashtag page is not reachable; I used search-engine results and public post URLs.

| Post | What it says | Link |
|---|---|---|
| Sriniketh Sudheendra, LinkedIn, about 18 Oct | Building **Dictaflow**: turns raw spoken meeting notes into structured summaries and action items with the Gemini API; says the UI and API are built by voice; shares a Flow insights screenshot | [post](https://www.linkedin.com/posts/sriniketh-sudheendra-9567441a6_nohandschallenge-wemakedevs-wisprflow-activity-7517607287272955904-lGrA) |
| Sattyam Samania, X, 17 Oct | "Day 1… dictated 2,200+ words at 141 WPM." No project named; 77 views | [post](https://x.com/itzsam_ai/status/2111440300006903999) |
| Maitreya Sonawane, comment on Kunal's LinkedIn post | Says every project they build is made with Flow (no project named) | [post](https://www.linkedin.com/posts/kunal-kushwaha_from-now-till-30-october-id-like-you-to-activity-7516840969351184384-bZ4h) |

Reach signals: Kunal's launch post on X had 9,234 views and 134 likes; his LinkedIn post had 163 reactions and 5 comments; WeMakeDevs' Instagram launch had 99 likes ([X](https://x.com/kunalstwt/status/2111074098289729848)). That is modest.

**Not available:** the leaderboard ("couldn't load"), the registrant count, the Discord, and any Reddit results (blocked). The hashtag is also used for unrelated dance/yoga posts, so searches are noisy.

### Reading it (*inferred*)
- **Field size.** Two projects visible in the first three days. A sponsor hackathon like SigNoz drew 350+ projects, but this one is India-only, solo, voice-required and has a harder submission form, so I would expect far fewer submissions that are complete and live. Plan as if dozens of finished entries, not hundreds.
- **The usage lane is a separate race.** Day 1: 2,200+ words from one participant; Maulik's day-1 card shows 356 words. One public benchmark: 44,414 words in six months was "top 0.1%" of Flow users ([X post](https://x.com/sdhilip/status/2069140867466797200), *snippet*). Rank 1 over 14 days will likely mean tens of thousands of words. Rank 1 does not need a better project, only more dictation.
- **A reply under Kunal's launch tweet asks how judges can know you didn't type** (*snippet*). The rules answer it: usage is measured from Flow's Insights and "confirmed with Wispr." Heavy, visible dictation is the proof.

### Crowded spaces to avoid (or to do very differently)
Based on the organisers' own examples, last-year winners, and the one project seen:

| Space | Why crowded | Source |
|---|---|---|
| **Meeting/call notes → summary + action items** (Dictaflow is already one) | Wispr's own Notetaker does it; organisers' sample submission is a call follow-up tool; PRD-from-call-notes and "meeting notes into tickets" are on the ideas page | [ideas](https://www.wemakedevs.org/wispr/ideas), Sriniketh's post |
| **Standup / weekly status bot, release notes writer, code review assistant** | Listed as examples on the judges page, the blog and the ideas page | [judges](https://www.wemakedevs.org/wispr/judges), [blog](https://www.wemakedevs.org/blogs/wispr) |
| **Inbox sorter / reply drafter** | Listed on the ideas page; Tria, Objective Email already won or placed at earlier WeMakeDevs events | [ideas](https://www.wemakedevs.org/wispr/ideas), [Assemble](https://archive.wemakedevs.org/hackathons/assemblehack25/projects) |
| **Follow-up email / CRM update from call notes** | The organisers' own sample submission and a No-Code example | [wispr page](https://www.wemakedevs.org/wispr) |
| **Dictation apps and wrappers** (a "voice to text" tool) | Competes with Wispr itself, so "Wispr used meaningfully" is hard to argue; a WisprGemma-style clone placed 2nd at a Gemma event (*snippet*) | [search result](https://arindamm.dev/blog/i-built-a-wispr-flow-clone-and-won-450-3ddp) |
| **Generic voice receptionist / voice agent** | Heavily covered at ElevenLabs, Vapi and AssemblyAI events, and a voice receptionist already won Best Blog at Cognee | [Vapi winners](https://vapi.ai/blog/meet-the-winners-of-the-vapi-build-challenge-2025) |
| **AI SRE / incident-triage agents** | Dozens in the WeMakeDevs archives (SRE Sentinel, SecureOps, On-Call Agent, PitCrew, OpsGuard…) | [2 Fast 2 MCP](https://archive.wemakedevs.org/hackathons/2fast2mcp/projects) |

**For the voice-QA seed:** in what I scanned, no No Hands entry targets QA or bug reporting (the evidence is thin, so low confidence). Many general bug-capture products exist outside the hackathon (*inferred from background knowledge, not checked here*); the question to answer for judges is why voice plus a screenshot, in the tester's own flow, beats them.

---

## 4. What I could not confirm
- Why any WeMakeDevs project won beyond what its own page says (no judge comments are published).
- NexHacks Wispr track details beyond the winner's post (Devpost returned 403).
- Winners of the AssemblyAI lablab event, the Voice Hack Night (secondary source only), and the full Contra project names.
- Any Wispr-sponsored hackathon in India before this one.
- How the four judges have scored past WeMakeDevs events. Scores for this event will be public on the leaderboard from 4 Nov.

---

## 5. Sources

### Verified (page opened and read)
**This hackathon**
- [wemakedevs.org/wispr](https://www.wemakedevs.org/wispr) · [/wispr/ideas](https://www.wemakedevs.org/wispr/ideas) · [/wispr/judges](https://www.wemakedevs.org/wispr/judges) · [/blogs/wispr](https://www.wemakedevs.org/blogs/wispr) · [leaderboard page (did not load)](https://www.wemakedevs.org/hackathons/wispr/leaderboard)
- [Kunal Kushwaha, LinkedIn launch post](https://www.linkedin.com/posts/kunal-kushwaha_from-now-till-30-october-id-like-you-to-activity-7516840969351184384-bZ4h) · [Kunal, X launch post](https://x.com/kunalstwt/status/2111074098289729848) · [WeMakeDevs, LinkedIn](https://www.linkedin.com/posts/wemakedevs_got-a-problem-at-work-youve-been-meaning-activity-7517546389745332224-GatY)
- [Sriniketh Sudheendra, LinkedIn](https://www.linkedin.com/posts/sriniketh-sudheendra-9567441a6_nohandschallenge-wemakedevs-wisprflow-activity-7517607287272955904-lGrA) · [Sattyam Samania, X](https://x.com/itzsam_ai/status/2111440300006903999)

**WeMakeDevs archive and hackathon pages**
- [Hackathon list](https://www.wemakedevs.org/hackathons) · [Graph Hacks page](https://wemakedevs.org/hackathons/falkordb)
- Winner pages: [Cognee](https://archive.wemakedevs.org/hackathons/cognee/projects) · [FutureStack 2025](https://archive.wemakedevs.org/hackathons/futurestack25/projects) · [AgentHack 2025](https://archive.wemakedevs.org/hackathons/agenthack25/projects) · [AI Agents Assemble](https://archive.wemakedevs.org/hackathons/assemblehack25/projects) · [Lingo](https://archive.wemakedevs.org/hackathons/lingohack25/projects) · [Tambo](https://archive.wemakedevs.org/hackathons/tambo/projects) · [2 Fast 2 MCP](https://archive.wemakedevs.org/hackathons/2fast2mcp/projects) · [Coral](https://archive.wemakedevs.org/hackathons/coral/projects) · [Vision Possible](https://archive.wemakedevs.org/hackathons/vision/projects) · [SigNoz](https://archive.wemakedevs.org/hackathons/signoz/projects) · [OpenMetadata](https://archive.wemakedevs.org/hackathons/openmetadata/projects) · [Motia](https://archive.wemakedevs.org/hackathons/motiahack25/projects) · [Accomplish](https://archive.wemakedevs.org/hackathons/accomplish/projects) · [Scrape-Verse](https://wemakedevs.org/hackathons/scrape-verse/projects) · [Zerops](https://wemakedevs.org/hackathons/zerops/projects)
- [Brabble overview of WeMakeDevs hackathons](https://brabble.ai/blog/wemakedevs-hackathon) (third-party, background only)

**Wispr-linked contests**
- [Lovable winners post](https://www.linkedin.com/posts/lovable-dev_last-week-we-asked-you-to-build-for-the-activity-7461081092146720768-Hbbh) · [Built for Moms page](https://builtformoms.lovable.app/) · [Wispr launch post for the Contra challenge](https://www.linkedin.com/posts/wisprflow_excited-to-announce-the-wispr-flow-challenge-activity-7426683538898477057-DJ6T) · [Contra guidelines](https://contra.com/community/topic/wisprflowchallenge/guidelines) · [Contra results](https://contra.com/community/FI5PB7L6-explore-winning-projects-wispr-flow-challenge)
- [NexHacks winner Usman Khan, LinkedIn](https://www.linkedin.com/posts/usman-khan-7a7407284_vanderbilt-hackathon-engineering-activity-7424122890629079040-imN_) · [Speakeasy event page](https://www.startupgrantsindia.com/events/speakeasy-w-wispr-flow)

**Voice-AI hackathons**
- [ElevenLabs winners](https://elevenlabs.io/blog/announcing-the-winners-of-the-elevenlabs-worldwide-hackathon) · [Vapi winners](https://vapi.ai/blog/meet-the-winners-of-the-vapi-build-challenge-2025) · [AssemblyAI SF recap](https://www.assemblyai.com/blog/voice-agent-hackathon-sept-19) · [lablab AssemblyAI page](https://lablab.ai/ai-hackathons/assemblyai-voice-agent-hackathon)

**Local files (Maulik's, read only)**
- `PS5 Winning Hackathon/planning/PAST-WINNERS.md`, `OTHER-SUBMISSIONS.md`, `RETROSPECTIVE.md`

### Snippet only (search result text, page not opened or blocked)
- [CompeteHub: NexHacks Wispr add-on track prize and rule](https://www.competehub.dev/en/competitions/devpost26155)
- [Megathon Prompt DJ repo](https://github.com/WisprGoBetween/prompt-roulette) (megathon.fluxzero.io track page would not load)
- [Voice Hack Night winners (aggregator)](https://www.traeai.com/en/entities/voice-hack-night) · [hacks.elevenlabs.io (Kleos)](https://hacks.elevenlabs.io/hackathons/0) (page returned 403 when opened)
- [WisprGemma, 2nd place Build with Gemma Kolkata](https://arindamm.dev/blog/i-built-a-wispr-flow-clone-and-won-450-3ddp) (blog returned 404; result from search summary)
- [X post: 44,414 words, top 0.1%](https://x.com/sdhilip/status/2069140867466797200) · Kunal's tweet reply about verification (seen in a search snippet)
- [Wispr on X about 250 Built for Moms builders](https://x.com/WisprFlow/status/2054666557922717823)

### Not reachable
- X and LinkedIn hashtag feeds (login wall), the No Hands leaderboard, the WeMakeDevs Discord, Reddit, NexHacks Devpost, Gannon's NexHacks write-up (timed out).
