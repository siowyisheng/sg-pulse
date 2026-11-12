# Handoff: Yah Lah (repo `siowyisheng/sg-pulse`)

Date: 2026-11-12 (Asia/Singapore). Written at the end of a design-and-planning session. No application code exists yet. All planning is in the tracker and the docs below.

## Where everything lives (read these, don't re-derive)

- **Spec:** GitHub issue #1, `https://github.com/siowyisheng/sg-pulse/issues/1` (74 user stories, implementation, testing and out-of-scope decisions).
- **Tickets:** issues #2 to #20, each with parent #1, acceptance criteria, and native GitHub blocking links. Frontier right now: #2 (walking skeleton), #3 (Singpass onboarding, human), #4 (pre-launch checklist, human). #5 (theme and style-guide enforcement) follows #2 and gates the UI tickets.
- **Glossary:** `CONTEXT.md` in the repo root. Use its terms exactly (Feeling, Polarity, Hashtag, Candidate, Cycle, Upvote, Byline, Approval, Carry-over, Election Mode and so on).
- **ADRs:** `docs/adr/0001` (public Byline with initials, sex, age band) and `docs/adr/0002` (Admin approves each winner before go-live).
- **Style guide:** `docs/style-guide.md` (copied from jio-me; ticket #5 rewrites it with a new palette and keeps the brand "Yah Lah").
- **Skill config:** `CLAUDE.md` plus `docs/agents/issue-tracker.md`, `triage-labels.md`, `domain.md`.
- **Reference codebase:** `https://github.com/siowyisheng/jio-me` (same owner, same stack). Its Singpass FAPI 2.0 adapter, port and fake pattern, in-memory test harness (PGlite), web manifest and test-persona data are what the plan reuses. Its `CLAUDE.md` has the test conventions (fast suite plus `*.slow.test.ts` edge-case files) that SG Pulse should copy.

## State of things not yet in the repo or tracker

- **Uncommitted local edits on the user's computer.** The brand change to "Yah Lah" updated `CONTEXT.md` and both ADRs in the user's local folder (`C:\Users\USER\Desktop\projects\sg-pulse`), but these are not committed or pushed. The remote copies still say "SG Pulse". The user has to commit and push; do not do it for them unless asked.
- **The user's local folder is in sync with GitHub** (checked: `main...origin/main`, no divergence). They pushed a history rewrite earlier, so any other clone from before that is stale. No reset is needed on their side.
- **Naming decisions the user made:** the brand is "Yah Lah", which is also the label on the Upvote button; "Upvote" stays the canonical glossary term. The logo wordmark still reads "SG PULSE" and the user will change it later. Leave the logo alone. The repo name `sg-pulse` is unchanged.
- **The repo is public.** The spec and tickets are visible to anyone. The user was told.

## Decisions the user made that are easy to miss

- Submission is once per day, one Feeling per Cycle regardless of Polarity; one Upvote per day across both Polarities.
- No usernames anywhere; Byline is initials, sex, age band. No minimum age beyond 13 (PDPC consent line); under-18 Bylines drop the initials.
- Ad slot goes on the first screen below both Feelings of the Day (the user overrode my "below the fold" suggestion); no interstitials.
- Support link is a Stripe payment link with PayNow, worded as support, not a charity donation. Ads start with Google AdSense.
- Singpass confirmed (user's statement) that gating voting and submitting behind Singpass while leaving reading open is acceptable. Singpass authentication is currently free. Myinfo was also reported free by the user, from their earlier project.
- Stack: React, Next, Neon, Vercel. Currently on Vercel Hobby, which is non-commercial; Pro is required before ads or the support link go live (ticket #4). Cycle logic is derived from SGT time on every read and write, never from cron, because Hobby cron runs once a day with about an hour of slack.
- Seed Feelings are written by hand and labelled "From the team" with no Byline. Nothing is copied from Twitter/X (I pushed back on invented bylines; the user accepted the original-text option).

## Still unconfirmed or risky

- **Singpass approval of `name`, `sex`, `dob` for public display.** Not verified; jio-me deliberately never requested `name`. Ticket #3 includes asking partner support early. A refusal would force a Byline redesign.
- **Legal points from desk research, not legal advice** (some primary sources would not load): the racial harmony law's commencement and operator duties; whether a daily tally of #election Feelings counts as an election survey; POFMA penalties; the online safety act's definition of an online communication service; PDPA consent wording; the PDPC NRIC guidance update. Ticket #4 covers a lawyer review.
- **Mobile-web Singpass behaviour is unconfirmed:** new Singpass apps are described as QR-only, embedded in-app browsers are unsupported, and same-device app launch was not confirmed. Test on staging, in-browser and as an installed PWA, on iOS and Android.
- The FAPI 2.0 deadline for Singpass apps is 31 Dec 2026; build on FAPI 2.0 from the start.

## Environment quirks learned

- In the cloud session, `gh` high-level commands fail (GraphQL is blocked and `gh auth status` reports an invalid token), but `gh api repos/siowyisheng/sg-pulse/...` REST calls work, including creating issues, labels and native blocking links (`.../issues/{n}/dependencies/blocked_by` with the blocker's database id).
- Clones in the cloud workspace: `/home/claude/sg-pulse` (reset to the remote's new history) and `/home/claude/jio-me`. The user's real folder is reachable only through the device bridge (`device_bash`, mounted under `$HOME/mnt/sg-pulse`); Write/Edit tools do not touch it.
- The `sg-pulse` repo's labels now include `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, and the pre-existing `wontfix`.

## Suggested skills for the next agent

- **`mattpocock-skills:implement`**: start on ticket #2 (walking skeleton), then #5 and the chain it unlocks.
- **`mattpocock-skills:tdd`**: the testing decisions in #1 call for behaviour tests through the one application interface (in-memory database, fake clock, fake Singpass).
- **`mattpocock-skills:wizard`**: tickets #3 and #4 are human-only steps (Singpass portal, lawyer, DPO, Stripe, AdSense, Vercel Pro); a guided wizard fits them.
- **`mattpocock-skills:domain-modeling`**: when a new term or decision comes up, update `CONTEXT.md` and `docs/adr/` as the session goes.
- **`mattpocock-skills:triage`** and **`mattpocock-skills:to-tickets`**: if new issues arrive or the user wants a ticket split further.
- **`mattpocock-skills:diagnosing-bugs`**: for anything that breaks once there is code.
- **`mattpocock-skills:writing-for-agents`**: when adding a Tests section (copy jio-me's) to the repo's `CLAUDE.md`.

## First move for a fresh agent

1. Read issue #1 and `CONTEXT.md`, then ticket #2.
2. Ask the user whether they have committed and pushed the local brand edits, so you start from current docs.
3. Start #2. Do not create issues or commit to the user's folder unless asked.
