/**
 * Errors the UI can show to a person. `message` is written for them;
 * `code` is for programs and tests.
 */
export class UserFacingError<Code extends string> extends Error {
  /** Marks these errors so they're recognised even where `instanceof` can't be trusted (see isUserFacing). */
  readonly userFacing = true;

  constructor(
    readonly code: Code,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Whether an error is one to show the person. Checked by its marker as well as its class: in
 * development the same module can be loaded twice, and an error thrown by one copy isn't an
 * instance of the other's class.
 */
export const isUserFacing = (error: unknown): error is UserFacingError<string> =>
  error instanceof UserFacingError || (error instanceof Error && (error as { userFacing?: unknown }).userFacing === true);

export type FeelingErrorCode =
  | "TEXT_EMPTY"
  | "TEXT_TOO_LONG"
  | "NO_LINKS"
  | "INVALID_HASHTAG"
  | "INVALID_POLARITY"
  | "REFUSED_BY_FILTER"
  | "ALREADY_SUBMITTED"
  | "INVALID_CYCLE"
  | "CYCLE_PAST"
  | "ALREADY_CHOSEN"
  | "ALREADY_LIVE";

export class FeelingError extends UserFacingError<FeelingErrorCode> {}

export const SINGPASS_MESSAGES = {
  SINGPASS_EXPIRED: "Your Singpass login has expired. Please log in again.",
  SINGPASS_FAILED: "Something went wrong with your Singpass login. Please try again.",
  NO_MYINFO: "Singpass has no Myinfo details for you, so we can't set up your Byline.",
  TOO_YOUNG: "You need to be 13 or older to take part in Yah Lah.",
} as const;

export type SingpassErrorCode = keyof typeof SINGPASS_MESSAGES;

export class SingpassError extends UserFacingError<SingpassErrorCode> {}

export const singpassError = (code: SingpassErrorCode) => new SingpassError(code, SINGPASS_MESSAGES[code]);

export class AdminError extends UserFacingError<"NOT_ADMIN"> {}
