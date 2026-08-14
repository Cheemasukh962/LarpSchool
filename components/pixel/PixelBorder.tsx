import type { CSSProperties, ReactNode } from "react";

export function PixelBorder({
  children,
  className = "",
  gold = false,
  style,
}: {
  children: ReactNode;
  className?: string;
  gold?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`border-2 ${gold ? "border-[#ffd700]" : "border-[#ffd700]/35"} bg-[#0a0a0a] ${className}`}
      style={{ boxShadow: gold ? "4px 4px 0 #b8860b" : "2px 2px 0 #b8860b44", ...style }}
    >
      {children}
    </div>
  );
}
