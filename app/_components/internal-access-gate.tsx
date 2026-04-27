"use client";

import Link from "next/link";
import { useState } from "react";

type AccessState = {
  hasAccess: boolean;
  plan: "basic" | "pro" | null;
  remainingScans: number | null;
  expiresAt: string | null;
  label: string | null;
  isAdmin: boolean;
  source: "checkout" | "admin" | null;
};

export function InternalAccessGate() {
  const [key, setKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [access, setAccess] = useState<AccessState | null>(null);

  async function activate() {
    setPending(true);
    setError("");

    try {
      const response = await fetch("/api/admin/access", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ key }),
      });

      const data = (await response.json()) as {
        error?: string;
        access?: AccessState;
      };

      if (!response.ok || !data.access) {
        throw new Error(data.error || "Accesso interno non disponibile.");
      }

      setAccess(data.access);
      setKey("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Accesso interno non disponibile."
      );
    } finally {
      setPending(false);
    }
  }

  async function clear() {
    setPending(true);
    setError("");

    try {
      await fetch("/api/admin/access", {
        method: "DELETE",
      });

      setAccess(null);
    } catch {
      setError("Non sono riuscito a disattivare l'accesso interno.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_32%),linear-gradient(180deg,_#09111f_0%,_#060b14_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-white/10 bg-slate-950/80 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur">
        <p className="text-xs uppercase tracking-[0.24em] text-emerald-300/80">
          Accesso interno
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
          Ingresso admin nascosto
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Questa pagina non è collegata dal sito pubblico. Serve solo ad
          attivare il tuo accesso interno per usare LexArmor senza checkout.
        </p>

        <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            Stato
          </p>
          <p className="mt-3 text-lg font-semibold">
            {access?.isAdmin ? "Accesso admin attivo" : "Nessun accesso admin attivo"}
          </p>
          <p className="mt-2 text-sm text-slate-300">
            {access?.isAdmin
              ? "Questo browser può usare direttamente il workspace."
              : "Inserisci la chiave interna per attivare l'accesso su questo browser."}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-3">
          <input
            type="password"
            value={key}
            onChange={(event) => setKey(event.target.value)}
            placeholder="Inserisci la chiave admin"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-emerald-400/40"
          />
          <button
            type="button"
            onClick={() => void activate()}
            disabled={pending || !key.trim()}
            className="rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Attivazione..." : "Attiva accesso admin"}
          </button>
        </div>

        {access?.isAdmin ? (
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/?tab=analysis"
              className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-white/[0.1]"
            >
              Vai al workspace
            </Link>
            <button
              type="button"
              onClick={() => void clear()}
              disabled={pending}
              className="rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Disattiva accesso admin
            </button>
          </div>
        ) : null}

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-3 text-sm text-red-100">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
