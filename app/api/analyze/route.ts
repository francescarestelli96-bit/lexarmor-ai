import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  ACCESS_COOKIE_NAME,
  consumeAccess,
  createAccessToken,
  getClearedCookieOptions,
  getCookieOptions,
  isAccessActive,
  readAccessToken,
  toClientAccessState,
} from "@/lib/access";
import { readConfiguredEnv } from "@/lib/env";
import { syncStripeBackedAccess } from "@/lib/stripe";

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

type LocalRule = {
  title: string;
  severity: ClauseSeverity;
  score: number;
  patterns: RegExp[];
  explanation: string;
  hiddenObligation?: string;
  negotiationMove?: string;
};

function splitDocumentUnits(text: string) {
  return text
    .split(/[\n\r]+|(?<=[.!?;:])\s+/)
    .map((unit) => unit.replace(/\s+/g, " ").trim())
    .filter((unit) => unit.length >= 18);
}

function findExcerpt(text: string, patterns: RegExp[]) {
  const units = splitDocumentUnits(text);
  const matchedUnit = units.find((unit) =>
    patterns.some((pattern) => pattern.test(unit))
  );

  return (matchedUnit || units[0] || text)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function pushUnique(target: string[], value?: string) {
  if (!value || target.includes(value)) {
    return;
  }

  target.push(value);
}

function detectDocumentClassification(text: string) {
  const normalized = text.toLowerCase();

  if (
    /(decreto penale|imputat|procura|querela|udienza|reato|indagato|difensore)/i.test(
      normalized
    )
  ) {
    return "Atto o procedimento penale";
  }

  if (
    /(tar|prefetto|ricorso amministrativo|verbale|sanzione amministrativa|ordinanza|pubblica amministrazione|comune|ente pubblico)/i.test(
      normalized
    )
  ) {
    return "Atto amministrativo o sanzionatorio";
  }

  if (
    /(datore di lavoro|dipendente|ccnl|mansioni|straordinari|busta paga|periodo di prova|patto di stabilita'|patto di stabilità)/i.test(
      normalized
    )
  ) {
    return "Contratto o documento di lavoro";
  }

  if (/(nda|non disclosure|riservatezza|confidenzial)/i.test(normalized)) {
    return "Accordo di riservatezza o confidenzialita'";
  }

  if (/(locazione|locatore|conduttore|canone|immobile|affitto)/i.test(normalized)) {
    return "Contratto di locazione";
  }

  if (
    /(consulenz|prestazion|onorario|compenso|artista|collaborazione|scrittura privata|professionale|servizi)/i.test(
      normalized
    )
  ) {
    return "Contratto professionale o di prestazione";
  }

  if (
    /(compliance|policy|audit|gdpr|privacy|antiriciclaggio|whistleblowing|sicurezza)/i.test(
      normalized
    )
  ) {
    return "Documento di compliance o regolatorio";
  }

  return "Documento legale o contrattuale generico";
}

function extractParties(text: string) {
  const parties: string[] = [];
  const betweenMatch = text.match(
    /tra\s+([\s\S]+?)\s+e\s+([\s\S]+?)(?:,|\n|si conviene|si stipula|si conviene quanto segue)/i
  );

  if (betweenMatch) {
    pushUnique(parties, betweenMatch[1]?.replace(/\s+/g, " ").trim().slice(0, 120));
    pushUnique(parties, betweenMatch[2]?.replace(/\s+/g, " ").trim().slice(0, 120));
  }

  const roleMatches = text.matchAll(
    /\b(Associazione|Artista|Committente|Consulente|Societa'|Società|Cliente|Fornitore|Datore di lavoro|Dipendente|Locatore|Conduttore)\b/gi
  );

  for (const match of roleMatches) {
    pushUnique(parties, match[0]);
    if (parties.length >= 6) {
      break;
    }
  }

  return parties.slice(0, 6);
}

function buildLocalFallbackAnalysis(contractText: string): AnalysisModelPayload {
  const documentClassification = detectDocumentClassification(contractText);
  const parties = extractParties(contractText);
  const clauses: AnalysisModelPayload["clauses"] = [];
  const hiddenObligations: string[] = [];
  const negotiationMoves: string[] = [];

  const rules: LocalRule[] = [
    {
      title: "Clausola penale o risarcitoria potenzialmente sbilanciata",
      severity: "critical",
      score: 24,
      patterns: [/\bpenale\b/i, /maggior danno/i, /caparra/i],
      explanation:
        "La clausola richiede verifica di proporzionalita' rispetto all'interesse tutelato; in area contrattuale il tema richiama la logica degli artt. 1382 ss. c.c. e il controllo su squilibrio o eccessivita'.",
      hiddenObligation:
        "In caso di inadempimento o recesso anticipato potresti dover pagare importi ulteriori rispetto al compenso pattuito.",
      negotiationMove:
        "Chiedi un limite massimo chiaro della penale e criteri di riduzione proporzionali al danno effettivo.",
    },
    {
      title: "Responsabilita' illimitata o manleva troppo estesa",
      severity: "critical",
      score: 22,
      patterns: [/senza limiti/i, /danni? diretti e indiretti/i, /manleva/i],
      explanation:
        "Una responsabilita' senza cap o estesa anche ai danni indiretti puo' trasferire sul firmatario un rischio economico sproporzionato rispetto al valore dell'accordo.",
      hiddenObligation:
        "Il documento puo' spostare su di te rischi economici non compatibili con il compenso o con il ruolo ricoperto.",
      negotiationMove:
        "Inserisci un tetto di responsabilita' collegato al valore dell'accordo ed escludi i danni indiretti salvo dolo o colpa grave.",
    },
    {
      title: "Vincolo di non concorrenza o esclusiva da verificare",
      severity: "critical",
      score: 18,
      patterns: [/non concorrenza/i, /\besclusiva\b/i, /concorrent/i],
      explanation:
        "Un vincolo post-contrattuale o di esclusiva va controllato per durata, ambito e corrispettivo; in ambito lavoro e prestazioni professionali un patto troppo ampio puo' essere aggredibile.",
      hiddenObligation:
        "Potresti limitare attivita' future o incarichi con terzi anche dopo la fine del rapporto.",
      negotiationMove:
        "Riduci durata e perimetro del vincolo e prevedi un corrispettivo specifico se limita attivita' future.",
    },
    {
      title: "Termini di opposizione o impugnazione da presidiare",
      severity: "critical",
      score: 24,
      patterns: [/opposizion/i, /impugnazion/i, /entro \d+ giorni/i, /tar/i, /prefetto/i],
      explanation:
        "Se l'atto contiene scadenze per reagire, il rischio principale e' la decadenza: nei procedimenti penali o amministrativi la tempestivita' difensiva e' decisiva.",
      hiddenObligation:
        "Il testo puo' imporre attivita' difensive o documentali in tempi molto stretti.",
      negotiationMove:
        "Annota subito il termine utile e prepara il fascicolo con i documenti necessari per opposizione o ricorso.",
    },
    {
      title: "Pagamento o compenso con tempistiche sfavorevoli",
      severity: "medium",
      score: 12,
      patterns: [/90 giorni/i, /120 giorni/i, /pagamento a/i, /corrispettivo/i, /onorario/i],
      explanation:
        "La disciplina economica appare da verificare per equilibrio di cassa, maturazione del credito e rimedi in caso di ritardo.",
      hiddenObligation:
        "Potresti sostenere il costo della prestazione per un periodo lungo prima di incassare.",
      negotiationMove:
        "Richiedi termini di pagamento piu' brevi o interessi automatici per ritardo.",
    },
    {
      title: "Foro competente o sede del contenzioso da confermare",
      severity: "medium",
      score: 10,
      patterns: [/foro competente/i, /competenza esclusiva/i],
      explanation:
        "La clausola sulla competenza puo' incidere sul costo del contenzioso e sulla praticabilita' della difesa; va valutata in base al rapporto concreto e all'eventuale parte debole.",
      hiddenObligation:
        "Un eventuale contenzioso potrebbe dover essere gestito lontano dalla tua sede o residenza.",
      negotiationMove:
        "Proponi un foro neutro o coerente con il luogo di esecuzione del rapporto.",
    },
    {
      title: "Diritti su registrazione, ripresa o uso promozionale",
      severity: "medium",
      score: 8,
      patterns: [/registrare/i, /riprese?/i, /uso promozionale/i, /archivio/i],
      explanation:
        "Le autorizzazioni su registrazioni e utilizzi promozionali vanno delimitate per finalita', durata e mezzi di diffusione.",
      hiddenObligation:
        "Il documento puo' consentire riuso dell'immagine, della prestazione o del contenuto oltre l'evento principale.",
      negotiationMove:
        "Limita l'autorizzazione a finalita' specifiche e richiedi approvazione preventiva per usi ulteriori.",
    },
    {
      title: "Adempimenti autorizzativi o amministrativi da completare",
      severity: "medium",
      score: 8,
      patterns: [/autorizzazione/i, /pubblica amministrazione/i, /art\.? 53/i, /d\.?\s*lgs/i],
      explanation:
        "Il testo richiama oneri dichiarativi o autorizzativi che, se non rispettati, possono incidere sulla validita' dell'incarico o esporre a contestazioni.",
      hiddenObligation:
        "Potresti dover consegnare autorizzazioni, attestazioni o documenti integrativi prima dell'esecuzione.",
      negotiationMove:
        "Verifica subito chi deve produrre l'autorizzazione e inserisci una condizione sospensiva se manca un presupposto essenziale.",
    },
    {
      title: "Forza maggiore o impossibilita' dell'adempimento disciplinata",
      severity: "safe",
      score: -6,
      patterns: [/forza maggiore/i, /impossibilita' dell'adempimento/i, /impossibilità dell'adempimento/i],
      explanation:
        "La presenza di una clausola su forza maggiore o impossibilita' sopravvenuta e' coerente con una corretta gestione del rischio operativo.",
    },
    {
      title: "Riservatezza o autorizzazione bilaterale presente",
      severity: "safe",
      score: -4,
      patterns: [/riservatezza/i, /previa autorizzazione/i, /consenso/i],
      explanation:
        "Il documento contiene un presidio di base su autorizzazioni o riservatezza, elemento normalmente utile per limitare usi impropri o divulgazioni non concordate.",
    },
  ];

  for (const rule of rules) {
    if (!rule.patterns.some((pattern) => pattern.test(contractText))) {
      continue;
    }

    clauses.push({
      title: rule.title,
      severity: rule.severity,
      explanation: rule.explanation,
      excerpt: findExcerpt(contractText, rule.patterns),
    });
    pushUnique(hiddenObligations, rule.hiddenObligation);
    pushUnique(negotiationMoves, rule.negotiationMove);
  }

  if (!clauses.length) {
    clauses.push({
      title: "Screening preliminare: revisione umana consigliata",
      severity: "medium",
      explanation:
        "Il testo non espone trigger evidenti nelle categorie automatiche, ma resta opportuno verificare obblighi, termini e responsabilita' prima della firma o del deposito.",
      excerpt: findExcerpt(contractText, [/./]),
    });
    pushUnique(
      negotiationMoves,
      "Chiedi una revisione professionale mirata dei punti economici, dei termini e delle responsabilita'."
    );
  }

  if (
    /(corrispettivo|onorario|compenso|euro\s*\d|€)/i.test(contractText) &&
    !clauses.some((clause) => clause.severity === "safe")
  ) {
    clauses.push({
      title: "Corrispettivo individuato nel testo",
      severity: "safe",
      explanation:
        "La presenza di un riferimento economico espresso rende il documento meno opaco sul piano del corrispettivo, pur lasciando da verificare tempi e condizioni di pagamento.",
      excerpt: findExcerpt(contractText, [/(corrispettivo|onorario|compenso|euro\s*\d|€)/i]),
    });
  }

  const criticalCount = clauses.filter((clause) => clause.severity === "critical").length;
  const mediumCount = clauses.filter((clause) => clause.severity === "medium").length;
  const safeCount = clauses.filter((clause) => clause.severity === "safe").length;
  const ruleScore = clauses.reduce((total, clause) => {
    const matchedRule = rules.find((rule) => rule.title === clause.title);
    return total + (matchedRule?.score ?? 0);
  }, 22);
  const riskScore = Math.max(
    18,
    Math.min(
      94,
      ruleScore + criticalCount * 6 + mediumCount * 3 - safeCount * 2
    )
  );
  const verdict: Verdict =
    riskScore >= 72 || criticalCount >= 2
      ? "critical"
      : riskScore >= 40 || mediumCount >= 1
        ? "review"
        : "safe";

  const summary = [
    `Classificazione preliminare: ${documentClassification}.`,
    criticalCount
      ? `Emergono ${criticalCount} profili critici con possibile impatto economico o legale immediato.`
      : "Non emergono red flag immediate nelle categorie automatiche piu' sensibili.",
    mediumCount
      ? `Ci sono ${mediumCount} punti da chiarire o rinegoziare prima di procedere.`
      : "La struttura appare piu' ordinata, ma resta consigliata una verifica professionale finale.",
  ].join(" ");

  return {
    contractType: documentClassification,
    parties,
    summary,
    verdict,
    riskScore,
    clauses: clauses.slice(0, 8),
    hiddenObligations: hiddenObligations.slice(0, 5),
    negotiationMoves: negotiationMoves.slice(0, 5),
    disclaimer:
      "Analisi automatica a scopo informativo, non sostituisce il parere di un avvocato abilitato",
  };
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const rawToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;
    const currentAccess = readAccessToken(rawToken);
    const synced = await syncStripeBackedAccess(currentAccess);

    if (!isAccessActive(synced.access)) {
      const deniedResponse = NextResponse.json(
        {
          error:
            "Per avviare l'analisi serve un accesso attivo. Scegli Basic o Pro dal pannello Plans.",
          code: "payment_required",
          access: toClientAccessState(synced.access),
        },
        { status: 402 }
      );

      if (rawToken && !synced.access) {
        deniedResponse.cookies.set(
          ACCESS_COOKIE_NAME,
          "",
          getClearedCookieOptions()
        );
      }

      return deniedResponse;
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

    const payload = openai
      ? await (async () => {
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
          return sanitizePayload(parsed);
        })()
      : buildLocalFallbackAnalysis(contractText);
    const grantedAccess = synced.access as NonNullable<typeof synced.access>;
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
      response.cookies.set(ACCESS_COOKIE_NAME, "", getClearedCookieOptions());
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
