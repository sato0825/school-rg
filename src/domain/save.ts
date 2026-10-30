import * as z from "zod";
import type { MonotonicClock } from "./clock.js";
import type { RunSession, RunScreen } from "./run-flow.js";
import type { ContentRegistry, RunState } from "./schema.js";
import { pausePlayerTurn, type TurnEndDisposition } from "./turn-state.js";
import { parseRunState } from "./validate.js";

export const SAVE_FORMAT_VERSION = 1 as const;

const SavedSessionSchema = z.strictObject({
  runId: z.string().min(1).optional(),
  run: z.unknown(),
  screen: z.enum(["map", "combat", "reward", "shop", "rest", "event", "treasure", "won", "lost"]),
  completedNodeIds: z.array(z.string().min(1)),
  rewardCardIds: z.array(z.string().min(1)),
});

const SaveEnvelopeSchema = z.strictObject({
  formatVersion: z.literal(SAVE_FORMAT_VERSION),
  session: SavedSessionSchema,
});

export class UnsupportedSaveVersionError extends Error {
  constructor(readonly version: unknown) {
    super(`unsupported save format version: ${String(version)}`);
    this.name = "UnsupportedSaveVersionError";
  }
}

function validateSession(session: RunSession, content: ContentRegistry): void {
  const { run, screen, completedNodeIds, rewardCardIds } = session;
  if (session.runId === "") throw new RangeError("run ID must not be empty");
  const nodeIds = new Set(run.map.nodes.map((node) => node.id));
  if (new Set(completedNodeIds).size !== completedNodeIds.length || completedNodeIds.some((id) => !nodeIds.has(id))) {
    throw new RangeError("completed map nodes are invalid or duplicated");
  }
  if (screen === "map" && !completedNodeIds.includes(run.map.currentNodeId)) throw new RangeError("current map node is not complete");
  if ((screen === "combat" || screen === "reward") && !run.combat) throw new RangeError("combat state is missing");
  if (screen !== "combat" && screen !== "reward" && screen !== "lost" && run.combat) throw new RangeError("combat state remains on a non-combat screen");
  if ((screen === "shop") !== Boolean(run.shop)) throw new RangeError("shop screen and stock disagree");
  if ((screen === "treasure") !== Boolean(run.treasure)) throw new RangeError("treasure screen and offers disagree");
  if (screen === "event" && (!run.event || run.event.choiceId)) throw new RangeError("event screen has no pending choice");
  if (run.event && screen !== "event" && !(screen === "combat" && run.event.pendingCombat) && screen !== "lost") {
    throw new RangeError("active event is on an invalid screen");
  }
  const knownCards = new Set(content.cards.map((card) => card.id));
  if (rewardCardIds.some((id) => !knownCards.has(id)) || new Set(rewardCardIds).size !== rewardCardIds.length) throw new RangeError("reward cards are invalid");
  if ((screen === "reward") !== (rewardCardIds.length > 0)) throw new RangeError("reward screen and choices disagree");
  if (screen === "reward" && run.combat?.phase !== "WON") throw new RangeError("reward requires won combat");
  if (screen === "won" && run.combat) throw new RangeError("won run cannot retain combat");
}

/** Freezes a copy at the injected clock time; the live session remains untouched. */
export function serializeRunSession(session: RunSession, content: ContentRegistry, clock: MonotonicClock, disposition: TurnEndDisposition): string {
  let run: RunState = session.run;
  if (session.screen === "combat" && run.combat?.phase === "PLAYER_INPUT" && !run.combat.clock.paused) {
    run = pausePlayerTurn(run, clock, disposition);
  }
  const snapshot: RunSession = { ...session, run: parseRunState(run, content) };
  validateSession(snapshot, content);
  return JSON.stringify({ formatVersion: SAVE_FORMAT_VERSION, session: snapshot });
}

/** Unknown versions are rejected; a future migration must be explicit and tested. */
export function deserializeRunSession(json: string, content: ContentRegistry, clock: MonotonicClock): RunSession {
  const raw: unknown = JSON.parse(json);
  if (!raw || typeof raw !== "object" || !("formatVersion" in raw) || raw.formatVersion !== SAVE_FORMAT_VERSION) {
    const version = raw && typeof raw === "object" && "formatVersion" in raw ? raw.formatVersion : undefined;
    throw new UnsupportedSaveVersionError(version);
  }
  const parsed = SaveEnvelopeSchema.parse(raw);
  let run = parseRunState(parsed.session.run, content);
  const now = clock.nowMs();
  if (!Number.isSafeInteger(now) || now < 0) throw new RangeError("clock must return a nonnegative integer millisecond timestamp");
  if (run.combat) {
    run = { ...run, combat: { ...run.combat, clock: { ...run.combat.clock, lastEventAtMs: now,
      paused: run.combat.phase === "PLAYER_INPUT" ? true : run.combat.clock.paused } } };
  }
  const session: RunSession = { runId: parsed.session.runId, run, screen: parsed.session.screen as RunScreen,
    completedNodeIds: parsed.session.completedNodeIds, rewardCardIds: parsed.session.rewardCardIds };
  validateSession(session, content);
  return session;
}
