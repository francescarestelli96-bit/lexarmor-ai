"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Fingerprint,
  LayoutGrid,
  LockKeyhole,
  ShieldCheck,
  Users2,
  WalletCards,
} from "lucide-react";
import { ContractStudio } from "@/app/_components/contract-studio";

type TabId = "studio" | "pricing" | "security" | "clients";

const tabs: Array<{
  id: TabId;
  label: string;
  eyebrow: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description: string;
}> = [
  {
    id: "studio",
    label: "Studio",
    eyebrow: "Core product",
    icon: LayoutGrid,
    title: "Una scansione premium senza dispersione.",
    description:
      "Tutto il valore di LexArmor resta in una singola schermata operativa: input, risk score e lettura dei rischi.",
  },
  {
    id: "pricing",
    label: "Pricing",
    eyebrow: "Monetization",
    icon: CircleDollarSign,
    title: "Prezzi visibili senza allungare la landing.",
    description:
      "Il piano singolo e il piano agenzie vivono dentro lo stesso control center, così l’offerta è sempre chiara ma non dispersiva.",
  },
  {
    id: "security",
    label: "Shield",
    eyebrow: "Trust layer",
    icon: ShieldCheck,
    title: "Sicurezza e protezione al centro della UX.",
    description:
      "I segnali di fiducia devono stare vicini al prodotto, non persi in fondo a una landing lunga.",
  },
  {
    id: "clients",
    label: "Clients",
    eyebrow: "Market fit",
    icon: Users2,
    title: "Messaggi adattati ai buyer più probabili.",
    description:
      "Privati, agenzie e consulenti vedono subito come il prodotto si applica al loro scenario concreto.",
  },
];

const quickSignals = [
  "Risk Score immediato",
  "Critical, Attention, Safe",
  "Nessun layout dispersivo",
];

const pricingTiers = [
  {
    name: "Basic",
    price: "19€",
    frequency: "per analisi",
    description:
      "Per clienti privati che vogliono un controllo rapido ma autorevole prima della firma.",
    points: [
      "1 scansione premium",
      "Risk Score e tre macro-aree",
      "Suggerimenti di negoziazione",
      "Perfetto per affitti e servizi",
    ],
    icon: CircleDollarSign,
    accent: "border-slate-700 bg-slate-900/70",
    ctaClass: "bg-white text-slate-950 hover:bg-slate-200",
  },
  {
    name: "Pro",
    price: "49€",
    frequency: "al mese",
    description:
      "Pensato per agenzie e consulenti che analizzano contratti in modo continuativo.",
    points: [
      "Analisi illimitate",
      "Workflow più adatto ai team",
      "Ideale per agenzie immobiliari",
      "Più margine su un servizio ricorrente",
    ],
    icon: WalletCards,
    accent:
      "border-emerald-500/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.14),rgba(15,23,42,0.92))]",
    ctaClass: "bg-emerald-500 text-slate-950 hover:bg-emerald-400",
  },
];

const trustCards = [
  {
    title: "256-bit Encryption",
    body: "Trasmissione protetta tra browser e server per mantenere il flusso affidabile e professionale.",
    icon: LockKeyhole,
  },
  {
    title: "GDPR Ready",
    body: "Struttura progettata per un posizionamento privacy-first, utile anche in ottica enterprise.",
    icon: Fingerprint,
  },
  {
    title: "No Data Retention",
    body: "LexArmor non salva il testo inviato, così il messaggio di protezione resta semplice e forte.",
    icon: ShieldCheck,
  },
];

const clientCards = [
  {
    title: "Privati",
    body: "Per chi deve firmare un affitto o un servizio e vuole ridurre il rischio senza leggere tutto da solo.",
    icon: ShieldCheck,
  },
  {
    title: "Agenzie",
    body: "Per team immobiliari che vogliono un primo layer di controllo elegante prima di coinvolgere legale o cliente.",
    icon: Building2,
  },
  {
    title: "Consulenti",
    body: "Per professionisti che vogliono offrire una prima revisione vendibile, leggibile e ad alto margine.",
    icon: Users2,
  },
];

export function LexArmorControlCenter() {
  const [activeTab, setActiveTab] = useState<TabId>("studio");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];

  return (
    <main className="bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_18%),radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_22%),#020817] text-white lg:h-screen lg:overflow-hidden">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col px-3 py-3 lg:h-screen lg:min-h-0">
        <div className="flex flex-1 flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,8,23,0.96))] shadow-[0_30px_120px_rgba(0,0,0,0.35)] lg:min-h-0">
          <header className="border-b border-white/10 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-sm font-semibold text-slate-950">
                  LA
                </span>
                <div>
                  <p className="text-sm font-semibold tracking-[0.14em] text-white">
                    LexArmor
                  </p>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    Contract defense control center
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
                  No-scroll desktop UX
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                  Premium scan from 19€
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTab("studio")}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-200"
                >
                  Apri studio
                  <ArrowUpRight size={15} />
                </button>
              </div>
            </div>
          </header>

          <div className="grid flex-1 lg:min-h-0 lg:grid-cols-[340px_minmax(0,1fr)]">
            <aside className="border-b border-white/10 px-4 py-5 sm:px-6 lg:min-h-0 lg:border-b-0 lg:border-r lg:px-5">
              <div className="flex h-full flex-col">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                    {active.eyebrow}
                  </p>
                  <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-white">
                    Il tuo scudo legale istantaneo contro le trappole contrattuali.
                  </h1>
                  <p className="mt-4 text-sm leading-7 text-slate-300">
                    Tutto sta dentro un’unica interfaccia: menu chiaro, pannelli
                    dedicati e nessuna landing lunga che disperde attenzione.
                  </p>
                </div>

                <nav className="mt-6 grid gap-2">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const selected = tab.id === activeTab;

                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                          selected
                            ? "border-emerald-400/30 bg-emerald-400/10 text-white"
                            : "border-white/10 bg-white/[0.03] text-slate-300 hover:bg-white/[0.06]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${
                              selected ? "bg-emerald-400/20 text-emerald-200" : "bg-white/5 text-slate-300"
                            }`}
                          >
                            <Icon size={18} />
                          </span>
                          <div>
                            <div className="text-sm font-medium">{tab.label}</div>
                            <div className="text-xs uppercase tracking-[0.16em] text-slate-400">
                              {tab.eyebrow}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-6 rounded-[1.75rem] border border-white/10 bg-white/[0.04] p-5 lg:flex-1">
                  <h2 className="text-xl font-semibold text-white">
                    {active.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-slate-300">
                    {active.description}
                  </p>

                  <div className="mt-5 grid gap-3">
                    {quickSignals.map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100"
                      >
                        <CheckCircle2 size={16} className="text-emerald-300" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>

            <section className="min-h-0 px-4 py-5 sm:px-6 lg:px-5 lg:py-5">
              <div className="h-full lg:min-h-0">
                {activeTab === "studio" ? <ContractStudio compact /> : null}
                {activeTab === "pricing" ? <PricingBoard /> : null}
                {activeTab === "security" ? <SecurityBoard /> : null}
                {activeTab === "clients" ? <ClientsBoard /> : null}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}

function PricingBoard() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-2">
      {pricingTiers.map((tier) => {
        const Icon = tier.icon;

        return (
          <article
            key={tier.name}
            className={`flex h-full flex-col rounded-[2rem] border p-6 ${tier.accent}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {tier.name}
                </p>
                <div className="mt-4 flex items-end gap-2">
                  <span className="text-5xl font-semibold tracking-[-0.05em] text-white">
                    {tier.price}
                  </span>
                  <span className="pb-2 text-sm text-slate-400">
                    {tier.frequency}
                  </span>
                </div>
              </div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Icon size={22} />
              </div>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-300">
              {tier.description}
            </p>

            <ul className="mt-6 grid gap-3">
              {tier.points.map((point) => (
                <li key={point} className="flex gap-3 text-sm text-slate-100">
                  <CheckCircle2 size={17} className="mt-0.5 text-emerald-300" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <button
              type="button"
              className={`mt-auto inline-flex items-center gap-2 self-start rounded-full px-5 py-3 text-sm font-semibold transition ${tier.ctaClass}`}
            >
              Attiva offerta
              <ArrowUpRight size={15} />
            </button>
          </article>
        );
      })}
    </div>
  );
}

function SecurityBoard() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="grid gap-4">
        {trustCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5"
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

      <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(16,185,129,0.10),rgba(15,23,42,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-emerald-200">
          Trust by design
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          La fiducia deve stare accanto al prodotto.
        </h3>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Invece di finire in basso in una landing lunga, i segnali di sicurezza
          sono integrati nella shell del prodotto e nello studio di analisi.
        </p>

        <div className="mt-6 grid gap-3">
          {[
            "Messaggio privacy leggibile in 3 secondi",
            "Badge di protezione vicino all’upload",
            "Tono visuale da software affidabile, non da tool amatoriale",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-slate-100"
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ClientsBoard() {
  return (
    <div className="grid h-full gap-4 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="grid gap-4">
        {clientCards.map((card) => {
          const Icon = card.icon;

          return (
            <article
              key={card.title}
              className="rounded-[1.8rem] border border-white/10 bg-white/[0.04] p-5"
            >
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-slate-100">
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

      <div className="rounded-[2rem] border border-white/10 bg-slate-900/70 p-6">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
          Go-to-market fit
        </p>
        <h3 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">
          Stesso prodotto, tre letture commerciali chiare.
        </h3>
        <div className="mt-6 grid gap-3">
          {[
            "Privati: paura di firmare qualcosa di sbagliato",
            "Agenzie: velocizzare il primo screening",
            "Consulenti: impacchettare una revisione premium",
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
  );
}
