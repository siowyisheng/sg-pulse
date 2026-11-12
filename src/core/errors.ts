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

export type FeelingErrorCode = "TEXT_EMPTY" | "TEXT_TOO_LONG" | "INVALID_HASHTAG" | "INVALID_CYCLE" | "ALREADY_CHOSEN";

export class FeelingError extends UserFacingError<FeelingErrorCode> {}
