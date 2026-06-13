import { Router, Request, Response } from "express";
import { getFirestore } from "firebase-admin/firestore";

const router = Router();

const getGoogleConfig = () => ({
  clientId: process.env.GOOGLE_CLIENT_ID || "PLACEHOLDER_CLIENT_ID",
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || "PLACEHOLDER_CLIENT_SECRET",
  redirectUri: process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/integrations/callback",
});

interface GoogleCredentials {
  accessToken: string;
  refreshToken: string;
  expiryDate: number;
}

// Helper: refresh token if expired
async function getValidAccessToken(userId: string): Promise<string | null> {
  const db = getFirestore();
  const credRef = db.collection("users").doc(userId).collection("settings").doc("googleCredentials");
  const doc = await credRef.get();

  if (!doc.exists) {
    return null;
  }

  const creds = doc.data() as GoogleCredentials;
  const now = Date.now();

  // If token is still valid (with 5 min buffer), return it
  if (creds.expiryDate > now + 300 * 1000) {
    return creds.accessToken;
  }

  // Otherwise, refresh it
  if (!creds.refreshToken) {
    return null;
  }

  try {
    const config = getGoogleConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        refresh_token: creds.refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Failed to refresh Google token", await response.text());
      return null;
    }

    const data = await response.json() as { access_token: string; expires_in: number };
    const newAccessToken = data.access_token;
    const newExpiryDate = Date.now() + data.expires_in * 1000;

    await credRef.update({
      accessToken: newAccessToken,
      expiryDate: newExpiryDate,
    });

    return newAccessToken;
  } catch (err) {
    console.error("Error refreshing google token:", err);
    return null;
  }
}

// 1. Get Google OAuth url
router.get("/auth-url", (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const scopes = [
    "https://www.googleapis.com/auth/gmail.readonly",
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/userinfo.profile"
  ];

  const config = getGoogleConfig();
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    scope: scopes.join(" "),
    access_type: "offline",
    prompt: "consent",
    state: userId
  }).toString();

  res.json({ authUrl });
});

// 2. OAuth Callback handler
router.post("/callback", async (req: Request, res: Response) => {
  const { code, userId } = req.body as { code?: string; userId?: string };
  if (!code || !userId) {
    return res.status(400).json({ error: "Missing code or userId" });
  }

  try {
    const config = getGoogleConfig();
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Google token exchange error:", errText);
      return res.status(502).json({ error: "Google token exchange failed", details: errText });
    }

    const data = await response.json() as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    const db = getFirestore();
    const credRef = db.collection("users").doc(userId).collection("settings").doc("googleCredentials");

    const payload: Partial<GoogleCredentials> = {
      accessToken: data.access_token,
      expiryDate: Date.now() + data.expires_in * 1000,
    };

    if (data.refresh_token) {
      payload.refreshToken = data.refresh_token;
    }

    await credRef.set(payload, { merge: true });

    res.json({ success: true });
  } catch (error) {
    console.error("Callback handler error:", error);
    res.status(500).json({ error: "Server error during callback processing" });
  }
});

// 3. Get connection status
router.get("/status", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const db = getFirestore();
    const doc = await db.collection("users").doc(userId).collection("settings").doc("googleCredentials").get();
    res.json({ connected: doc.exists });
  } catch (err) {
    res.status(500).json({ error: "Failed to get google credentials status" });
  }
});

// 4. Disconnect Google Account
router.post("/disconnect", async (req: Request, res: Response) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const db = getFirestore();
    await db.collection("users").doc(userId).collection("settings").doc("googleCredentials").delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to disconnect Google account" });
  }
});

// 5. Fetch Gmail inbox list
router.get("/emails", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const token = await getValidAccessToken(userId);
  if (!token) {
    return res.status(401).json({ error: "Google account not connected" });
  }

  try {
    // List messages
    const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=5&q=is:unread", {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!listRes.ok) {
      return res.status(listRes.status).json({ error: "Failed to fetch Gmail list" });
    }

    const listData = await listRes.json() as { messages?: Array<{ id: string }> };
    const messages = listData.messages || [];

    const details = await Promise.all(
      messages.map(async (msg) => {
        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!detailRes.ok) return null;
        
        const detailData = await detailRes.json() as {
          id: string;
          snippet: string;
          payload?: {
            headers?: Array<{ name: string; value: string }>;
          };
        };

        const headers = detailData.payload?.headers || [];
        const subject = headers.find((h) => h.name.toLowerCase() === "subject")?.value || "(No Subject)";
        const from = headers.find((h) => h.name.toLowerCase() === "from")?.value || "Unknown Sender";
        const date = headers.find((h) => h.name.toLowerCase() === "date")?.value || "";

        return {
          id: detailData.id,
          subject,
          from,
          date,
          snippet: detailData.snippet,
        };
      })
    );

    res.json(details.filter(Boolean));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error reading Gmail" });
  }
});

// 6. Fetch Google Calendar events
router.get("/events", async (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  const token = await getValidAccessToken(userId);
  if (!token) {
    return res.status(401).json({ error: "Google account not connected" });
  }

  try {
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ahead

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` + new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "10"
      }).toString(),
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!calRes.ok) {
      return res.status(calRes.status).json({ error: "Failed to fetch Google Calendar" });
    }

    const data = await calRes.json() as {
      items?: Array<{
        id: string;
        summary?: string;
        description?: string;
        location?: string;
        start?: { dateTime?: string; date?: string };
        end?: { dateTime?: string; date?: string };
      }>;
    };

    const events = (data.items || []).map((item) => ({
      id: item.id,
      title: item.summary || "(No Title)",
      description: item.description || "",
      location: item.location || "",
      start: item.start?.dateTime || item.start?.date || "",
      end: item.end?.dateTime || item.end?.date || "",
    }));

    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error reading Google Calendar" });
  }
});

export default router;
