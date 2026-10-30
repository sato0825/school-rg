import * as z from "zod";

export const SCHEMA_VERSION = 1 as const;

const id = z.string().min(1).regex(/^[A-Za-z0-9][A-Za-z0-9_.-]*$/);
const text = z.string().min(1).refine((value) => value.trim().length > 0);
const nonNegativeInt = z.number().int().nonnegative();
const positiveInt = z.number().int().positive();

// Input vocabulary is deliberately separate from effect definitions. Its
// normalization and punctuation rules belong to #5/#6, not this schema.
export const InputWordSchema = z.strictObject({
  text: text.refine((value) => !/[\r\n]/.test(value)),
  locale: z.literal("en"),
});

export const EffectSchema = z.strictObject({
  id,
  kind: id,
  parameters: z.record(z.string(), z.unknown()),
});

export const CardSchema = z.strictObject({
  id,
  name: text,
  type: z.enum(["attack", "skill", "power", "status", "curse"]),
  target: z.enum(["self", "enemy", "all_enemies", "hand", "none"]),
  input: InputWordSchema,
  effectIds: z.array(id),
  upgradeEffectIds: z.array(id).optional(),
  keywordIds: z.array(id),
  xTimePolicy: z.strictObject({ rounding: z.enum(["floor", "ceil", "nearest", "default"]), consume: z.enum(["all", "units", "none"]) }).optional(),
});

export const IntentSchema = z.strictObject({
  id,
  label: text,
  category: z.enum(["attack", "defend", "buff", "debuff", "summon", "mixed"]),
  effectIds: z.array(id),
});

export const EnemySchema = z.strictObject({
  id,
  name: text,
  maxHp: positiveInt,
  intentIds: z.array(id).min(1),
});

export const RelicSchema = z.strictObject({
  id,
  name: text,
  triggerIds: z.array(id),
  effectIds: z.array(id),
});

export const PotionSchema = z.strictObject({
  id,
  name: text,
  input: InputWordSchema,
  target: z.enum(["self", "enemy", "all_enemies", "none"]),
  effectIds: z.array(id),
});

// Club names and starter counts are content, not hard-coded game rules.
export const ClubSchema = z.strictObject({
  id,
  name: text,
  startingHp: positiveInt,
  starterCardIds: z.array(id).min(1),
  cardPoolIds: z.array(id).min(1),
  startingRelicId: id.nullable(),
});

export const ContentRegistrySchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  effects: z.array(EffectSchema),
  cards: z.array(CardSchema),
  intents: z.array(IntentSchema),
  enemies: z.array(EnemySchema),
  relics: z.array(RelicSchema),
  potions: z.array(PotionSchema),
  clubs: z.array(ClubSchema),
});

export const CardInstanceSchema = z.strictObject({
  instanceId: id,
  cardId: id,
  upgraded: z.boolean(),
});

export const EnemyInstanceSchema = z.strictObject({
  instanceId: id,
  enemyId: id,
  hp: nonNegativeInt,
  maxHp: positiveInt,
  block: nonNegativeInt,
  intentId: id,
  intentHistoryIds: z.array(id),
});

export const MapNodeSchema = z.strictObject({
  id,
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  floor: nonNegativeInt,
  kind: z.enum(["start", "combat", "elite", "event", "shop", "rest", "treasure", "boss"]),
  nextIds: z.array(id),
});

export const TypingStateSchema = z.strictObject({
  buffer: z.string(),
  candidateCardInstanceIds: z.array(id),
  selectedCardInstanceId: id.nullable(),
  progress: nonNegativeInt,
  targetEnemyInstanceId: id.nullable(),
});

export const TurnClockStateSchema = z.strictObject({
  remainingMs: nonNegativeInt,
  lastEventAtMs: nonNegativeInt,
  paused: z.boolean(),
});

export const CombatStatusesSchema = z.strictObject({
  player: z.record(z.string(), z.number().int()),
  enemies: z.record(z.string(), z.record(z.string(), z.number().int())),
});

export const CombatStateSchema = z.strictObject({
  phase: z.enum(["PLAYER_START", "PLAYER_INPUT", "PLAYER_END", "ENEMY_PHASE", "WON", "LOST"]),
  turn: positiveInt,
  cards: z.array(CardInstanceSchema),
  drawPile: z.array(id),
  hand: z.array(id),
  discardPile: z.array(id),
  exhaustPile: z.array(id),
  resolvingPile: z.array(id).default([]),
  enemies: z.array(EnemyInstanceSchema),
  typing: TypingStateSchema,
  clock: TurnClockStateSchema,
  nextTurnBonusMs: nonNegativeInt.default(0),
  statuses: CombatStatusesSchema.default({ player: {}, enemies: {} }),
});

export const RunStateSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  seed: z.number().int().min(0).max(0xffffffff),
  rngState: z.number().int().min(0).max(0xffffffff),
  clubId: id,
  act: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  player: z.strictObject({ hp: nonNegativeInt, maxHp: positiveInt, block: nonNegativeInt }),
  deck: z.array(CardInstanceSchema),
  relicIds: z.array(id),
  potionIds: z.array(id),
  map: z.strictObject({ nodes: z.array(MapNodeSchema), currentNodeId: id }),
  combat: CombatStateSchema.nullable(),
});

export type ContentRegistry = z.infer<typeof ContentRegistrySchema>;
export type Card = z.infer<typeof CardSchema>;
export type Effect = z.infer<typeof EffectSchema>;
export type Enemy = z.infer<typeof EnemySchema>;
export type EnemyInstance = z.infer<typeof EnemyInstanceSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Relic = z.infer<typeof RelicSchema>;
export type Potion = z.infer<typeof PotionSchema>;
export type MapNode = z.infer<typeof MapNodeSchema>;
export type CombatState = z.infer<typeof CombatStateSchema>;
export type RunState = z.infer<typeof RunStateSchema>;
export type TurnClockState = z.infer<typeof TurnClockStateSchema>;
export type TypingState = z.infer<typeof TypingStateSchema>;
export type CombatStatuses = z.infer<typeof CombatStatusesSchema>;
