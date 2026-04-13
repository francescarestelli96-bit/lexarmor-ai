"use client";

import { startTransition, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Fingerprint,
  LoaderCircle,
  LockKeyhole,
  ScanSearch,
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
    label: "Critical Risk",
    icon: AlertTriangle,
    className: "text-red-300",
  },
  medium: {
    label: "Attention Required",
    icon: Shield,
    className: "text-amber-200",
  },
  safe: {
    label: "Standard / Safe",
    icon: CheckCircle2,
    className: "text-emerald-200",
  },
} as const;

const scanningSteps = [
  "Scanning structure and clause density",
  "Checking penalties, obligations and unilateral terms",
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

export function ContractStudio({ compact = false }: { compact?: boolean }) {
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
    }, 850);

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

  const categoryCards = [
    {
      key: "critical",
      title: "Critical Risks",
      subtitle: "Clausole vessatorie e penali nascoste.",
      tone: "border-red-400/15 bg-red-400/8",
      badge: "bg-red-400/15 text-red-200",
      items: groupedClauses.critical,
    },
    {
      key: "medium",
      title: "Attention Required",
      subtitle: "Punti da rinegoziare o ambiguità.",
      tone: "border-amber-300/15 bg-amber-300/8",
      badge: "bg-amber-300/15 text-amber-100",
      items: groupedClauses.medium,
    },
    {
      key: "safe",
      title: "Standard / Safe",
      subtitle: "Clausole conformi o non anomale.",
      tone: "border-emerald-400/15 bg-emerald-400/8",
      badge: "bg-emerald-400/15 text-emerald-100",
      items: groupedClauses.safe,
    },
  ] as const;

  return (
    <section
      className={`rounded-[2rem] border border-slate-800 bg-[linear-gradient(180deg,#0f172a_0%,#111c34_100%)] shadow-[0_30px_120px_rgba(0,0,0,0.35)] ${
        compact ? "flex h-full min-h-0 flex-col p-5 lg:p-6" : "p-5 md:p-8"
      }`}
    >
      <div
        className={`grid gap-6 ${
          compact
            ? "min-h-0 flex-1 xl:grid-cols-[0.95fr_1.05fr]"
            : "lg:grid-cols-[1.08fr_0.92fr]"
        }`}
      >
        <div className={`space-y-5 ${compact ? "min-h-0" : ""}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-slate-200">
              <ScanSearch size={14} className="text-emerald-300" />
              Enterprise contract scan
            </span>
            <span className="text-xs uppercase tracking-[0.24em] text-slate-400">
              affitti, servizi, consulenze, collaborazioni
            </span>
          </div>

          <div className="space-y-3">
            <h2
              className={`max-w-xl font-semibold tracking-[-0.04em] text-white ${
                compact ? "text-2xl xl:text-3xl" : "text-3xl md:text-4xl"
              }`}
            >
              Incolla il contratto e ricevi una dashboard di rischio credibile.
            </h2>
            <p
              className={`max-w-2xl text-slate-300 ${
                compact ? "text-sm leading-6" : "text-base leading-7"
              }`}
            >
              LexArmor organizza l’analisi in segnali rossi, gialli e verdi,
              con un Risk Score immediato e note da usare in trattativa.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Output
              </div>
              <div className="mt-2 text-lg text-white">Risk Score</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Review
              </div>
              <div className="mt-2 text-lg text-white">Macro-aree</div>
            </div>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/5 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-slate-400">
                Security
              </div>
              <div className="mt-2 text-lg text-white">Privacy-first</div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-white/10 bg-[#0b1728] p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <span className="text-sm uppercase tracking-[0.2em] text-slate-400">
                Testo del contratto
              </span>
              <button
                type="button"
                onClick={() => setText(sampleContract)}
                className="rounded-full border border-white/10 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-emerald-400/50 hover:text-white"
              >
                Carica demo
              </button>
            </div>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Incolla qui il contratto. Più testo dai, più l'analisi sarà utile."
              className={`w-full resize-none rounded-[1.4rem] border border-white/8 bg-[#050b14] px-5 py-4 text-sm leading-7 text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-emerald-400/50 ${
                compact ? "h-40 xl:h-48" : "h-72"
              }`}
            />

            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
              <button
                type="button"
                disabled={isPending || text.trim().length < 80}
                onClick={analyzeContract}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-[#04101c] transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-300"
              >
                {isPending ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" />
                    Scanning...
                  </>
                ) : (
                  <>
                    Analizza contratto
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
              <p className="text-sm text-slate-400">
                Minimo consigliato: 80 caratteri. Output progettato per essere
                chiaro anche per chi non è legale.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {complianceBadges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <div
                    key={badge.label}
                    className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-200"
                  >
                    <Icon size={16} className="text-emerald-300" />
                    <span>{badge.label}</span>
                  </div>
                );
              })}
            </div>

            {error ? (
              <div className="mt-4 rounded-[1.2rem] border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
                {error}
              </div>
            ) : null}
          </div>
        </div>

        <div
          className={`rounded-[1.8rem] border border-white/10 bg-[linear-gradient(180deg,rgba(8,15,29,0.95),rgba(11,23,40,0.96))] ${
            compact ? "flex min-h-0 flex-col p-5" : "p-5 md:p-6"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.26em] text-slate-400">
                Risk intelligence
              </p>
              <h3 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-white">
                {analysis ? "Risk Score Dashboard" : "In attesa del contratto"}
              </h3>
            </div>
            {verdict ? (
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${verdict.badgeClass}`}
              >
                {verdict.label}
              </span>
            ) : null}
          </div>

          {isPending ? (
            <div className="mt-8 rounded-[1.6rem] border border-slate-700 bg-slate-950/40 p-6">
              <div className="flex items-center gap-3 text-emerald-300">
                <LoaderCircle size={18} className="animate-spin" />
                <span className="text-sm uppercase tracking-[0.22em]">
                  Scanning in progress
                </span>
              </div>
              <div className="mt-6 space-y-3">
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
            <div className={`mt-6 space-y-5 ${compact ? "min-h-0 overflow-auto pr-1" : ""}`}>
              <div className="rounded-[1.6rem] border border-white/8 bg-white/5 p-5">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                      Risk Score
                    </p>
                    <div className="mt-2 text-5xl font-semibold tracking-[-0.05em] text-white">
                      {analysis.riskScore}/100
                    </div>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    {analysis.mode === "demo" ? "Modalità demo" : "Analisi live"}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-200">
                  {analysis.summary}
                </p>
              </div>

              <div className={`grid gap-4 ${compact ? "xl:grid-cols-3" : ""}`}>
                {categoryCards.map((category) => (
                  <section
                    key={category.key}
                    className={`rounded-[1.5rem] border p-5 ${category.tone}`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-semibold text-white">
                          {category.title}
                        </h4>
                        <p className="mt-1 text-sm text-slate-200/80">
                          {category.subtitle}
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${category.badge}`}
                      >
                        {category.items.length}
                      </span>
                    </div>
                    <div className="mt-4 space-y-3">
                      {category.items.length ? (
                        category.items
                          .slice(0, compact ? 1 : category.items.length)
                          .map((clause, index) => (
                            <RiskClauseCard
                              key={`${category.key}-${clause.title}-${index}`}
                              clause={clause}
                              compact={compact}
                            />
                          ))
                      ) : (
                        <EmptyState
                          text={
                            category.key === "critical"
                              ? "Nessuna criticità forte individuata."
                              : category.key === "medium"
                                ? "Nessuna area gialla rilevante."
                                : "Nessuna clausola standard evidenziata."
                          }
                        />
                      )}
                    </div>
                  </section>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
                  <h4 className="text-sm uppercase tracking-[0.22em] text-slate-400">
                    Obblighi nascosti
                  </h4>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-100">
                    {analysis.hiddenObligations
                      .slice(0, compact ? 3 : analysis.hiddenObligations.length)
                      .map((item, index) => (
                      <li key={`${item}-${index}`} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-[1.5rem] border border-white/8 bg-white/5 p-4">
                  <h4 className="text-sm uppercase tracking-[0.22em] text-slate-400">
                    Mosse di negoziazione
                  </h4>
                  <ul className="mt-3 space-y-3 text-sm leading-7 text-slate-100">
                    {analysis.negotiationMoves
                      .slice(0, compact ? 3 : analysis.negotiationMoves.length)
                      .map((item, index) => (
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
            <div className="mt-8 rounded-[1.6rem] border border-dashed border-white/12 bg-white/[0.03] p-6">
              <p className="text-sm uppercase tracking-[0.26em] text-slate-400">
                Cosa vedrai qui
              </p>
              <ul className="mt-4 space-y-4 text-sm leading-7 text-slate-200">
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-red-400" />
                  Critical Risks con clausole potenzialmente vessatorie.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-amber-300" />
                  Attention Required per punti da rinegoziare o chiarire.
                </li>
                <li className="flex gap-3">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Standard / Safe per sezioni non anomale.
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RiskClauseCard({
  clause,
  compact = false,
}: {
  clause: Clause;
  compact?: boolean;
}) {
  const severity = severityCopy[clause.severity];
  const Icon = severity.icon;

  return (
    <article className="rounded-[1.3rem] border border-white/8 bg-slate-950/30 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h5 className="text-base font-medium text-white">{clause.title}</h5>
          <p
            className={`mt-2 text-sm text-slate-300 ${
              compact ? "leading-6" : "leading-7"
            }`}
          >
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
      <div
        className={`mt-3 rounded-[1rem] border border-white/6 bg-black/20 px-4 py-3 text-sm italic text-slate-400 ${
          compact ? "leading-6" : ""
        }`}
      >
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
