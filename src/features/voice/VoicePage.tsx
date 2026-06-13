import { addDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { Bot, Mic, MicOff, Pause, Play, Save, Send, Square } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Waveform } from "../../components/ui/Waveform";
import { useAuth } from "../../context/AuthContext";
import { useSpeechRecognition } from "../../hooks/useSpeechRecognition";
import { useTextToSpeech } from "../../hooks/useTextToSpeech";
import { useToast } from "../../context/ToastContext";
import { requestAssistantReply } from "../../services/ai";
import { userVoiceSettings, userMessages, userTasks, userMemories } from "../../services/paths";
import type { ChatMessage, VoiceSettings } from "../../types/domain";
import { AssistantBrainService } from "../../services/AssistantBrainService";

const defaultSettings: VoiceSettings = {
  enabled: true,
  language: "en-US",
  rate: 1,
  pitch: 1
};

export function VoicePage() {
  const { user } = useAuth();
  const { success } = useToast();
  const [settings, setSettings] = useState<VoiceSettings>(defaultSettings);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const recognition = useSpeechRecognition(settings.language);
  const tts = useTextToSpeech(settings);

  const composedTranscript = useMemo(
    () => `${recognition.transcript} ${recognition.interimTranscript}`.trim(),
    [recognition.interimTranscript, recognition.transcript]
  );

  useEffect(() => {
    if (!user) return;

    void getDoc(userVoiceSettings(user.uid)).then((snapshot) => {
      if (snapshot.exists()) {
        setSettings({ ...defaultSettings, ...(snapshot.data() as Partial<VoiceSettings>) });
      }
    });
  }, [user]);

  async function sendVoiceToChat(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    const prompt = composedTranscript.trim();
    if (!user || !prompt || sending) return;

    setSending(true);
    recognition.stopListening();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
      createdAt: new Date()
    };

    try {
      await addDoc(userMessages(user.uid), {
        role: "user",
        content: prompt,
        createdAt: serverTimestamp()
      });

      // Integrate brain service context for voice
      const brain = new AssistantBrainService(user.uid);
      const ctx = await brain.assembleContext(prompt);
      let systemPrompt = brain.buildSystemPrompt(ctx);

      // Append instruction for structured Voice commands
      systemPrompt += `\n\n== VOICE ACTIONS INSTRUCTION ==\n` +
        `If the user requests to perform a system action (like adding a task or saving a memory/note/preference), you MUST respond in this format:\n` +
        `[ACTION] {"action": "create_task" | "create_memory", ...details} [REPLY] Your spoken confirmation message.\n` +
        `If no action is requested, respond normally without [ACTION] or [REPLY] tags.\n\n` +
        `JSON schemas:\n` +
        `- Action "create_task": {"action": "create_task", "title": string, "priority": "low"|"medium"|"high", "dueDate": "YYYY-MM-DD"}\n` +
        `- Action "create_memory": {"action": "create_memory", "content": string, "category": "General"|"Preferences"|"Projects"|"Reference"}\n` +
        `Keep [ACTION] strictly valid single-line JSON.`;

      const rawReply = await requestAssistantReply([userMessage], systemPrompt);
      
      let parsedReply = rawReply;
      let actionObj: any = null;

      if (rawReply.includes("[ACTION]")) {
        const actionMatch = rawReply.match(/\[ACTION\]\s*(\{.*?\})\s*\[REPLY\](.*)/s);
        if (actionMatch) {
          try {
            actionObj = JSON.parse(actionMatch[1].trim());
            parsedReply = actionMatch[2].trim();
          } catch (e) {
            console.error("Failed to parse Voice Action JSON:", e);
          }
        }
      }

      // Execute Action locally if detected
      if (actionObj) {
        if (actionObj.action === "create_task") {
          await addDoc(userTasks(user.uid), {
            title: actionObj.title || "Untitled Task",
            priority: actionObj.priority || "medium",
            status: "active",
            dueDate: actionObj.dueDate || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        } else if (actionObj.action === "create_memory") {
          await addDoc(userMemories(user.uid), {
            content: actionObj.content || "",
            category: actionObj.category || "General",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
        }
      }

      setReply(parsedReply);

      await addDoc(userMessages(user.uid), {
        role: "assistant",
        content: parsedReply,
        createdAt: serverTimestamp()
      });

      tts.speak(parsedReply);
      recognition.resetTranscript();
    } catch (error) {
      console.error(error);
    } finally {
      setSending(false);
    }
  }

  async function saveSettings() {
    if (!user) return;
    await setDoc(userVoiceSettings(user.uid), settings, { merge: true });
    success("Voice settings saved");
  }

  return (
    <section className="grid gap-5 xl:grid-cols-[1fr_24rem]">
      <div className="glass-panel overflow-hidden rounded-[2rem]">
        <div className="border-b border-white/10 p-6">
          <p className="text-sm text-cyan-200">Voice Assistant</p>
          <h1 className="mt-2 text-3xl font-semibold">Talk naturally to Teja Assistant</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Web Speech API powers Phase 2 speech-to-text now. The voice layer keeps language and provider settings separate for multilingual support later.
          </p>
        </div>

        <div className="grid gap-6 p-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-[2rem] border border-cyan-300/20 bg-cyan-400/10 p-6 text-center">
            <button
              type="button"
              onClick={recognition.isListening ? recognition.stopListening : recognition.startListening}
              className={`mx-auto grid h-36 w-36 place-items-center rounded-full border text-white transition ${
                recognition.isListening
                  ? "border-rose-300/50 bg-rose-400/20 shadow-[0_0_70px_rgba(244,63,94,0.55)]"
                  : "border-cyan-200/60 bg-cyan-400/20 shadow-[0_0_70px_rgba(34,211,238,0.65)]"
              }`}
            >
              {recognition.isListening ? <MicOff className="h-12 w-12" /> : <Mic className="h-12 w-12" />}
            </button>
            <p className="mt-5 text-lg font-semibold">{recognition.isListening ? "Listening..." : "Tap to speak"}</p>
            <p className="mt-2 text-sm text-slate-400">{recognition.supported ? "English recognition active" : "Browser not supported"}</p>
            <Waveform active={recognition.isListening} />
            {recognition.error && <p className="text-sm text-rose-200">{recognition.error}</p>}
          </div>

          <form onSubmit={(event) => void sendVoiceToChat(event)} className="flex min-h-96 flex-col rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
            <label className="text-sm font-medium text-slate-300">Live transcript</label>
            <textarea
              className="mt-3 min-h-52 flex-1 resize-none rounded-2xl border border-white/10 bg-slate-950/50 p-4 text-sm leading-6 text-white outline-none"
              value={composedTranscript}
              onChange={() => undefined}
              placeholder="Speak now. Example: Today plan cheppu"
              readOnly
            />
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="submit" disabled={!composedTranscript || sending} className="primary-button">
                <Send className="h-4 w-4" />
                Send to Chat
              </button>
              <button type="button" onClick={recognition.resetTranscript} className="ghost-button">
                Clear
              </button>
            </div>
          </form>
        </div>

        {reply && (
          <div className="border-t border-white/10 p-6">
            <div className="rounded-3xl border border-white/10 bg-white/[0.05] p-5">
              <div className="mb-3 flex items-center gap-2 text-cyan-200">
                <Bot className="h-4 w-4" />
                Latest spoken response
              </div>
              <p className="text-sm leading-7 text-slate-300">{reply}</p>
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => tts.speak(reply)} className="ghost-button">
                  <Play className="h-4 w-4" />
                  Play
                </button>
                <button type="button" onClick={tts.pause} className="ghost-button">
                  <Pause className="h-4 w-4" />
                  Pause
                </button>
                <button type="button" onClick={tts.stop} className="ghost-button">
                  <Square className="h-4 w-4" />
                  Stop
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="glass-panel h-fit rounded-[2rem] p-5">
        <p className="text-sm text-cyan-200">Voice Settings</p>
        <h2 className="mt-2 text-xl font-semibold">Assistant voice</h2>
        <div className="mt-5 space-y-4">
          <label className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm">
            Speak responses
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => setSettings((current) => ({ ...current, enabled: event.target.checked }))}
            />
          </label>
          <div>
            <label className="text-sm text-slate-400">Language</label>
            <select className="field mt-2" value={settings.language} onChange={(event) => setSettings((current) => ({ ...current, language: event.target.value }))}>
              <option value="en-US">English (US)</option>
              <option value="en-IN">English (India)</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-slate-400">Voice</label>
            <select className="field mt-2" value={settings.voiceName || ""} onChange={(event) => setSettings((current) => ({ ...current, voiceName: event.target.value }))}>
              <option value="">System default</option>
              {tts.voices.map((voice) => (
                <option key={voice.name} value={voice.name}>
                  {voice.name}
                </option>
              ))}
            </select>
          </div>
          <Range label="Rate" value={settings.rate} min={0.7} max={1.4} step={0.1} onChange={(rate) => setSettings((current) => ({ ...current, rate }))} />
          <Range label="Pitch" value={settings.pitch} min={0.7} max={1.4} step={0.1} onChange={(pitch) => setSettings((current) => ({ ...current, pitch }))} />
          <button type="button" onClick={() => void saveSettings()} className="primary-button w-full">
            <Save className="h-4 w-4" />
            Save Voice Settings
          </button>
        </div>
      </aside>
    </section>
  );
}

function Range(props: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void }) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <label className="text-slate-400">{props.label}</label>
        <span>{props.value.toFixed(1)}</span>
      </div>
      <input
        className="w-full accent-cyan-300"
        type="range"
        value={props.value}
        min={props.min}
        max={props.max}
        step={props.step}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </div>
  );
}
