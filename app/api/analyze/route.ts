import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ACCESS_COOKIE_NAME,
  consumeAccess,
  createAccessToken,
  getCookieOptions,
  isAccessActive,
  readAccessToken,
  toClientAccessState,
} from "@/lib/access";

type ClauseSeverity = "critical" | "medium" | "safe";
type Verdict = "critical" | "review" | "safe";

type AnalysisModelPayload = {
  contractType: string;
  parties: string[];
  summary: string;
  verdict: Verdict;
  riskScore: number;
  clauses: Array<{
    title: string;
    severity: ClauseSeverity;
    explanation: string;
    excerpt: string;
  }>;
  hiddenObligations: string[];
  negotiationMoves: string[];
  disclaimer: string;
};

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

function normalizeJson(raw: string) {
  return raw
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "");
}

function isClauseSeverity(value: unknown): value is ClauseSeverity {
  return value === "critical" || value === "medium" || value === "safe";
}

function isVerdict(value: unknown): value is Verdict {
  return value === "critical" || value === "review" || value === "safe";
}

function sanitizePayload(payload: unknown): AnalysisModelPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Formato analisi non valido.");
  }

  const data = payload as Partial<AnalysisModelPayload>;

  if (
    typeof data.contractType !== "string" ||
    !Array.isArray(data.parties) ||
    typeof data.summary !== "string" ||
    !isVerdict(data.verdict) ||
    typeof data.riskScore !== "number" ||
    !Array.isArray(data.clauses) ||
    !Array.isArray(data.hiddenObligations) ||
    !Array.isArray(data.negotiationMoves) ||
    typeof data.disclaimer !== "string"
  ) {
    throw new Error("Campi analisi incompleti.");
  }

  return {
    contractType: data.contractType.trim(),
    parties: data.parties
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    summary: data.summary.trim(),
    verdict: data.verdict,
    riskScore: Math.max(0, Math.min(100, Math.round(data.riskScore))),
    clauses: data.clauses.slice(0, 4).map((clause) => {
      const candidate = clause as AnalysisModelPayload["clauses"][number];

      if (
        !candidate ||
        typeof candidate.title !== "string" ||
        !isClauseSeverity(candidate.severity) ||
        typeof candidate.explanation !== "string" ||
        typeof candidate.excerpt !== "string"
      ) {
        throw new Error("Clausola non valida.");
      }

      return {
        title: candidate.title.trim(),
        severity: candidate.severity,
        explanation: candidate.explanation.trim(),
        excerpt: candidate.excerpt.trim(),
      };
    }),
    hiddenObligations: data.hiddenObligations
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    negotiationMoves: data.negotiationMoves
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 4),
    disclaimer: data.disclaimer.trim(),
  };
}

function buildPrompt(contractText: string) {
  return `
Analizza il seguente documento legale in italiano semplice. Non fare premesse inutili.

Restituisci SOLO JSON valido con questa shape:
{
  "contractType": "string",
  "parties": ["string"],
  "summary": "string",
  "verdict": "critical" | "review" | "safe",
  "riskScore": number,
  "clauses": [
    {
      "title": "string",
      "severity": "critical" | "medium" | "safe",
      "explanation": "string",
      "excerpt": "string"
    }
  ],
  "hiddenObligations": ["string"],
  "negotiationMoves": ["string"],
  "disclaimer": "string"
}

Regole:
- identifica prima il tipo reale di documento e le parti coinvolte
- usa i ruoli e i nomi presenti nel testo; non inventare locatore, conduttore, immobile o affitto se il documento non e' chiaramente immobiliare
- massimo 4 clausole
- excerpt brevi, testuali e fedeli al documento
- riskScore da 0 a 100
- se il documento e' artistico, professionale o di prestazione, analizza compenso, penali, registrazioni/riprese, forza maggiore, autorizzazioni, responsabilita', annullamento, foro e obblighi amministrativi
- se il documento e' civile, penale, regolatorio o di compliance, usa il lessico pertinente e segnala punti critici, obblighi, rischi procedurali, responsabilita' e passaggi che richiedono approfondimento professionale
- classifica come "safe" le clausole standard o equilibrate per quel tipo di documento
- niente markdown
- niente testo fuori dal JSON

Documento:
${contractText}
`;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const currentAccess = readAccessToken(
      cookieStore.get(ACCESS_COOKIE_NAME)?.value
    );

    if (!isAccessActive(currentAccess)) {
      return NextResponse.json(
        {
          error:
            "Per avviare l'analisi serve un accesso attivo. Scegli Basic o Pro dal pannello Plans.",
          code: "payment_required",
          access: toClientAccessState(currentAccess),
        },
        { status: 402 }
      );
    }

    const body = (await request.json()) as { contractText?: string };
    const contractText = body.contractText?.trim();

    if (!contractText || contractText.length < 80) {
      return NextResponse.json(
        {
          error:
            "Inserisci almeno 80 caratteri di contenuto per ottenere un'analisi utile.",
        },
        { status: 400 }
      );
    }

    if (!openai) {
      return NextResponse.json(
        {
          error:
            "OpenAI non e' configurato sul server. Inserisci OPENAI_API_KEY nelle variabili ambiente.",
        },
        { status: 503 }
      );
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Sei un legal document reviewer esperto. Devi riconoscere correttamente il tipo di documento, usare il lessico pertinente al contesto e spiegare rischi, obblighi nascosti e leve di negoziazione o approfondimento in italiano chiaro.",
        },
        {
          role: "user",
          content: buildPrompt(contractText),
        },
      ],
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error("Risposta vuota dal modello.");
    }

    const parsed = JSON.parse(normalizeJson(content));
    const payload = sanitizePayload(parsed);
    const grantedAccess = currentAccess as NonNullable<typeof currentAccess>;
    const updatedAccess = consumeAccess(grantedAccess);

    const response = NextResponse.json({
      ...payload,
      access: toClientAccessState(updatedAccess),
    });

    if (updatedAccess) {
      response.cookies.set(
        ACCESS_COOKIE_NAME,
        createAccessToken(updatedAccess),
        getCookieOptions(updatedAccess)
      );
    } else {
      response.cookies.delete(ACCESS_COOKIE_NAME);
    }

    return response;
  } catch (error) {
    console.error("Analyze route error", error);

    return NextResponse.json(
      {
        error:
          "Non sono riuscito a completare l'analisi. Controlla la configurazione oppure riprova tra poco.",
      },
      { status: 500 }
    );
  }
}
