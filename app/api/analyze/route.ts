import OpenAI from "openai";

type ClauseSeverity = "critical" | "medium" | "safe";
type Verdict = "critical" | "review" | "safe";

type AnalysisPayload = {
  mode: "live" | "demo";
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

const demoPayload: AnalysisPayload = {
  mode: "demo",
  summary:
    "Questo testo contiene diverse clausole sbilanciate a favore del locatore: rinuncia preventiva a tutele, recesso molto punitivo e tempi di restituzione della cauzione eccessivi.",
  verdict: "critical",
  riskScore: 82,
  clauses: [
    {
      title: "Rinuncia preventiva ai vizi dell'immobile",
      severity: "critical",
      explanation:
        "Ti fa perdere protezione anche se scopri problemi seri dopo la firma, come infiltrazioni o impianti difettosi.",
      excerpt:
        "Il conduttore rinuncia espressamente a qualsiasi richiesta di rimborso per vizi dell'immobile.",
    },
    {
      title: "Recesso anticipato con penale estrema",
      severity: "critical",
      explanation:
        "Se esci prima, rischi di restare obbligato a pagare quasi tutto il contratto anche senza usare più l'immobile.",
      excerpt:
        "Il conduttore restera' obbligato al pagamento di tutti i canoni residui fino alla scadenza naturale.",
    },
    {
      title: "Restituzione cauzione troppo lenta",
      severity: "medium",
      explanation:
        "180 giorni sono un tempo molto lungo e lasciano troppo margine discrezionale al locatore.",
      excerpt:
        "Il deposito cauzionale verra' restituito entro 180 giorni dal rilascio dell'immobile.",
    },
  ],
  hiddenObligations: [
    "Accetti modifiche unilaterali al regolamento applicabile all'immobile.",
    "Potresti sostenere costi e canoni anche dopo il rilascio anticipato.",
    "Il foro scelto dal locatore puo' rendere piu' costosa una contestazione.",
  ],
  negotiationMoves: [
    "Chiedi di eliminare la rinuncia generale ai vizi e di limitare la clausola ai difetti gia' noti e documentati.",
    "Proponi un tetto massimo alla penale di recesso, ad esempio 2 o 3 mensilita'.",
    "Riduci il termine di restituzione della cauzione a 30 giorni con motivazione scritta per eventuali trattenute.",
  ],
  disclaimer:
    "Analisi informativa, non sostituisce una revisione legale professionale. La piattaforma non salva il testo inviato; in demo mode uso euristiche locali per non bloccare l'esperienza.",
};

function normalizeJson(raw: string) {
  return raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
}

function isClauseSeverity(value: unknown): value is ClauseSeverity {
  return value === "critical" || value === "medium" || value === "safe";
}

function isVerdict(value: unknown): value is Verdict {
  return value === "critical" || value === "review" || value === "safe";
}

function sanitizePayload(payload: unknown): AnalysisPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Formato analisi non valido.");
  }

  const data = payload as Partial<AnalysisPayload>;

  if (
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
    mode: "live",
    summary: data.summary,
    verdict: data.verdict,
    riskScore: Math.max(0, Math.min(100, Math.round(data.riskScore))),
    clauses: data.clauses.slice(0, 4).map((clause) => {
      const candidate = clause as AnalysisPayload["clauses"][number];

      if (
        !candidate ||
        typeof candidate.title !== "string" ||
        !isClauseSeverity(candidate.severity) ||
        typeof candidate.explanation !== "string" ||
        typeof candidate.excerpt !== "string"
      ) {
        throw new Error("Clausola non valida.");
      }

      return candidate;
    }),
    hiddenObligations: data.hiddenObligations
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4),
    negotiationMoves: data.negotiationMoves
      .filter((item): item is string => typeof item === "string")
      .slice(0, 4),
    disclaimer: data.disclaimer,
  };
}

function buildPrompt(contractText: string) {
  return `
Analizza il seguente contratto in italiano semplice. Non fare premesse inutili.

Restituisci SOLO JSON valido con questa shape:
{
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
- massimo 4 clausole
- excerpt brevi, testuali e fedeli al contratto
- riskScore da 0 a 100
- niente markdown
- niente testo fuori dal JSON

Contratto:
${contractText}
`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { contractText?: string };
    const contractText = body.contractText?.trim();

    if (!contractText || contractText.length < 80) {
      return Response.json(
        { error: "Incolla almeno 80 caratteri di contratto per ottenere un'analisi utile." },
        { status: 400 }
      );
    }

    if (!openai) {
      return Response.json(demoPayload);
    }

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      temperature: 0.3,
      messages: [
        {
          role: "system",
          content:
            "Sei un contract reviewer preciso. Evidenzi rischi, obblighi nascosti e possibili mosse di negoziazione con linguaggio chiaro.",
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

    return Response.json(payload);
  } catch (error) {
    console.error("Analyze route error", error);

    return Response.json(
      {
        error:
          "Non sono riuscito a completare l'analisi. Controlla le variabili ambiente oppure riprova tra poco.",
      },
      { status: 500 }
    );
  }
}
