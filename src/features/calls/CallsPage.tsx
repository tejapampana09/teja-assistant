import { useState, useMemo, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useFirestoreCollection } from "../../hooks/useFirestoreCollection";
import { userCommunicationMessages, userContacts } from "../../services/paths";
import { query, orderBy, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import type { CommunicationMessage } from "../../types/domain";
import {
  Phone, PhoneCall, PhoneMissed, PhoneIncoming,
  Search, Clock3, User, X, RefreshCw, Info
} from "lucide-react";


// ─── Types ────────────────────────────────────────────────────────────────────
interface DeviceContact {
  name: string;
  phoneNumber: string;
  initials: string;
  color: string;
}

interface FirestoreContact {
  id: string;
  name: string;
  phoneNumber?: string;
  source?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "from-cyan-400/30 to-blue-500/20",
  "from-purple-400/30 to-pink-500/20",
  "from-emerald-400/30 to-teal-500/20",
  "from-amber-400/30 to-orange-500/20",
  "from-rose-400/30 to-red-500/20",
];

function getColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
}

function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

function isOnAndroid(): boolean {
  return typeof window !== "undefined" && !!window.TejaAndroid;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DialButton({ digit, sub, onClick }: { digit: string; sub?: string; onClick: (d: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(digit)}
      className="flex flex-col items-center justify-center h-16 w-16 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.1] active:scale-95 transition select-none"
    >
      <span className="text-xl font-semibold leading-none">{digit}</span>
      {sub && <span className="text-[9px] text-slate-500 mt-0.5 tracking-widest">{sub}</span>}
    </button>
  );
}

function CallHistoryItem({ msg, onDialBack }: { msg: CommunicationMessage; onDialBack: (name: string, number: string) => void }) {
  const isIncoming = msg.direction !== "outgoing";
  const isMissed = msg.status === "missed";
  const name = msg.senderName || msg.sender || "Unknown";
  const number = msg.contactPhone || msg.sender || "";

  const ts = useMemo(() => {
    const d = msg.timestamp || msg.createdAt;
    if (!d) return "";
    const date = typeof d === "string" ? new Date(d) : new Date((d as any).seconds * 1000);
    return date.toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" });
  }, [msg]);

  const Icon = isMissed ? PhoneMissed : isIncoming ? PhoneIncoming : PhoneCall;
  const iconColor = isMissed ? "text-red-400" : isIncoming ? "text-emerald-400" : "text-cyan-400";
  const color = getColor(name);

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition group">
      <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${color} border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0`}>
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <Icon className={`h-3 w-3 shrink-0 ${iconColor}`} />
          <span className={`text-[11px] ${isMissed ? "text-red-400" : "text-slate-500"}`}>
            {isMissed ? "Missed" : isIncoming ? "Incoming" : "Outgoing"}
            {msg.durationMs ? ` • ${formatDuration(msg.durationMs)}` : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-slate-600 hidden sm:block">{ts}</span>
        {number && (
          <button
            type="button"
            onClick={() => onDialBack(name, number)}
            className="h-8 w-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition hover:bg-emerald-500/20"
            title="Call back"
          >
            <Phone className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Calling Overlay ──────────────────────────────────────────────────────────
function CallingOverlay({ name, number, onDismiss }: { name: string; number: string; onDismiss: () => void }) {
  const initials = getInitials(name || number);
  return (
    <motion.div
      key="calling"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4"
    >
      <motion.div
        initial={{ scale: 0.9, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 30 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        className="relative w-full max-w-sm overflow-hidden rounded-[2.5rem] bg-slate-950 border border-white/10 shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(52,211,153,0.15),transparent_60%)]" />
        <div className="h-1 w-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-transparent" />
        <div className="relative flex flex-col items-center gap-6 p-8 text-center">
          <div className="relative flex items-center justify-center">
            {[1, 2, 3].map((i) => (
              <span key={i} className="absolute rounded-full bg-emerald-400/10"
                style={{ width: `${80 + i * 28}px`, height: `${80 + i * 28}px`, animation: `ping ${1 + i * 0.3}s ease-out infinite`, animationDelay: `${i * 0.25}s` }} />
            ))}
            <div className="relative z-10 h-20 w-20 rounded-full bg-gradient-to-br from-emerald-400/30 to-cyan-400/20 border border-emerald-400/30 flex items-center justify-center text-2xl font-bold text-emerald-200">
              {initials}
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-semibold">{name || number}</h2>
            <p className="text-sm text-emerald-400 mt-1 animate-pulse">Calling on your phone…</p>
            <p className="text-xs text-slate-500 mt-1">{number}</p>
          </div>
          <p className="text-xs text-slate-400 max-w-[220px] leading-relaxed">
            Your Android phone is dialing. Manage the call from your device.
          </p>
          <button onClick={onDismiss}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/[0.1] transition text-sm">
            <X className="h-4 w-4" /> Dismiss
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Dial keys ────────────────────────────────────────────────────────────────
const DIAL_KEYS = [
  { d: "1", s: "" }, { d: "2", s: "ABC" }, { d: "3", s: "DEF" },
  { d: "4", s: "GHI" }, { d: "5", s: "JKL" }, { d: "6", s: "MNO" },
  { d: "7", s: "PQRS" }, { d: "8", s: "TUV" }, { d: "9", s: "WXYZ" },
  { d: "*", s: "" }, { d: "0", s: "+" }, { d: "#", s: "" },
];

// ─── Main Component ────────────────────────────────────────────────────────────
export function CallsPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [dialNumber, setDialNumber] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"dialer" | "history">("dialer");
  const [calling, setCalling] = useState(false);
  const [callName, setCallName] = useState("");
  const [callNumber, setCallNumber] = useState("");
  const [syncingContacts, setSyncingContacts] = useState(false);

  // Firestore data
  const historyQuery = useMemo(() =>
    user ? query(userCommunicationMessages(user.uid), orderBy("createdAt", "desc")) : null, [user]);
  const contactsQuery = useMemo(() =>
    user ? query(userContacts(user.uid), orderBy("name", "asc")) : null, [user]);

  const { data: allMessages } = useFirestoreCollection<CommunicationMessage>(historyQuery);
  const { data: firestoreContacts } = useFirestoreCollection<FirestoreContact>(contactsQuery);

  const callHistory = useMemo(() =>
    allMessages.filter((m) => m.channel === "call").slice(0, 60), [allMessages]);

  // Build contact list: Firestore contacts (synced from device) take priority
  const contacts: DeviceContact[] = useMemo(() => {
    if (firestoreContacts.length > 0) {
      return firestoreContacts
        .filter(c => c.name && c.phoneNumber)
        .map(c => ({
          name: c.name,
          phoneNumber: c.phoneNumber!,
          initials: getInitials(c.name),
          color: getColor(c.name),
        }));
    }
    // Fallback: derive from call history
    const seen = new Set<string>();
    return allMessages
      .filter(m => {
        const name = m.senderName || m.sender || "";
        if (!name || seen.has(name)) return false;
        seen.add(name);
        return true;
      })
      .slice(0, 30)
      .map(m => ({
        name: m.senderName || m.sender || "Unknown",
        phoneNumber: m.contactPhone || m.sender || "",
        initials: getInitials(m.senderName || m.sender || "?"),
        color: getColor(m.senderName || m.sender || ""),
      }));
  }, [firestoreContacts, allMessages]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts.slice(0, 12);
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q));
  }, [contacts, searchQuery]);

  // ── Dial handlers ──────────────────────────────────────────────────────────
  const appendDigit = useCallback((d: string) => {
    setDialNumber(prev => prev.length < 15 ? prev + d : prev);
  }, []);

  const deleteLastDigit = useCallback(() => {
    setDialNumber(prev => prev.slice(0, -1));
  }, []);

  async function handleMakeCall(name: string, number: string) {
    const cleaned = number.trim().replace(/\s+/g, "");
    if (!cleaned) { toastError("Enter a number to call"); return; }

    setCallName(name);
    setCallNumber(cleaned);
    setCalling(true);

    if (isOnAndroid()) {
      // ✅ PRIMARY PATH: Direct JS bridge call → Android fires ACTION_CALL immediately
      try {
        window.TejaAndroid!.initiateCall!(cleaned);
        success(`Calling ${name || cleaned} via your phone…`);

        // Also log to Firestore for history (non-blocking)
        if (user) {
          setDoc(doc(db, `users/${user.uid}/callRequest/outgoing`), {
            to: cleaned,
            displayName: name || cleaned,
            status: "dialing",
            requestedAt: serverTimestamp(),
            source: "web_dialer",
          }).catch(console.error);
        }
      } catch (e: any) {
        console.error("JS bridge call failed:", e);
        toastError("Call failed: " + (e?.message || "Unknown error"));
        setCalling(false);
      }
    } else {
      // ✅ FALLBACK: web browser — open tel: link
      success(`Opening dialer for ${name || cleaned}…`);
      window.open(`tel:${cleaned}`, "_self");
      setCalling(false);
    }
  }

  function handleSyncContacts() {
    if (isOnAndroid()) {
      setSyncingContacts(true);
      try {
        window.TejaAndroid!.syncContacts!();
        success("Contact sync triggered — contacts will appear shortly");
      } catch (e) {
        toastError("Sync failed");
      }
      setTimeout(() => setSyncingContacts(false), 3000);
    } else {
      toastError("Contact sync requires the Android app");
    }
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="glass-panel rounded-[2rem] p-6 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-72 h-72 bg-emerald-400/5 blur-[80px] pointer-events-none rounded-full" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Phone Integration</p>
              <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Calls</h1>
              <p className="max-w-xl text-slate-400 text-xs mt-1">
                {isOnAndroid()
                  ? "Connected to Android — calls are routed through your device."
                  : "Running in browser — tap Call to open your phone dialer."}
              </p>
            </div>
            {/* Android status badge */}
            <div className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold ${isOnAndroid() ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300" : "border-amber-400/20 bg-amber-400/10 text-amber-300"}`}>
              <span className={`h-2 w-2 rounded-full ${isOnAndroid() ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              {isOnAndroid() ? "Android Connected" : "Browser Mode"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[22rem_1fr]">

          {/* ── Left: Dialer ─────────────────────────────────────────────── */}
          <div className="glass-panel rounded-[2rem] p-6 space-y-5">
            <div className="flex gap-1 rounded-xl bg-white/[0.04] p-1">
              {(["dialer", "history"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-lg py-2 text-xs font-semibold capitalize transition ${activeTab === tab ? "bg-emerald-400/15 text-emerald-200" : "text-slate-400 hover:text-white"}`}>
                  {tab}
                </button>
              ))}
            </div>

            {activeTab === "dialer" ? (
              <>
                {/* Number display */}
                <div className="rounded-2xl bg-white/[0.03] border border-white/10 px-4 py-3 flex items-center gap-2 min-h-[56px]">
                  <span className="flex-1 text-2xl font-mono tracking-wider text-white">
                    {dialNumber || <span className="text-slate-600 text-base font-normal">Enter number…</span>}
                  </span>
                  {dialNumber && (
                    <button type="button" onClick={deleteLastDigit} className="text-slate-400 hover:text-white transition p-1">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Numpad */}
                <div className="grid grid-cols-3 gap-3 place-items-center">
                  {DIAL_KEYS.map(({ d, s }) => (
                    <DialButton key={d} digit={d} sub={s} onClick={appendDigit} />
                  ))}
                </div>

                {/* Call button */}
                <button
                  onClick={() => void handleMakeCall("", dialNumber)}
                  disabled={!dialNumber.trim() || calling}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition disabled:opacity-40 active:scale-95"
                >
                  <Phone className="h-5 w-5" />
                  {calling ? "Dialing…" : "Call via Phone"}
                </button>
              </>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {callHistory.length > 0 ? callHistory.map(m => (
                  <CallHistoryItem key={m.id} msg={m} onDialBack={(name, num) => void handleMakeCall(name, num)} />
                )) : (
                  <div className="flex flex-col items-center gap-3 py-12 text-slate-500">
                    <Clock3 className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No call history yet</p>
                    <p className="text-xs text-center max-w-[200px] opacity-70">Calls made or received via your phone will appear here</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right: Contacts + History ──────────────────────────────── */}
          <div className="space-y-4 min-w-0">
            {/* Contacts panel */}
            <div className="glass-panel rounded-[2rem] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4 text-cyan-300" />
                  Contacts
                  <span className="text-[11px] text-slate-500 font-normal">({contacts.length})</span>
                </h2>
                <button onClick={handleSyncContacts} disabled={syncingContacts}
                  className="flex items-center gap-1.5 text-[11px] text-cyan-300 hover:text-cyan-200 transition disabled:opacity-50">
                  <RefreshCw className={`h-3 w-3 ${syncingContacts ? "animate-spin" : ""}`} />
                  Sync
                </button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input type="text" className="field pl-9 py-2 text-xs" placeholder="Search contacts…"
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>

              {filteredContacts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {filteredContacts.map((c, i) => (
                    <button key={i} onClick={() => void handleMakeCall(c.name, c.phoneNumber)} disabled={calling}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-emerald-400/20 transition group disabled:opacity-40">
                      <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${c.color} border border-white/10 flex items-center justify-center text-sm font-bold text-white`}>
                        {c.initials}
                      </div>
                      <span className="text-xs font-medium truncate w-full text-center">{c.name}</span>
                      <span className="text-[10px] text-slate-500 truncate w-full text-center">{c.phoneNumber}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-8 text-slate-500">
                  {!isOnAndroid() ? (
                    <>  
                      <Info className="h-8 w-8 opacity-30" />
                      <p className="text-sm">Android app required</p>
                      <p className="text-xs text-center max-w-[220px] opacity-70">
                        Contacts sync from your Android device. Install the APK and grant contact permission.
                      </p>
                    </>
                  ) : (
                    <>
                      <User className="h-8 w-8 opacity-30" />
                      <p className="text-sm">{searchQuery ? "No matches" : "No contacts synced yet"}</p>
                      {!searchQuery && (
                        <button onClick={handleSyncContacts}
                          className="mt-1 text-xs text-cyan-300 hover:text-cyan-200 flex items-center gap-1">
                          <RefreshCw className="h-3 w-3" /> Tap to sync contacts
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Full call history */}
            <div className="glass-panel rounded-[2rem] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-slate-400" />
                  Call History
                </h2>
                <span className="text-[11px] text-slate-500">{callHistory.length} calls</span>
              </div>

              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                {callHistory.length > 0 ? callHistory.map(m => (
                  <CallHistoryItem key={m.id} msg={m} onDialBack={(name, num) => void handleMakeCall(name, num)} />
                )) : (
                  <div className="flex flex-col items-center gap-3 py-10 text-slate-500">
                    <PhoneCall className="h-10 w-10 opacity-20" />
                    <p className="text-sm">No call records found</p>
                    <p className="text-xs text-center max-w-xs opacity-70">
                      Make or receive calls via your Android phone — they'll appear here automatically
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* How it works */}
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-cyan-200 flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5" /> How Calls Work
              </p>
              <p>Tap <strong className="text-white">Call via Phone</strong> — it triggers <code className="text-cyan-300 bg-white/5 px-1 rounded">ACTION_CALL</code> directly on your Android device via the JS bridge. No extra steps.</p>
              <p>Incoming calls from your Android phone are automatically logged here and shown as overlays throughout the app.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Calling overlay */}
      <AnimatePresence>
        {calling && (
          <CallingOverlay name={callName} number={callNumber} onDismiss={() => setCalling(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
