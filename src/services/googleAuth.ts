const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export async function getGoogleAuthUrl(userId: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/google/auth-url?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) {
    throw new Error("Failed to get Google authorization URL");
  }
  const data = await res.json() as { authUrl: string };
  return data.authUrl;
}

export async function handleGoogleCallback(code: string, userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/google/callback`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, userId }),
  });
  if (!res.ok) {
    const data = await res.json() as { error?: string };
    throw new Error(data.error || "Failed Google authentication callback");
  }
}

export async function checkGoogleConnection(userId: string): Promise<boolean> {
  const res = await fetch(`${API_BASE_URL}/google/status?userId=${encodeURIComponent(userId)}`);
  if (!res.ok) return false;
  const data = await res.json() as { connected: boolean };
  return data.connected;
}

export async function disconnectGoogle(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/google/disconnect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    throw new Error("Failed to disconnect Google account");
  }
}
