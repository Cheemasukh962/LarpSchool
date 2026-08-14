"use client";

import { BAR_MAX, BARS } from "@/lib/adapt";
import type { Breakdown } from "@/lib/types";
import { pxS } from "../pixel";

/**
 * Mirrored stat comparison: your points grow leftward from the label, theirs rightward.
 * Fits the 390px frame better than two stacked scorecards.
 */
export function CompareBars({
  left,
  right,
  leftColor = "#ffd700",
  rightColor = "#4a9eff",
}: {
  left: Breakdown;
  right: Breakdown;
  leftColor?: string;
  rightColor?: string;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {BARS.map(({ key, label }) => {
        const max = BAR_MAX[key];
        const l = left[key];
        const r = right[key];
        const lead = l === r ? "tie" : l > r ? "left" : "right";
        return (
          <div key={key} className="flex items-center gap-1.5">
            <div style={{ ...pxS("5px"), color: leftColor, width: 20, textAlign: "right" }}>{l}</div>
            <div className="flex h-2.5 flex-1 justify-end border border-[#ffd700]/12 bg-[#141414]">
              <div
                style={{
                  width: `${(l / max) * 100}%`,
                  background: leftColor,
                  opacity: lead === "left" ? 0.95 : 0.4,
                  transition: "width .5s ease-out",
                }}
              />
            </div>
            <div style={{ ...pxS("4px"), color: "#ffffff55", width: 52, textAlign: "center" }}>{label}</div>
            <div className="flex h-2.5 flex-1 border border-[#ffd700]/12 bg-[#141414]">
              <div
                style={{
                  width: `${(r / max) * 100}%`,
                  background: rightColor,
                  opacity: lead === "right" ? 0.95 : 0.4,
                  transition: "width .5s ease-out",
                }}
              />
            </div>
            <div style={{ ...pxS("5px"), color: rightColor, width: 20 }}>{r}</div>
          </div>
        );
      })}
    </div>
  );
}
