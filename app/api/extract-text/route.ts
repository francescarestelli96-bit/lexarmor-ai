import { extractTextFromFile } from "@/lib/document-extraction";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const candidate = formData.get("file");

    if (
      !candidate ||
      typeof candidate !== "object" ||
      !("arrayBuffer" in candidate) ||
      typeof candidate.arrayBuffer !== "function"
    ) {
      return Response.json(
        { error: "Seleziona un file valido." },
        { status: 400 }
      );
    }

    const file = candidate as File;

    if (file.size === 0) {
      return Response.json(
        { error: "Il file è vuoto." },
        { status: 400 }
      );
    }

    if (file.size > 12 * 1024 * 1024) {
      return Response.json(
        {
          error:
            "Il file supera 12 MB. Carica una versione più leggera oppure esporta solo le pagine necessarie.",
        },
        { status: 400 }
      );
    }

    const extracted = await extractTextFromFile(file);

    if (!extracted.text || extracted.text.length < 40) {
      return Response.json(
        {
          error:
            "Non sono riuscito a estrarre abbastanza testo dal documento. Se è un PDF scannerizzato, assicurati che sia leggibile; in alternativa esporta in PDF testuale o DOCX.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      filename: file.name,
      detectedType: extracted.detectedType,
      text: extracted.text,
    });
  } catch (error) {
    console.error("Extract text route error", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Non sono riuscito a leggere il documento.",
      },
      { status: 500 }
    );
  }
}
