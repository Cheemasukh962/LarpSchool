import { Coins } from "lucide-react";
import { pxS } from "./tokens";

export function TokenPill({ tokens, size = "7px", icon = 11 }: { tokens: number; size?: string; icon?: number }) {
  return (
    <div data-testid="tokens" className="flex items-center gap-1.5 text-[#ffd700]" style={pxS(size)}>
      <Coins size={icon} /> {tokens}
    </div>
  );
}
