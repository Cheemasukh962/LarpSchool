import type { ReactNode } from "react";

/** The CRT frame: gold grid, scanlines, and a single scroll container for screen content. */
export function Shell({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  return (
    <div
      className="relative flex h-full min-h-0 flex-col bg-[#0a0a0a] text-white"
      style={{ fontFamily: "var(--font-body)" }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage:
            "linear-gradient(#ffd700 1px,transparent 1px),linear-gradient(90deg,#ffd700 1px,transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,.13) 2px,rgba(0,0,0,.13) 4px)",
        }}
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      {footer}
    </div>
  );
}
