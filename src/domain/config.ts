import * as z from "zod";

const source = z.string().url();
const ownerIssue = z.number().int().positive();

function setting<T extends z.ZodType>(value: T) {
  return z.discriminatedUnion("status", [
    z.strictObject({ status: z.literal("confirmed"), value, source, ownerIssue }),
    z.strictObject({ status: z.literal("provisional"), value, source, ownerIssue }),
    z.strictObject({ status: z.literal("unresolved"), value: z.null(), source, ownerIssue }),
  ]);
}

const positiveInt = z.number().int().positive();
const inputKey = z.enum(["Enter", "Space", "Tab"]);
const punctuationPolicy = z.enum(["literal", "ignore"]);
const whitespacePolicy = z.enum(["literal", "ignore", "collapse"]);
const sameNamePolicy = z.enum(["first_in_hand", "select_instance"]);
const xRoundingPolicy = z.enum(["floor", "ceil", "nearest"]);

/** Unresolved values cannot silently become game rules. */
export const GameConfigSchema = z.strictObject({
  cardsDrawnPerTurn: setting(positiveInt),
  playerTurnMs: setting(positiveInt),
  prefixConfirmKey: setting(inputKey),
  inputCancelKey: setting(z.literal("Escape")),
  whitespacePolicy: setting(whitespacePolicy),
  punctuationPolicy: setting(punctuationPolicy),
  caseSensitiveInput: setting(z.boolean()),
  sameNameCardPolicy: setting(sameNamePolicy),
  handLimit: setting(positiveInt),
  potionSlots: setting(positiveInt),
  potionModeKey: setting(z.enum(["F2", "Tab"])),
  timeCapMs: setting(positiveInt),
  xRoundingPolicy: setting(xRoundingPolicy),
  clubNames: setting(z.array(z.string().min(1)).length(5)),
  energyEquivalentMs: setting(positiveInt),
  counterAfterLethal: setting(z.boolean()),
  deadlineTiePolicy: setting(z.enum(["timeout_wins", "input_wins"])),
  etherealRetainPriority: setting(z.enum(["ethereal", "retain"])),
  innateCountsTowardDraw: setting(z.boolean()),
  weakMultiplierPercent: setting(positiveInt),
  vulnerableMultiplierPercent: setting(positiveInt),
  frailMultiplierPercent: setting(positiveInt),
  poisonTickTiming: setting(z.enum(["owner_start", "owner_end"])),
  debuffDecayTiming: setting(z.enum(["owner_start", "owner_end"])),
});

export type GameConfig = z.infer<typeof GameConfigSchema>;

const designDoc = "https://docs.google.com/document/d/1Z4eGdsTD1q9eu6O1czWZs96LPDSavSnT1zncXpa5uRI/edit";
const epic = "https://github.com/sato0825/school-rg/issues/27";
const typingIssue = "https://github.com/sato0825/school-rg/issues/5";
const selectionIssue = "https://github.com/sato0825/school-rg/issues/6";

export const DEFAULT_GAME_CONFIG: GameConfig = GameConfigSchema.parse({
  cardsDrawnPerTurn: { status: "provisional", value: 5, source: designDoc, ownerIssue: 4 },
  playerTurnMs: { status: "provisional", value: 10_000, source: designDoc, ownerIssue: 4 },
  prefixConfirmKey: { status: "provisional", value: "Enter", source: designDoc, ownerIssue: 6 },
  inputCancelKey: { status: "provisional", value: "Escape", source: designDoc, ownerIssue: 5 },
  whitespacePolicy: { status: "provisional", value: "literal", source: typingIssue, ownerIssue: 5 },
  punctuationPolicy: { status: "provisional", value: "literal", source: typingIssue, ownerIssue: 5 },
  caseSensitiveInput: { status: "provisional", value: false, source: typingIssue, ownerIssue: 5 },
  sameNameCardPolicy: { status: "provisional", value: "select_instance", source: selectionIssue, ownerIssue: 6 },
  handLimit: { status: "provisional", value: 10, source: "https://github.com/sato0825/school-rg/issues/8", ownerIssue: 8 },
  potionSlots: { status: "provisional", value: 3, source: "https://github.com/sato0825/school-rg/issues/22", ownerIssue: 22 },
  potionModeKey: { status: "provisional", value: "F2", source: "https://github.com/sato0825/school-rg/issues/22", ownerIssue: 22 },
  timeCapMs: { status: "provisional", value: 30_000, source: "https://github.com/sato0825/school-rg/issues/11", ownerIssue: 11 },
  xRoundingPolicy: { status: "provisional", value: "floor", source: "https://github.com/sato0825/school-rg/issues/11", ownerIssue: 11 },
  clubNames: { status: "unresolved", value: null, source: designDoc, ownerIssue: 12 },
  energyEquivalentMs: { status: "confirmed", value: 2_000, source: epic, ownerIssue: 11 },
  counterAfterLethal: { status: "provisional", value: false, source: "https://github.com/sato0825/school-rg/issues/9", ownerIssue: 9 },
  deadlineTiePolicy: { status: "provisional", value: "timeout_wins", source: "https://github.com/sato0825/school-rg/issues/4", ownerIssue: 4 },
  etherealRetainPriority: { status: "provisional", value: "ethereal", source: "https://github.com/sato0825/school-rg/issues/8", ownerIssue: 8 },
  innateCountsTowardDraw: { status: "provisional", value: true, source: "https://github.com/sato0825/school-rg/issues/8", ownerIssue: 8 },
  weakMultiplierPercent: { status: "provisional", value: 75, source: "https://github.com/sato0825/school-rg/issues/10", ownerIssue: 10 },
  vulnerableMultiplierPercent: { status: "provisional", value: 150, source: "https://github.com/sato0825/school-rg/issues/10", ownerIssue: 10 },
  frailMultiplierPercent: { status: "provisional", value: 75, source: "https://github.com/sato0825/school-rg/issues/10", ownerIssue: 10 },
  poisonTickTiming: { status: "provisional", value: "owner_start", source: "https://github.com/sato0825/school-rg/issues/10", ownerIssue: 10 },
  debuffDecayTiming: { status: "provisional", value: "owner_end", source: "https://github.com/sato0825/school-rg/issues/10", ownerIssue: 10 },
});

export function parseGameConfig(value: unknown): GameConfig {
  return GameConfigSchema.parse(value);
}

export function requireSetting<T>(
  setting: { status: "confirmed" | "provisional"; value: T; ownerIssue: number } |
    { status: "unresolved"; value: null; ownerIssue: number },
): NonNullable<T> {
  if (setting.status === "unresolved") {
    throw new Error(`Game setting is unresolved; see issue #${setting.ownerIssue}`);
  }
  return setting.value as NonNullable<T>;
}
