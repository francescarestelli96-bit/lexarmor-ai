"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Square,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react";

type ChatRole = "user" | "assistant";
type ChatMessage = { id: string; role: ChatRole; content: string };

type AnalysisContext = {
  contractType?: string;
  parties?: string[];
  summary?: string;
  verdict?: string;
  riskScore?: number;
  clauses?: Array<{
    title: string;
    severity: "critical" | "medium" | "safe";
    explanation: string;
    excerpt: string;
  }>;
  hiddenObligations?: string[];
  negotiationMoves?: string[];
};

type ChatPanelProps = {
  /** Plain text del documento appena analizzato. */
  contractText: string;
  /** Output dell'analisi precedente. */
  analysis: AnalysisContext;
  /** Se true, l'utente non ha access attivo: niente chat. */
  disabled?: boolean;
  onAccessRequired?: () => void;
};

const SUGGESTED_PROMPTS: Array<{ label: string; prompt: string }> = [
  {
    label: "Spiegami la clausola più rischiosa",
    prompt:
      "Quale è la clausola più rischiosa del documento e perché? Spiegamela in modo operativo e dimmi cosa rischio concretamente.",
  },
  {
    label: "Bozza controproposta",
    prompt:
      "Scrivimi una bozza di controproposta da inviare alla controparte sulle clausole critiche identificate. Tono professionale italiano, pronta da copiare.",
  },
  {
    label: "Email per chiedere modifiche",
    prompt:
      "Scrivi un'email cortese ma ferma da inviare alla controparte per chiedere le modifiche più importanti emerse nell'analisi.",
  },
  {
    label: "E se firmo lo stesso?",
    prompt:
      "Se firmassi questo documento così com'è, cosa rischio in pratica? Quali sono i tre scenari peggiori e come potrei mitigarli a posteriori?",
  },
];

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/**
 * Render minimal markdown:
 *  **bold**, *italic*, `code`, headings (#/##/###),
 *  bullet lists (- or *), numbered lists, paragraph breaks.
 * Volutamente molto leggero per evitare dipendenze pesanti in un MVP.
 */
function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split(/\r?\n/);
  const blocks: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let listType: "ul" | "ol" | null = null;

  function flushList() {
    if (!listType || listBuffer.length === 0) return;
    if (listType === "ul") {
      blocks.push(
        <ul key={blocks.length} className="ml-5 list-disc space-y-1 my-2">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
    } else {
      blocks.push(
        <ol key={blocks.length} className="ml-5 list-decimal space-y-1 my-2">
          {listBuffer.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ol>,
      );
    }
    listBuffer = [];
    listType = null;
  }

  function renderInline(s: string): React.ReactNode {
    // **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let key = 0;
    while ((match = regex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        parts.push(s.slice(lastIndex, match.index));
      }
      const token = match[0];
      if (token.startsWith("**")) {
        parts.push(
          <strong key={`b${key++}`} className="font-semibold">
            {token.slice(2, -2)}
          </strong>,
        );
      } else if (token.startsWith("`")) {
        parts.push(
          <code
            key={`c${key++}`}
            className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] font-mono"
          >
            {token.slice(1, -1)}
          </code>,
        );
      } else {
        parts.push(
          <em key={`i${key++}`} className="italic">
            {token.slice(1, -1)}
          </em>,
        );
      }
      lastIndex = regex.lastIndex;
    }
    if (lastIndex < s.length) parts.push(s.slice(lastIndex));
    return parts;
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    const ulMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    const olMatch = /^\d+\.\s+(.+)$/.exec(trimmed);

    if (ulMatch) {
      if (listType !== "ul") flushList();
      listType = "ul";
      listBuffer.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      if (listType !== "ol") flushList();
      listType = "ol";
      listBuffer.push(olMatch[1]);
      continue;
    }

    flushList();

    if (trimmed.length === 0) {
      blocks.push(<div key={blocks.length} className="h-2" />);
      continue;
    }

    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const sizes = ["text-lg", "text-base", "text-sm"];
      blocks.push(
        <div
          key={blocks.length}
          className={`${sizes[level - 1]} font-semibold mt-3 mb-1`}
        >
          {renderInline(headingMatch[2])}
        </div>,
      );
      continue;
    }

    blocks.push(
      <p key={blocks.length} className="my-1.5 leading-7">
        {renderInline(trimmed)}
      </p>,
    );
  }

  flushList();
  return <>{blocks}</>;
}

export function ChatPanel({
  contractText,
  analysis,
  disabled = false,
  onAccessRequired,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [input]);

  // Auto-scroll on new content
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isStreaming]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isStreaming) return;
    if (disabled) {
      onAccessRequired?.();
      return;
    }

    setError(null);
    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: trimmed,
    };
    const assistantMsg: ChatMessage = {
      id: generateId(),
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contractText,
          analysis,
          messages: [...messages, userMsg].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          onAccessRequired?.();
        }
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? `Errore HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("Stream non disponibile.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: acc } : m,
          ),
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        // aborted: lascia quanto già streamato
      } else {
        const message =
          err instanceof Error ? err.message : "Errore imprevisto";
        setError(message);
        setMessages((prev) => prev.filter((m) => m.id !== assistantMsg.id));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }

  function stop() {
    abortRef.current?.abort();
  }

  function reset() {
    if (isStreaming) stop();
    setMessages([]);
    setError(null);
  }

  async function copyMessage(msg: ChatMessage) {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  const isEmpty = messages.length === 0;

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,8,23,0.96))] p-4 sm:rounded-[1.9rem] sm:p-5 lg:p-7">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <Sparkles size={17} />
          </span>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Follow-up con LexArmor
            </p>
            <h3 className="mt-1 text-xl font-semibold tracking-[-0.02em] text-white sm:text-2xl">
              Chiedi qualsiasi cosa su questo documento.
            </h3>
          </div>
        </div>

        {!isEmpty && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-white/[0.08]"
          >
            <RefreshCw size={12} />
            Nuova chat
          </button>
        )}
      </header>

      {/* Suggested prompts (visible only when chat is empty) */}
      {isEmpty && (
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {SUGGESTED_PROMPTS.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => send(s.prompt)}
              disabled={disabled || isStreaming}
              className="text-left rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div className="text-sm font-medium text-white">{s.label}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-400">
                {s.prompt}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      {!isEmpty && (
        <div
          ref={scrollRef}
          className="mt-5 max-h-[60vh] space-y-5 overflow-y-auto pr-1"
        >
          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-2xl rounded-br-md bg-white/[0.07] px-4 py-3 text-sm leading-relaxed text-white whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-slate-950">
                  LA
                </span>
                <div className="min-w-0 flex-1 text-sm text-slate-100">
                  {m.content.length === 0 ? (
                    <ThinkingDots />
                  ) : (
                    <>
                      <div className="prose prose-invert max-w-none">
                        <MiniMarkdown text={m.content} />
                      </div>
                      {!isStreaming || m.id !== messages[messages.length - 1].id ? (
                        <button
                          type="button"
                          onClick={() => copyMessage(m)}
                          className="mt-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-400 transition hover:text-white hover:bg-white/[0.06]"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check size={12} /> Copiato
                            </>
                          ) : (
                            <>
                              <Copy size={12} /> Copia risposta
                            </>
                          )}
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      )}

      {/* Input */}
      <form
        className="mt-5 flex items-end gap-2 rounded-2xl border border-white/10 bg-slate-950/40 p-2 focus-within:border-emerald-400/30"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (input.trim().length > 0 && !isStreaming) {
                send(input);
              }
            }
          }}
          rows={1}
          placeholder={
            disabled
              ? "Attiva un piano per chattare con LexArmor…"
              : "Es. Spiega la clausola sulla penale e proponi una controproposta…"
          }
          disabled={disabled}
          className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-relaxed text-white placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={stop}
            aria-label="Interrompi"
            className="grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-950 transition hover:bg-slate-200"
          >
            <Square size={14} fill="currentColor" />
          </button>
        ) : (
          <button
            type="submit"
            aria-label="Invia"
            disabled={disabled || input.trim().length === 0}
            className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400 text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp size={16} />
          </button>
        )}
      </form>

      <p className="mt-3 text-center text-[11px] text-slate-500">
        LexArmor può sbagliare. Verifica sempre i riferimenti prima di un&apos;azione difensiva.
      </p>
    </section>
  );
}

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse" />
      <span
        className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
        style={{ animationDelay: "0.2s" }}
      />
      <span
        className="h-1.5 w-1.5 rounded-full bg-slate-400 animate-pulse"
        style={{ animationDelay: "0.4s" }}
      />
    </div>
  );
}
