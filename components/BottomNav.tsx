"use client";

import { Gift, ShoppingBag, Swords } from "lucide-react";
import type { ReactNode } from "react";

import type { Tab } from "@/lib/game-store";
import { pxS } from "./pixel";

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "battles", label: "BATTLES", icon: <Swords size={18} /> },
  { id: "rewards", label: "REWARDS", icon: <Gift size={18} /> },
  { id: "store", label: "STORE", icon: <ShoppingBag size={18} /> },
];

export function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  return (
    <div className="relative z-30 shrink-0 border-t border-[#ffd700]/20 bg-[#0a0a0a]">
      <div className="flex">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-1 flex-col items-center gap-1 py-3 transition ${
              tab === t.id ? "text-[#ffd700]" : "text-white/25 hover:text-white/50"
            }`}
          >
            {t.icon}
            <span style={pxS("5px")}>{t.label}</span>
            {tab === t.id && <div className="h-0.5 w-6 bg-[#ffd700]" />}
          </button>
        ))}
      </div>
    </div>
  );
}
