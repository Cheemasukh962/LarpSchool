"use client";

import { Gift, ShoppingBag, Swords } from "lucide-react";

import { GameProvider, useGame } from "@/lib/game-store";
import { BattlesTab } from "./battles/BattlesTab";
import { BottomNav } from "./BottomNav";
import { CoverScreen } from "./CoverScreen";
import { PixelBorder, TokenPill, pxS } from "./pixel";
import { RewardsTab } from "./rewards/RewardsTab";
import { Shell } from "./Shell";
import { StoreTab } from "./store/StoreTab";

/* Icons rather than emoji: Press Start 2P has no emoji coverage, so the glyphs fell back to
   whatever monochrome shape the system had. */
const TAB_HEADER = {
  battles: { label: "BATTLES", icon: Swords },
  rewards: { label: "REWARDS", icon: Gift },
  store: { label: "STORE", icon: ShoppingBag },
} as const;

export function LarpGame() {
  return (
    <GameProvider>
      <GameRoot />
    </GameProvider>
  );
}

function GameRoot() {
  const { screen, tab, setTab, tokens, error, retryLoad } = useGame();

  if (screen === "cover") return <CoverScreen />;

  const { label, icon: Icon } = TAB_HEADER[tab];

  return (
    <Shell footer={<BottomNav tab={tab} setTab={setTab} />}>
      <div className="flex shrink-0 items-center justify-between border-b border-[#ffd700]/20 px-5 py-3">
        <div className="flex items-center gap-2 text-[#ffd700]">
          <Icon size={14} />
          <span style={pxS("8px")}>{label}</span>
        </div>
        <TokenPill tokens={tokens} />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        {error ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <PixelBorder className="w-full">
              <div className="flex flex-col items-center gap-4 p-6 text-center">
                <div style={pxS("8px")} className="text-[#ef4444]">
                  DATA OFFLINE
                </div>
                <div style={pxS("5px")} className="leading-loose text-white/40">
                  {error.toUpperCase()}
                </div>
                <button
                  onClick={retryLoad}
                  className="px-5 py-3 text-[#0a0a0a]"
                  style={{ ...pxS("7px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
                >
                  RETRY
                </button>
              </div>
            </PixelBorder>
          </div>
        ) : (
          <>
            {tab === "battles" && <BattlesTab />}
            {tab === "rewards" && <RewardsTab />}
            {tab === "store" && <StoreTab />}
          </>
        )}
      </div>
    </Shell>
  );
}
