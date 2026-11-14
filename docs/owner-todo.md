# Owner to-do list

Everything that needs a person (you) rather than an agent, in one place. Agents add to this file when their work leaves something for you, and tick nothing: you tick. The two human tickets on GitHub, #3 (Singpass onboarding) and #4 (pre-launch checklist), hold the full acceptance criteria; this file repeats them in short and adds what has come up while building.

Last updated: 13 Nov 2026, after tickets #2, #5 to #15 and #17 to #20. #16 (Election Mode) is deferred.

## After every push that changes the database

- [ ] Run `npm run db:migrate` against Neon. A push needs it when it adds a file under `drizzle/`. **Needed now** for `drizzle/0005_moderation.sql` (tickets #14, #15 and #17), `drizzle/0006_daily_push.sql` (#19) `drizzle/0007_removal_and_deletion.sql` (#18) and `drizzle/0008_front_page_look.sql` (the front page looks): run it once and it applies all four. Until it is run, the front page and most other pages fail on the live site.

## Every day, until the Admin area can be used on the live site

- [ ] Add tomorrow's Good and Bad Seed Feelings: `npm run seed -- 2026-11-14 good kopi "your text"`. Without them the front page says "Nothing here today." Write them yourself; copy nothing from Twitter/X or anywhere else.
  - The Admin area (`/admin`) does the same job with a form, once Singpass is connected and you have made yourself an Admin (see Singpass below).

## App name

- [ ] Decide what the site calls itself. In `/admin`, under "App name", pick one of Yah Lah (now), SG Pulse, How Is Singapore, SG Feels, Shiok or Not or Today in SG; it switches the screens and browser tabs for everyone at once. Two places still say Yah Lah whatever you pick, and need a code change once you settle: the name of the installed app (`app/manifest.ts`) and the title of the push notifications. The Upvote button keeps its "Yah Lah" label on purpose.

## Design

- [ ] Choose a Design. Seven new ones are built beside Classic (what shows now): Kopitiam, Hawker signboard, Pasar malam, Peranakan tiles, MRT, Void deck and Garden City. In `/admin`, under "Design", press Preview on one: the whole site switches to it for you alone, with a bar at the top to stop. Browse the screens on your phone, then press "Use this Design" to switch everyone. No migration is needed beyond `0008` above. Locally, `npm run demo` and open `/design-preview?design=mrt` (or any other) to try one without signing in.
- [ ] Check the Hashtag emojis (`src/ui/emoji.tsx`) read right to you: a Hashtag not in that list shows no emoji. Add or change any there.

## Front page look

- [ ] Only matters in the Classic Design. Choose the front page look. Four are built: Original (what shows now), Sunrise and dusk, Highlighter and Postcards. In `/admin`, under "Front page look", press Preview on each to see it on your phone, then "Use this look". It switches for everyone at once and you can switch back any time. Without the `0008` migration above the front page fails, so run that first. Locally, `npm run demo` and open `/?look=sunrise` (or `highlighter`, `postcards`) to compare without signing in.

## Housekeeping on GitHub

- [ ] Try Reports, Take-down, correction notices, the archive and sharing, then close #14, #15 and #17. Closing #14 unblocks #18 (removal on request, account deletion and the audit log).
- [ ] #16 (Election Mode) is deferred at your say-so, as the next election is not expected until 2030. Two things hang on it:
  - #19 (installable PWA and the daily push) is marked as blocked by #16 on GitHub. It only needs #16 to leave held Hashtags out of the push. To build #19 now, say so, and it will be built without that part.
  - Until #19 exists there are no pushes, so nothing reminds you to approve each evening.
  - The morning lines about yesterday ("X others chose the same Feeling as you", "X people chose your Feeling", #26 and #27) tell one person one Feeling's count. #16 should leave those out for held Feelings too, as it hides their tallies.
  - An election can be called early. Build #16 before one is, and ask the lawyer which topics it must hold.

## When something is Reported, or a direction arrives

- [ ] Look at `/admin` at least daily. A Reported Feeling stays hidden until you put it back or remove it, and one still waiting at midnight can't win.
- [ ] For a correction direction (POFMA or similar): `/admin`, "Showing now", type the notice, Save. It shows on the Feeling on the front page, in the archive and on its share page.
- [ ] To take a published Feeling down: `/admin`, "Showing now", "Take down now". It is one click, immediate and can't be undone. For an older one that is only in the archive, ask an agent: there is no button for those yet.

## Switching on the daily notification (ticket #19)

- [ ] Run `npm run push:keys`. It writes the private key to `.env.push-keys.local` and prints the public key.
- [ ] In Vercel, set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (the public key), `VAPID_PRIVATE_KEY` (the private one) and `VAPID_SUBJECT` (`mailto:` then an address you check, e.g. `mailto:you@example.com`; push services use it to reach you), then redeploy. Delete the key file. Until all are set the site offers no opt-in; with only one set, the site refuses to start and says which is missing.
- [ ] Make sure `CRON_SECRET` is set (the same one the Approval reminder uses). Vercel then calls `/api/cron/morning` at 07:00 Singapore time. On Hobby a job can run up to an hour late.
- [ ] Try it on a real phone: log in, accept the prompt, then call `/api/cron/morning` with `Authorization: Bearer <CRON_SECRET>` and see the notification arrive. On an iPhone it only works once Yah Lah is added to the Home Screen.
- [ ] Hobby allows two scheduled jobs and the site now uses both (the Approval reminder and the morning job). A third needs Pro, or its work has to go into one of these.

## Switching on Feedback (ticket #21)

- [ ] Make a free Resend account (resend.com) and create an API key. To send from your own domain, add and verify the domain in Resend; for a first try Resend's test sender (`onboarding@resend.dev`) works but only to the email you signed up with.
- [ ] In Vercel, set `FEEDBACK_TO` (the address to read feedback at, `golden.triangle.software.sg@gmail.com`), `RESEND_API_KEY` and `FEEDBACK_FROM` (for example `Yah Lah <feedback@your-domain>`), then redeploy. Until all three are set no Feedback link shows and `/feedback` is a 404.
- [ ] Send a test from a phone (log in, tap "Feedback" at the bottom of the front page) and check it arrives, and that Reply goes to the address typed in "Reply to".
- [ ] The log line for a sent message carries the sender's internal ID (like every other log line), so you can see someone sending too much; the email itself has only their Byline. Two sends at the same instant could squeeze past the 5-a-day limit.
- [ ] Only signed-in Users can send, 5 a day each. Nothing is kept but a log line saying a User sent one; the message and Reply to address live only in your inbox.

## When someone asks for a Feeling to be removed, or deletes their account (ticket #18)

- [ ] Look at "Removal requests" at the top of `/admin` at least daily: each has a "due by" time, 24 hours after it was asked. "Remove it" takes the Feeling off the front page and out of the archive.
- [ ] Someone who deletes their account can tick a box to ask for their Feelings of the Day to be removed in the same go. If they don't, there is no way for them to ask afterwards: you decided (13 Nov) not to publish a contact email.

## Every evening, from now on

- [ ] Before midnight, open `/admin` and approve one Good and one Bad Feeling from the top three. They go live at 00:00. If you approve nothing for a Polarity, today's Feeling stays up marked "Still feeling it".
- [ ] Set `CRON_SECRET` in Vercel to a long random string (for example the output of `openssl rand -hex 32`) and redeploy. Vercel then calls the reminder job once a day at about 21:00 SGT. Without it the job answers 401 and does nothing.
  - The reminder is a push to your phone, and pushes only start working with #19 (installable PWA and the daily push). Until then nothing reminds you: set your own alarm.

## Singpass (tickets #3 and #7)

The real Singpass adapter is built (#7) and tested against a fake Singpass server. What is left is connecting it and trying it on staging. You registered the staging app with keys address `https://sg-pulse.vercel.app/.well-known/jwks.json` and redirect URL `https://sg-pulse.vercel.app/auth/singpass/callback`; the code matches both.

- [ ] Run `npm run singpass:keys` in your folder. Never paste the private keys into a chat or commit them.
- [ ] In Vercel, set all four together and redeploy (the app refuses to start if `SINGPASS_CLIENT_ID` is set and another is missing):
  - `SINGPASS_PRIVATE_JWKS`: the value from `.env.singpass-keys.local`, without the quotes; then delete that file
  - `SINGPASS_CLIENT_ID`: the staging App ID from the Singpass Developer Portal
  - `SINGPASS_ENVIRONMENT`: `staging`
  - `SINGPASS_REDIRECT_URI`: `https://sg-pulse.vercel.app/auth/singpass/callback`
- [ ] Open `https://sg-pulse.vercel.app/.well-known/jwks.json`: it should show two keys and no `d` field. Check it with Singpass's troubleshooting tool.
- [ ] On the portal, check the app's scopes are exactly `openid name dob sex`. A scope the app isn't approved for makes every login fail.
- [ ] Log in on the live site with Singpass staging test personas, and check the Byline on the consent screen for: an ordinary adult; someone under 18 (no initials); someone with sex unknown (no sex); a name with bin, binte, s/o or d/o (particle skipped); and someone under 13 (refused). Tell the agent what happened; if a login fails, the message on screen and the Vercel function log are what it needs.
- [ ] Try it in a mobile browser and as an installed PWA, on iPhone and Android. Whether Singpass opens its app from the same phone, or only shows a QR code, is still unconfirmed.
- [ ] After your first login, make yourself an Admin: `npm run admin -- list`, then `npm run admin -- grant <user id>`.
- [ ] Justify the `name`, `sex` and `dob` scopes (not email, mobile or NRIC) for showing a Byline beside each Feeling.
- [ ] Email Singpass partner support early: is public display of initials, sex and age band an acceptable purpose? Record the answer on #3. A "no" forces a Byline redesign.
- [ ] Upload the user journey and request the production app (allow up to 2 weeks). The FAPI 2.0 deadline is 31 Dec 2026.
- [ ] For production, a separate Singpass app with its own keys: run `npm run singpass:keys` again and change the four variables. If production uses a different domain, register that domain's two addresses.
- [ ] Once real people can log in, the site is live for submissions: do this only when you are ready for that, or keep the address private until launch.

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
- [ ] With #10 the "+" has moved: it floats at the bottom right of the voting screen. A Visitor who taps it is taken to log in.
- [ ] When a Hashtag has more than 10 Candidates, the 10 shown are a random pick each time, with a "Show another mix" link. The top, Rising and New mix replaces this in #12.
- [ ] The front page snaps firmly between the Feelings of the Day and the voting screen: a short swipe springs back, a longer one moves on.
- [ ] Someone whose Singpass account has no Myinfo profile is told "Singpass has no Myinfo details for you, so we can't set up your Byline."
- [ ] A Visitor who taps Yah Lah and logs in lands on the front page afterwards, not back on the Candidate they tapped.
- [ ] After saying Yah Lah the Candidates stay in the order they were in, with a quiet "Your Yah Lah" mark on the one chosen. The My Feelings page also shows today's Yah Lah, with a "Take it back" button.
- [ ] The Admin sees how many Yah Lahs each of the top three has so far. Nobody else sees a count until a Feeling has won.
- [ ] An Approval can be changed or withdrawn until 00:00. One made at 00:01 is too late: yesterday's Candidates can no longer be approved and the Carry-over stands.
- [ ] Approving a Candidate replaces a Seed Feeling scheduled for the same day.
- [ ] A Carry-over keeps going for as many days as nothing is approved, and shows the count the Feeling won with.
- [ ] The top three include Candidates with no Yah Lahs when fewer than three have any (earliest written first), so there is always something to approve.
- [ ] The mix of 10: the 5 with the most Yah Lahs, then 3 Rising (at least 2 Yah Lahs, and at least half of them still "fresh", where freshness halves every 3 hours), then 2 New (0 or 1 Yah Lahs, picked at random so they take turns). A group that is short gives its places to New ones, then to the next most upvoted.
- [ ] Moving a Yah Lah away and back to the same Candidate counts as a fresh Yah Lah for "Rising" each time. One person could nudge a Candidate into the Rising places that way; it does not change any count.
- [ ] When a published Feeling of the Day is taken down, the next most-upvoted Feeling of its day replaces it at once, without your Approval. This follows tickets #14 and #15 but cuts across ADR 0002 (the Admin approves each winner). The alternative is to fall back to the Carry-over every time and let you approve a replacement by hand.
- [ ] A Report on the Candidate you approved for tomorrow voids the Approval straight away. Put it back before midnight and approve it again, or it can't win. Anyone can do this at 23:55; the cost to them is the Timeout.
- [ ] A Reported Feeling keeps its Yah Lahs but takes no new ones while it is under review.
- [ ] Reporting takes two taps: "Report", then "Report it" under a line saying what will happen. Visitors don't see the button; Users can't Report their own Feeling.
- [ ] "Put it back" gives the reporter a one-week Timeout; "Put it back, no Timeout" lets them off.
- [ ] An Admin sees an "Admin: take down" button on every Candidate. It is one tap with no confirmation.
- [ ] A share link opens a page for that one Feeling, which shows the Byline as the front page does. Only the preview image and the link text leave the Byline out.
- [ ] The preview image is drawn in a plain built-in font, not the site's fonts, and a Feeling written in Chinese, Tamil or another non-Latin script may show as empty boxes in it.
- [ ] A Feeling with a correction notice shows "Correction notice attached: see the link" on its preview image, and the notice in the link's description. The notice itself is not drawn on the image.
- [ ] Share links use `https://sg-pulse.vercel.app` (Vercel's production address). Set `SITE_URL` in Vercel if you move to your own domain.
- [ ] The audit log records Reports and every Admin action, and nothing yet reads it on screen or trims it at 12 months: both are part of #18.

- [ ] A Take-down putting the next most-upvoted Feeling in place without your Approval is confirmed by you (13 Nov), so ADR 0002 should say so. Ask an agent to amend it.
- [ ] Deleting an account removes that person's Upvotes, so the final count shown on a Feeling of the Day they voted for goes down by one. The winners themselves stay. You accepted this (13 Nov).
- [ ] The log kept for 12 months is the audit log. A Report's own row (who Reported what) is not trimmed yet, and a deleted account's Reports stay without their reporter. The submission line is written just after the Feeling is saved, so a crash in between could leave a Feeling unlogged.
- [ ] A deleted account leaves a record in the log with its internal ID and no name, kept 12 months. The log is trimmed by the morning job; an Admin screen to read it is not built.
- [ ] The daily notification leaves out nothing yet. When Election Mode (#16) is built it must hide held Hashtags from the push as well.

## Later, whenever you like

- [ ] Change the logo's wordmark from "SG PULSE" to "Yah Lah" (`logo.png`), then ask an agent to regenerate the icons from it.
- [ ] Delete `handoff-yah-lah.md` from the repo once it is no longer useful; it was committed with "initial build".
