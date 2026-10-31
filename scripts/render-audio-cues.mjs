import { chromium } from "@playwright/test";
import { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";

const url = process.argv[2];
const output = process.argv[3];
if (!url || !output) throw new Error("Usage: node scripts/render-audio-cues.mjs <vite-url> <new-output.wav>");

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(url);
  const samples = await page.evaluate(async () => {
    const { createAudioFeedback } = await import("/src/ui/audio.ts");
    const sampleRate = 44100;
    const context = new globalThis.OfflineAudioContext(1, sampleRate * 4.4, sampleRate);
    const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => context);
    const cues = ["card", "enemy", "hit", "block", "status", "win", "lose"];
    cues.forEach((cue, index) => feedback.play(cue, index * 0.58));
    return Array.from((await context.startRendering()).getChannelData(0));
  });
  const dataBytes = samples.length * 2;
  const wav = Buffer.alloc(44 + dataBytes);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + dataBytes, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(44100, 24);
  wav.writeUInt32LE(88200, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(dataBytes, 40);
  samples.forEach((sample, index) => wav.writeInt16LE(Math.round(Math.max(-1, Math.min(1, sample)) * 32767), 44 + index * 2));
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, wav, { flag: "wx" });
  process.stdout.write(`${path}\n`);
} finally {
  await browser.close();
}
