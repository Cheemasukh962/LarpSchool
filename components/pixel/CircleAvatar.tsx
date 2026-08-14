"use client";

import { useState } from "react";

/**
 * Avatar with three states: real LinkedIn photo, initials on a gradient, or an empty
 * dashed ring before a card is claimed. A photo that 404s falls back to initials so a
 * missing file never leaves a hole in the layout.
 */
export function CircleAvatar({
  initials,
  gradient,
  size = 56,
  photo,
  ring,
}: {
  initials: string;
  gradient?: string;
  size?: number;
  photo?: string | null;
  ring?: string;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = photo && !broken;

  return (
    <div
      style={{ width: size, height: size, boxShadow: ring ? `0 0 0 2px ${ring}` : undefined }}
      className="relative shrink-0 rounded-full"
    >
      {showPhoto ? (
        <img
          src={photo}
          alt={initials}
          width={size}
          height={size}
          loading="lazy"
          onError={() => setBroken(true)}
          className="absolute inset-0 h-full w-full rounded-full object-cover"
        />
      ) : gradient ? (
        <>
          <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${gradient}`} />
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full font-mono font-bold text-white"
            style={{ fontSize: size * 0.22 }}
          >
            {initials}
          </div>
        </>
      ) : (
        <>
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-[#ffd700]/40 bg-[#1a1400]" />
          <div
            className="absolute inset-0 flex items-center justify-center rounded-full font-mono font-bold text-[#ffd700]/50"
            style={{ fontSize: size * 0.22 }}
          >
            {initials}
          </div>
        </>
      )}
    </div>
  );
}
