import { mkdir, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { chromium } from "playwright";

const isVertical = process.argv.includes("--vertical");
const dimensions = isVertical
  ? { width: 1080, height: 1920 }
  : { width: 1920, height: 1080 };

const workspaceRoot = process.cwd();
const outputDir = path.join(workspaceRoot, "marketing", "videos");
const rawDir = path.join(outputDir, "raw");
const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const baseName = `lexarmor-demo-${isVertical ? "vertical-" : ""}${timestamp}`;
const webmPath = path.join(outputDir, `${baseName}.webm`);
const mp4Path = path.join(outputDir, `${baseName}.mp4`);

const targetUrl =
  process.argv.find((value) => value.startsWith("http")) ||
  "https://lexarmor-ai-francescarestelli-francescas-projects-a654bd16.vercel.app/demo";

const ffmpegCandidates = [
  "/Users/francescarestelli/Library/Caches/ms-playwright/ffmpeg-1011/ffmpeg-mac",
  "/opt/homebrew/bin/ffmpeg",
  "/usr/local/bin/ffmpeg",
];

function runFfmpeg(inputPath, outputPath) {
  const ffmpegPath = ffmpegCandidates.find((candidate) => existsSync(candidate));

  if (!ffmpegPath) {
    return {
      ok: false,
      message: "FFmpeg non trovato, ho lasciato solo il file .webm",
    };
  }

  const result = spawnSync(
    ffmpegPath,
    [
      "-y",
      "-i",
      inputPath,
      "-vf",
      `scale=${dimensions.width}:${dimensions.height}:force_original_aspect_ratio=decrease,pad=${dimensions.width}:${dimensions.height}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`,
      "-r",
      "30",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    {
      stdio: "pipe",
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    return {
      ok: false,
      message: result.stderr || "Conversione ffmpeg non riuscita.",
    };
  }

  return { ok: true, message: outputPath };
}

async function recordDemoVideo() {
  await mkdir(rawDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: dimensions.width, height: dimensions.height },
    recordVideo: {
      dir: rawDir,
      size: { width: dimensions.width, height: dimensions.height },
    },
  });

  const page = await context.newPage();

  await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: "Carica script demo per video" }).click();
  await page.waitForTimeout(1200);

  await page.getByRole("button", { name: "Avvia analisi demo" }).click();
  await page.waitForTimeout(5200);

  await page.getByRole("button", { name: "Sicurezza" }).click();
  await page.waitForTimeout(2200);

  await page.getByRole("button", { name: "Casi d'uso" }).click();
  await page.waitForTimeout(2200);

  await page.getByRole("button", { name: "Demo analisi" }).click();
  await page.waitForTimeout(1600);

  const video = page.video();

  await context.close();
  await browser.close();

  if (!video) {
    throw new Error("Video non disponibile.");
  }

  const rawVideoPath = await video.path();
  await copyFile(rawVideoPath, webmPath);

  const conversion = runFfmpeg(webmPath, mp4Path);

  console.log("Demo URL:", targetUrl);
  console.log("WEBM:", webmPath);

  if (conversion.ok) {
    console.log("MP4:", mp4Path);
  } else {
    console.log("FFMPEG:", conversion.message);
  }
}

recordDemoVideo().catch((error) => {
  console.error("Errore registrazione demo:", error);
  process.exit(1);
});
