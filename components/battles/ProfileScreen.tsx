"use client";

import { Check } from "lucide-react";

import { useGame } from "@/lib/game-store";
import { pxS } from "../pixel";
import { ScoreCard } from "./ScoreCard";

export function ProfileScreen() {
  const { playerCard, setBattleStep, clearCard } = useGame();
  if (!playerCard) return null;

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6">
      <div className="flex items-center justify-between">
        <div style={pxS("7px")} className="text-[#ffd700]">
          YOUR CARD
        </div>
        <button onClick={clearCard} style={pxS("6px")} className="text-white/30 transition hover:text-white">
          ← NOT ME
        </button>
      </div>

      <div style={pxS("9px")} className="leading-relaxed text-white">
        IS THIS YOU?
      </div>

      <ScoreCard card={playerCard} />

      <div className="mt-auto flex flex-col gap-3 pt-4">
        <button
          onClick={() => setBattleStep("challenger-select")}
          className="flex w-full items-center justify-center gap-2 py-4 text-[#0a0a0a] transition active:scale-95"
          style={{ ...pxS("9px"), background: "#ffd700", boxShadow: "4px 4px 0 #b8860b" }}
        >
          <Check size={14} /> YES, LET&apos;S BATTLE
        </button>
      </div>
    </div>
  );
}
