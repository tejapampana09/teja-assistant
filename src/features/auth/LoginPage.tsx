import { Bot, Chrome, Database, LockKeyhole, Sparkles } from "lucide-react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { isFirebaseConfigured } from "../../services/firebase";

export function LoginPage() {
  const { user, loginWithGoogle, loading } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.22),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(139,92,246,0.18),transparent_25%),linear-gradient(135deg,#05070c,#07111f_45%,#05070c)]" />
      <section className="relative mx-auto grid min-h-screen w-full max-w-7xl items-center gap-10 px-6 py-10 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full border border-cyan-300/20 bg-white/5 px-4 py-2 text-sm text-cyan-100 shadow-glow backdrop-blur">
            <span className="h-2 w-2 rounded-full bg-neon shadow-[0_0_18px_#22d3ee]" />
            Phase 1 MVP
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal md:text-7xl">
              Teja Assistant
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-300">
              A private AI productivity cockpit for chat history, memories, tasks, and realtime sync across PC and mobile.
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              { icon: LockKeyhole, label: "Google Auth" },
              { icon: Database, label: "Firestore Sync" },
              { icon: Bot, label: "AI Ready" }
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-xl">
                <item.icon className="mb-5 h-5 w-5 text-cyan-300" />
                <p className="text-sm font-medium text-slate-100">{item.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/12 bg-white/[0.07] p-6 shadow-panel backdrop-blur-2xl">
          <div className="relative overflow-hidden rounded-[1.5rem] border border-cyan-300/15 bg-slate-950/80 p-8">
            <div className="absolute right-8 top-8 h-28 w-28 rounded-full border border-cyan-200/50 bg-cyan-400/10 shadow-[0_0_70px_rgba(34,211,238,0.7)] animate-pulseGlow" />
            <Sparkles className="mb-10 h-8 w-8 text-cyan-300" />
            <h2 className="max-w-sm text-3xl font-semibold">Sign in to your realtime assistant space.</h2>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
              Sessions persist securely through Firebase Authentication. Your tasks, memories, and chats are scoped to your user account.
            </p>

            {!isFirebaseConfigured && (
              <div className="mt-6 rounded-xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm text-amber-100">
                Add Firebase values to `.env.local` before Google Sign In can connect.
              </div>
            )}

            <button
              type="button"
              disabled={loading || !isFirebaseConfigured}
              onClick={() => void loginWithGoogle()}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-white px-5 py-4 font-semibold text-slate-950 transition hover:-translate-y-0.5 hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Chrome className="h-5 w-5" />
              Continue with Google
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
