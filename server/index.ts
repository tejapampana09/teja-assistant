import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 8787);

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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

    if (!message?.trim()) {
      return response.status(400).json({ error: "Missing message" });
    }

    const apiKey = process.env.AI_PROVIDER_API_KEY || process.env.GROQ_API_KEY;
    const apiUrl = process.env.AI_PROVIDER_URL || "https://api.groq.com/openai/v1/chat/completions";
    const model = process.env.AI_PROVIDER_MODEL || "llama-3.1-8b-instant";

    if (!apiKey) {
      return response.json(fallbackSuggestions(message));
    }

    const providerResponse = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        temperature: 0.25,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "Generate WhatsApp reply suggestions as JSON with keys short, friendly, professional. Keep replies natural. Do not auto-send anything."
          },
          {
            role: "user",
            content: `Relationship: ${relationship || "Unknown"}\nIncoming message: ${message}`
          }
        ]
      })
    });

    if (!providerResponse.ok) {
      return response.json(fallbackSuggestions(message));
    }

    const data = (await providerResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(content) as Partial<ReturnType<typeof fallbackSuggestions>>;

    return response.json({
      short: parsed.short || fallbackSuggestions(message).short,
      friendly: parsed.friendly || fallbackSuggestions(message).friendly,
      professional: parsed.professional || fallbackSuggestions(message).professional
    });
  } catch (error) {
    console.error(error);
    return response.json(fallbackSuggestions(String(request.body?.message || "")));
  }
});

app.listen(port, () => {
  console.log(`Teja Assistant API running on http://localhost:${port}`);
});

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

  if (lower.includes("project") || lower.includes("complete")) {
    return {
      short: "Almost bro.",
      friendly: "Almost bro, testing chesthunna.",
      professional: "The project is nearly complete. Currently testing."
    };
  }

  if (lower.includes("meeting") || lower.includes("call")) {
    return {
      short: "Okay, noted.",
      friendly: "Sure, I will check and confirm.",
      professional: "Thank you for the update. I will review and confirm shortly."
    };
  }

  return {
    short: "Okay.",
    friendly: "Sure, I will get back to you.",
    professional: "Thank you for your message. I will respond shortly."
  };
}
