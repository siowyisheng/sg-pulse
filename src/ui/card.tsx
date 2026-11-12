import type { HTMLAttributes } from "react";

export function Card({ as: Tag = "div", className, ...props }: HTMLAttributes<HTMLElement> & { as?: "div" | "article" | "section" }) {
  return <Tag className={["card", className].filter(Boolean).join(" ")} {...props} />;
}
