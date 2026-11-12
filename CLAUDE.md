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

## Styling

`docs/style-guide.md` is the reference and `src/theme/tokens.ts` carries it into the app. Never write a colour or font value anywhere else: use the CSS variables (`var(--color-…)`, `var(--type-…)`, `var(--space-…)`, `var(--radius-…)`) and the shared components in `src/ui/`. `npm run check:style` (run by `npm test` and before every build) fails on a raw value or on a text and background pair below the contrast minimum. A new colour goes into the guide and the tokens together; a new text-on-background combination goes into `pairs` in the tokens. `/style-guide` shows the components as they render.
