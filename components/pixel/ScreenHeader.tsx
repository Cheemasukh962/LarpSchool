import type { ReactNode } from "react";
import { pxS } from "./tokens";

/** The back / title / token-count bar shared by the trivia, slots and chest screens. */
export function ScreenHeader({
  title,
  onBack,
  right,
  sticky = false,
}: {
  title: string;
  onBack?: () => void;
  right?: ReactNode;
  sticky?: boolean;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-between border-b border-[#ffd700]/20 px-5 py-3 ${
        sticky ? "sticky top-0 z-10 bg-[#0a0a0a]" : ""
      }`}
    >
      {onBack ? (
        <button onClick={onBack} style={pxS("6px")} className="text-white/35 transition hover:text-white">
          ← BACK
        </button>
      ) : (
        <span className="w-10" />
      )}
      <div style={pxS("8px")} className="text-[#ffd700]">
        {title}
      </div>
      <div className="flex min-w-10 justify-end">{right}</div>
    </div>
  );
}
