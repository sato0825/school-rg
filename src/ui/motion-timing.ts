/** CSS animations are recreated with the battle DOM. A negative delay restores their shared phase. */
export const MOTION_MS = { heroIdle: 3_100, enemyIdle: 3_500, hero: 380, enemy: 600, enemyPhase: 650, hit: 420 } as const;

export function loopDelayMs(nowMs: number, durationMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(durationMs) || durationMs <= 0) throw new RangeError("invalid animation time");
  const phase = ((nowMs % durationMs) + durationMs) % durationMs;
  return phase === 0 ? 0 : -phase;
}

export function actionDelayMs(nowMs: number, startedAtMs: number, durationMs: number): number {
  if (!Number.isFinite(nowMs) || !Number.isFinite(startedAtMs) || !Number.isFinite(durationMs) || durationMs <= 0) throw new RangeError("invalid animation time");
  const elapsed = Math.max(0, Math.min(durationMs, nowMs - startedAtMs));
  return elapsed === 0 ? 0 : -elapsed;
}
