import { BAR_MAX, BARS } from "@/lib/adapt";
import type { Breakdown } from "@/lib/types";
import { pxS } from "./tokens";

/** The four scored categories, replacing the mock's invented STR/WIT/LRP meters. */
export function StatBars({ breakdown, showMax = true }: { breakdown: Breakdown; showMax?: boolean }) {
  return (
    <div className="flex w-full flex-col gap-2">
      {BARS.map(({ key, label, color }) => {
        const pts = breakdown[key];
        const max = BAR_MAX[key];
        return (
          <div key={key} className="flex items-center gap-3">
            <div style={{ ...pxS("5px"), color, width: 58, flexShrink: 0 }}>{label}</div>
            <div className="h-2 flex-1 border border-[#ffd700]/15 bg-[#1a1a1a]">
              <div
                style={{
                  width: `${Math.min(100, (pts / max) * 100)}%`,
                  height: "100%",
                  background: color,
                  opacity: 0.75,
                  transition: "width .5s ease-out",
                }}
              />
            </div>
            <div style={{ ...pxS("5px"), color: "#ffffff40", width: showMax ? 40 : 22, textAlign: "right" }}>
              {showMax ? `${pts}/${max}` : pts}
            </div>
          </div>
        );
      })}
    </div>
  );
}
