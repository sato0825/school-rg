import { expect, test } from "@playwright/test";

test("every battle cue renders at a restrained peak and quiet mode remains audible", async ({ page }) => {
  await page.goto("/");
  const measurements = await page.evaluate(async () => {
    const { createAudioFeedback } = await import("/src/ui/audio.ts" as string);
    const cues = ["card", "enemy", "hit", "block", "status", "win", "lose", "route", "reward"] as const;
    // OfflineAudioContext schedules before rendering; expose the scheduling state
    // while retaining the browser's real Web Audio nodes and rendered samples.
    const offlineReady = (context: OfflineAudioContext) => {
      Object.defineProperty(context, "state", { value: "running" });
      return context as unknown as AudioContext;
    };
    const render = async (cue: typeof cues[number], quiet: boolean) => {
      const context = new OfflineAudioContext(1, 44100 * 0.35, 44100);
      const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => offlineReady(context));
      feedback.setQuiet(quiet);
      feedback.activate();
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
    const context = new OfflineAudioContext(1, 44100 * 0.4, 44100);
    const feedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => offlineReady(context));
    feedback.activate();
    feedback.play("card");
    feedback.play("hit", 0.07);
    const combinedSamples = (await context.startRendering()).getChannelData(0);
    const combinedPeak = combinedSamples.reduce((peak: number, sample: number) => Math.max(peak, Math.abs(sample)), 0);
    const mutedContext = new OfflineAudioContext(1, 44100 * 0.35, 44100);
    const mutedFeedback = createAudioFeedback({ read: () => null, write: () => undefined }, () => offlineReady(mutedContext));
    mutedFeedback.activate();
    mutedFeedback.play("win");
    mutedFeedback.toggle();
    const mutedSamples = (await mutedContext.startRendering()).getChannelData(0);
    const mutedPeak = mutedSamples.reduce((peak: number, sample: number) => Math.max(peak, Math.abs(sample)), 0);
    return { result, combinedPeak, mutedPeak };
  });
  for (const { normal, quiet } of Object.values(measurements.result)) {
    expect(normal.rms).toBeGreaterThan(0.001);
    expect(normal.peak).toBeLessThan(0.15);
    expect(quiet.rms / normal.rms).toBeGreaterThan(0.3);
    expect(quiet.rms / normal.rms).toBeLessThan(0.5);
  }
  expect(measurements.combinedPeak).toBeLessThan(0.15);
  expect(measurements.mutedPeak).toBeLessThan(0.00001);
});
