"use client";

import { Coins, Package, RotateCcw, Zap } from "lucide-react";

import { gradientFor, photoUrl } from "@/lib/adapt";
import { useGame } from "@/lib/game-store";
import { CircleAvatar, PixelBorder, monoS, pxS } from "../pixel";
import { CompareBars } from "./CompareBars";

export function ResultScreen() {
  const {
    playerCard,
    challenger,
    battleResult,
    flavor,
    guessedRight,
    restartBattle,
    setRewardView,
    setTab,
    resetChest,
    resetSlots,
    rewardError,
  } = useGame();

  if (!playerCard || !challenger || !battleResult) return null;

  const won = battleResult.bet_won === true;
  const winner = battleResult.winner_id === playerCard.id ? playerCard : challenger;
  const loser = winner.id === playerCard.id ? challenger : playerCard;

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-5">
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          style={{
            ...pxS("clamp(16px,5vw,22px)"),
            color: won ? "#ffd700" : "#ef4444",
            textShadow: won ? "3px 3px 0 #b8860b" : "3px 3px 0 #7f1d1d",
          }}
        >
          {won ? "YOU WIN!" : "YOU LOSE"}
        </div>
        <div style={pxS("5px")} className="text-white/40">
          {won ? "YOUR BET HIT" : "YOUR BET MISSED"}
        </div>
        {rewardError && (
          <div style={pxS("5px")} className="text-[#ef4444]">
            {rewardError}
          </div>
        )}
        <div className="flex flex-wrap justify-center gap-2">
          {battleResult.margin === 0 ? (
            <div className="border border-[#ffd700]/50 px-2 py-1 text-[#ffd700]" style={pxS("4px")}>
              DEAD HEAT
            </div>
          ) : (
            battleResult.photo_finish && (
              <div className="border border-[#ffd700]/50 px-2 py-1 text-[#ffd700]" style={pxS("4px")}>
                PHOTO FINISH
              </div>
            )
          )}
          <div
            className="border px-2 py-1"
            style={{
              ...pxS("4px"),
              borderColor: guessedRight ? "#22c55e88" : "#ef444488",
              color: guessedRight ? "#22c55e" : "#ef4444",
            }}
          >
            {guessedRight ? "CALLED IT" : "WRONG CALL"}
          </div>
        </div>
      </div>

      {/* scoreboard */}
      <PixelBorder gold className="w-full">
        <div className="flex items-center gap-3 bg-[#0a0a0a] p-4">
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <CircleAvatar
              initials={winner.initials}
              gradient={gradientFor(winner.id)}
              photo={photoUrl(winner)}
              size={48}
              ring="#ffd700"
            />
            <div style={pxS("5px")} className="w-full truncate text-center text-white">
              {winner.name.toUpperCase()}
            </div>
            <div style={{ ...pxS("16px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>
              {battleResult.winner_score}
            </div>
            {winner.id === playerCard.id && (battleResult.gear_flex ?? 0) > 0 && (
              <div style={pxS("4px")} className="text-[#22c55e]">
                INCL +{battleResult.gear_flex} GEAR
              </div>
            )}
            <div style={pxS("4px")} className="text-[#22c55e]">
              WINNER
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1">
            <div style={pxS("9px")} className="text-[#ffd700]/50">
              VS
            </div>
            <div style={pxS("5px")} className="text-white/30">
              +{battleResult.margin}
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 opacity-60">
            <CircleAvatar
              initials={loser.initials}
              gradient={gradientFor(loser.id)}
              photo={photoUrl(loser)}
              size={48}
            />
            <div style={pxS("5px")} className="w-full truncate text-center text-white">
              {loser.name.toUpperCase()}
            </div>
            <div style={pxS("16px")} className="text-white/50">
              {battleResult.loser_score}
            </div>
            <div style={pxS("4px")} className="text-[#ef4444]">
              LOSER
            </div>
          </div>
        </div>
      </PixelBorder>

      {/* An identical total needs a reason, or the crown looks arbitrary. */}
      {(battleResult.margin === 0 || (battleResult.photo_finish && flavor?.tiebreak_note)) && (
        <div className="border border-[#ffd700]/25 bg-[#140d00] px-3 py-2 text-center" style={pxS("5px")}>
          <span className="text-[#ffd700]">{battleResult.margin === 0 ? "SAME SCORE — " : "PHOTO FINISH — "}</span>
          <span className="text-white/60">
            {flavor?.tiebreak_note
              ? flavor.tiebreak_note.toUpperCase()
              : battleResult.tiebreak === "larp_index"
                ? "LOWER LARP INDEX TAKES IT"
                : "SPLIT ON NAME ORDER"}
          </span>
        </div>
      )}

      {/* Headline only: the compliment and roast get their own lines below. */}
      <div className="border-l-2 border-[#ffd700] pl-4">
        <div style={monoS(11)} className="leading-relaxed text-white">
          {flavor?.headline ?? battleResult.headline}
        </div>
      </div>

      <div className="flex flex-col gap-2 border border-[#ffd700]/12 p-3">
        <div style={monoS(10)} className="leading-relaxed text-[#22c55e]/80">
          ✓ {flavor?.winner_compliment ?? battleResult.winner_compliment}
        </div>
        <div style={monoS(10)} className="leading-relaxed text-[#ef4444]/70">
          ✗ {flavor?.loser_roast ?? battleResult.loser_roast}
        </div>
      </div>

      {/* stat comparison, player on the left regardless of who won */}
      <div className="flex flex-col gap-2 border border-[#ffd700]/12 p-3">
        <div className="flex items-center justify-between" style={pxS("4px")}>
          <span className="text-[#ffd700]">YOU</span>
          <span className="text-white/25">BREAKDOWN</span>
          <span className="text-[#4a9eff]">THEM</span>
        </div>
        <CompareBars left={playerCard.breakdown} right={challenger.breakdown} />
      </div>

      <PixelBorder gold>
        <div className="flex items-center justify-center gap-3 bg-[#0a0a0a] px-6 py-3">
          <Coins size={20} className={won ? "text-[#ffd700]" : "text-white/30"} />
          {won ? (
            <>
              <div style={{ ...pxS("18px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>+1</div>
              <div style={pxS("6px")} className="text-white/40">
                TOKEN EARNED
              </div>
            </>
          ) : (
            <div style={pxS("6px")} className="text-white/40">
              NO TOKEN — WRONG SIDE
            </div>
          )}
        </div>
      </PixelBorder>

      <div className="flex w-full flex-col gap-3">
        <button
          onClick={() => {
            resetChest();
            setRewardView("chest");
            setTab("rewards");
          }}
          className="flex w-full items-center justify-center gap-2 py-4 text-[#0a0a0a] transition active:scale-95"
          style={{ ...pxS("9px"), background: "#ffd700", boxShadow: "4px 4px 0 #b8860b" }}
        >
          <Package size={14} /> OPEN CHEST
        </button>
        <button
          onClick={() => {
            resetSlots();
            setRewardView("slots");
            setTab("rewards");
          }}
          className="flex w-full items-center justify-center gap-2 border-2 border-[#ffd700]/40 py-4 text-white/60 transition hover:border-[#ffd700] hover:text-white active:scale-95"
          style={pxS("9px")}
        >
          <Zap size={14} /> SLOTS
        </button>
        <button
          onClick={restartBattle}
          className="flex items-center justify-center gap-2 py-2 text-white/30 transition hover:text-white"
          style={pxS("7px")}
        >
          <RotateCcw size={12} /> AGAIN
        </button>
      </div>
    </div>
  );
}
