"use client";

import { Star, Zap } from "lucide-react";

import { useGame } from "@/lib/game-store";
import { BET_OPTIONS, SLOT_SYMBOLS } from "@/lib/slots";
import { PixelBorder, ScreenHeader, TokenPill, pxS } from "../pixel";

export function SlotsScreen() {
  const { tokens, jackpot, bet, setBet, reels, slotPhase, lastWin, isJackpot, spinSlots, resetSlots, setRewardView, rewardError } =
    useGame();

  const won = slotPhase === "result" && lastWin !== null && lastWin > 0;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <ScreenHeader title="SLOTS" onBack={() => setRewardView("hub")} right={<TokenPill tokens={tokens} />} />

      {/* jackpot meter */}
      <div className="relative shrink-0 border-b border-[#ffd700]/20 bg-[#0d0900] px-5 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={14} className="fill-[#ffd700] text-[#ffd700]" />
            <div style={pxS("7px")} className="text-[#ffd700]">
              JACKPOT
            </div>
          </div>
          <div style={{ ...pxS("16px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>🪙 {jackpot}</div>
        </div>
        <div className="mt-2 h-2 overflow-hidden border border-[#ffd700]/20 bg-[#1a1a1a]">
          <div
            className="h-full bg-gradient-to-r from-[#ffd700] to-amber-400 transition-all"
            style={{ width: `${Math.min(100, (jackpot / 200) * 100)}%` }}
          />
        </div>
        <div style={pxS("5px")} className="mt-1 text-white/25">
          GROWS EVERY SPIN · RESETS ON HIT
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center gap-4 overflow-y-auto px-5 py-4">
        {/* reels */}
        <PixelBorder gold className="w-full">
          <div className="relative bg-[#060606] px-3 py-4">
            {won && (
              <div
                className="pointer-events-none absolute inset-0 animate-pulse"
                style={{
                  background: isJackpot ? "#ffd70018" : "#ffffff08",
                  border: `1px solid ${isJackpot ? "#ffd70066" : "#ffffff22"}`,
                }}
              />
            )}
            <div className="flex justify-center gap-3">
              {reels.map((sym, i) => (
                <div
                  key={i}
                  className="flex shrink-0 flex-col items-center justify-center gap-1"
                  style={{
                    width: 78,
                    height: 86,
                    background: "#0a0a0a",
                    border: `2px solid ${won ? sym.color : "#ffd70030"}`,
                    boxShadow: won ? `0 0 12px ${sym.color}44` : "none",
                    transition: "border-color .3s, box-shadow .3s",
                  }}
                >
                  <div style={{ fontSize: 30 }}>{sym.icon}</div>
                  <div style={{ ...pxS("5px"), color: sym.color }}>{sym.name}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-center gap-1">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-0.5 w-6 bg-[#ffd700]/20" />
              ))}
            </div>
          </div>
        </PixelBorder>

        {/* outcome */}
        <div className="flex h-12 items-center justify-center">
          {slotPhase === "spinning" && (
            <div style={pxS("8px")} className="animate-pulse text-[#ffd700]">
              SPINNING...
            </div>
          )}
          {slotPhase === "result" &&
            lastWin !== null &&
            (isJackpot ? (
              <div
                style={{ ...pxS("12px"), textShadow: "2px 2px 0 #b8860b" }}
                className="animate-bounce text-center text-[#ffd700]"
              >
                ⭐ JACKPOT! +{lastWin} 🪙
              </div>
            ) : lastWin > 0 ? (
              <div style={pxS("10px")} className="text-white">
                WIN! +{lastWin} 🪙
              </div>
            ) : (
              <div style={pxS("8px")} className="text-white/30">
                NO MATCH — TRY AGAIN
              </div>
            ))}
        </div>

        {/* bet selector */}
        <div className="w-full">
          <div style={pxS("6px")} className="mb-2 text-center text-white/40">
            BET AMOUNT
          </div>
          <div className="flex gap-2">
            {BET_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => setBet(b)}
                disabled={slotPhase === "spinning"}
                className="flex-1 py-3 transition active:scale-95"
                style={{
                  ...pxS("9px"),
                  background: bet === b ? "#ffd700" : "#0a0a0a",
                  color: bet === b ? "#0a0a0a" : "#ffd700",
                  border: `2px solid ${bet === b ? "#ffd700" : "#ffd70040"}`,
                  boxShadow: bet === b ? "3px 3px 0 #b8860b" : "none",
                }}
              >
                {b}×
              </button>
            ))}
          </div>
        </div>

        {/* paytable */}
        <PixelBorder className="w-full">
          <div className="bg-[#0a0a0a] p-3">
            <div style={pxS("5px")} className="mb-2 text-center text-[#ffd700]/50">
              PAYTABLE
            </div>
            <div className="flex flex-col gap-1.5">
              {SLOT_SYMBOLS.slice()
                .reverse()
                .map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <span style={{ fontSize: 14 }}>
                      {s.icon}
                      {s.icon}
                      {s.icon}
                    </span>
                    <div style={{ ...pxS("5px"), color: s.color, flex: 1 }}>
                      {s.id === "star" ? "JACKPOT 🪙" : `× ${s.mult} BET`}
                    </div>
                    <div style={{ ...pxS("4px"), color: s.color + "99" }}>
                      {s.id === "star" ? `🪙${jackpot}` : `+${bet * s.mult} 🪙`}
                    </div>
                  </div>
                ))}
              <div className="flex items-center gap-2 border-t border-[#ffd700]/10 pt-1.5">
                <span style={{ fontSize: 14 }}>🎭🎭</span>
                <div style={{ ...pxS("5px"), color: "#888", flex: 1 }}>ANY PAIR</div>
                <div style={{ ...pxS("4px"), color: "#88888899" }}>+{bet} 🪙</div>
              </div>
            </div>
          </div>
        </PixelBorder>

        <button
          disabled={slotPhase === "spinning" || tokens < bet}
          onClick={spinSlots}
          className="flex w-full items-center justify-center gap-2 py-4 text-[#0a0a0a] transition active:scale-95 disabled:opacity-30"
          style={{
            ...pxS("10px"),
            background: "#ffd700",
            boxShadow: slotPhase === "spinning" || tokens < bet ? "none" : "4px 4px 0 #b8860b",
          }}
        >
          <Zap size={16} />
          {slotPhase === "spinning"
            ? "SPINNING..."
            : tokens < bet
              ? "NOT ENOUGH 🪙"
              : `SPIN — ${bet} TOKEN${bet > 1 ? "S" : ""}`}
        </button>
        {rewardError && (
          <div style={pxS("5px")} className="text-center text-[#ef4444]">
            {rewardError}
          </div>
        )}

        {slotPhase === "result" && (
          <button onClick={resetSlots} className="text-white/30 transition hover:text-white" style={pxS("7px")}>
            RESET
          </button>
        )}
      </div>
    </div>
  );
}
