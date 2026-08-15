"use client";

import { Coins, Trophy, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { EQUIP_PER_KIND, effectLabel, equippedOfKind } from "@/lib/gear";
import { gradientFor, photoUrl, roleFor } from "@/lib/adapt";
import { useGame } from "@/lib/game-store";
import { postMagicLink } from "@/lib/session-client";
import { CircleAvatar, pxS } from "../pixel";

export function StoreTab() {
  const { playerCard, tokens, inventory, toggleEquip, tossItem, setTab, setBattleStep, setRewardView, resetChest, gear, persistOn } =
    useGame();
  const [email, setEmail] = useState("");
  const [magicMsg, setMagicMsg] = useState<string | null>(null);
  const [equipMsg, setEquipMsg] = useState<string | null>(null);
  const [tossUid, setTossUid] = useState<string | null>(null);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto">
      {/* profile header */}
      <div className="border-b border-[#ffd700]/20 px-5 py-5">
        <div className="flex items-center gap-4">
          <CircleAvatar
            initials={playerCard?.initials ?? "??"}
            gradient={playerCard ? gradientFor(playerCard.id) : undefined}
            photo={playerCard ? photoUrl(playerCard) : null}
            size={60}
          />
          <div className="flex min-w-0 flex-col gap-1">
            <div style={pxS("8px")} className="truncate text-white">
              {(playerCard?.name ?? "ANONYMOUS").toUpperCase()}
            </div>
            <div style={pxS("5px")} className="truncate text-[#ffd700]/60">
              {playerCard ? roleFor(playerCard).toUpperCase() : "CLAIM YOUR CARD IN BATTLES"}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[#ffd700]" style={pxS("6px")}>
              <Coins size={10} /> {tokens} TOKENS
            </div>
            {(gear.flex > 0 || gear.luck > 0 || gear.payout > 0) && (
              <div style={pxS("4px")} className="mt-1 text-white/35">
                {gear.flex > 0 ? `FLEX +${gear.flex}  ` : ""}
                {gear.luck > 0 ? `LUCK +${gear.luck}  ` : ""}
                {gear.payout > 0 ? `PAYOUT +${gear.payout}%` : ""}
              </div>
            )}
          </div>
          {playerCard && (
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
              <div style={{ ...pxS("14px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>
                {(playerCard.flex_score ?? 0) + gear.flex}
              </div>
              <div style={pxS("4px")} className="text-white/30">
                #{playerCard.rank}
              </div>
              {gear.flex > 0 && (
                <div style={pxS("4px")} className="text-[#22c55e]">
                  +{gear.flex} GEAR
                </div>
              )}
            </div>
          )}
        </div>
        {!playerCard && (
          <button
            onClick={() => {
              setBattleStep("claim");
              setTab("battles");
            }}
            className="mt-4 w-full py-3 text-[#0a0a0a]"
            style={{ ...pxS("7px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
          >
            FIND MY CARD
          </button>
        )}
        <Link
          href="/leaderboard"
          className="mt-3 flex w-full items-center justify-center gap-2 py-3 text-[#ffd700]"
          style={{ ...pxS("7px"), border: "2px solid #ffd700" }}
        >
          <Trophy size={12} />
          LEADERBOARD
        </Link>
        <Link
          href="/join"
          className="mt-3 flex w-full items-center justify-center py-3 text-[#ffd700]/80"
          style={{ ...pxS("7px"), border: "2px solid #ffd70055" }}
        >
          HOST QR
        </Link>
      </div>

      {/* inventory */}
      <div className="px-5 py-4">
        <div style={pxS("7px")} className="mb-3 text-[#ffd700]">
          INVENTORY ({inventory.length})
        </div>
        {inventory.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="text-4xl opacity-30">📦</div>
            <div style={pxS("6px")} className="leading-loose text-white/25">
              OPEN CHESTS
              <br />
              TO COLLECT ITEMS
            </div>
            <button
              onClick={() => {
                resetChest();
                setRewardView("chest");
                setTab("rewards");
              }}
              className="mt-2 px-5 py-3 text-[#0a0a0a]"
              style={{ ...pxS("7px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
            >
              OPEN CHEST
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {inventory.map((item) => {
              const tossing = tossUid === item.uid;
              return (
                <div
                  key={item.uid}
                  className="relative flex flex-col items-center gap-1 p-2"
                  style={{
                    border: `2px solid ${tossing ? "#ef4444" : item.equipped ? item.border : item.border + "55"}`,
                    background: tossing ? "#1a0505" : item.equipped ? item.bg : "#0a0a0a",
                    boxShadow: item.equipped && !tossing ? `0 0 10px ${item.glow}` : "none",
                  }}
                >
                  <button
                    type="button"
                    aria-label={tossing ? "Confirm toss" : "Toss item"}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (tossing) {
                        tossItem(item.uid);
                        setTossUid(null);
                        setEquipMsg(null);
                        return;
                      }
                      setTossUid(item.uid);
                      setEquipMsg("TAP × AGAIN TO TOSS");
                    }}
                    className="absolute top-0.5 right-0.5 flex h-5 w-5 items-center justify-center text-white/35 transition hover:text-[#ef4444]"
                  >
                    <X size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (tossing) {
                        setTossUid(null);
                        setEquipMsg(null);
                        return;
                      }
                      if (!item.effect || item.effect.value <= 0) {
                        setTossUid(item.uid);
                        setEquipMsg("TAP × AGAIN TO TOSS");
                        return;
                      }
                      if (!item.equipped && equippedOfKind(inventory, item.effect.kind) >= EQUIP_PER_KIND) {
                        setEquipMsg(`MAX ${EQUIP_PER_KIND} ${item.effect.kind.toUpperCase()}`);
                        return;
                      }
                      setEquipMsg(null);
                      setTossUid(null);
                      toggleEquip(item.uid);
                    }}
                    className="flex w-full flex-col items-center gap-1 pt-2 transition active:scale-95"
                  >
                    <div style={{ fontSize: 24 }}>{item.icon}</div>
                    <div style={{ ...pxS("4px"), color: tossing ? "#ef4444" : item.border, textAlign: "center", lineHeight: 1.5 }}>
                      {tossing ? "TOSS?" : item.name}
                    </div>
                    <div style={{ ...pxS("4px"), color: "#ffffff55", textAlign: "center" }}>
                      {effectLabel(item.effect)}
                    </div>
                    {item.equipped && !tossing && <div style={{ ...pxS("4px"), color: "#ffd700" }}>EQUIPPED</div>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inventory.length > 0 && (
        <div className="px-5 pb-4">
          <div style={pxS("6px")} className="text-center leading-loose text-white/25">
            TAP TO EQUIP · × × TO TOSS · MAX {EQUIP_PER_KIND} OF EACH
            {equipMsg ? (
              <>
                <br />
                <span className="text-[#ffd700]">{equipMsg}</span>
              </>
            ) : null}
          </div>
        </div>
      )}

      <div className="border-t border-[#ffd700]/10 px-5 py-5">
        <div style={pxS("6px")} className="mb-3 text-[#ffd700]/70">
          {persistOn ? "SAVED ON THIS PHONE" : "LOCAL ONLY"}
        </div>
        {persistOn ? (
          <div className="flex flex-col gap-2">
            <div style={pxS("5px")} className="leading-loose text-white/35">
              EMAIL A MAGIC LINK TO KEEP THIS CARD IF YOU SWITCH PHONES
            </div>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="YOU@EMAIL.COM"
              className="w-full border border-[#ffd700]/30 bg-[#0a0a0a] px-3 py-2 text-[#ffd700] placeholder:text-[#ffd700]/25 focus:outline-none"
              style={pxS("6px")}
            />
            <button
              onClick={() => {
                void postMagicLink(email)
                  .then((r) => setMagicMsg(r.local ? "SUPABASE AUTH NOT SET" : "CHECK YOUR EMAIL"))
                  .catch((err) => setMagicMsg(err instanceof Error ? err.message : "FAILED"));
              }}
              className="py-3 text-[#0a0a0a]"
              style={{ ...pxS("6px"), background: "#ffd700", boxShadow: "3px 3px 0 #b8860b" }}
            >
              SEND LINK
            </button>
            {magicMsg && (
              <div style={pxS("5px")} className="text-white/40">
                {magicMsg.toUpperCase()}
              </div>
            )}
          </div>
        ) : (
          <div style={pxS("5px")} className="leading-loose text-white/30">
            ADD SUPABASE KEYS TO .ENV TO KEEP CLAIMS AFTER REFRESH
          </div>
        )}
      </div>
    </div>
  );
}
