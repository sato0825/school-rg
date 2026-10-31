import { expect, test } from "@playwright/test";

test("every battle cue renders at a restrained peak and quiet mode remains audible", async ({ page }) => {
  await page.goto("/");
  const measurements = await page.evaluate(async () => {
    const { createAudioFeedback } = await import("/src/ui/audio.ts" as string);
    const cues = ["card", "enemy", "hit", "block", "status", "win", "lose"] as const;
    const render = async (cue: typeof cues[number], quiet: boolean) => {
      const context = new OfflineAudioContext(1, 44100 * 0.35, 44100);
      const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => context as unknown as AudioContext);
      feedback.setQuiet(quiet);
      feedback.play(cue);
      const samples = (await context.startRendering()).getChannelData(0);
      let peak = 0;
      let energy = 0;
      for (const sample of samples) {
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      return { peak, rms: Math.sqrt(energy / samples.length) };
    };
    const result: Record<string, { normal: { peak: number; rms: number }; quiet: { peak: number; rms: number } }> = {};
    for (const cue of cues) result[cue] = { normal: await render(cue, false), quiet: await render(cue, true) };
    return result;
  });
  for (const { normal, quiet } of Object.values(measurements)) {
    expect(normal.rms).toBeGreaterThan(0.001);
    expect(normal.peak).toBeLessThan(0.15);
    expect(quiet.rms / normal.rms).toBeGreaterThan(0.3);
    expect(quiet.rms / normal.rms).toBeLessThan(0.5);
  }
});
