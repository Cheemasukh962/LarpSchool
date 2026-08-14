"use client";

import { Coins } from "lucide-react";

import { gradientFor, photoUrl, roleFor } from "@/lib/adapt";
import { useGame } from "@/lib/game-store";
import { CircleAvatar, pxS } from "../pixel";

export function StoreTab() {
  const { playerCard, tokens, inventory, toggleEquip, setTab, setBattleStep, setRewardView, resetChest } = useGame();

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
          </div>
          {playerCard && (
            <div className="ml-auto flex shrink-0 flex-col items-end gap-1">
              <div style={{ ...pxS("14px"), color: "#ffd700", textShadow: "2px 2px 0 #b8860b" }}>
                {playerCard.flex_score}
              </div>
              <div style={pxS("4px")} className="text-white/30">
                #{playerCard.rank}
              </div>
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
            {inventory.map((item) => (
              <button
                key={item.uid}
                onClick={() => toggleEquip(item.uid)}
                className="flex flex-col items-center gap-1 p-2 transition active:scale-95"
                style={{
                  border: `2px solid ${item.equipped ? item.border : item.border + "55"}`,
                  background: item.equipped ? item.bg : "#0a0a0a",
                  boxShadow: item.equipped ? `0 0 10px ${item.glow}` : "none",
                }}
              >
                <div style={{ fontSize: 24 }}>{item.icon}</div>
                <div style={{ ...pxS("4px"), color: item.border, textAlign: "center", lineHeight: 1.5 }}>
                  {item.name}
                </div>
                {item.equipped && <div style={{ ...pxS("4px"), color: "#ffd700" }}>EQUIPPED</div>}
              </button>
            ))}
          </div>
        )}
      </div>

      {inventory.length > 0 && (
        <div className="px-5 pb-4">
          <div style={pxS("6px")} className="text-center leading-loose text-white/25">
            TAP AN ITEM TO EQUIP / UNEQUIP
          </div>
        </div>
      )}
    </div>
  );
}
