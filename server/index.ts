import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import googleRouter from "./routes/google.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP, please try again later" }
});

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(limiter);

// Register Google routes
app.use("/api/google", googleRouter);

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "teja-assistant-api" });
});

app.post("/api/chat", async (request, response) => {
  try {
    const { messages, system } = request.body as {
      messages?: Array<{ role: "user" | "assistant"; content: string }>;
      system?: string;
    };

    if (!messages?.length) {
      return response.status(400).json({ error: "Missing messages array" });
    }

    const latest = messages[messages.length - 1]?.content?.toLowerCase() || "";
    const apiKey = process.env.AI_PROVIDER_API_KEY || process.env.GROQ_API_KEY;
    const apiUrl = process.env.AI_PROVIDER_URL || "https://api.groq.com/openai/v1/chat/completions";
    const model = process.env.AI_PROVIDER_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) {
      return response.json({ reply: fallbackReply(latest) });
    }

    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(system ? [{ role: "system", content: system }] : []),
          ...messages.map((message) => ({
            role: message.role,
            content: message.content
          }))
        ],
        temperature: 0.25,
        max_tokens: 650
      })
    });

    if (!providerResponse.ok) {
      const details = await providerResponse.text();
      console.error("AI provider error", providerResponse.status, details);
      return response.status(502).json({ error: "AI provider error" });
    }

    const data = (await providerResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    return response.json({
      reply: data.choices?.[0]?.message?.content?.trim() || "I am ready, but I could not generate a response."
    });
  } catch (error) {
    console.error(error);
    return response.status(500).json({ error: "Server error" });
  }
});

app.post("/api/reply-suggestions", async (request, response) => {
  try {
    const { message, relationship } = request.body as { message?: string; relationship?: string };
    const suggestions = await generateSuggestionsDirectly(message || "", relationship || "Unknown");
    return response.json(suggestions);
  } catch (error) {
    console.error(error);
    return response.json(fallbackSuggestions(String(request.body?.message || "")));
  }
});

app.post("/api/suggest-tasks", async (request, response) => {
  try {
    const { conversation } = request.body as { conversation?: string };
    if (!conversation) return response.json({ tasks: [] });

    const apiKey = process.env.AI_PROVIDER_API_KEY || process.env.GROQ_API_KEY;
    const apiUrl = process.env.AI_PROVIDER_URL || "https://api.groq.com/openai/v1/chat/completions";
    const model = process.env.AI_PROVIDER_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) return response.json({ tasks: [] });

    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "Extract actionable tasks from the conversation. Return JSON with a 'tasks' array. Each task must have 'title' (string), 'notes' (string), 'priority' (low/medium/high)."
          },
          {
            role: "user",
            content: conversation
          }
        ]
      })
    });

    if (!providerResponse.ok) return response.json({ tasks: [] });

    const data = await providerResponse.json() as any;
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);
    
    return response.json({ tasks: parsed.tasks || [] });
  } catch (error) {
    console.error("Task suggestion error:", error);
    return response.json({ tasks: [] });
  }
});

app.listen(port, () => {
  console.log(`Teja Assistant API running on http://localhost:${port}`);
});

// Initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');
if (fs.existsSync(serviceAccountPath)) {
  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin Initialized successfully.");
    startFirebaseListeners();
  } catch (err) {
    console.error("Failed to initialize Firebase Admin:", err);
  }
} else {
  console.warn("No serviceAccountKey.json found. Backend Firebase listener will not start.");
}

function startFirebaseListeners() {
  const db = getFirestore();
  
  db.collectionGroup('communicationMessages')
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data();
          
          // Process ALL incoming messages that don't have suggestions yet
          // Previously only handled android_notification — now handles all sources
          const isIncoming = data.direction === 'incoming';
          const hasNoSuggestions = !data.suggestions && !data.replySuggestions;
          const hasContent = data.content && data.content.trim().length > 0;
          const isCallChannel = data.channel === 'call'; // skip call-log entries
          
          if (isIncoming && hasNoSuggestions && hasContent && !isCallChannel) {
            console.log(`[Firebase Listener] Generating suggestions for ${change.doc.id} (source: ${data.source})`);
            
            let relationship = "Unknown";
            const userId = change.doc.ref.parent.parent?.id;
            
            if (userId && data.contactId) {
              try {
                const contactDoc = await db.collection('users').doc(userId).collection('contacts').doc(data.contactId).get();
                if (contactDoc.exists) {
                  relationship = contactDoc.data()?.relationship || "Unknown";
                }
              } catch (e) {
                console.error("Error fetching contact relationship:", e);
              }
            }
            
            const suggestions = await generateSuggestionsDirectly(data.content || "", relationship);
            const replySuggestions = [suggestions.short, suggestions.friendly, suggestions.professional];
            
            try {
              await change.doc.ref.update({ suggestions, replySuggestions });
              console.log(`[Firebase Listener] Suggestions saved for message: ${change.doc.id}`);
            } catch (e) {
              console.error(`[Firebase Listener] Error updating message ${change.doc.id}:`, e);
            }
          }
        }
      });
    }, (error) => {
      console.error("[Firebase Listener] Error in onSnapshot listener:", error);
    });
}

async function generateSuggestionsDirectly(message: string, relationship: string) {
  if (!message.trim()) return fallbackSuggestions("");

  const apiKey = process.env.AI_PROVIDER_API_KEY || process.env.GROQ_API_KEY;
  const apiUrl = process.env.AI_PROVIDER_URL || "https://api.groq.com/openai/v1/chat/completions";
  const model = process.env.AI_PROVIDER_MODEL || "llama-3.1-8b-instant";

  if (!apiKey) return fallbackSuggestions(message);

  try {
    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 250,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: "You are an expert personal communication assistant. Generate three distinct, highly natural reply options for the given incoming message based on the relationship. The replies should be brief, direct, and sound like a real human text message. Since the user is Teja (Indian student/developer), feel free to use simple conversational Hinglish/Telugish mixed terms (like 'bro', 'chesta', 'choosta', 'avunu', 'ledu') where appropriate for the casual friendly option. Return a JSON object with keys 'short' (1-4 words), 'friendly' (warm, casual, Hinglish/Telugish/English mix), 'professional' (polite, clean, brief English), and 'summary' (a single concise sentence summarizing the message)."
          },
          {
            role: "user",
            content: `Relationship: ${relationship || "Unknown"}\nIncoming message: ${message}`
          }
        ]
      })
    });

    if (!providerResponse.ok) return fallbackSuggestions(message);

    const data = await providerResponse.json() as any;
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content);

    return {
      short: parsed.short || fallbackSuggestions(message).short,
      friendly: parsed.friendly || fallbackSuggestions(message).friendly,
      professional: parsed.professional || fallbackSuggestions(message).professional,
      summary: parsed.summary || fallbackSuggestions(message).summary
    };
  } catch (error) {
    console.error(error);
    return fallbackSuggestions(message);
  }
}

function fallbackReply(message: string) {
  if (message.includes("task")) {
    return "I can help you break tasks into clear next actions. In Phase 1, create tasks with due dates and mark them complete when finished.";
  }

  if (message.includes("study")) {
    return "For study planning, list the subject, deadline, and available time. I will help structure a focused plan.";
  }

  if (message.includes("memory") || message.includes("remember")) {
    return "Use the Memory tab to save projects, goals, preferences, learning notes, and personal notes. Those memories sync through Firestore.";
  }

  return "I am Teja Assistant. Phase 1 supports secure login, realtime chat history, memories, and task management. AI provider keys can be added on the backend when ready.";
}

function fallbackSuggestions(message: string) {
  const lower = message.toLowerCase();
  let summary = "Sender sent a general message.";
  
  if (lower.includes("project") || lower.includes("complete")) {
    summary = "Sender is asking for project progress.";
  } else if (lower.includes("meeting") || lower.includes("call")) {
    summary = "Sender is asking about a meeting or call schedule.";
  } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey")) {
    summary = "Sender is greeting you.";
  }

  if (lower.includes("project") || lower.includes("complete")) {
    return {
      short: "Almost bro.",
      friendly: "Almost bro, testing chesthunna.",
      professional: "The project is nearly complete. Currently testing.",
      summary
    };
  }

  if (lower.includes("meeting") || lower.includes("call")) {
    return {
      short: "Okay, noted.",
      friendly: "Sure, I will check and confirm.",
      professional: "Thank you for the update. I will review and confirm shortly.",
      summary
    };
  }

  return {
    short: "Okay.",
    friendly: "Sure, I will get back to you.",
    professional: "Thank you for your message. I will respond shortly.",
    summary
  };
}

// Global error handler middleware
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Global Error Handler Caught:", err);
  res.status(err.status || 500).json({
    error: err.message || "An unexpected error occurred on the server."
  });
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("[Process] Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("[Process] Uncaught Exception caught:", error);
});


