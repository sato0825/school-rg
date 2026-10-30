import type { CombatState, RunState } from "./schema.js";

/** Player defeat takes precedence if an effect defeats both sides together. */
export function assessCombatOutcome(run: RunState): RunState {
  const combat = run.combat;
  if (!combat) throw new Error("combat is required");
  let phase: CombatState["phase"] = combat.phase;
  if (run.player.hp === 0) phase = "LOST";
  else if (combat.enemies.every((enemy) => enemy.hp === 0)) phase = "WON";
  return phase === combat.phase ? run : { ...run, combat: { ...combat, phase } };
}
