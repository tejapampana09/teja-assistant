import { useEffect, useState, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { userCommunicationMessages } from "../../services/paths";
import { CommunicationMessage } from "../../types/domain";
import { Phone, PhoneCall, Bot, X, Check } from "../../components/ui/icons";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../../context/ToastContext";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60).toString().padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ─── Pulsing rings ────────────────────────────────────────────────────────────
function RingingRings() {
  return (
    <div className="relative flex items-center justify-center">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className="absolute rounded-full border border-emerald-400/40"
          style={{
            width: `${52 + i * 20}px`,
            height: `${52 + i * 20}px`,
            animation: `ping ${0.9 + i * 0.3}s cubic-bezier(0,0,0.2,1) infinite`,
            animationDelay: `${i * 0.2}s`,
            opacity: 1 / i,
          }}
        />
      ))}
      <div className="relative z-10 h-14 w-14 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-xl font-bold text-emerald-200">
        {/* filled by parent */}
      </div>
    </div>
  );
}

// ─── Live call timer ──────────────────────────────────────────────────────────
function LiveTimer({ startedAt }: { startedAt: number }) {
  const [elapsed, setElapsed] = useState(Date.now() - startedAt);
  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span>{formatDuration(elapsed)}</span>;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function GlobalCallMonitor() {
  const { user } = useAuth();
  const { success } = useToast();

  const [callState, setCallState] = useState<"idle" | "ringing" | "in_progress" | "ended">("idle");
  const [callMsg, setCallMsg] = useState<CommunicationMessage | null>(null);
  const [callStartTs, setCallStartTs] = useState<number>(Date.now());
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Use a ref to track the previous status without triggering re-subscribe
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const q = query(
      userCommunicationMessages(user.uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      // Find the most recent message that is a call from android_telephony
      const callMsgDoc = snapshot.docs
        .map((doc) => doc.data() as CommunicationMessage)
        .find((msg) => msg.channel === "call" && msg.source === "android_telephony");

      if (!callMsgDoc) return;
      const status = callMsgDoc.status ?? "idle";

      if (status === prevStatusRef.current) return;
      prevStatusRef.current = status;

      // Only respond to recent call events (e.g. within the last 5 minutes) to avoid showing stale modals on app load
      const createdTime = callMsgDoc.createdAt;
      const timeMs = typeof createdTime === "string"
        ? new Date(createdTime).getTime()
        : (createdTime as any)?.seconds
          ? (createdTime as any).seconds * 1000
          : 0;

      const isActive = status === "ringing" || status === "in_progress";
      const isRecent = isActive || (Date.now() - timeMs < 5 * 60 * 1000);

      if (!isRecent) {
        setCallState("idle");
        setCallMsg(null);
        return;
      }

      if (status === "ringing") {
        setCallMsg(callMsgDoc);
        setCallState("ringing");
      } else if (status === "in_progress") {
        setCallMsg(callMsgDoc);
        setCallStartTs(Date.now());
        setCallState("in_progress");
      } else if (status === "completed" || status === "missed") {
        setCallMsg(callMsgDoc);
        setCallState("ended");
      } else {
        setCallState("idle");
      }
    });

    return () => unsubscribe();
  }, [user]);

  const dismiss = useCallback(() => {
    setCallState("idle");
    setCallMsg(null);
    setNotes("");
  }, []);

  async function handleGenerateTasks() {
    if (!notes.trim() || !callMsg) return;
    setProcessing(true);
    // Simulate AI processing — in production connect to your AI service
    await new Promise((r) => setTimeout(r, 1800));
    success("AI tasks created from call notes!");
    setProcessing(false);
    dismiss();
  }

  const callerName = callMsg?.senderName ?? "Unknown";
  const initials = getInitials(callerName);

  return (
    <AnimatePresence>

      {/* ─── RINGING: Phone Link-style full bottom sheet ─── */}
      {callState === "ringing" && (
        <motion.div
          key="ringing"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 280 }}
          className="fixed inset-x-0 bottom-0 z-[200] md:bottom-8 md:right-8 md:left-auto md:w-96"
        >
          <div className="relative overflow-hidden rounded-t-[2.5rem] md:rounded-[2.5rem] bg-slate-950 border border-white/10 shadow-[0_-8px_60px_rgba(0,0,0,0.8)] p-6">
            {/* Ambient glow */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.12),transparent_60%)]" />

            <div className="relative flex flex-col items-center gap-5 text-center">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Incoming Call
              </p>

              {/* Avatar with rings */}
              <div className="relative flex items-center justify-center mt-2">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className="absolute rounded-full bg-emerald-400/10"
                    style={{
                      width: `${72 + i * 28}px`,
                      height: `${72 + i * 28}px`,
                      animation: `ping ${1 + i * 0.3}s ease-out infinite`,
                      animationDelay: `${i * 0.25}s`,
                    }}
                  />
                ))}
                <div className="relative z-10 h-[72px] w-[72px] rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/10 border border-emerald-400/30 flex items-center justify-center text-2xl font-bold text-emerald-200">
                  {initials}
                </div>
              </div>

              <div>
                <h2 className="text-2xl font-semibold">{callerName}</h2>
                <p className="text-sm text-slate-400 mt-1">Mobile • Calling your phone</p>
              </div>

              {/* Actions */}
              <div className="flex w-full gap-4 mt-2">
                <button
                  onClick={dismiss}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-red-500/15 border border-red-500/20 text-red-400 hover:bg-red-500/25 transition"
                >
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <X className="h-5 w-5 rotate-[135deg]" />
                  </div>
                  <span className="text-xs font-medium">Dismiss</span>
                </button>
                <button
                  onClick={() => { setCallStartTs(Date.now()); setCallState("in_progress"); }}
                  className="flex-1 flex flex-col items-center gap-2 py-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/25 transition"
                >
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium">Accept</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── IN PROGRESS: Phone Link-style mini active call bar ─── */}
      {callState === "in_progress" && (
        <motion.div
          key="in_progress"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] lg:bottom-6"
        >
          <div className="relative flex items-center gap-4 rounded-2xl bg-slate-900/95 border border-emerald-400/20 shadow-2xl px-5 py-3 backdrop-blur-xl overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_left,rgba(52,211,153,0.08),transparent_60%)]" />

            {/* Pulsing dot */}
            <div className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </div>

            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-xs font-bold text-emerald-200">
                {initials}
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">{callerName}</p>
                <p className="text-xs text-emerald-400 mt-0.5 font-mono">
                  <LiveTimer startedAt={callStartTs} />
                </p>
              </div>
            </div>

            <button
              onClick={() => { setCallMsg(prev => prev ? { ...prev, durationMs: Date.now() - callStartTs } : prev); setCallState("ended"); }}
              className="ml-2 h-9 w-9 rounded-full bg-red-500/20 border border-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition shrink-0"
              title="End call"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── CALL ENDED: Post-call AI summary modal ─── */}
      {callState === "ended" && (
        <motion.div
          key="ended"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end justify-center md:items-center p-4 bg-slate-950/70 backdrop-blur-md"
        >
          <motion.div
            initial={{ y: 60, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.97 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-slate-950 border border-white/10 shadow-2xl"
          >
            {/* top gradient bar */}
            <div className="h-1 w-full bg-gradient-to-r from-cyan-400 via-emerald-400 to-transparent" />

            <div className="p-6 space-y-5">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-sm font-bold text-slate-200">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-lg leading-tight truncate">{callerName}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {callMsg?.status === "missed" ? (
                      <span className="text-red-400">Missed call</span>
                    ) : (
                      <>Call ended • {formatDuration(callMsg?.durationMs ?? 0)}</>
                    )}
                  </p>
                </div>
                <button onClick={dismiss} className="h-8 w-8 rounded-xl bg-white/[0.06] text-slate-400 flex items-center justify-center hover:bg-white/10 transition shrink-0">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {callMsg?.status !== "missed" && (
                <>
                  {/* AI section */}
                  <div className="rounded-2xl bg-cyan-400/5 border border-cyan-400/10 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300">
                      <Bot className="h-3.5 w-3.5" />
                      AI Call Assistant
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Jot down what happened on the call. I'll extract tasks and create a summary automatically.
                    </p>
                    <textarea
                      className="field min-h-[80px] resize-none text-sm"
                      placeholder="e.g. Ravi asked about IBM project, follow up tomorrow 10 AM..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      className="ghost-button flex-1 text-sm"
                      onClick={dismiss}
                      disabled={processing}
                    >
                      Skip
                    </button>
                    <button
                      className="primary-button flex-1 text-sm"
                      onClick={handleGenerateTasks}
                      disabled={processing || !notes.trim()}
                    >
                      <Bot className="h-4 w-4" />
                      {processing ? "Analyzing..." : "Generate Tasks"}
                    </button>
                  </div>
                </>
              )}

              {callMsg?.status === "missed" && (
                <button className="primary-button w-full text-sm" onClick={dismiss}>
                  <Check className="h-4 w-4" />
                  Got it
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
