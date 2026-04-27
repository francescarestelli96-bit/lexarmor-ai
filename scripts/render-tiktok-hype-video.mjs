import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";

const workspaceRoot = process.cwd();
const videosDir = path.join(workspaceRoot, "marketing", "videos");
const voiceDir = path.join(videosDir, "voice");
const finalDir = path.join(videosDir, "final");
const ffmpegPath = path.join(
  workspaceRoot,
  "node_modules",
  "ffmpeg-static",
  "ffmpeg"
);
const edgeTtsPath =
  "/Users/francescarestelli/Library/Python/3.9/bin/edge-tts";

const scriptText =
  "Non firmare. Ti stanno fregando? Con Lecs Armor carichi il documento. Parte il saiber scan. Il risc scor sale. Vedi subito le clausole critiche. Ti proteggo io. Lecs Armor.";

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: "pipe",
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(result.stderr || `Command failed: ${command}`);
  }
}

function pickLatestBaseVertical(files) {
  const candidates = files
    .filter((file) => file.endsWith(".mp4"))
    .filter((file) => file.startsWith("lexarmor-demo-vertical-"))
    .filter((file) => !file.includes("-voice"))
    .sort((a, b) => b.localeCompare(a));

  return candidates[0] || null;
}

function buildAssSubtitles() {
  return `[Script Info]
Title: LexArmor High-Energy Italian Hype
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Blast,Arial,118,&H00FFFFFF,&H00FFFFFF,&H00070A12,&H44000000,1,0,0,0,100,100,0,0,1,6,0,5,60,60,260,0
Style: Alert,Arial,94,&H00FFFFFF,&H00FFFFFF,&H00070A12,&H44000000,1,0,0,0,100,100,0,0,1,5,0,5,70,70,250,0
Style: CTA,Arial,98,&H00FFFFFF,&H00FFFFFF,&H00070A12,&H44000000,1,0,0,0,100,100,0,0,1,5,0,5,60,60,260,0

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
Dialogue: 0,0:00:00.00,0:00:01.60,Blast,,0,0,0,,{\\an5\\pos(540,430)\\c&H002E42FF&\\fscx40\\fscy40\\t(0,140,\\fscx112\\fscy112)\\t(140,1150,\\fscx100\\fscy100)}NON FIRMARE
Dialogue: 0,0:00:01.60,0:00:03.25,Alert,,0,0,0,,{\\an5\\pos(540,430)\\fscx60\\fscy60\\t(0,150,\\fscx106\\fscy106)}Ti stanno fregando?
Dialogue: 0,0:00:04.85,0:00:06.40,Blast,,0,0,0,,{\\an5\\pos(540,430)\\c&H002E42FF&\\fscx52\\fscy52\\t(0,180,\\fscx110\\fscy110)}RISCHIO ALTO
Dialogue: 0,0:00:09.90,0:00:11.23,CTA,,0,0,0,,{\\an5\\pos(540,430)\\c&H0046FFB6&\\fscx54\\fscy54\\t(0,180,\\fscx108\\fscy108)}TI PROTEGGO IO
`;
}

async function main() {
  await mkdir(finalDir, { recursive: true });
  await mkdir(voiceDir, { recursive: true });

  const files = await readdir(videosDir);
  const baseVideo = pickLatestBaseVertical(files);

  if (!baseVideo) {
    throw new Error("Video verticale base non trovato.");
  }

  const baseVideoPath = path.join(videosDir, baseVideo);
  const voicePath = path.join(voiceDir, "lexarmor-tiktok-hype-voice-it.mp3");
  const bedPath = path.join(voiceDir, "lexarmor-tiktok-hype-bed.wav");
  const assPath = path.join(voiceDir, "lexarmor-tiktok-hype-subs.ass");
  const outputPath = path.join(finalDir, "lexarmor-high-energy-italian-hype.mp4");

  await writeFile(assPath, buildAssSubtitles(), "utf8");

  runCommand(edgeTtsPath, [
    "--voice",
    "it-IT-IsabellaNeural",
    "--rate",
    "+18%",
    "--pitch",
    "+6Hz",
    "--text",
    scriptText,
    "--write-media",
    voicePath,
  ]);

  runCommand(ffmpegPath, [
    "-y",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=96:sample_rate=48000:duration=11.3",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=192:sample_rate=48000:duration=11.3",
    "-f",
    "lavfi",
    "-i",
    "anoisesrc=color=pink:sample_rate=48000:duration=11.3",
    "-f",
    "lavfi",
    "-i",
    "sine=frequency=1420:sample_rate=48000:duration=0.35",
    "-filter_complex",
    "[0:a]volume=0.026,lowpass=f=180,highpass=f=60,tremolo=f=3.2:d=0.78[bass];" +
      "[1:a]volume=0.012,highpass=f=420,tremolo=f=6.6:d=0.58[lead];" +
      "[2:a]volume=0.0046,highpass=f=3200,lowpass=f=7800[air];" +
      "[3:a]volume=0.12,highpass=f=1100,lowpass=f=3200,aecho=0.8:0.45:14:0.22,afade=t=in:st=0:d=0.02,afade=t=out:st=0.10:d=0.22,adelay=10000:all=1[shield];" +
      "[bass][lead][air][shield]amix=inputs=4:duration=longest,afade=t=in:st=0:d=0.18,afade=t=out:st=10.4:d=0.8,alimiter=limit=0.78[bed]",
    "-map",
    "[bed]",
    "-c:a",
    "pcm_s16le",
    bedPath,
  ]);

  runCommand(ffmpegPath, [
    "-y",
    "-i",
    baseVideoPath,
    "-i",
    voicePath,
    "-i",
    bedPath,
    "-filter_complex",
    `[0:v]split=5[v0][v1][v2][v3][v4];` +
      `[v0]trim=start=0:end=1.65,setpts=PTS-STARTPTS,scale=1500:2666,crop=1080:1920:x='170+t*150+sin(t*18)*18':y='210+t*220+sin(t*14)*20',setsar=1,eq=contrast=1.42:saturation=1.62:brightness=-0.14,gblur=sigma=1.2[s0];` +
      `[v1]trim=start=1.30:end=3.40,setpts=PTS-STARTPTS,scale=1430:2542,crop=1080:1920:x='160+sin(t*19)*24':y='240+t*120+sin(t*15)*18',setsar=1,eq=contrast=1.40:saturation=1.58:brightness=-0.13[s1];` +
      `[v2]trim=start=2.95:end=6.55,setpts=PTS-STARTPTS,scale=1560:2774,crop=1080:1920:x='120+t*170+sin(t*22)*22':y='280+t*170+sin(t*16)*18',setsar=1,eq=contrast=1.46:saturation=1.70:brightness=-0.15,drawbox=x=0:y='mod(t*620,1920)-240':w=1080:h=240:color=0x00F4FF@0.12:t=fill,drawbox=x=0:y='mod(t*620,1920)':w=1080:h=8:color=0x00F4FF@0.95:t=fill[s2];` +
      `[v3]trim=start=6.10:end=8.95,setpts=PTS-STARTPTS,scale=1600:2844,crop=1080:1920:x='220+sin(t*26)*34':y='360+t*110+sin(t*18)*26',setsar=1,eq=contrast=1.50:saturation=1.82:brightness=-0.15,drawbox=x=78:y=1028:w=930:h=380:color=0xFF1E48@0.22:t=fill:enable='lt(mod(t*8,1),0.60)',drawbox=x=72:y=1022:w=942:h=392:color=0xFF5A78@0.96:t=7:enable='lt(mod(t*12,1),0.62)'[s3];` +
      `[v4]trim=start=10.70:end=14.50,setpts=PTS-STARTPTS,scale=1480:2630,crop=1080:1920:x='150+sin(t*16)*18':y='170+t*70',setsar=1,eq=contrast=1.40:saturation=1.64:brightness=-0.16[s4];` +
      `[s0][s1][s2][s3][s4]concat=n=5:v=1:a=0[cut];` +
      `[cut]drawbox=x=0:y=0:w=84:h=1920:color=0x02060B@0.36:t=fill,` +
      `drawbox=x=996:y=0:w=84:h=1920:color=0x02060B@0.36:t=fill,` +
      `drawtext=font=Arial:text='0xA7F4\\\\n7F2D09\\\\nALRT-82\\\\nSCAN-11\\\\nCRC-914':x=30:y='mod(-t*360,1920)-400':fontsize=28:fontcolor=0x46FFB6@0.52:borderw=0:line_spacing=10,` +
      `drawtext=font=Arial:text='4E-19\\\\nC0DE\\\\nSAFE\\\\nLOCK\\\\n782A':x=972:y='mod(t*360,1920)-420':fontsize=28:fontcolor=0x2DE2FF@0.42:borderw=0:line_spacing=10,` +
      `drawbox=x=322:y=248:w=430:h=608:color=0x07101A@0.74:t=fill:enable='between(t,3.60,8.90)',` +
      `drawbox=x=322:y=248:w=430:h=608:color=0x1E2B3B@0.94:t=5:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+sin(t*10)*2':y='292+sin(t*8)*2':fontsize=150:fontcolor=0x7A1728:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+if(between(t,5.05,5.90),sin(t*34)*8,0)':y='292+if(between(t,5.05,5.90),sin(t*30)*8,0)':fontsize=166:fontcolor=0xFF3048:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+sin(t*9+0.6)*2':y='462+sin(t*8+0.8)*2':fontsize=150:fontcolor=0x7E6518:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+if(between(t,6.00,6.85),sin(t*32)*8,0)':y='462+if(between(t,6.00,6.85),sin(t*28)*8,0)':fontsize=166:fontcolor=0xFFF04A:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+sin(t*8+1.2)*2':y='632+sin(t*7+1.1)*2':fontsize=150:fontcolor=0x154C34:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='●':x='404+if(between(t,6.95,7.80),sin(t*30)*8,0)':y='632+if(between(t,6.95,7.80),sin(t*26)*8,0)':fontsize=166:fontcolor=0x46FFB6:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='CRITICAL':x=540:y=346:fontsize=34:fontcolor=0xFFE5EA:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='ATTENTION':x=540:y=516:fontsize=34:fontcolor=0xFFF6C8:enable='between(t,3.60,8.90)',` +
      `drawtext=font=Arial:text='SAFE':x=540:y=686:fontsize=34:fontcolor=0xD5FFE9:enable='between(t,3.60,8.90)',` +
      `drawbox=x=138:y=1018:w=804:h=156:color=0xFF3048@0.14:t=fill:enable='between(t,5.05,5.90)',` +
      `drawbox=x=132:y=1012:w=816:h=168:color=0xFF5A78@0.98:t=8:enable='lt(mod((t-5.05)*8,1),0.55)*between(t,5.05,5.90)',` +
      `drawtext=font=Arial:text='CRITICAL RISKS':x=168:y=1062:fontsize=38:fontcolor=0xFFF2F5:enable='between(t,5.05,5.90)',` +
      `drawbox=x=138:y=1208:w=804:h=156:color=0xFFF04A@0.14:t=fill:enable='between(t,6.00,6.85)',` +
      `drawbox=x=132:y=1202:w=816:h=168:color=0xFFE46B@0.98:t=8:enable='lt(mod((t-6.00)*8,1),0.55)*between(t,6.00,6.85)',` +
      `drawtext=font=Arial:text='ATTENTION REQUIRED':x=168:y=1252:fontsize=38:fontcolor=0xFFF7D6:enable='between(t,6.00,6.85)',` +
      `drawbox=x=138:y=1398:w=804:h=156:color=0x46FFB6@0.14:t=fill:enable='between(t,6.95,7.80)',` +
      `drawbox=x=132:y=1392:w=816:h=168:color=0x65FFD0@0.98:t=8:enable='lt(mod((t-6.95)*8,1),0.55)*between(t,6.95,7.80)',` +
      `drawtext=font=Arial:text='STANDARD / SAFE':x=168:y=1442:fontsize=38:fontcolor=0xE0FFF0:enable='between(t,6.95,7.80)',` +
      `drawtext=font=Arial:text='%{eif\\:clip((t-4.90)*62\\,0\\,82)\\:d}/100':x='540-tw/2+if(between(t,4.90,6.25),sin(t*48)*12,0)':y='865+if(between(t,4.90,6.25),sin(t*40)*10,0)':fontsize=164:fontcolor=0xFF3048:enable='between(t,4.90,6.35)',` +
      `drawtext=font=Arial:text='RISK SCORE':x='540-tw/2':y=775:fontsize=48:fontcolor=0xFFF04A:enable='between(t,4.90,6.35)',` +
      `drawbox=x='-540+min(max((t-9.78)*820,0),540)':y=0:w=540:h=1920:color=0x03070B@0.88:t=fill:enable='between(t,9.78,10.30)',` +
      `drawbox=x='1080-min(max((t-9.78)*820,0),540)':y=0:w=540:h=1920:color=0x03070B@0.88:t=fill:enable='between(t,9.78,10.30)',` +
      `drawbox=x=438:y=620:w=204:h=204:color=0xFFFFFF@0.97:t=fill:enable='gte(t,10.02)',` +
      `drawtext=font=Arial:text='LA':x=540-tw/2:y=666:fontsize=110:fontcolor=0x08111C:enable='gte(t,10.02)',` +
      `subtitles='${assPath}'[v];` +
      "[2:a]volume=0.82[bed];" +
      "[bed][1:a]sidechaincompress=threshold=0.017:ratio=12:attack=8:release=220[ducked];" +
      "[1:a]volume=1.92,acompressor=threshold=-18dB:ratio=2.4:attack=9:release=110[voice];" +
      "[ducked][voice]amix=inputs=2:weights='0.56 1':duration=first[a]",
    "-map",
    "[v]",
    "-map",
    "[a]",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "18",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
    "-shortest",
    outputPath,
  ]);

  console.log("Base video:", baseVideoPath);
  console.log("Voice:", voicePath);
  console.log("Music bed:", bedPath);
  console.log("Subtitles:", assPath);
  console.log("Final video:", outputPath);
}

main().catch((error) => {
  console.error("Errore render TikTok hype:", error);
  process.exit(1);
});
