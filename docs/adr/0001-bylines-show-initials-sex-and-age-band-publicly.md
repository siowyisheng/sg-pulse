# Bylines show initials, sex and age band publicly

Every Feeling is shown with a Byline of the Submitter's initials, sex and age band, taken from Singpass Myinfo (`name`, `sex`, `dob`), so readers can see that real, varied people wrote it. We considered username-only Bylines, and keeping sex and age for aggregate analytics only; we chose public display because the product's value is "real verified people", and a clear display purpose is easier to justify to Singpass than analytics.

For Submitters under 18 the Byline is sex and "<18" only, with no initials. When Myinfo records sex as unknown the sex is omitted. Initials are the first letter of the first two words of the name, skipping particles such as bin, binte, s/o and d/o. There is no username option.

## Consequences

- **Singpass must approve the `name`, `sex` and `dob` scopes** for a public-display purpose; jio-me deliberately never requested `name`. A refusal would force a redesign.
- **PDPA**: initials, sex and age band beside the text are probably personal data, so Yah Lah needs explicit consent naming that display, a data protection officer, and an impact assessment before launch. The minimum age is 13.
- **Removal on request**: a User can ask for a published winner (including its archive entry) to be removed within 24 hours, even though Candidates cannot be edited or withdrawn.
- **Store only** the Singpass user ID, initials, sex and date of birth. Never the full name or NRIC.
