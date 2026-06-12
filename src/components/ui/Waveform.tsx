export function Waveform({ active }: { active: boolean }) {
  return (
    <div className="flex h-12 items-center justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: 24 }).map((_, index) => (
        <span
          key={index}
          className={`w-1 rounded-full bg-cyan-300 ${active ? "animate-pulse" : "opacity-30"}`}
          style={{
            height: `${12 + ((index * 7) % 30)}px`,
            animationDelay: `${index * 55}ms`
          }}
        />
      ))}
    </div>
  );
}
