# Yah Lah

How's Singapore feeling today? One Good and one Bad Feeling of the Day. Vocabulary is in `CONTEXT.md`, decisions in `docs/adr/`.

## Run it locally

```
npm install
npm run demo
```

Demo mode needs no database or `.env.local`: it runs on an in-memory Postgres with sample Seed Feelings. Open http://localhost:3000. Logging in goes through a fake Singpass page with made-up people; outside demo mode there is no way to log in until the real Singpass is connected.

## Checks

```
npm run typecheck
npm test            # fast suite
npm run test:slow   # edge cases
npm run check:style # no raw colours or fonts, contrast minimums (also runs before every build)
```

The look follows `docs/style-guide.md`; `/style-guide` shows the shared components as they render.

## Deploy (Vercel and Neon, Singapore)

1. Create a Neon Postgres database in the Singapore region and copy its connection string.
2. Put it in `.env.local` as `DATABASE_URL` (see `.env.example`), then run `npm run db:migrate`.
3. Import the repository into Vercel and set `DATABASE_URL` there. `vercel.json` pins functions to `sin1`.
4. Until the Admin area exists, add each day's Seed Feelings by hand:
   `npm run seed -- 2026-11-13 good kopi "Kopi with the neighbours before work"`

## The Admin area

`/admin` is where an Admin writes and schedules Seed Feelings. To anyone else it is a 404. An Admin is a User the operator has marked by hand: log in once, then

```
npm run admin -- list
npm run admin -- grant <user id>
```

In demo mode, the "Demo: make me an Admin" button on the My Feelings page does the same.

What still needs the owner, rather than an agent, is listed in `docs/owner-todo.md`.

## Database changes

After a schema change, run `npm run db:generate` and commit the new file in `drizzle/`. After pulling one, run `npm run db:migrate` against the live database.

## Ads and the support link

Both are off until their environment variables are set (see `.env.example`): `AD_NETWORK`, `ADSENSE_CLIENT` and `ADSENSE_SLOT` for the one ad slot below the Feelings of the Day, and `SUPPORT_URL` for the "Support Yah Lah" link. Set them in Vercel only once the plan allows commercial use.
