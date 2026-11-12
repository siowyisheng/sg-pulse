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

## Connecting Singpass

Yah Lah asks Singpass for `openid name dob sex` and nothing else: no email, no mobile number, no NRIC. Until `SINGPASS_CLIENT_ID` is set the site offers no way to log in (demo mode uses a fake Singpass instead).

1. Run `npm run singpass:keys`. It writes a signing key (ES256) and an encryption key (ECDH-ES+A256KW) to `.env.singpass-keys.local`, which git ignores, and prints the public halves. Each Singpass app (staging, production) gets its own keys: run it once for each.
2. In Vercel, set these four together, then redeploy. If `SINGPASS_CLIENT_ID` is set and another is missing or wrong, the app refuses to start and the log says which.

   | Variable | Value |
   | --- | --- |
   | `SINGPASS_PRIVATE_JWKS` | The value after `SINGPASS_PRIVATE_JWKS=` in the keys file, without the quotes. Then delete the file. |
   | `SINGPASS_CLIENT_ID` | The App ID from the Singpass Developer Portal |
   | `SINGPASS_ENVIRONMENT` | `staging` or `production` |
   | `SINGPASS_REDIRECT_URI` | The callback exactly as registered: `https://sg-pulse.vercel.app/auth/singpass/callback` |

3. Check that `https://sg-pulse.vercel.app/.well-known/jwks.json` shows two keys, with no `d` field. This is the keys address registered with Singpass; its troubleshooting tool (<https://developer.singpass.gov.sg/troubleshooting-tool>) checks that the keys meet its requirements.
4. Log in on the site with one of Singpass's staging test personas.

To change keys, run the script again, put the new keys after the old ones inside `"keys": [...]` in `SINGPASS_PRIVATE_JWKS`, and redeploy. Both are published; once Singpass has picked up the new ones (about an hour), remove the old ones.

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
