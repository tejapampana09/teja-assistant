import { Bot, CheckSquare, Home, Inbox, Database, LogOut, Menu, MessageSquare, Mic, Search, StickyNote, SunMedium, UserCircle } from "lucide-react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../context/AuthContext";
import { useSearch } from "../../hooks/useSearch";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/chat", label: "Chat", icon: MessageSquare },
  { to: "/voice", label: "Voice", icon: Mic },
  { to: "/communication", label: "Comms", icon: Inbox },
  { to: "/briefing", label: "Briefing", icon: SunMedium },
  { to: "/tasks", label: "Tasks", icon: CheckSquare },
  { to: "/memories", label: "Memories", icon: StickyNote },
  { to: "/integrations", label: "Google", icon: Database }
];

const XIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const CommandIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3"/></svg>
);

export function AppShell() {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { queryText, setQueryText, results } = useSearch();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setQueryText('');
    }
  }, [searchOpen, setQueryText]);

  const handleSearchResultClick = (url: string) => {
      navigate(url);
      setSearchOpen(false);
  }

  return (
    <div className="min-h-screen overflow-hidden bg-night text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(34,211,238,0.2),transparent_28%),radial-gradient(circle_at_88%_16%,rgba(37,99,235,0.2),transparent_25%),radial-gradient(circle_at_45%_90%,rgba(139,92,246,0.14),transparent_28%),linear-gradient(135deg,#05070c,#07101d_45%,#03050a)]" />
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative flex min-h-screen">
        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div 
            className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <aside className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 border-r border-white/10 bg-slate-950/80 p-6 backdrop-blur-2xl transition-transform lg:static lg:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="mb-10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-full border border-cyan-200/50 bg-cyan-400/10 text-cyan-200 shadow-glow animate-pulseGlow">
                <Bot className="h-6 w-6" />
              </div>
              <div>
                <p className="text-lg font-semibold">Teja Assistant</p>
                <p className="text-xs text-cyan-200">Realtime AI workspace</p>
              </div>
            </div>
            <button className="icon-button h-8 w-8 lg:hidden" onClick={() => setMobileMenuOpen(false)}>
              <XIcon className="h-4 w-4" />
            </button>
          </div>


          <nav className="space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileMenuOpen(false)}
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
              <button className="icon-button lg:hidden" aria-label="Menu" onClick={() => setMobileMenuOpen(true)}>
                <Menu className="h-5 w-5" />
              </button>
              <button 
                className="hidden items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-slate-400 transition hover:bg-white/[0.1] md:flex md:w-96"
                onClick={() => setSearchOpen(true)}
              >
                <Search className="h-4 w-4" />
                <span className="text-sm flex-1 text-left">Search anything...</span>
                <kbd className="hidden rounded bg-slate-800 px-2 font-sans text-xs text-slate-400 sm:inline-block">⌘K</kbd>
              </button>
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
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* Command Palette */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24">
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-slate-900 shadow-panel m-4">
            <div className="flex items-center border-b border-white/10 px-4 py-4">
              <Search className="h-5 w-5 text-cyan-300" />
              <input
                ref={searchInputRef}
                className="ml-4 flex-1 bg-transparent text-white outline-none placeholder:text-slate-500"
                placeholder="Search tasks, memories, messages..."
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
              />
              <button className="icon-button h-8 w-8" onClick={() => setSearchOpen(false)}>
                <XIcon className="h-4 w-4" />
              </button>
            </div>
            
            {queryText && (
              <div className="max-h-96 overflow-y-auto p-2">
                {results.length > 0 ? (
                  results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSearchResultClick(result.url)}
                      className="flex w-full items-center justify-between rounded-xl p-3 text-left transition hover:bg-white/[0.06]"
                    >
                      <div>
                        <div className="font-medium text-slate-200">{result.title}</div>
                        <div className="mt-1 text-xs text-slate-400 line-clamp-1">{result.subtitle}</div>
                      </div>
                      <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase text-cyan-200 shrink-0">
                        {result.type}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-slate-400">
                    No results found for "{queryText}"
                  </div>
                )}
              </div>
            )}
            
            {!queryText && (
               <div className="p-4 text-xs text-slate-500 flex justify-center gap-4">
                  <span className="flex items-center gap-1"><CommandIcon className="h-3 w-3"/>K to open</span>
                  <span className="flex items-center gap-1">ESC to close</span>
               </div>
            )}
          </div>
        </div>
      )}


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
