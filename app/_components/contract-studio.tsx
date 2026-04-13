"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  Shield,
  ShieldCheck,
} from "lucide-react";

type Clause = {
  title: string;
  severity: "critical" | "medium" | "safe";
  explanation: string;
  excerpt: string;
};

type AnalysisResponse = {
  mode: "live" | "demo";
  summary: string;
  verdict: "critical" | "review" | "safe";
  riskScore: number;
  clauses: Clause[];
  hiddenObligations: string[];
  negotiationMoves: string[];
  disclaimer: string;
};

const sampleContract = `Il conduttore rinuncia espressamente a qualsiasi richiesta di rimborso per vizi dell'immobile, anche se scoperti successivamente alla firma.

Il locatore potra' modificare unilateralmente il regolamento condominiale applicabile all'unita' locata previa semplice comunicazione via email.

In caso di recesso anticipato, il conduttore restera' obbligato al pagamento di tutti i canoni residui fino alla scadenza naturale del contratto.

Il deposito cauzionale verra' restituito entro 180 giorni dal rilascio dell'immobile, previa verifica integrale da parte del locatore.

Ogni controversia sara' devoluta in via esclusiva al foro scelto dal locatore.`;

const verdictCopy = {
  critical: {
    label: "High risk",
    badgeClass:
      "bg-red-400/15 text-red-200 ring-1 ring-inset ring-red-400/25",
  },
  review: {
    label: "Needs review",
    badgeClass:
      "bg-amber-300/15 text-amber-100 ring-1 ring-inset ring-amber-300/25",
  },
  safe: {
    label: "Mostly standard",
    badgeClass:
      "bg-emerald-400/15 text-emerald-100 ring-1 ring-inset ring-emerald-400/25",
  },
} as const;

const severityCopy = {
  critical: {
    label: "Critical",
    icon: AlertTriangle,
    className: "text-red-300",
  },
  medium: {
    label: "Attention",
    icon: Shield,
    className: "text-amber-200",
  },
  safe: {
    label: "Safe",
    icon: CheckCircle2,
    className: "text-emerald-200",
  },
} as const;

const scanningSteps = [
  "Reading structure and clause density",
  "Checking penalties and unilateral obligations",
  "Scoring legal exposure and negotiation points",
];

const complianceBadges = [
  {
    label: "256-bit Encryption",
    icon: LockKeyhole,
  },
  {
    label: "GDPR Compliant",
    icon: Fingerprint,
  },
  {
    label: "No Data Retention",
    icon: ShieldCheck,
  },
];

export function ContractStudio() {
  const [text, setText] = useState("");
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [scanIndex, setScanIndex] = useState(0);

  useEffect(() => {
    if (!isPending) {
      setScanIndex(0);
      return;
    }

    const interval = window.setInterval(() => {
      setScanIndex((current) => (current + 1) % scanningSteps.length);
    }, 900);

    return () => window.clearInterval(interval);
  }, [isPending]);

  async function analyzeContract() {
    setIsPending(true);
    setError("");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contractText: text }),
      });

      const data = (await res.json()) as AnalysisResponse & { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Analisi non disponibile.");
      }

      startTransition(() => {
        setAnalysis(data);
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Non sono riuscito a leggere il contratto. Riprova tra poco."
      );
    } finally {
      setIsPending(false);
    }
  }

  const verdict = analysis ? verdictCopy[analysis.verdict] : null;

  const groupedClauses = useMemo(
    () => ({
      critical:
        analysis?.clauses.filter((clause) => clause.severity === "critical") ??
        [],
      medium:
        analysis?.clauses.filter((clause) => clause.severity === "medium") ??
        [],
      safe:
        analysis?.clauses.filter((clause) => clause.severity === "safe") ?? [],
    }),
    [analysis]
  );

  const panels = [
    {
      key: "critical",
      title: "Critical Risks",
      subtitle: "Clausole vessatorie e penali nascoste",
      tone: "border-red-400/15 bg-red-400/8",
      badge: "bg-red-400/15 text-red-200",
      items: groupedClauses.critical,
      empty: "Nessuna criticita' forte rilevata.",
    },
    {
      key: "medium",
      title: "Attention Required",
      subtitle: "Punti da rinegoziare o chiarire",
      tone: "border-amber-300/15 bg-amber-300/8",
      badge: "bg-amber-300/15 text-amber-100",
      items: groupedClauses.medium,
      empty: "Nessuna area gialla rilevante.",
    },
    {
      key: "safe",
      title: "Standard / Safe",
      subtitle: "Clausole non anomale",
      tone: "border-emerald-400/15 bg-emerald-400/8",
      badge: "bg-emerald-400/15 text-emerald-100",
      items: groupedClauses.safe,
      empty: "Nessuna clausola standard evidenziata.",
    },
  ] as const;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(9,15,28,0.92))] p-6 lg:p-7">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Contract input
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white lg:text-3xl">
              Analizza un contratto in pochi secondi.
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              Incolla il testo completo. Riceverai un risk score, una
              classificazione per severita’ e note di negoziazione leggibili.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setText(sampleContract)}
            className="shrink-0 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
          >
            Carica demo
          </button>
        </div>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder="Incolla qui il contratto..."
          className="mt-6 h-[320px] w-full resize-none rounded-[1.5rem] border border-white/10 bg-[#050b14] px-5 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/40 lg:h-[420px]"
        />

        <div className="mt-5 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2">
            {complianceBadges.map((badge) => {
              const Icon = badge.icon;

              return (
                <div
                  key={badge.label}
                  className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-slate-200"
                >
                  <Icon size={14} className="text-emerald-300" />
                  <span>{badge.label}</span>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            disabled={isPending || text.trim().length < 80}
            onClick={analyzeContract}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#04101c] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
          >
            {isPending ? (
              <>
                <LoaderCircle size={16} className="animate-spin" />
                Analisi in corso
              </>
            ) : (
              <>
                Analizza contratto
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-[1.2rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </section>

      <section className="rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.95),rgba(11,23,40,0.96))] p-6 lg:p-7">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              Risk dashboard
            </p>
            <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white lg:text-3xl">
              {analysis ? "Analisi completata" : "In attesa di un contratto"}
            </h2>
          </div>
          {verdict ? (
            <span
              className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-medium ${verdict.badgeClass}`}
            >
              {verdict.label}
            </span>
          ) : null}
        </div>

        {isPending ? (
          <div className="mt-6 rounded-[1.6rem] border border-slate-700 bg-slate-950/40 p-6">
            <div className="flex items-center gap-3 text-emerald-300">
              <LoaderCircle size={18} className="animate-spin" />
              <span className="text-sm uppercase tracking-[0.22em]">
                Analisi in corso
              </span>
            </div>
            <div className="mt-5 space-y-3">
              {scanningSteps.map((step, index) => (
                <div
                  key={step}
                  className={`rounded-2xl border px-4 py-3 text-sm transition ${
                    index === scanIndex
                      ? "border-emerald-400/40 bg-emerald-400/10 text-white"
                      : "border-white/8 bg-white/[0.03] text-slate-400"
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>
        ) : analysis ? (
          <div className="mt-6 space-y-4">
            <div className="rounded-[1.6rem] border border-white/8 bg-white/5 p-5">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Risk Score
                  </p>
                  <div className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-white">
                    {analysis.riskScore}/100
                  </div>
                </div>
                <div className="text-sm text-slate-300">
                  {analysis.mode === "demo" ? "Modalita' demo" : "Analisi live"}
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-slate-200">
                {analysis.summary}
              </p>
            </div>

            <div className="space-y-4">
              {panels.map((panel) => (
                <section
                  key={panel.key}
                  className={`rounded-[1.5rem] border p-5 ${panel.tone}`}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {panel.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-200/80">
                        {panel.subtitle}
                      </p>
                    </div>
                    <span
                      className={`inline-flex self-start rounded-full px-3 py-1 text-xs font-medium ${panel.badge}`}
                    >
                      {panel.items.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-3">
                    {panel.items.length ? (
                      panel.items.map((clause, index) => (
                        <RiskClauseCard
                          key={`${panel.key}-${clause.title}-${index}`}
                          clause={clause}
                        />
                      ))
                    ) : (
                      <EmptyState text={panel.empty} />
                    )}
                  </div>
                </section>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
                <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400">
                  Obblighi nascosti
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-100">
                  {analysis.hiddenObligations.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-5">
                <h3 className="text-sm uppercase tracking-[0.22em] text-slate-400">
                  Mosse di negoziazione
                </h3>
                <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-100">
                  {analysis.negotiationMoves.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-3">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-slate-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-xs leading-6 text-slate-400">
              {analysis.disclaimer}
            </p>
          </div>
        ) : (
          <div className="mt-6 rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] p-6">
            <p className="text-sm uppercase tracking-[0.24em] text-slate-400">
              Cosa vedrai qui
            </p>
            <div className="mt-5 grid gap-3">
              {[
                "Risk Score sintetico",
                "Critical Risks, Attention Required e Standard / Safe",
                "Note di negoziazione e obblighi nascosti",
              ].map((item, index) => (
                <div
                  key={item}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-100"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      index === 0
                        ? "bg-emerald-400"
                        : index === 1
                          ? "bg-amber-300"
                          : "bg-red-400"
                    }`}
                  />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function RiskClauseCard({ clause }: { clause: Clause }) {
  const severity = severityCopy[clause.severity];
  const Icon = severity.icon;

  return (
    <article className="rounded-[1.3rem] border border-white/8 bg-slate-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-medium text-white">{clause.title}</h4>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            {clause.explanation}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1 text-[11px] font-medium ${severity.className}`}
        >
          <Icon size={14} />
          {severity.label}
        </span>
      </div>
      <div className="mt-3 rounded-[1rem] border border-white/6 bg-black/20 px-4 py-3 text-sm italic leading-6 text-slate-400">
        “{clause.excerpt}”
      </div>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-4 py-3 text-sm text-slate-300">
      {text}
    </div>
  );
}
