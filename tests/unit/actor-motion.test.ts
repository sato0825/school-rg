import { describe, expect, it } from "vitest";
import { actorMotionClips, actorMotionState, literatureMotionCandidate } from "../../src/ui/actor-motion.js";

const poses = { idle: "idle.png", activate: "activate.png", hit: "hit.png" };

describe("candidate actor motion timeline", () => {
  it("keeps a fixed identity/canvas contract and records the missing editable source", () => {
    expect(literatureMotionCandidate.characterId).toBe("literature-student");
    expect(literatureMotionCandidate.canvas).toEqual({ width: 1024, height: 1536 });
    expect(literatureMotionCandidate.editableSource).toBeNull();
    expect(Object.keys(literatureMotionCandidate.poseIds)).toEqual(["idle", "activate", "hit"]);
    expect(actorMotionClips["card-use"].durationMs).toBe(380);
    expect(actorMotionClips.hit.durationMs).toBe(420);
  });

  it("selects the card and hit pose at the event timestamp, preserving elapsed phase after redraw", () => {
    const card = actorMotionState("hero", 1_000, 1_190, false, "literature-demo", poses);
    expect(card).toEqual({ baseUrl: "idle.png", overlayUrl: "activate.png", kind: "card-use", delayMs: -190 });
    expect(actorMotionState("hero", 1_000, 1_190, false, "literature-demo", poses)).toEqual(card);
    expect(actorMotionState("hit", 2_000, 2_140, false, "literature-demo", poses))
      .toEqual({ baseUrl: "idle.png", overlayUrl: "hit.png", kind: "hit", delayMs: -140 });
  });

  it("uses the action pose without movement in quiet mode and leaves other clubs unchanged", () => {
    expect(actorMotionState("hero", 1_000, 1_190, true, "literature-demo", poses))
      .toEqual({ baseUrl: "idle.png", overlayUrl: "activate.png", kind: "card-use", delayMs: 0 });
    expect(actorMotionState("hit", 1_000, 1_140, false, "science-demo", poses)).toBeNull();
    expect(actorMotionState(null, null, 0, false, "literature-demo", poses))
      .toEqual({ baseUrl: "idle.png", overlayUrl: null, kind: null, delayMs: 0 });
  });
});
