# Owner to-do list

Everything that needs a person (you) rather than an agent, in one place. Agents add to this file when their work leaves something for you, and tick nothing: you tick. The two human tickets on GitHub, #3 (Singpass onboarding) and #4 (pre-launch checklist), hold the full acceptance criteria; this file repeats them in short and adds what has come up while building.

Last updated: 12 Nov 2026, after tickets #2, #5, #6, #8, #9 and #20.

## After every push that changes the database

- [ ] Run `npm run db:migrate` against Neon. A push needs it when it adds a file under `drizzle/`. **Needed now** for `drizzle/0002_admins_and_submissions.sql` (tickets #8 and #9).

## Every day, until the Admin area can be used on the live site

- [ ] Add tomorrow's Good and Bad Seed Feelings: `npm run seed -- 2026-11-14 good kopi "your text"`. Without them the front page says "Nothing here today." Write them yourself; copy nothing from Twitter/X or anywhere else.
  - The Admin area (`/admin`) does the same job with a form, but nobody can log in on the live site until the real Singpass is connected (#7). After that, log in once, run `npm run admin -- list` to find your user ID, then `npm run admin -- grant <user id>`.

## Housekeeping on GitHub

- [ ] Check and close #6 and #20 (pushed earlier), then #8 and #9 once you have looked at them. Closing #9 unblocks #10; #13 also needs #8 closed.

## Singpass (ticket #3; blocks #7, the real login)

- [ ] Register a Yah Lah app on the Singpass developer portal for staging: its own App ID, redirect URI (`https://<your domain>/singpass/callback`), signing and encryption keys, and the published keys endpoint.
- [X] Justify the `name`, `sex` and `dob` scopes (not email, mobile or NRIC) for showing a Byline beside each Feeling.
- [X] Email Singpass partner support early: is public display of initials, sex and age band an acceptable purpose? Record the answer on #3. A "no" forces a Byline redesign.
- [ ] Upload the user journey and request the production app (allow up to 2 weeks). The FAPI 2.0 deadline is 31 Dec 2026.
- [ ] Hand the staging App ID and keys to #7 as environment values.
- [ ] Once #7 is built, test logging in on staging in a mobile browser and as an installed PWA, on iPhone and Android. Whether Singpass opens its app from the same phone, or only shows a QR code, is still unconfirmed.

## Before launch (ticket #4)

- [ ] A Singapore lawyer reviews: the racial harmony law's operator duties and when it starts; whether a daily tally of #election Feelings counts as an election survey; the PDPA consent wording. Feed any changes back into the spec (#1).
  - Show them the consent screen (`/welcome`) and the reminder on the submit form: run `npm run demo` and log in as a made-up person.
  - Ask which topics Election Mode must hold (#16 needs the answer).
- [ ] Name a data protection officer and do a short data protection impact assessment.
- [ ] Name a contact who can act on a POFMA direction within hours, and make them reachable.
- [ ] Read the profanity and slur list in `src/core/profanity-words.ts` and add or remove words. It is short on purpose (words that are vulgar or slurs in any context); Reports and your Approval catch the rest. Worth showing to the lawyer alongside the racial harmony question.
- [ ] Confirm Singpass production approval (see above).

## Before the first ad or support link (ticket #4)

- [ ] Upgrade Vercel from Hobby to Pro. Hobby is for non-commercial use only.
- [ ] Get a Google AdSense account approved, and create one **fixed-size 320×50** display ad unit.
- [ ] Add an `ads.txt` for AdSense (AdSense shows the exact line). Nothing in the repo serves one yet: ask an agent to add `public/ads.txt` with your publisher ID.
- [ ] Create a Stripe payment link with PayNow turned on.
- [ ] Then set these in Vercel (they are all off until set; see `.env.example`): `AD_NETWORK=adsense`, `ADSENSE_CLIENT=ca-pub-…`, `ADSENSE_SLOT=…`, `SUPPORT_URL=https://buy.stripe.com/…`.
- [ ] Look at a real ad on a phone. Only the reserved space was tested, with the ad script blocked.
- [ ] Check the wording under the support link: "Chip in to help keep Yah Lah running. This is support for the site, not a charity donation."

## Decisions made while building that you may want to overrule

- [X] Secondary text uses a darker grey (`#5D6070`) than the old guide's cool grey, which was too faint to pass the contrast check.
- [X] Dark mode colours (the ticket only gave light ones): see `docs/style-guide.md` or `/style-guide`.
- [X] The favicon and header mark are the lion's head cropped from the logo; the larger app icons are the lion and skyline without the wordmark.
- [X] A particle at the start of a name counts as a name ("BIN LADEN TAN" is "BL"). Skipped elsewhere: bin, binte, binti, bte, s/o, d/o, a/l, a/p.
- [X] The consent screen is shown at first login (as ticket #6 says), not at first submission (as the spec #1 says). A short reminder shows at every submission.
- [X] A Feeling may not contain a link, and line breaks become spaces.
- [X] The "+" for writing a Feeling is in the header for now; it moves to the voting screen with #10.

## Later, whenever you like

- [ ] Change the logo's wordmark from "SG PULSE" to "Yah Lah" (`logo.png`), then ask an agent to regenerate the icons from it.
- [ ] Delete `handoff-yah-lah.md` from the repo once it is no longer useful; it was committed with "initial build".
