"use client";

import { Shuffle } from "lucide-react";

import { gradientFor, photoUrl } from "@/lib/adapt";
import { suggestedOpponents } from "@/lib/cards";
import { useGame } from "@/lib/game-store";
import { CircleAvatar, PixelBorder, pxS } from "../pixel";

export function ChallengerSelectScreen() {
  const { data, playerCard, setBattleStep, chooseRandomChallenger } = useGame();
  const preview = data && playerCard ? suggestedOpponents(data.cards, playerCard, 5) : [];
  const remaining = data ? Math.max(0, data.cards.length - 1 - preview.length) : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <div style={pxS("7px")} className="text-[#ffd700]">
          PICK CHALLENGER
        </div>
        <button
          onClick={() => setBattleStep("profile")}
          style={pxS("6px")}
          className="text-white/30 transition hover:text-white"
        >
          ← BACK
        </button>
      </div>

      <button
        onClick={chooseRandomChallenger}
        className="w-full active:scale-[.98]"
        style={{ boxShadow: "6px 6px 0 #b8860b" }}
      >
        <div className="flex items-center justify-center gap-3 border-2 border-[#ffd700] bg-[#ffd700] p-5">
          <Shuffle size={18} className="text-[#0a0a0a]" />
          <div style={pxS("12px")} className="text-[#0a0a0a]">
            RANDOM
          </div>
        </div>
      </button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-[#ffd700]/20" />
        <div style={pxS("7px")} className="text-[#ffd700]/40">
          OR
        </div>
        <div className="h-px flex-1 bg-[#ffd700]/20" />
      </div>

      <button onClick={() => setBattleStep("pick")} className="w-full active:scale-[.98]">
        <PixelBorder gold className="w-full">
          <div className="flex flex-col items-center gap-3 bg-[#0a0a0a] p-5 transition hover:bg-[#ffd700]/8">
            <div className="flex -space-x-2">
              {preview.map((c) => (
                <div key={c.id} className="rounded-full border-2 border-[#0a0a0a]">
                  <CircleAvatar initials={c.initials} gradient={gradientFor(c.id)} photo={photoUrl(c)} size={36} />
                </div>
              ))}
              <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#ffd700]/30 bg-[#1a1400]">
                <span style={pxS("5px")} className="text-[#ffd700]/50">
                  +{remaining > 999 ? "999" : remaining}
                </span>
              </div>
            </div>
            <div style={pxS("12px")} className="text-white">
              CHOOSE
            </div>
            <div style={pxS("5px")} className="text-white/30">
              CLOSE FIGHTS FIRST
            </div>
          </div>
        </PixelBorder>
      </button>
    </div>
  );
}
