export function LoadingScreen() {
  return (
    <div className="grid min-h-screen place-items-center bg-night text-white">
      <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 backdrop-blur">
        <span className="h-3 w-3 animate-ping rounded-full bg-neon" />
        <span className="text-sm text-slate-300">Syncing Teja Assistant...</span>
      </div>
    </div>
  );
}
