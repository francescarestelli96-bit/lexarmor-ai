import {
  ArrowUpRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  CircleDollarSign,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { ContractStudio } from "@/app/_components/contract-studio";

const featureRows = [
  "Clausole vessatorie e penali nascoste",
  "Punti da rinegoziare prima della firma",
  "Clausole standard e conformi",
];

const audiences = [
  {
    title: "Privati",
    description:
      "Per chi sta per firmare un affitto, un contratto di servizi o un incarico e vuole ridurre il rischio prima di impegnarsi.",
    icon: ShieldCheck,
  },
  {
    title: "Agenzie",
    description:
      "Per team immobiliari e property manager che vogliono una pre-verifica autorevole prima dell'invio al cliente.",
    icon: Building2,
  },
  {
    title: "Consulenti",
    description:
      "Per professionisti che vogliono una prima scansione premium, leggibile e presentabile al cliente finale.",
    icon: BadgeCheck,
  },
];

const trustBadges = [
  {
    label: "256-bit Encryption",
    description: "Trasmissione protetta tra browser e server",
    icon: LockKeyhole,
  },
  {
    label: "GDPR Ready",
    description: "Struttura progettata per workflow privacy-first",
    icon: Fingerprint,
  },
  {
    label: "No Data Retention",
    description: "La piattaforma non salva il contratto inviato",
    icon: ShieldCheck,
  },
];

const pricingTiers = [
  {
    name: "Basic",
    price: "19€",
    frequency: "per analisi",
    description:
      "Per clienti privati che vogliono una scansione rapida ma autorevole prima della firma.",
    points: [
      "1 analisi premium",
      "Risk Score immediato",
      "Critical risks, attention points e safe clauses",
      "Suggerimenti di negoziazione",
    ],
    icon: CircleDollarSign,
    accent: "border-slate-200 bg-white",
    cta: "Sblocca analisi singola",
    ctaClass: "bg-[#0f172a] text-white hover:bg-slate-800",
  },
  {
    name: "Pro",
    price: "49€",
    frequency: "al mese",
    description:
      "Pensato per agenzie e consulenti che analizzano contratti in modo continuativo.",
    points: [
      "Analisi illimitate",
      "Workflow continuo per team",
      "Priority access alle nuove feature",
      "Ideale per agenzie immobiliari",
    ],
    icon: WalletCards,
    accent:
      "border-emerald-500/30 bg-[linear-gradient(180deg,#ffffff_0%,#f0fdf4_100%)] shadow-[0_24px_80px_rgba(16,185,129,0.12)]",
    cta: "Attiva piano Pro",
    ctaClass: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
];

export default function Home() {
  return (
    <main className="bg-[#f8fafc] text-[#0f172a]">
      <section className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#0f172a] text-sm font-semibold text-white">
              LA
            </span>
            <div>
              <p className="text-sm font-semibold tracking-[0.12em] text-[#0f172a]">
                LexArmor
              </p>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                Enterprise-grade contract screening
              </p>
            </div>
          </div>
          <a
            href="#studio"
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-[#0f172a] transition hover:border-slate-400"
          >
            Avvia una scansione
            <ArrowUpRight size={15} />
          </a>
        </div>
      </section>

      <section className="relative overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(15,23,42,0.08),transparent_22%),linear-gradient(180deg,#ffffff_0%,#eff6ff_42%,#f8fafc_100%)]">
        <div className="mx-auto grid max-w-7xl gap-14 px-4 py-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:px-8 lg:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-slate-600 shadow-sm">
              <ShieldCheck size={14} className="text-emerald-600" />
              Trusted contract defense
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-semibold tracking-[-0.06em] text-[#0f172a] sm:text-6xl lg:text-7xl">
              Il tuo scudo legale istantaneo contro le trappole contrattuali.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Trasmissione protetta. Nessun contratto viene salvato dalla
              piattaforma. LexArmor evidenzia clausole vessatorie, ambiguità da
              rinegoziare e sezioni standard in una dashboard leggibile e
              autorevole.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#studio"
                className="inline-flex items-center gap-2 rounded-full bg-[#0f172a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Analizza ora
                <ArrowUpRight size={16} />
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-[#0f172a] transition hover:border-slate-400"
              >
                Vedi pricing
              </a>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <div
                    key={badge.label}
                    className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                      <Icon size={18} />
                    </div>
                    <div className="mt-4 text-sm font-semibold text-[#0f172a]">
                      {badge.label}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {badge.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.08)] lg:p-7">
            <div className="rounded-[1.7rem] border border-slate-900/95 bg-[#0f172a] p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-300">
                    Enterprise snapshot
                  </p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
                    Risk Score Dashboard
                  </h2>
                </div>
                <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">
                  Premium review
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {featureRows.map((row, index) => (
                  <div
                    key={row}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm text-slate-100">{row}</span>
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        index === 0
                          ? "bg-red-400"
                          : index === 1
                            ? "bg-amber-300"
                            : "bg-emerald-400"
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  Designed for premium pricing
                </p>
                <p className="mt-3 text-lg font-medium text-[#0f172a]">
                  Autorità visiva, segnali di sicurezza e chiarezza sul rischio
                  aumentano il valore percepito della scansione.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50/60 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                  Monetization ready
                </p>
                <p className="mt-3 text-lg font-medium text-[#0f172a]">
                  Basic per clienti finali, Pro per agenzie che vogliono
                  analisi continue senza attrito operativo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#f8fafc]">
        <div className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
          <div className="grid gap-5 md:grid-cols-3">
            {audiences.map((item) => {
              const Icon = item.icon;

              return (
                <article
                  key={item.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <Icon size={20} />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-[#0f172a]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {item.description}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="studio" className="bg-[#0f172a]">
        <div className="mx-auto max-w-7xl px-4 py-18 sm:px-6 lg:px-8">
          <div className="mb-8 max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
              Live contract scan
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-white">
              Una dashboard che fa sembrare la revisione un servizio premium,
              non una textarea con output.
            </h2>
          </div>
          <ContractStudio />
        </div>
      </section>

      <section id="pricing" className="bg-white">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
              Pricing readiness
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-[#0f172a]">
              Prezzi pronti per una conversione premium.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              Ho predisposto una struttura chiara per Stripe con un’offerta
              singola per utenti finali e un piano mensile per agenzie.
            </p>
          </div>

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            {pricingTiers.map((tier) => {
              const Icon = tier.icon;

              return (
                <article
                  key={tier.name}
                  className={`rounded-[2rem] border p-7 ${tier.accent}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {tier.name}
                      </p>
                      <div className="mt-4 flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.05em] text-[#0f172a]">
                          {tier.price}
                        </span>
                        <span className="pb-2 text-sm text-slate-500">
                          {tier.frequency}
                        </span>
                      </div>
                    </div>
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <Icon size={22} />
                    </div>
                  </div>

                  <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                    {tier.description}
                  </p>

                  <ul className="mt-6 space-y-3">
                    {tier.points.map((point) => (
                      <li key={point} className="flex gap-3 text-sm text-slate-700">
                        <CheckCircle2
                          size={17}
                          className="mt-0.5 text-emerald-600"
                        />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className={`mt-8 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition ${tier.ctaClass}`}
                  >
                    {tier.cta}
                    <ArrowUpRight size={16} />
                  </button>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-lg font-semibold text-[#0f172a]">LexArmor</div>
              <p className="mt-2 text-sm text-slate-600">
                Contract screening con segnali di sicurezza, autorità visiva e
                pricing pronto per il deploy.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {trustBadges.map((badge) => {
                const Icon = badge.icon;

                return (
                  <div
                    key={badge.label}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
                  >
                    <Icon size={16} className="text-emerald-600" />
                    <span>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
