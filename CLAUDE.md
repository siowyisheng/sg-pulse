## Agent skills

### Issue tracker

GitHub Issues on siowyisheng/sg-pulse (via `gh`). See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. See `docs/agents/domain.md`.

## Tests

`npm test` runs the fast suite (under 10 seconds): the core journey of each area only. Run it after every change. Edge cases and slow journeys live in `*.slow.test.ts` files and run with `npm run test:slow`; run those only when the user asks. When adding tests, put the main journey in the fast file and everything else in the matching `*.edge-cases.slow.test.ts` (or the area's `*.slow.test.ts`).

Tests go through the application interface only (`createTestApp` in `src/testing/harness.ts`): in-memory Postgres, a clock that moves only when told to, a fake Singpass and a fake web push.
