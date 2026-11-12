import { isUserFacing } from "@/core/errors";

/** What a form's server action hands back: nothing when it worked, or what to show the person. */
export interface FormState {
  message?: string;
  /** Bumped on every success, so the form can clear itself. */
  done?: number;
}

/** The words to show for an error; anything unexpected is logged and shown generically. */
export function messageOf(error: unknown): string {
  if (isUserFacing(error)) return error.message;
  console.error(error);
  return "Something went wrong. Please try again.";
}
