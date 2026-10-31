import { actionDelayMs, MOTION_MS } from "./motion-timing.js";

/** Candidate whole-pose sources used as a fallback until every rig layer is decoded. */
export type ActorPoseSources = Readonly<{ idle: string; activate: string; hit: string }>;
export type ActorMotionKind = "card-use" | "hit";

export type ActorMotionClip = Readonly<{
  kind: ActorMotionKind;
  durationMs: number;
  pose: "activate" | "hit";
  /** The visual contact must coincide with the card/result feedback, never with typing start. */
  contactMs: number;
}>;

export const actorMotionClips: Readonly<Record<ActorMotionKind, ActorMotionClip>> = {
  "card-use": { kind: "card-use", durationMs: MOTION_MS.hero, pose: "activate", contactMs: 0 },
  hit: { kind: "hit", durationMs: MOTION_MS.hit, pose: "hit", contactMs: 0 },
};

/** The canvas and foot anchor are a review contract, not proof that candidate feet coincide. */
export const literatureMotionCandidate = {
  characterId: "literature-student",
  sourceState: "candidate",
  sourceVersion: 1,
  canvas: { width: 1024, height: 1536 },
  footAnchor: { x: 0.5, y: 0.975 },
  editableSource: null,
  poseIds: {
    idle: "literature-idle-candidate-v1",
    activate: "literature-activate-candidate-v2",
    hit: "literature-hit-candidate-v2",
  },
} as const;

export function actorMotionState(
  motion: "hero" | "enemy" | "hit" | null,
  startedAtMs: number | null,
  nowMs: number,
  lowStimulus: boolean,
  clubId: string,
  sources: ActorPoseSources | undefined,
): Readonly<{ baseUrl: string; overlayUrl: string | null; kind: ActorMotionKind | null; delayMs: number }> | null {
  if ((clubId !== "literature-demo" && clubId !== "science-demo") || !sources) return null;
  const kind = motion === "hero" ? "card-use" : motion === "hit" ? "hit" : null;
  if (!kind) return { baseUrl: sources.idle, overlayUrl: null, kind: null, delayMs: 0 };
  const clip = actorMotionClips[kind];
  return {
    baseUrl: sources[clip.pose],
    overlayUrl: lowStimulus ? null : sources.idle,
    kind,
    delayMs: lowStimulus ? 0 : actionDelayMs(nowMs, startedAtMs ?? nowMs, clip.durationMs),
  };
}
