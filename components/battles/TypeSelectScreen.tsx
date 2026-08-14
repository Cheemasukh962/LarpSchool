"use client";

import { ChevronRight } from "lucide-react";

import { useGame } from "@/lib/game-store";
import { PixelBorder, pxS } from "../pixel";

export function TypeSelectScreen() {
  const { data, playerCard, setBattleStep, startTrivia } = useGame();

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 pt-8 pb-5">
      <div className="flex flex-col gap-1">
        <div style={pxS("7px")} className="text-[#ffd700]">
          CHOOSE BATTLE TYPE
        </div>
        <div style={pxS("5px")} className="leading-loose text-white/30">
          PICK YOUR CHALLENGE MODE
        </div>
      </div>

      <button
        onClick={() => setBattleStep(playerCard ? "challenger-select" : "claim")}
        className="group transition active:scale-[.98]"
      >
        <PixelBorder gold className="w-full">
          <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5 transition group-hover:bg-[#ffd700]/8">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#ffd700] bg-[#140d00]"
                style={{ boxShadow: "3px 3px 0 #b8860b" }}
              >
                <span style={{ fontSize: 26 }}>⚔️</span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <div style={pxS("10px")} className="text-[#ffd700]">
                  LARP BATTLE
                </div>
                <div style={pxS("5px")} className="leading-relaxed text-white/40">
                  Claim your real card
                  <br />
                  and duel another guest
                </div>
              </div>
              <ChevronRight size={16} className="ml-auto shrink-0 text-[#ffd700]/40 group-hover:text-[#ffd700]" />
            </div>
            <div className="flex flex-wrap gap-2">
              {["LINKEDIN", "FACE-OFF", "TOKENS"].map((tag) => (
                <div key={tag} className="border border-[#ffd700]/25 px-2 py-0.5 text-[#ffd700]/50" style={pxS("4px")}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </PixelBorder>
      </button>

      <button onClick={startTrivia} disabled={!data} className="group transition active:scale-[.98] disabled:opacity-40">
        <PixelBorder className="w-full">
          <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5 transition group-hover:bg-[#ffd700]/8">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center border-2 border-[#4a9eff]/50 bg-[#030d1a]"
                style={{ boxShadow: "3px 3px 0 #1a3a6644" }}
              >
                <span style={{ fontSize: 26 }}>🏢</span>
              </div>
              <div className="flex flex-col gap-1 text-left">
                <div style={pxS("10px")} className="text-white">
                  YC COMPANY TRIVIA
                </div>
                <div style={pxS("5px")} className="leading-relaxed text-white/40">
                  {data ? `${data.questions.length} questions on YC companies` : "Loading questions..."}
                  <br />
                  Answer right to earn tokens
                </div>
              </div>
              <ChevronRight size={16} className="ml-auto shrink-0 text-white/20 group-hover:text-white/50" />
            </div>
            <div className="flex flex-wrap gap-2">
              {["TRIVIA", "STARTUPS", "EARN TOKENS"].map((tag) => (
                <div key={tag} className="border border-white/10 px-2 py-0.5 text-white/30" style={pxS("4px")}>
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </PixelBorder>
      </button>

      <div className="border border-dashed border-[#ffd700]/10 p-4 text-center">
        <div style={pxS("5px")} className="leading-loose text-[#ffd700]/20">
          MORE MODES
          <br />
          COMING SOON...
        </div>
      </div>
    </div>
  );
}
