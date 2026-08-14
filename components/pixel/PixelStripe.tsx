export function PixelStripe({ flip = false }: { flip?: boolean }) {
  return (
    <div className="relative overflow-hidden shrink-0" style={{ transform: flip ? "scaleY(-1)" : undefined }}>
      <div className="h-1 w-full bg-[#ffd700]" />
      <div className="flex bg-[#120f00]">
        {Array.from({ length: 49 }).map((_, i) => (
          <div
            key={i}
            style={{ width: 8, height: 8, background: i % 3 === 0 ? "#ffd700" : i % 3 === 1 ? "#b8860b" : "#0a0a0a" }}
          />
        ))}
      </div>
      <div className="h-px w-full bg-[#ffd700]/20" />
    </div>
  );
}
