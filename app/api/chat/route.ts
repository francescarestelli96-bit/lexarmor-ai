import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ACCESS_COOKIE_NAME,
  isAccessActive,
  readAccessToken,
} from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";
import { syncStripeBackedAccess } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatRole = "user" | "assistant";
type ChatMessage = { role: ChatRole; content: string };

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

type ChatRequestBody = {
  messages?: ChatMessage[];
  contractText?: string;
  analysis?: AnalysisContext;
};

const MAX_CONTRACT_CHARS = 80_000;
const MAX_HISTORY = 24;
const MAX_USER_MESSAGE_CHARS = 4_000;

const openaiApiKey = readConfiguredEnv("OPENAI_API_KEY");
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

const CHAT_SYSTEM_PROMPT = `Sei LexArmor AI, copilota legale per documenti italiani. L'utente ha già caricato un documento e ha visto il report di analisi. Ora ti fa domande di follow-up: vuole capire dettagli, ricevere consigli operativi, ottenere bozze di controproposte o lettere.

# Contesto operativo
- Hai accesso al testo integrale del documento e al JSON dell'analisi precedente.
- Le tue risposte devono basarsi su quel materiale: cita la clausola esatta, il numero, le parti, il punto del testo che stai discutendo.
- Quando l'utente chiede una bozza (controproposta, email, lettera), produci il testo finito, pronto da copiare. Tono professionale italiano.

# Stile
- Rispondi in italiano, professionale e asciutto. Niente preamboli inutili. Niente emoji.
- Vai al punto: l'utente è probabilmente un professionista o ha già letto il report.
- Per risposte tecniche usa elenchi puntati e grassetto in markdown sobrio. Niente headers grandi.
- Per drafting: testo finito, formule italiane standard ("Egregio…", "Con la presente…", "Tutto ciò premesso…").

# Regole anti-allucinazione
- Non inventare clausole, parti o fatti che non sono nel documento.
- Quando citi articoli di codice, sii prudente: indica solo quelli pertinenti che conosci con certezza (es. art. 1382 c.c. per la penale, art. 2125 c.c. per non concorrenza nel lavoro).
- Se non hai dati sufficienti per rispondere, dillo chiaramente invece di tirare a indovinare.

# Limiti
- Non fornisci pareri legali vincolanti né garanzie sull'esito di una causa.
- Per scelte critiche (impugnazioni, contenzioso) suggerisci consulenza con un avvocato.
- Se la richiesta è eticamente problematica (occultare prove, frodare), rifiuta brevemente.`;

function buildContextBlock(
  contractText: string,
  analysis: AnalysisContext | undefined,
) {
  const truncatedContract =
    contractText.length > MAX_CONTRACT_CHARS
      ? contractText.slice(0, MAX_CONTRACT_CHARS) +
        `\n\n[testo troncato — originale ${contractText.length.toLocaleString("it-IT")} caratteri]`
      : contractText;

  const analysisJson = analysis
    ? JSON.stringify(
        {
          contractType: analysis.contractType,
          parties: analysis.parties,
          summary: analysis.summary,
          verdict: analysis.verdict,
          riskScore: analysis.riskScore,
          clauses: analysis.clauses,
          hiddenObligations: analysis.hiddenObligations,
          negotiationMoves: analysis.negotiationMoves,
        },
        null,
        2,
      )
    : "(nessuna analisi precedente disponibile)";

  return `# Documento caricato dall'utente
<documento>
${truncatedContract}
</documento>

# Report di analisi precedente (JSON)
<analisi>
${analysisJson}
</analisi>`;
}

export async function POST(request: Request) {
  // ----- Access check -----
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
  const currentAccess = readAccessToken(rawToken);
  const synced = await syncStripeBackedAccess(currentAccess);

  if (!isAccessActive(synced.access)) {
    return NextResponse.json(
      {
        error:
          "Per chattare con LexArmor serve un accesso attivo. Apri il pannello Piani.",
        code: "payment_required",
      },
      { status: 402 },
    );
  }

  if (!openai) {
    return NextResponse.json(
      {
        error:
          "Chat non disponibile: OPENAI_API_KEY non configurata. Contatta l'amministratore.",
      },
      { status: 503 },
    );
  }

  // ----- Validate body -----
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "Body JSON non valido." }, { status: 400 });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const contractText = body.contractText?.trim() ?? "";

  if (messages.length === 0) {
    return NextResponse.json(
      { error: "Almeno un messaggio richiesto." },
      { status: 400 },
    );
  }
  if (contractText.length < 40) {
    return NextResponse.json(
      { error: "Manca il testo del documento di contesto." },
      { status: 400 },
    );
  }

  // Sanitize messages: trim, cap length, keep only user/assistant.
  const cleaned: ChatMessage[] = messages
    .filter(
      (m): m is ChatMessage =>
        m && (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, MAX_USER_MESSAGE_CHARS).trim(),
    }))
    .filter((m) => m.content.length > 0)
    .slice(-MAX_HISTORY);

  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") {
    return NextResponse.json(
      { error: "L'ultimo messaggio deve essere dell'utente." },
      { status: 400 },
    );
  }

  const contextBlock = buildContextBlock(contractText, body.analysis);
  const systemContent = `${CHAT_SYSTEM_PROMPT}\n\n${contextBlock}`;

  // ----- Call OpenAI with streaming -----
  let stream: AsyncIterable<unknown>;
  try {
    stream = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      stream: true,
      store: false,
      temperature: 0.4,
      messages: [
        { role: "system", content: systemContent },
        ...cleaned.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
  } catch (err) {
    console.error(
      "Chat route OpenAI error",
      err instanceof Error ? err.message : "unknown",
    );
    return NextResponse.json(
      { error: "Il modello non è raggiungibile in questo momento. Riprova tra poco." },
      { status: 502 },
    );
  }

  // ----- Stream response back as plain text chunks -----
  const encoder = new TextEncoder();
  const responseStream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream as AsyncIterable<{
          choices?: Array<{ delta?: { content?: string | null } }>;
        }>) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            controller.enqueue(encoder.encode(delta));
          }
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "stream interrotto";
        controller.enqueue(encoder.encode(`\n\n[errore: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
