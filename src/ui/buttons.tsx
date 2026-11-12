import type { ButtonHTMLAttributes } from "react";

/** "yah-lah" is the red call to action (the Upvote); "secondary" is navy; "ghost" is outlined. */
export type ButtonVariant = "yah-lah" | "secondary" | "ghost";

export function Button({ variant = "secondary", className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return <button type={type} className={["button", `button-${variant}`, className].filter(Boolean).join(" ")} {...props} />;
}
