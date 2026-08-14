"use client";

import { CHEST_COST, CONTAINER_W, ITEM_W, RARITY_ORDER, firstOfRarity } from "@/lib/chest";
import { useGame } from "@/lib/game-store";
import { PixelChest, ScreenHeader, TokenPill, pxS } from "../pixel";

export function ChestScreen() {
  const { tokens, chestPhase, chestOpen, reelItems, wonItem, reelRef, openChest, resetChest, setRewardView } =
    useGame();

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title="LOOT CHEST" onBack={() => setRewardView("hub")} right={<TokenPill tokens={tokens} />} />

      <div className="flex flex-1 flex-col items-center overflow-hidden">
        {/* reel */}
        <div className="relative mt-6 w-full shrink-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 left-1/2 z-20 flex -translate-x-1/2 flex-col items-center">
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderTop: "12px solid #ffd700",
              }}
            />
            <div className="w-px flex-1 bg-[#ffd700]" />
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "8px solid transparent",
                borderRight: "8px solid transparent",
                borderBottom: "12px solid #ffd700",
              }}
            />
          </div>
          <div className="w-full overflow-hidden py-2" style={{ height: 104 }}>
            <div
              ref={reelRef}
              className="flex gap-[6px]"
              style={{ willChange: "transform", paddingLeft: CONTAINER_W / 2 }}
            >
              {reelItems.map((item, i) => (
                <div
                  key={i}
                  className="flex shrink-0 flex-col items-center justify-center gap-1"
                  style={{
                    width: ITEM_W,
                    height: 88,
                    background: item.bg,
                    border: `2px solid ${item.border}`,
                    boxShadow: `0 0 8px ${item.glow}`,
                  }}
                >
                  <div style={{ fontSize: 26 }}>{item.icon}</div>
                  <div
                    style={{ ...pxS("4px"), color: item.border, textAlign: "center", lineHeight: 1.4, padding: "0 4px" }}
                  >
                    {item.name}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* rarity legend */}
        <div className="mt-2 flex shrink-0 flex-wrap justify-center gap-2 px-4">
          {RARITY_ORDER.map((r) => {
            const sample = firstOfRarity(r);
            return (
              <div key={r} className="flex items-center gap-1">
                <div className="h-1.5 w-1.5 rounded-sm" style={{ background: sample.border }} />
                <span style={{ ...pxS("4px"), color: sample.border }}>{r.toUpperCase()}</span>
              </div>
            );
          })}
        </div>

        {/* chest + controls */}
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-4">
          <div className="relative">
            {chestOpen && (
              <div className="absolute -bottom-3 h-6 w-28 rounded-full blur-xl" style={{ background: "#ffd70033" }} />
            )}
            <PixelChest open={chestOpen} />
          </div>

          {chestPhase === "idle" && (
            <div className="flex w-full flex-col items-center gap-3">
              <button
                disabled={tokens < CHEST_COST}
                onClick={openChest}
                className="w-full py-4 text-[#0a0a0a] transition active:scale-95 disabled:opacity-25"
                style={{ ...pxS("9px"), background: "#ffd700", boxShadow: "4px 4px 0 #b8860b" }}
              >
                OPEN — {CHEST_COST} TOKEN
              </button>
              {tokens < CHEST_COST && (
                <div style={pxS("6px")} className="text-center leading-loose text-white/25">
                  WIN BATTLES
                  <br />
                  TO EARN TOKENS
                </div>
              )}
            </div>
          )}

          {(chestPhase === "opening" || chestPhase === "spinning") && (
            <div style={pxS("8px")} className="animate-pulse text-[#ffd700]">
              {chestPhase === "opening" ? "OPENING..." : "ROLLING..."}
            </div>
          )}

          {chestPhase === "reveal" && wonItem && (
            <div className="flex w-full flex-col items-center gap-3">
              <div style={{ ...pxS("6px"), color: wonItem.border }}>{wonItem.rarity.toUpperCase()} DROP!</div>
              <div
                className="flex flex-col items-center justify-center gap-2 px-5 py-4"
                style={{
                  border: `3px solid ${wonItem.border}`,
                  background: wonItem.bg,
                  boxShadow: `0 0 20px ${wonItem.glow}`,
                  minWidth: 130,
                }}
              >
                <div style={{ fontSize: 36 }}>{wonItem.icon}</div>
                <div style={{ ...pxS("6px"), color: wonItem.border, textAlign: "center", lineHeight: 1.8 }}>
                  {wonItem.name}
                </div>
              </div>
              <div className="flex w-full gap-3">
                <button
                  onClick={resetChest}
                  className="flex-1 border-2 border-[#ffd700]/35 py-3 text-white/50 transition hover:text-white"
                  style={pxS("6px")}
                >
                  AGAIN
                </button>
                <button
                  onClick={() => setRewardView("hub")}
                  className="flex-1 py-3 text-[#0a0a0a]"
                  style={{ ...pxS("6px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
                >
                  DONE
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
