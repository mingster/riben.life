import clsx from "clsx";
import { Button } from "../Button";

export { Widont } from "@/components/Widont";

export function Caption({ className = "", ...props }) {
  return <h2 className={`mt-8 font-semibold ${className}`} {...props} />;
}

export function BigText({ className = "", ...props }) {
  return (
    <p
      className={`mt-4 text-3xl sm:text-4xl text-slate-900 font-extrabold tracking-tight dark:text-slate-50 ${className}`}
      {...props}
    />
  );
}

export function Paragraph({ as: Component = "p", className = "", ...props }) {
  return <p className={`mt-4 max-w-3xl space-y-6 ${className}`} {...props} />;
}

export function Link({ className = "", ...props }) {
  return <Button className={clsx("mt-8", className)} {...props} />;
}

export function InlineCode({ className = "", ...props }) {
  return (
    <code
      className={`font-mono text-slate-900 font-medium dark:text-slate-200 ${className}`}
      {...props}
    />
  );
}
