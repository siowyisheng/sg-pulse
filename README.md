# Yah Lah

How's Singapore feeling today? One Good and one Bad Feeling of the Day. Vocabulary is in `CONTEXT.md`, decisions in `docs/adr/`.

## Run it locally

```
npm install
npm run demo
```

Demo mode needs no database or `.env.local`: it runs on an in-memory Postgres with sample Seed Feelings. Open http://localhost:3000.

## Checks

```
npm run typecheck
npm test            # fast suite
npm run test:slow   # edge cases
```

## Deploy (Vercel and Neon, Singapore)

1. Create a Neon Postgres database in the Singapore region and copy its connection string.
2. Put it in `.env.local` as `DATABASE_URL` (see `.env.example`), then run `npm run db:migrate`.
3. Import the repository into Vercel and set `DATABASE_URL` there. `vercel.json` pins functions to `sin1`.
4. Until the Admin area exists, add each day's Seed Feelings by hand:
   `npm run seed -- 2026-11-13 good kopi "Kopi with the neighbours before work"`

After a schema change, run `npm run db:generate` and commit the new file in `drizzle/`.
