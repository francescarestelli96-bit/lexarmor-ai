import { readdir, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = process.cwd();
const videosDir = path.join(workspaceRoot, "marketing", "videos");
const voiceDir = path.join(videosDir, "voice");
const edgeTtsPath =
  "/Users/francescarestelli/Library/Python/3.9/bin/edge-tts";

const voiceoverText =
  "Stai per firmare? Carica il documento su LexArmor AI e in pochi secondi vedi risk score, clausole critiche, obblighi nascosti e cosa contestare. Piu controllo, meno sorprese. Provalo prima di firmare.";

const ffmpegPath = path.join(
  workspaceRoot,
  "node_modules",
  "ffmpeg-static",
  "ffmpeg"
);

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Command failed: ${command}`);
  }
}

function pickLatestVideo(files, isVertical) {
  const matching = files
    .filter((file) => file.endsWith(".mp4"))
    .filter((file) => file.startsWith("lexarmor-demo-"))
    .filter((file) => file.includes("-vertical-") === isVertical)
    .filter((file) => !file.includes("-voice-"))
    .sort((a, b) => b.localeCompare(a));

  return matching[0] || null;
}

async function addVoiceToVideo(inputVideoPath, outputVideoPath, voiceTrackPath) {
  runCommand(ffmpegPath, [
    "-y",
    "-i",
    inputVideoPath,
    "-i",
    voiceTrackPath,
    "-filter_complex",
    "[1:a]volume=1.7,apad[a]",
    "-map",
    "0:v:0",
    "-map",
    "[a]",
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-shortest",
    outputVideoPath,
  ]);
}

async function createVoiceTrack(outputPath) {
  runCommand(edgeTtsPath, [
    "--voice",
    "it-IT-IsabellaNeural",
    "--rate",
    "+18%",
    "--pitch",
    "+2Hz",
    "--text",
    voiceoverText,
    "--write-media",
    outputPath,
  ]);
}

async function main() {
  await mkdir(voiceDir, { recursive: true });

  const files = await readdir(videosDir);
  const horizontal = pickLatestVideo(files, false);
  const vertical = pickLatestVideo(files, true);

  if (!horizontal || !vertical) {
    throw new Error(
      "Video demo non trovati. Genera prima i video base con npm run record:demo-video."
    );
  }

  const voiceTrackPath = path.join(voiceDir, "lexarmor-demo-voice-it.mp3");
  const scriptPath = path.join(voiceDir, "lexarmor-demo-voice-script.txt");

  await writeFile(scriptPath, `${voiceoverText}\n`, "utf8");

  await createVoiceTrack(voiceTrackPath);

  const horizontalInput = path.join(videosDir, horizontal);
  const verticalInput = path.join(videosDir, vertical);
  const horizontalOutput = horizontalInput.replace(".mp4", "-voice-final-it.mp4");
  const verticalOutput = verticalInput.replace(".mp4", "-voice-final-it.mp4");

  await addVoiceToVideo(horizontalInput, horizontalOutput, voiceTrackPath);
  await addVoiceToVideo(verticalInput, verticalOutput, voiceTrackPath);

  console.log("Voice track:", voiceTrackPath);
  console.log("Horizontal with voice:", horizontalOutput);
  console.log("Vertical with voice:", verticalOutput);
}

main().catch((error) => {
  console.error("Errore voiceover demo:", error);
  process.exit(1);
});
