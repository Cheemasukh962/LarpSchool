"use client";

import { followersLabel, gradientFor, identityLines, photoUrl, taglineFor, tierColor, tierLabel } from "@/lib/adapt";
import type { Card } from "@/lib/types";
import { CircleAvatar, PixelBorder, StatBars, monoS, pxS } from "../pixel";

/** The full four-bar scorecard. Shared by the profile confirmation and the store tab. */
export function ScoreCard({
  card,
  gold = true,
  gearFlex = 0,
}: {
  card: Card;
  gold?: boolean;
  gearFlex?: number;
}) {
  const tint = tierColor(card.school_tier);
  const { role } = identityLines(card);
  // Without a title the role line already names the employer, so don't print it twice.
  const showCompany = Boolean(card.title && card.company);

  return (
    <PixelBorder gold={gold} className="w-full">
      <div className="flex flex-col gap-4 bg-[#0a0a0a] p-5">
        <div className="flex items-start gap-4">
          <CircleAvatar
            initials={card.initials}
            gradient={gradientFor(card.id)}
            photo={photoUrl(card)}
            size={64}
            ring={tint + "66"}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div style={pxS("8px")} className="leading-relaxed text-white">
              {card.name.toUpperCase()}
            </div>
            <div style={pxS("6px")} className="leading-relaxed text-[#ffd700]/70">
              {role.toUpperCase()}
            </div>
            {showCompany && (
              <div style={pxS("5px")} className="text-white/35">
                {card.company.toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <div style={{ ...pxS("18px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>
              {card.flex_score + gearFlex}
            </div>
            <div style={pxS("4px")} className="text-white/30">
              FLEX
            </div>
            {gearFlex > 0 && (
              <div style={pxS("4px")} className="text-[#22c55e]">
                +{gearFlex} GEAR
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="border px-2 py-0.5" style={{ ...pxS("4px"), borderColor: tint + "66", color: tint }}>
            {tierLabel(card.school_tier)}
          </div>
          <div className="border border-[#ffd700]/25 px-2 py-0.5 text-[#ffd700]/60" style={pxS("4px")}>
            RANK #{card.rank}
          </div>
          <div className="border border-white/10 px-2 py-0.5 text-white/35" style={pxS("4px")}>
            LARP {card.larp_index}
          </div>
          {card.followers > 0 && (
            <div className="border border-white/10 px-2 py-0.5 text-white/35" style={pxS("4px")}>
              {followersLabel(card.followers)} FOLLOWERS
            </div>
          )}
        </div>

        {card.school && (
          <div style={monoS(10)} className="truncate text-white/45">
            {card.school}
          </div>
        )}

        <div className="border-t border-[#ffd700]/10 pt-3">
          <StatBars breakdown={card.breakdown} />
        </div>

        <div className="border-t border-[#ffd700]/10 pt-3">
          <p style={monoS(10)} className="italic leading-relaxed text-white/50">
            &quot;{taglineFor(card)}&quot;
          </p>
        </div>
      </div>
    </PixelBorder>
  );
}
