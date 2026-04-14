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
import { readConfiguredEnv } from "@/lib/env";

type ClauseSeverity = "critical" | "medium" | "safe";
type Verdict = "critical" | "review" | "safe";
type ModelClause = {
  title: string;
  explanation: string;
  excerpt: string;
};

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

type RawAnalysisModelPayload = Partial<{
  documentClassification: string;
  contractType: string;
  parties: unknown[];
  executiveSummary: string;
  summary: string;
  verdict: unknown;
  riskScore: unknown;
  criticalAlerts: unknown[];
  attentionRequired: unknown[];
  standardSafe: unknown[];
  clauses: unknown[];
  hiddenObligations: unknown[];
  negotiationStrategy: unknown[];
  negotiationMoves: unknown[];
  disclaimer: string;
}>;

const LEGAL_AI_DISCLAIMER =
  "Analisi basata su AI a scopo informativo, non sostituisce il parere di un avvocato abilitato";

const openaiApiKey = readConfiguredEnv("OPENAI_API_KEY");

const openai = openaiApiKey
  ? new OpenAI({ apiKey: openaiApiKey })
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

function sanitizeStringList(value: unknown, limit: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit);
}

function sanitizeStructuredClauses(
  value: unknown,
  severity: ClauseSeverity,
  limit: number
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, limit)
    .map((item) => {
      if (!item || typeof item !== "object") {
        throw new Error("Voce analisi non valida.");
      }

      const candidate = item as Partial<ModelClause>;

      if (
        typeof candidate.title !== "string" ||
        typeof candidate.explanation !== "string" ||
        typeof candidate.excerpt !== "string"
      ) {
        throw new Error("Voce analisi incompleta.");
      }

      return {
        title: candidate.title.trim(),
        severity,
        explanation: candidate.explanation.trim(),
        excerpt: candidate.excerpt.trim(),
      };
    })
    .filter(
      (item) => item.title && item.explanation && item.excerpt
    ) satisfies AnalysisModelPayload["clauses"];
}

function sanitizePayload(payload: unknown): AnalysisModelPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Formato analisi non valido.");
  }

  const data = payload as RawAnalysisModelPayload;
  const contractType = data.documentClassification || data.contractType;
  const summary = data.executiveSummary || data.summary;
  const criticalAlerts = sanitizeStructuredClauses(
    data.criticalAlerts,
    "critical",
    4
  );
  const attentionRequired = sanitizeStructuredClauses(
    data.attentionRequired,
    "medium",
    4
  );
  const standardSafe = sanitizeStructuredClauses(data.standardSafe, "safe", 4);
  const legacyClauses = Array.isArray(data.clauses)
    ? data.clauses.slice(0, 8).map((clause) => {
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
      })
    : [];
  const clauses =
    criticalAlerts.length || attentionRequired.length || standardSafe.length
      ? [...criticalAlerts, ...attentionRequired, ...standardSafe]
      : legacyClauses;

  if (
    typeof contractType !== "string" ||
    !isVerdict(data.verdict) ||
    typeof data.riskScore !== "number" ||
    typeof summary !== "string" ||
    !clauses.length
  ) {
    throw new Error("Campi analisi incompleti.");
  }

  return {
    contractType: contractType.trim(),
    parties: sanitizeStringList(data.parties, 6),
    summary: summary.trim(),
    verdict: data.verdict,
    riskScore: Math.max(0, Math.min(100, Math.round(data.riskScore))),
    clauses,
    hiddenObligations: sanitizeStringList(data.hiddenObligations, 5),
    negotiationMoves: sanitizeStringList(
      data.negotiationStrategy || data.negotiationMoves,
      5
    ),
    disclaimer: LEGAL_AI_DISCLAIMER,
  };
}

function buildPrompt(contractText: string) {
  return `
Analizza il seguente documento legale in italiano con tono tecnico, autorevole ma comprensibile. Non fare premesse inutili.

Restituisci SOLO JSON valido con questa shape:
{
  "documentClassification": "string",
  "parties": ["string"],
  "executiveSummary": "string",
  "verdict": "critical" | "review" | "safe",
  "riskScore": number,
  "criticalAlerts": [
    {
      "title": "string",
      "explanation": "string",
      "excerpt": "string"
    }
  ],
  "attentionRequired": [
    {
      "title": "string",
      "explanation": "string",
      "excerpt": "string"
    }
  ],
  "standardSafe": [
    {
      "title": "string",
      "explanation": "string",
      "excerpt": "string"
    }
  ],
  "hiddenObligations": ["string"],
  "negotiationStrategy": ["string"],
  "disclaimer": "${LEGAL_AI_DISCLAIMER}"
}

Regole:
- inizia sempre con un protocollo di identificazione automatica: riconosci la natura del documento (es. contratto di locazione, atto di citazione civile, decreto penale, ricorso amministrativo, contratto di lavoro, NDA, multa o sanzione, documento compliance, accordo professionale, scrittura privata, diffida)
- usa i ruoli, i nomi e il lessico presenti nel testo; non inventare locatore, conduttore, immobile o affitto se il documento non e' chiaramente immobiliare
- se il documento tocca piu' aree, combina i controlli dei moduli rilevanti
- executiveSummary: massimo 3 righe, pensato per un utente non esperto
- criticalAlerts: inserisci solo i punti che comportano perdita economica, rischio legale immediato, decadenze, nullita', responsabilita' o urgenze procedurali
- attentionRequired: inserisci ambiguita', punti da chiarire, clausole squilibrate o aspetti da approfondire
- standardSafe: inserisci clausole standard o equilibrate per il tipo di documento
- excerpt brevi, testuali e fedeli al documento
- riskScore da 0 a 100
- modulo CIVILE/CONTRATTUALE: verifica clausole vessatorie, ex art. 1341-1342 c.c. se pertinenti, squilibri eccessivi, recesso, penali fuori mercato, limitazioni di responsabilita', obblighi impliciti, foro, termini e condizioni sbilanciate
- modulo PENALE: individua capi d'imputazione o contestazioni, termini di prescrizione se desumibili, scadenze per opposizione o impugnazione, profili che incidono sui diritti della difesa, oneri documentali e urgenze procedurali
- modulo LAVORO: verifica non concorrenza non retribuita, patti di stabilita', inquadramento, mansioni, straordinari, orari, ferie, recesso, disciplinare, responsabilita' e clausole retributive ambigue
- modulo AMMINISTRATIVO: verifica vizi formali di sanzioni o atti della PA, motivazione, notifica, competenza, termini per ricorso a TAR, Prefetto o autorita' competente, decadenze e adempimenti necessari
- modulo COMPLIANCE/REGOLATORIO: evidenzia obblighi di policy, responsabilita', audit, conservazione documentale, sanzioni, obblighi privacy, sicurezza, antiriciclaggio o requisiti procedurali se presenti
- se il documento e' artistico, professionale o di prestazione, analizza compenso, penali, registrazioni, riprese, forza maggiore, autorizzazioni, responsabilita', annullamento, foro e obblighi amministrativi
- quando possibile cita in explanation la ratio legis o l'articolo di riferimento in forma breve e prudente, senza inventare riferimenti non supportati dal testo o dal contesto giuridico
- se un dato decisivo non e' presente, dichiaralo esplicitamente invece di dedurlo
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
      store: false,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Sei LexArmor AI, un analista legale universale per documenti italiani. Devi classificare automaticamente la natura dell'atto, attivare i controlli giuridici pertinenti per area, distinguere tra urgenze, punti da approfondire e clausole standard, e scrivere in italiano tecnico ma chiaro. Non inventare fatti, parti, articoli o qualificazioni giuridiche non supportate dal testo. Non assumere mai che il documento sia immobiliare se non emerge chiaramente dal contenuto. Non restituire testo fuori dal JSON richiesto.",
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
    const criticalAlerts = payload.clauses.filter(
      (clause) => clause.severity === "critical"
    );
    const attentionRequired = payload.clauses.filter(
      (clause) => clause.severity === "medium"
    );
    const standardSafe = payload.clauses.filter(
      (clause) => clause.severity === "safe"
    );

    const response = NextResponse.json({
      ...payload,
      documentClassification: payload.contractType,
      executiveSummary: payload.summary,
      criticalAlerts,
      attentionRequired,
      standardSafe,
      negotiationStrategy: payload.negotiationMoves,
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
    console.error(
      "Analyze route error",
      error instanceof Error ? error.message : "unknown_error"
    );

    return NextResponse.json(
      {
        error:
          "Non sono riuscito a completare l'analisi. Controlla la configurazione oppure riprova tra poco.",
      },
      { status: 500 }
    );
  }
}
