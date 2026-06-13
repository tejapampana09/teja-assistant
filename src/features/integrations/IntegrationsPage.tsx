import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { checkGoogleConnection, getGoogleAuthUrl, disconnectGoogle } from "../../services/googleAuth";
import { RefreshCw } from "lucide-react";

const MailIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
);

const CalendarIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>
);

const LinkIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
);

const CheckCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
);

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

export default function IntegrationsPage() {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const connected = await checkGoogleConnection(user.uid);
      setIsConnected(connected);
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch Google Integration status");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStatus();
  }, [user]);

  const handleConnect = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const authUrl = await getGoogleAuthUrl(user.uid);
      // Redirect to Google OAuth screen
      window.location.href = authUrl;
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to initiate Google connection");
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to disconnect Google Calendar & Gmail?")) {
      return;
    }
    try {
      setLoading(true);
      await disconnectGoogle(user.uid);
      setIsConnected(false);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to disconnect Google connection");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[70vh]">
      <div className="relative z-10 mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Google Integrations
          </h1>
          <p className="mt-2 text-slate-400">
            Connect Gmail & Google Calendar to enable Jarvis to read and manage your schedule and inbox.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-200">
            <XCircleIcon className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Main Google Integration Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-md">
            <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-400/10 blur-3xl pointer-events-none rounded-full" />
            <div className="flex flex-col h-full justify-between gap-6">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-cyan-200">
                    <LinkIcon className="h-6 w-6" />
                  </div>
                  {isConnected ? (
                    <span className="flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200 border border-emerald-400/20 animate-pulse">
                      <CheckCircleIcon className="h-3.5 w-3.5" />
                      Connected
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-400">
                      Not Connected
                    </span>
                  )}
                </div>

                <h2 className="mt-6 text-xl font-bold text-white">Google Account Suite</h2>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">
                  Links your primary Google Account to authorize secure, read-only sync of emails and events directly to your local database context.
                </p>
              </div>

              <div className="flex gap-3">
                {isConnected ? (
                  <button
                    onClick={handleDisconnect}
                    disabled={loading}
                    className="flex-1 rounded-2xl border border-red-500/30 bg-red-500/10 py-3 text-sm font-semibold text-red-200 transition hover:bg-red-500/20 disabled:opacity-50"
                  >
                    Disconnect Account
                  </button>
                ) : (
                  <button
                    onClick={handleConnect}
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 rounded-2xl border border-cyan-300/30 bg-cyan-400/15 py-3 text-sm font-bold text-cyan-200 transition hover:bg-cyan-400/25 shadow-glow disabled:opacity-50"
                  >
                    {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Connect Google Account
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Access permissions overview Card */}
          <div className="rounded-3xl border border-white/10 bg-slate-950/40 p-6 backdrop-blur-md space-y-6">
            <h3 className="text-lg font-bold text-white">Granted Access Scopes</h3>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-300">
                  <MailIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Gmail Access</h4>
                  <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                    Reads unread emails to compile in your Daily Briefings and active assistant prompt context.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300">
                  <CalendarIcon className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Google Calendar Access</h4>
                  <p className="mt-0.5 text-xs text-slate-400 leading-relaxed">
                    Retrieves your calendar events to visualize schedules on your Dashboard and calculate overdue tasks.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
