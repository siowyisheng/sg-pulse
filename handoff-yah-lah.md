# Handoff: Yah Lah (repo `siowyisheng/sg-pulse`)

Date: 13 Nov 2026, 03:45 SGT. Written when the owner stopped an implementation session partway through tickets #14, #15 and #17. This replaces the planning-session handoff that used to be in this file (the old one is in git history).

## Where things stand

| Ticket | State |
|---|---|
| #2, #5 to #13, #20 | Built, on `main`, deployed, closed |
| #14 Report, Take-down, Timeout | Built on branch `wip/14-15-17`, not verified, open |
| #15 Correction notices, one-click take-down | Same branch, open |
| #17 Archive and share cards | Same branch, open |
| #16 Election Mode | Deferred by the owner (next election expected 2030) |
| #18 Removal, account deletion, audit log | Not started; blocked by #14 |
| #19 Installable PWA and daily push | Not started; blocked on GitHub by #13 (closed) and #16 (deferred) |
| #3, #4 | Human tasks, open |

`main` is at `e5df1dc` and is what the live site (`https://sg-pulse.vercel.app`) runs. Migrations up to `drizzle/0004` have been run against Neon. Singpass staging is connected and logging in works on the live site.

## The unfinished branch: `wip/14-15-17` (commit `c0c2798`)

Read the diff against `main`; do not re-derive it. What is known:

- Typecheck passes and all 224 tests pass (`npm run test:all`), including new `tests/moderation*.test.ts` and `tests/archive*.test.ts`.
- **Not done:** `npm run build`; a pass through the screens in demo mode (`npm run demo`) at 360px; a review of the diff. Earlier tickets each got all three before going to `main`.
- It adds `drizzle/0005_moderation.sql`. The owner must run `npm run db:migrate` after it merges. Say so plainly: earlier migrations broke live pages until they were run.
- `docs/owner-todo.md` on the branch is already updated for these tickets.

To finish: check out the branch, build, try Report (on a Candidate), the Admin's report queue, Take-down, a correction notice, `/archive` and a share link with its preview image; fix what turns up; merge to `main`; push; tell the owner to migrate. Leave #14, #15 and #17 open for the owner to try and close.

### One decision on the branch the owner has not confirmed

A Feeling of the Day that is taken down is replaced at once by the next most-upvoted Feeling of its day, with no Approval. Tickets #14 and #15 ask for this, but ADR 0002 says every winner is approved by an Admin first. It is listed in `docs/owner-todo.md`; raise it again when handing the branch over.

## How the owner works (follow this)

- **Push to GitHub, do not write to their local folder.** Work in a clone, commit, push to `origin`. They pull.
- **One or a few tickets per request**, named by them or "all unblocked tickets". A ticket counts as blocked while any blocker is open on GitHub, so nothing new starts until they close the previous ones.
- **They close tickets, or tell you to by number.** Do not close on your own inference: an attempt to close tickets they had not named was refused by the permission system.
- **After each ticket they want:** what was built against the acceptance criteria, what they must do (migrations first), and the decisions you made, briefly. They usually reply "decisions are fine".
- **`docs/owner-todo.md` is where anything they must do is recorded.** `CLAUDE.md` has the rule: add to it in the same commit, never tick items. They tick items themselves, so match existing lines exactly before editing them.
- They stopped using `/code-review`'s sub-agents implicitly: every ticket so far was reviewed inline by the implementing agent, and each summary said so.

## Things that are easy to get wrong

- **Repo conventions are in `CLAUDE.md`:** tests go through `createTestApp` only, fast suite versus `*.slow.test.ts`, and no raw colour or font values outside `src/theme/tokens.ts` (the build fails). `src/theme/` is the one place drawing code may write styles out, which is why the share card lives there.
- **The Cycle is always derived from the clock passed in.** Never use `new Date()` in `src/core`. A Feeling submitted at or after 21:00 SGT belongs to the next Cycle, so test worlds that need Candidates "today" must be created before 21:00.
- **Counts are hidden from everyone but the Admin** until a Feeling has won. The harness's `tally()` reads storage directly for that reason.
- **`cast` is a reserved word in SQL.** Several statements are single raw-SQL statements on purpose (the Neon HTTP driver has no interactive transactions); keep check-and-write in one statement.
- **Next.js here is newer than training data.** `AGENTS.md` says to read `node_modules/next/dist/docs/` before using an unfamiliar API. Patterns already in the repo (async `cookies()`, server actions, `next/font/local`) are known to work.
- **React clears a form's own fields after a form action**, even a refused one. Forms that must keep their values send by hand (`onSubmit` plus `startTransition`); see `app/submit/submit-form.tsx`.
- **Playwright's `text=` selector is a case-insensitive substring match.** It clicked a paragraph instead of a button twice. Use `button:has-text(...)` or a class.
- **Server-action redirects inside the site are soft navigations**; `wait_for_url` with its default wait hangs. Poll `page.url`.

## Verifying in a browser

`npm run demo` runs the real app on in-memory Postgres with sample Seed Feelings, 14 sample Candidates with Upvotes, and a fake Singpass (`/demo/singpass`) with made-up people. "Demo: make me an Admin" is on the My Feelings page. The demo uses the real clock, so anything that happens at midnight (go-live, Carry-over) can only be checked by tests.

For the real Singpass on the live site, the owner logs in with Singpass's staging test personas. They have the password; it is deliberately not written here. Persona IDs worth using are in the jio-me repo at `docs/singpass/myinfo-test-personas.csv`.

## Open threads

- **#19 and #16.** With #16 deferred, #19 cannot start under the "unblocked" rule. #19 only needs #16 for leaving held Hashtags out of the push. Ask the owner whether to remove the blocking link or go ahead regardless. Until #19 exists, the Approval reminder job runs (the owner has set `CRON_SECRET`) but reaches nobody, because no browser has a push subscription and there is no real web push adapter.
- **Returning a Visitor to the Candidate they tapped** after they log in from the Yah Lah button was offered as a follow-up and not taken up.
- **Rising can be nudged** by one person moving their Upvote away and back. Accepted by the owner for now.
- **The share preview image uses the image library's built-in font**, so a Feeling in Chinese or Tamil may not render in it. Check on the branch and tell the owner what you find.
- **`ads.txt`** is not served yet; it is on the owner's list for when AdSense is approved.

## Where everything is

- Spec: GitHub issue #1. Tickets: #2 to #20, with native blocking links.
- Glossary: `CONTEXT.md`. Decisions: `docs/adr/`. Look: `docs/style-guide.md` and `/style-guide`.
- Owner's tasks and the decisions taken per ticket: `docs/owner-todo.md`.
- Setup, deploy, Singpass, Admin, ads: `README.md`. Environment variables: `.env.example`.
- The application interface, which is the whole of what the app does: `src/core/app.ts`.
- Reference codebase the stack was ported from: `siowyisheng/jio-me`.

## Environment notes for a cloud session

- `gh api repos/siowyisheng/sg-pulse/...` REST calls work for reading and for closing issues; higher-level `gh` commands may not.
- The clone is shallow, so `origin/<branch>` refs may be missing locally; use `git ls-remote origin` to see remote branches.
- Headless Chrome is available as Playwright's `channel="chrome"` from Python, which is how the screens were checked.
- The owner's computer is reachable through the device bridge, but they asked that work go through GitHub.

## Suggested skills

- **`mattpocock-skills:implement`**: to finish the branch, then for whichever ticket the owner names next (#18 once #14 is closed).
- **`mattpocock-skills:code-review`**: the branch is 2,000 lines that have had no review; this is the place to use it properly.
- **`mattpocock-skills:tdd`**: for #18 and #19, in the same style as the existing suites.
- **`mattpocock-skills:diagnosing-bugs`**: if the build or the browser pass on the branch turns something up.
- **`mattpocock-skills:domain-modeling`**: if a new term appears; `CONTEXT.md` gained "New Candidate" this session.
- **`mattpocock-skills:wizard`**: tickets #3 and #4 are still human-only steps a guided script could walk the owner through.
