"use client";

import { ChevronRight } from "lucide-react";

import { gradientFor, identityLines, photoUrl, tierColor } from "@/lib/adapt";
import type { Card } from "@/lib/types";
import { CircleAvatar, pxS } from "../pixel";

/** One guest in a scrollable list. Used by the claim search and the challenger picker. */
export function CardRow({ card, onSelect }: { card: Card; onSelect: (card: Card) => void }) {
  const { role, sub } = identityLines(card);

  return (
    <button
      data-testid="card-row"
      onClick={() => onSelect(card)}
      className="flex w-full items-center gap-4 border-b border-[#ffd700]/10 px-5 py-4 text-left transition hover:bg-[#ffd700]/5 active:scale-[.98]"
    >
      <CircleAvatar
        initials={card.initials}
        gradient={gradientFor(card.id)}
        photo={photoUrl(card)}
        size={52}
        ring={tierColor(card.school_tier) + "55"}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div style={pxS("7px")} className="truncate text-white">
          {card.name.toUpperCase()}
        </div>
        <div style={pxS("5px")} className="truncate text-[#ffd700]/60">
          {role.toUpperCase()}
        </div>
        <div style={pxS("5px")} className="truncate text-white/30">
          {sub.toUpperCase()}
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <div style={pxS("9px")} className="text-[#ffd700]">
          {card.flex_score}
        </div>
        <div style={pxS("4px")} className="text-white/25">
          #{card.rank}
        </div>
      </div>
      <ChevronRight size={16} className="shrink-0 text-[#ffd700]/35" />
    </button>
  );
}
