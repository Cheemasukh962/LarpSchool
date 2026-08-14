"use client";

import { gradientFor, identityLines, photoUrl } from "@/lib/adapt";
import { useGame } from "@/lib/game-store";
import type { Card } from "@/lib/types";
import { CircleAvatar, PixelBorder, pxS } from "../pixel";

/**
 * The design's "who performed better?" vote. Scores stay hidden here: the tap is a
 * prediction, and the result screen reveals whether the rubric agreed with you.
 */
export function FaceoffScreen() {
  const { playerCard, challenger, submitGuess, setBattleStep } = useGame();
  if (!playerCard || !challenger) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#ffd700]/20 px-5 py-3">
        <span style={pxS("7px")} className="text-[#ffd700]">
          WHO PERFORMED BETTER?
        </span>
        <button
          onClick={() => setBattleStep("challenger-select")}
          style={pxS("6px")}
          className="text-white/30 transition hover:text-white"
        >
          ← BACK
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 py-4">
        <Fighter card={playerCard} label="YOU" gold testId="faceoff-you" onPick={() => submitGuess(playerCard.id)} />
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[#ffd700]/20" />
          <span style={pxS("11px")} className="text-[#ffd700]">
            VS
          </span>
          <div className="h-px flex-1 bg-[#ffd700]/20" />
        </div>
        <Fighter
          card={challenger}
          label="CHALLENGER"
          testId="faceoff-them"
          onPick={() => submitGuess(challenger.id)}
        />
      </div>

      <div className="px-5 pb-3 text-center text-white/25" style={pxS("6px")}>
        TAP WHO YOU THINK WINS
      </div>
    </div>
  );
}

function Fighter({
  card,
  label,
  gold = false,
  testId,
  onPick,
}: {
  card: Card;
  label: string;
  gold?: boolean;
  testId: string;
  onPick: () => void;
}) {
  const { role, sub } = identityLines(card);

  return (
    <button data-testid={testId} onClick={onPick} className="group flex-1 active:scale-[.98]">
      <PixelBorder gold={gold} className="h-full w-full">
        <div className="flex h-full flex-col gap-3 bg-[#0a0a0a] p-4 text-left transition group-hover:bg-[#ffd700]/8">
          <CircleAvatar initials={card.initials} gradient={gradientFor(card.id)} photo={photoUrl(card)} size={52} />
          <div className="min-w-0">
            <div style={pxS("6px")} className={`mb-1 ${gold ? "text-[#ffd700]" : "text-white/40"}`}>
              {label}
            </div>
            <div style={pxS("8px")} className="leading-relaxed text-white">
              {card.name.toUpperCase()}
            </div>
            <div style={pxS("5px")} className="mt-1 leading-relaxed text-[#ffd700]/50">
              {role.toUpperCase()}
            </div>
            <div style={pxS("5px")} className="mt-1 truncate text-white/25">
              {sub.toUpperCase()}
            </div>
          </div>
        </div>
      </PixelBorder>
    </button>
  );
}
