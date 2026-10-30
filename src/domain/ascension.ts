import * as z from "zod";
import type { ContentRegistry } from "./schema.js";
import type { RunSession } from "./run-flow.js";

const issue = "https://github.com/sato0825/school-rg/issues/66";
/** Values and unlock rules are provisional until the content balance review. */
export const ASCENSION_RULES = [
  { level: 1, label: "強敵の体力", kind: "enemy_hp_percent", value: 120, status: "provisional", source: issue },
  { level: 2, label: "体力の制約", kind: "starting_hp_loss", value: 5, status: "provisional", source: issue },
] as const;

export const MAX_ASCENSION_LEVEL = ASCENSION_RULES.length;
export const ProgressionSchema = z.strictObject({
  formatVersion: z.literal(1),
  unlockedByClub: z.record(z.string().min(1), z.number().int().min(0).max(MAX_ASCENSION_LEVEL)),
});
export type Progression = z.infer<typeof ProgressionSchema>;

export function emptyProgression(): Progression { return { formatVersion: 1, unlockedByClub: {} }; }

export function parseProgression(value: unknown, content: ContentRegistry): Progression {
  const progression = ProgressionSchema.parse(value);
  const known = new Set(content.clubs.map((club) => club.id));
  for (const clubId of Object.keys(progression.unlockedByClub)) if (!known.has(clubId)) throw new RangeError(`unknown progression club: ${clubId}`);
  return progression;
}

export function assertAscensionLevel(level: number): void {
  if (!Number.isSafeInteger(level) || level < 0 || level > MAX_ASCENSION_LEVEL) throw new RangeError(`invalid Ascension level: ${level}`);
}

export function unlockedLevel(progression: Progression, clubId: string): number { return progression.unlockedByClub[clubId] ?? 0; }

/** A full three-Act victory at the currently highest unlocked level opens one more. */
export function unlockAfterVictory(progression: Progression, session: RunSession): Progression {
  const run = session.run;
  const finalNode = run.map.nodes.find((node) => node.id === run.map.currentNodeId);
  if (session.screen !== "won" || finalNode?.kind !== "boss" || finalNode.act !== 3 || !session.completedNodeIds.includes(finalNode.id)) {
    throw new Error("Ascension unlock requires a completed three-Act victory");
  }
  assertAscensionLevel(run.ascensionLevel);
  const highest = unlockedLevel(progression, run.clubId);
  if (run.ascensionLevel !== highest || highest === MAX_ASCENSION_LEVEL) return progression;
  return { ...progression, unlockedByClub: { ...progression.unlockedByClub, [run.clubId]: highest + 1 } };
}

export function ascensionStartingHp(base: number, level: number): number {
  assertAscensionLevel(level);
  return Math.max(1, base - (level >= 2 ? ASCENSION_RULES[1].value : 0));
}

export function ascensionEnemyHp(base: number, level: number): number {
  assertAscensionLevel(level);
  return level >= 1 ? Math.max(1, Math.ceil(base * ASCENSION_RULES[0].value / 100)) : base;
}
