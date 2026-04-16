import { Buffer } from "node:buffer";
import JSZip from "jszip";
import mammoth from "mammoth";

type ExtractedDocument = {
  text: string;
  detectedType: string;
};

const TEXT_EXTENSIONS = new Set(["txt", "text", "md", "markdown", "csv"]);
const RTF_EXTENSIONS = new Set(["rtf"]);
const WORD_EXTENSIONS = new Set(["doc", "docx"]);
const PDF_EXTENSIONS = new Set(["pdf"]);
const PAGES_EXTENSIONS = new Set(["pages"]);
const MIN_DIRECT_PDF_TEXT_LENGTH = 80;
const MAX_PDF_OCR_PAGES = 6;

function getExtension(filename: string) {
  const clean = filename.toLowerCase().trim();
  const pieces = clean.split(".");
  return pieces.length > 1 ? pieces.pop() ?? "" : "";
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\u0000/g, " ")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripRtf(text: string) {
  return normalizeExtractedText(
    text
      .replace(/\\par[d]?/gi, "\n")
      .replace(/\\tab/gi, " ")
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, " ")
      .replace(/[{}]/g, " ")
  );
}

async function extractPdf(buffer: Buffer) {
  if (typeof globalThis.DOMMatrix === "undefined") {
    const DOMMatrixModule = await import("@thednp/dommatrix");
    const DOMMatrixPolyfill = DOMMatrixModule.default as unknown as typeof DOMMatrix;

    globalThis.DOMMatrix = DOMMatrixPolyfill;
  }

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

async function ensurePdfOcrPolyfills() {
  const canvasModule = await import("@napi-rs/canvas");

  if (typeof globalThis.DOMMatrix === "undefined") {
    globalThis.DOMMatrix = canvasModule.DOMMatrix as unknown as typeof DOMMatrix;
  }

  if (typeof globalThis.ImageData === "undefined") {
    globalThis.ImageData = canvasModule.ImageData as unknown as typeof ImageData;
  }

  if (typeof globalThis.Path2D === "undefined") {
    globalThis.Path2D = canvasModule.Path2D as unknown as typeof Path2D;
  }

  return canvasModule;
}

async function ocrPdf(buffer: Buffer) {
  const [{ createCanvas }, pdfjsModule, tesseractModule] = await Promise.all([
    ensurePdfOcrPolyfills(),
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("tesseract.js"),
  ]);

  const pdfjs = pdfjsModule as typeof import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useWorkerFetch: false,
    isEvalSupported: false,
    disableFontFace: true,
  });
  const pdfDocument = await loadingTask.promise;
  const pageCount = Math.min(pdfDocument.numPages, MAX_PDF_OCR_PAGES);
  const worker = await tesseractModule.createWorker("ita+eng", 1, {
    logger: () => undefined,
  });

  try {
    const pages: string[] = [];

    for (let pageIndex = 1; pageIndex <= pageCount; pageIndex += 1) {
      const page = await pdfDocument.getPage(pageIndex);
      const viewport = page.getViewport({ scale: 1.8 });
      const canvas = createCanvas(
        Math.max(1, Math.ceil(viewport.width)),
        Math.max(1, Math.ceil(viewport.height))
      );
      const context = canvas.getContext("2d");

      const renderContext = {
        canvas: canvas as unknown,
        canvasContext: context as unknown,
        viewport,
      } as Parameters<typeof page.render>[0];

      await page.render(renderContext).promise;

      const imageBuffer = canvas.toBuffer("image/png");
      const result = await worker.recognize(imageBuffer);
      const normalizedPageText = normalizeExtractedText(result.data.text);

      if (normalizedPageText) {
        pages.push(normalizedPageText);
      }

      page.cleanup();
    }

    return normalizeExtractedText(pages.join("\n\n"));
  } finally {
    await worker.terminate();
    await loadingTask.destroy();
  }
}

async function extractPdfWithFallback(buffer: Buffer) {
  const directText = await extractPdf(buffer);

  if (directText.length >= MIN_DIRECT_PDF_TEXT_LENGTH) {
    return {
      text: directText,
      detectedType: "pdf",
    };
  }

  const ocrText = await ocrPdf(buffer);

  if (ocrText) {
    return {
      text: ocrText,
      detectedType: "pdf-ocr",
    };
  }

  return {
    text: directText,
    detectedType: "pdf",
  };
}

async function extractDocx(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const normalized = normalizeExtractedText(result.value);

  if (normalized) {
    return normalized;
  }

  return extractWordBinary(buffer);
}

async function extractWordBinary(buffer: Buffer) {
  const WordExtractorModule = await import("word-extractor");
  const WordExtractor = (WordExtractorModule.default ??
    WordExtractorModule) as unknown as {
    new (): {
      extract(input: string | Buffer): Promise<{
        getBody(): string;
      }>;
    };
  };

  const extractor = new WordExtractor();
  const document = await extractor.extract(buffer);

  return normalizeExtractedText(document.getBody());
}

async function extractPages(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const previewPdf =
    zip.file("QuickLook/Preview.pdf") ??
    zip.file("preview.pdf") ??
    Object.values(zip.files).find((entry) => /preview\.pdf$/i.test(entry.name));

  if (previewPdf) {
    const previewBuffer = await previewPdf.async("nodebuffer");
    return extractPdf(previewBuffer);
  }

  throw new Error(
    "Questo file Pages non contiene un'anteprima PDF leggibile. Esporta in PDF oppure Word e riprova."
  );
}

export async function extractTextFromFile(file: File): Promise<ExtractedDocument> {
  const extension = getExtension(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());

  if (TEXT_EXTENSIONS.has(extension)) {
    return {
      text: normalizeExtractedText(await file.text()),
      detectedType: "text",
    };
  }

  if (RTF_EXTENSIONS.has(extension)) {
    return {
      text: stripRtf(await file.text()),
      detectedType: "rtf",
    };
  }

  if (PDF_EXTENSIONS.has(extension)) {
    return extractPdfWithFallback(buffer);
  }

  if (extension === "docx") {
    return {
      text: await extractDocx(buffer),
      detectedType: "docx",
    };
  }

  if (extension === "doc") {
    return {
      text: await extractWordBinary(buffer),
      detectedType: "doc",
    };
  }

  if (PAGES_EXTENSIONS.has(extension)) {
    return {
      text: await extractPages(buffer),
      detectedType: "pages",
    };
  }

  if (WORD_EXTENSIONS.has(extension)) {
    return {
      text: await extractWordBinary(buffer),
      detectedType: "word",
    };
  }

  throw new Error(
    "Formato non supportato. Carica un file PDF, Word, Pages o di testo."
  );
}
