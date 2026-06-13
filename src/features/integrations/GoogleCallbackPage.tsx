import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { handleGoogleCallback } from "../../services/googleAuth";
import { RefreshCw } from "lucide-react";

const XCircleIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
);

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"processing" | "success" | "error">("processing");
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const userId = searchParams.get("state");

    if (!code || !userId) {
      setStatus("error");
      setErrorMsg("Missing OAuth authorization code or session state.");
      return;
    }

    const processOAuth = async () => {
      try {
        await handleGoogleCallback(code, userId);
        setStatus("success");
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } catch (err: any) {
        console.error(err);
        setStatus("error");
        setErrorMsg(err.message || "Failed to finalize Google authentication.");
      }
    };

    void processOAuth();
  }, [searchParams, navigate]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      {status === "processing" && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <RefreshCw className="h-10 w-10 animate-spin text-cyan-200" />
          </div>
          <h2 className="text-xl font-bold text-white">Connecting Google Account...</h2>
          <p className="text-slate-400">Verifying secure credentials and syncing scopes.</p>
        </div>
      )}

      {status === "success" && (
        <div className="space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-300">
            ✓
          </div>
          <h2 className="text-xl font-bold text-white">Google Integration Success!</h2>
          <p className="text-slate-400">Successfully authorized and registered. Redirecting to dashboard...</p>
        </div>
      )}

      {status === "error" && (
        <div className="max-w-md space-y-6">
          <div className="flex justify-center">
            <XCircleIcon className="h-12 w-12 text-red-500" />
          </div>
          <h2 className="text-xl font-bold text-white">OAuth Synchronization Failed</h2>
          <p className="text-red-200 bg-red-950/20 border border-red-900/30 rounded-2xl px-4 py-3 text-sm">
            {errorMsg}
          </p>
          <button
            onClick={() => navigate("/")}
            className="rounded-2xl bg-slate-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
}
