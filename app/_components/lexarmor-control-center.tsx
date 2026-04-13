"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  Users2,
  WalletCards,
} from "lucide-react";
import { ContractStudio } from "@/app/_components/contract-studio";

type TabId = "analysis" | "plans" | "security" | "segments";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "analysis", label: "Analysis" },
  { id: "plans", label: "Plans" },
  { id: "security", label: "Security" },
  { id: "segments", label: "Segments" },
];

const planCards = [
  {
    name: "Basic",
    price: "19€",
    frequency: "per analisi",
    description: "Per revisioni singole prima della firma.",
    points: [
      "1 scansione",
      "Risk Score",
      "Classificazione per severita'",
      "Suggerimenti di negoziazione",
    ],
    icon: CircleDollarSign,
    tone: "border-slate-700 bg-slate-900/70",
    buttonClass: "bg-white text-slate-950 hover:bg-slate-200",
  },
  {
    name: "Pro",
    price: "49€",
    frequency: "al mese",
    description: "Per team che analizzano contratti in modo continuativo.",
    points: [
      "Analisi illimitate",
      "Adatto a consulenti e agenzie",
      "Maggiore continuita' operativa",
      "Workflow piu' adatto a volumi ricorrenti",
    ],
    icon: WalletCards,
    tone:
      "border-emerald-500/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.92))]",
    buttonClass: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
  },
];

const securityCards = [
  {
    title: "256-bit Encryption",
    body: "Trasmissione protetta tra browser e server durante l'intero flusso di analisi.",
    icon: LockKeyhole,
  },
  {
    title: "GDPR Ready",
    body: "Architettura compatibile con una comunicazione privacy-first verso clienti e partner.",
    icon: Fingerprint,
  },
  {
    title: "No Data Retention",
    body: "Il testo caricato non viene conservato dalla piattaforma dopo l'elaborazione.",
    icon: ShieldCheck,
  },
];

const segmentCards = [
  {
    title: "Privati",
    body: "Per chi deve firmare un affitto o un contratto di servizi e vuole una lettura del rischio prima della firma.",
    icon: ShieldCheck,
  },
  {
    title: "Agenzie",
    body: "Per team immobiliari che vogliono un primo livello di screening prima del passaggio a cliente o legale.",
    icon: Building2,
  },
  {
    title: "Consulenti",
    body: "Per professionisti che vogliono offrire una prima revisione sintetica, leggibile e presentabile.",
    icon: Users2,
  },
];

export function LexArmorControlCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("analysis");

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.06),transparent_18%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.05),transparent_22%),#020817] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-5 lg:px-6 lg:py-6">
        <header className="rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.96))] px-5 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.28)] lg:px-7">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
                LA
              </span>
              <div>
                <div className="text-lg font-semibold tracking-[0.08em] text-white">
                  LexArmor
                </div>
                <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Contract risk analysis
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                Encrypted transmission
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                No data retention
              </span>
              <button
                type="button"
                onClick={() => setActiveTab("analysis")}
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
              >
                Open analysis
                <ArrowUpRight size={15} />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const selected = tab.id === activeTab;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? "bg-white text-slate-950"
                      : "border border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </header>

        <section className="mt-5 rounded-[1.9rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,8,23,0.96))] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.22)] lg:p-7">
          {activeTab === "analysis" ? <ContractStudio /> : null}
          {activeTab === "plans" ? <PlansBoard /> : null}
          {activeTab === "security" ? <SecurityBoard /> : null}
          {activeTab === "segments" ? <SegmentsBoard /> : null}
        </section>
      </div>
    </main>
  );
}

function PlansBoard() {
  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Commercial plans
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Due piani, descritti in modo semplice.
        </h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        {planCards.map((plan) => {
          const Icon = plan.icon;

          return (
            <article
              key={plan.name}
              className={`flex min-h-[420px] flex-col rounded-[1.8rem] border p-7 ${plan.tone}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    {plan.name}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-5xl font-semibold tracking-[-0.05em] text-white">
                      {plan.price}
                    </span>
                    <span className="pb-2 text-sm text-slate-400">
                      {plan.frequency}
                    </span>
                  </div>
                </div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                  <Icon size={22} />
                </div>
              </div>

              <p className="mt-5 text-sm leading-7 text-slate-300">
                {plan.description}
              </p>

              <ul className="mt-6 grid gap-3">
                {plan.points.map((point) => (
                  <li key={point} className="flex gap-3 text-sm text-slate-100">
                    <CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                className={`mt-auto inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold transition ${plan.buttonClass}`}
              >
                Select plan
                <ArrowUpRight size={15} />
              </button>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function SecurityBoard() {
  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Security posture
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Protezione leggibile, senza rumore inutile.
        </h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          {securityCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {card.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {card.body}
                </p>
              </article>
            );
          })}
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Operational trust
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Informazioni chiare vicino al flusso di lavoro.
          </h3>
          <div className="mt-6 grid gap-3">
            {[
              "Privacy comunicata vicino al punto di upload",
              "Badge di protezione integrati nell'interfaccia",
              "Lessico sobrio e coerente con un posizionamento premium",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SegmentsBoard() {
  return (
    <div className="space-y-4">
      <div className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Use cases
        </p>
        <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Tre segmenti, tre contesti chiari.
        </h2>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-5">
          {segmentCards.map((segment) => {
            const Icon = segment.icon;

            return (
              <article
                key={segment.title}
                className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-6"
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-slate-100">
                  <Icon size={20} />
                </div>
                <h3 className="mt-4 text-2xl font-semibold text-white">
                  {segment.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {segment.body}
                </p>
              </article>
            );
          })}
        </div>

        <div className="rounded-[1.8rem] border border-white/10 bg-slate-900/70 p-6">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Segment focus
          </p>
          <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
            Ogni profilo vede subito il proprio caso d’uso.
          </h3>
          <div className="mt-6 grid gap-3">
            {[
              "Privati: riduzione del rischio prima della firma",
              "Agenzie: accelerazione del primo screening",
              "Consulenti: revisione preliminare piu' presentabile",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
