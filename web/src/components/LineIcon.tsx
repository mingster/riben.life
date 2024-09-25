import clsx from "clsx";

export function LineLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 48"
      width="24px"
      height="24px"
      className={clsx("line-logo", className)}
    >
      <linearGradient
        id="gradient"
        x1="4.522"
        x2="45.203"
        y1="2.362"
        y2="47.554"
        gradientUnits="userSpaceOnUse"
      >
        <stop offset="0" stop-color="#33c481" />
        <stop offset="1" stop-color="#21a366" />
      </linearGradient>
      <path
        fill="url(#gradient)"
        d="M8,42h32c1.105,0,2-0.895,2-2V8c0-1.105-0.895-2-2-2H8C6.895,6,6,6.895,6,8v32C6,41.105,6.895,42,8,42z"
      />
      {/* ... */}
    </svg>
  );
}
