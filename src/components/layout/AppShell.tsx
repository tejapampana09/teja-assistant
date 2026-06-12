import { Bot, CheckSquare, Home, Inbox, LogOut, Menu, MessageSquare, Mic, Search, StickyNote, SunMedium, UserCircle } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/voice", label: "Voice", icon: Mic },
  { to: "/communication", label: "Comms", icon: Inbox },
  { to: "/briefing", label: "Briefing", icon: SunMedium },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/memories", label: "Memories", icon: StickyNote }
];

export function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.2),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(37,99,235,0.2),transparent_25%),radial-gradient(circle_at_45%_90%,rgba(139,92,246,0.14),transparent_28%),linear-gradient(135deg,#05070c,#07101d_45%,#03050a)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/55 p-6 backdrop-blur-2xl lg:block">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-full border border-cyan-200/50 bg-cyan-400/10 text-cyan-200 shadow-glow animate-pulseGlow">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">Teja Assistant</p>
              <p className="text-xs text-cyan-200">Realtime AI workspace</p>
            </div>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? "border border-cyan-300/30 bg-cyan-400/15 text-cyan-100 shadow-glow"
                      : "text-slate-300 hover:bg-white/[0.06] hover:text-white"
                  }`
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="" className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <UserCircle className="h-11 w-11 text-slate-400" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user?.displayName || "Teja"}</p>
                <p className="truncate text-xs text-slate-400">{user?.email}</p>
              </div>
              <button type="button" onClick={() => void logout()} className="icon-button" aria-label="Log out">
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-night/70 px-4 py-4 backdrop-blur-2xl md:px-6">
            <div className="mx-auto flex max-w-7xl items-center gap-3">
              <button className="icon-button lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
              <div className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-400 md:flex md:w-96">
                <Search className="h-4 w-4" />
                <span className="text-sm">Search anything...</span>
              </div>
              <div className="ml-auto flex items-center gap-3">
                <span className="hidden rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs text-emerald-200 sm:inline-flex">
                  Synced live
                </span>
                <button type="button" onClick={() => void logout()} className="ghost-button">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-28 pt-6 md:px-6 lg:pb-8">
            <Outlet />
          </main>
        </div>
      </div>

      <nav className="fixed bottom-4 left-4 right-4 z-40 grid grid-cols-4 rounded-3xl border border-white/10 bg-slate-950/80 p-2 shadow-panel backdrop-blur-2xl sm:grid-cols-7 lg:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] transition ${
                isActive ? "bg-cyan-400/15 text-cyan-200" : "text-slate-400"
              }`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
