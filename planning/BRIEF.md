# No Hands: The Wispr Challenge — brief and plan

Read from the official pages on Oct 19, 2026: [blog](https://www.wemakedevs.org/blogs/wispr), [overview](https://www.wemakedevs.org/wispr), [ideas](https://www.wemakedevs.org/wispr/ideas), [schedule](https://www.wemakedevs.org/wispr/schedule), [judging](https://www.wemakedevs.org/wispr/judges). Re-read this every morning.

## The brief in one line
Build a working tool that fixes a real problem in **your own work**, and do the building **by voice with Wispr Flow** (prompts, docs, messages, commit notes). Keyboard only for shortcuts and small fixes.

## Facts
- **Organisers:** WeMakeDevs × Wispr Flow. Online, free, India only.
- **Solo only.** (The blog says "teams up to four", but the registration page says solo. Follow the registration page.)
- **One track, one project.** Track 1 **Builders** (writes code) fits Maulik. Track 2 is No-Code.
- **Deadline:** Fri 30 Oct, 11:59 pm IST. Submit on `wemakedevs.org/wispr/submit`.
- **Register with the same email as your Wispr Flow account.** Flow Pro free for 1 month with code `WEMAKEDEVS`.
- **First Flow = start of the project:** dictate the problem you want to fix and what the tool should do.

## Judging (fixed before the start)
| Weight | Question | What they look for | What that means for us |
|---|---|---|---|
| 30% | Real problem in your work? | A specific problem, a clear user, a tool that person would keep using | Pick a problem from Maulik's actual week; show one real (anonymised) result it produced |
| 30% | Wispr used meaningfully? | Flow is part of the **build and the workflow**; demo and usage card show it | Voice is the tool's natural input, not an add-on. Dictate every prompt, doc, message and commit note. Clip of Flow in use |
| 25% | Does it work? | **A live link judges can open and use** | Hosted, no sign-in, sample input one click away, works without a mic |
| 15% | Clear demo? | A **two-minute** video anyone can follow | Hard 2-minute limit. Strongest moment in the first 20 seconds |

Judges: Kunal Kushwaha (WeMakeDevs founder), Rohan Kochhar (Wispr Flow India growth), Aayush Sharma (WeMakeDevs COO), Sachin Sharma (WeMakeDevs CMO). Mostly product and growth people: a relatable problem and a clear before/after will land better than technical depth. All scores and comments are public.

Weights come from the blog; the judging page renders them as animated counters.

## Submission form (`/wispr/submit`, checked Oct 19 while signed in)
On Oct 19 the form was only a preview, so nothing typed there was saved. Once it's live you can edit your submission until the deadline. It has 7 required fields:
1. Project name
2. Track (Builders / No-Code)
3. Link to the working project: "a live link the judges can open and use **without signing up for anything**"
4. Demo video, up to 2 minutes (unlisted YouTube or Loom)
5. About the project: the problem, who it's for, how you used Wispr Flow
6. Wispr usage card: in Flow, go to Insights → Your usage → **Share**, then upload one image (≤5 MB)
7. **Your feedback on Wispr Flow**: what worked, what got in the way, what you'd want next. It goes to the Wispr team, so keep notes as we build

The form's own note: "How you used Wispr Flow… is 30% of the score, so show the judges where your voice went."

## Registration status (Oct 19)
- Registered on WeMakeDevs as Maulik Ranadive (profile `/maulik_ranadive_17`). The welcome email says "pending verification" until a Flow account with the same email has run a first Flow.
- Flow account: Google sign-in with the same Gmail. First Flows done (day-1 card: 356 words, 161 wpm, 3 apps).
- Leaderboard: `wemakedevs.org/hackathons/wispr/leaderboard` ("couldn't load" on Oct 19).
- **Weekly check-in form: not live anywhere yet.** It's not in the account menu (Home, Profile, Feedback, Settings) and not linked in any email. Expect it by email before Mon 26 Oct; otherwise ask in Discord or reply to the welcome email.
- The Wispr Flow connector is connected in Claude: meetings (Notetaker), scratchpad notes, calendar. All read-only.

## Prizes (₹3 lakh total)
- ₹1,00,000 best Builders project · ₹1,00,000 best No-Code project
- ₹1,00,000 **Most Wispr usage**: rank 1 by words dictated during the challenge, in any app. Confirmed with Wispr before payout
- Weekly prizes (Wispr usage and Social), named every Monday
- The ₹0 "Top 3 projects" block on the site is a placeholder. The Oct 17 and Oct 19 emails confirm it's three cash prizes of ₹1 lakh each: Builders, At Work/No-Code, and Wispr usage

## Weekly duties
- Upload the usage card once a week.
- Post progress with **#NoHandsChallenge**, tag WeMakeDevs and Wispr Flow, add the link to the weekly check-in. Social is judged on "how clearly a post shows a real workflow".
- Where the check-in form lives isn't linked publicly; it's probably in the dashboard after sign-in. Check after registering.

## Key dates
| Date | Event |
|---|---|
| Fri 16 Oct | Started |
| **Mon 19 Oct** | Leaderboard goes live. **We start today: 11 days left** |
| Sun 25 Oct | Our week-1 check-in + post (winners named Mon 26) |
| **Thu 29 Oct** | **Our feature freeze.** Stranger test, video, description |
| Fri 30 Oct | Submit by the afternoon, not at 11:59 pm |
| Mon 2 Nov | Week-2 winners |
| Wed 4 Nov | Scores published · Thu 5 Nov last day to question a score |
| Fri 6 Nov | Winners + prize money |

## Rules we set ourselves (from the Graph Hacks retrospective)
- **Wispr Flow is not installed yet.** Install it and register **before** more work: every word typed from now on is a word that doesn't count, and judges look at how much of the writing went through Flow.
- **Defaults beat docs:** the live link must work for a stranger with zero setup and no mic (a "try a sample" button).
- **Baseline with numbers:** time to write it by hand vs dictating into the tool; what a plain chat prompt misses vs the tool's output.
- **Privacy both ways:** real customer names and data never go into the demo or the LLM; redact before sending; no storage beyond the session by default.
- **Freeze a day early (29 Oct)**, then a stranger test in a fresh browser profile with only the submission link.
- Score every feature against the four questions above before building it.

## Idea shortlist (Oct 19, before Maulik's own problem dump)
These come from Maulik's ServiceNow solution-architect work at his day job (implementations and upgrades of an enterprise app). The "real problem" scores are guesses until Maulik confirms how often each pain happens and how long it takes today.

Score 1–5 per judging question, weighted 30/30/25/15:

| Idea | Real problem | Wispr in the workflow | Works (live link) | Demo | Weighted |
|---|---|---|---|---|---|
| **A. Scope Catcher** | 5 | 4 | 5 | 4 | **4.55** |
| **B. Talk-through Tester** | 4 | 5 | 4 | 5 | **4.45** |
| C. ServiceNow config from voice | 3 | 3 | 3 | 4 | 3.15 |
| D. Weekly status from voice | 3 | 3 | 5 | 3 | 3.50 |

**A. Scope Catcher.** After a customer call, hold Fn and talk for two minutes. Out comes a requirement summary, ServiceNow user stories with acceptance criteria, the platform pieces each one touches (tables, Flow Designer, Business Rules, ACLs, UI Builder), open questions to send back, a **scope-change flag** against what's already agreed, an effort range, and the follow-up email.
- Problem: turning calls into documents eats the evening, and scope creep nobody flagged becomes a missed date.
- Wispr: talking right after a call is the natural input. Stretch goal: pull the call straight from Flow's Notetaker.
- Baseline: minutes to write it by hand vs to dictate it; open questions a plain ChatGPT prompt misses vs our checklist.

**B. Talk-through Tester.** During UAT or upgrade testing (e.g. a major version upgrade), your hands are on the mouse clicking through the instance. Hold Fn and say what you see ("approve button missing for the legal role on the contract form"). Out comes a structured defect (steps, expected vs actual, severity, component, role), a running UAT log, and an export to CSV, Jira or a ServiceNow import.
- Problem: testers stop clicking to type defects, lose context, and log thin tickets that bounce back.
- Wispr: the most literal "No Hands" story there is. Voice is the only free input while your hands test.
- Baseline: defects logged per hour, and how complete each ticket is, typed vs talked.

**C. ServiceNow config from voice.** Dictate a requirement and get scripts plus an update set. Judges can't easily verify it without an instance, and Wispr is just the prompt box here.

**D. Weekly status from voice.** Easy, but it's the organisers' own example idea, so expect a crowd of similar entries.

**Wispr beyond dictation (any idea):** dictate every prompt, doc and commit note; record short Flow clips for the demo; keep notes for the "feedback on Wispr Flow" field. Spike on day 1: can our web app read Flow Notetaker meetings or scratchpad (via Wispr's MCP over OAuth)? If yes, that's deep integration. If not, voice-first input is still enough.
