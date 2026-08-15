"use client";

import { ChevronRight } from "lucide-react";

import { useGame } from "@/lib/game-store";
import { PixelBorder, TokenPill, pxS } from "../pixel";

export function RewardsHub() {
  const { tokens, jackpot, inventory, battlesWon, triviaCorrect, setRewardView, resetChest } = useGame();

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-6">
      <div className="flex items-center justify-between">
        <div style={pxS("8px")} className="text-[#ffd700]">
          REWARDS
        </div>
        <TokenPill tokens={tokens} size="8px" icon={13} />
      </div>

      <button onClick={() => setRewardView("slots")} className="active:scale-[.98]">
        <PixelBorder gold className="w-full">
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-5 transition hover:bg-[#ffd700]/8">
            <div className="text-3xl">🎰</div>
            <div className="flex flex-col gap-1 text-left">
              <div style={pxS("10px")} className="text-[#ffd700]">
                FORTUNE SLOTS
              </div>
              <div style={pxS("6px")} className="leading-relaxed text-white/40">
                Bet tokens · win big
                <br />
                JACKPOT: 🪙 {jackpot}
              </div>
            </div>
            <ChevronRight size={16} className="ml-auto text-[#ffd700]/40" />
          </div>
        </PixelBorder>
      </button>

      <button
        onClick={() => {
          resetChest();
          setRewardView("chest");
        }}
        className="active:scale-[.98]"
      >
        <PixelBorder className="w-full">
          <div className="flex items-center gap-4 bg-[#0a0a0a] p-5 transition hover:bg-[#ffd700]/8">
            <div className="text-3xl">📦</div>
            <div className="flex flex-col gap-1 text-left">
              <div style={pxS("10px")} className="text-white">
                LOOT CHEST
              </div>
              <div style={pxS("6px")} className="leading-relaxed text-white/40">
                Spend 1 token · mostly
                <br />
                junk · gold is rare
              </div>
            </div>
            <ChevronRight size={16} className="ml-auto text-[#ffd700]/40" />
          </div>
        </PixelBorder>
      </button>

      <div className="mt-1 border border-[#ffd700]/10 p-4">
        <div style={pxS("6px")} className="mb-3 text-[#ffd700]/50">
          PLAY-ONLY — NO CASH VALUE
        </div>
        <div className="flex flex-col gap-1.5" style={pxS("5px")}>
          {[
            ["BATTLES WON", battlesWon],
            ["TRIVIA CORRECT", triviaCorrect],
            ["ITEMS COLLECTED", inventory.length],
            ["TOKENS", tokens],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between text-white/30">
              <span>{label}</span>
              <span className="text-[#ffd700]/60">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
