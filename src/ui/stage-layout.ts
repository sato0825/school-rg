export type StageSlot = { xPercent: number };
export type StageLayout = { allies: StageSlot[]; enemies: StageSlot[] };

const allyPositions: Readonly<Record<number, readonly number[]>> = {
  1: [22],
  2: [17, 37],
  3: [10, 27, 44],
};
const enemyPositions: Readonly<Record<number, readonly number[]>> = {
  0: [],
  1: [76],
  2: [68, 85],
  3: [62, 77, 92],
  4: [58, 69, 80, 91],
  5: [56, 65, 74, 83, 92],
};

/** Presentation slots only. This does not define party combat rules. */
export function stageLayout(allyCount: number, enemyCount: number): StageLayout {
  const allies = allyPositions[allyCount];
  const enemies = enemyPositions[enemyCount];
  if (!allies || !enemies) throw new RangeError("stage supports 1–3 allies and 0–5 enemies");
  return {
    allies: allies.map((xPercent) => ({ xPercent })),
    enemies: enemies.map((xPercent) => ({ xPercent })),
  };
}
