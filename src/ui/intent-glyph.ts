import type { IntentStepKind, IntentTarget } from "./intent-visual.js";

/** Original vector silhouettes. The same shape is used for a preview and its resolved cue. */
const shape: Record<IntentStepKind, string> = {
  attack: '<path d="M22 3C17 8 13 12 5 21m0-7v7h7M18 4l-4 7m9 5-6 1"/>',
  block: '<path d="M12 2 21 6v6c0 5-3 8-9 11-6-3-9-6-9-11V6l9-4Z"/><path d="m7 13 3 3 7-7"/>',
  heal: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M7 12h10"/>',
  buff: '<path d="M12 21V6m-6 6 6-6 6 6M4 19l3-3m13 3-3-3M4 7l3 2m13-2-3 2"/>',
  debuff: '<path d="M12 3v13m-6-6 6 6 6-6M4 20h16M7 4l2 3m8-3-2 3"/>',
  summon: '<path d="M4 22V9a8 8 0 0 1 16 0v13H4Z"/><path d="M12 7v12m-4-4 4 4 4-4"/>',
  unknown: '<circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 4h.1"/>',
};

const targetShape: Record<IntentTarget, string> = {
  player: '<path d="M19 12H5m6-6-6 6 6 6"/>',
  self: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2"/>',
  enemy_side: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  unknown: '<circle cx="12" cy="12" r="8"/><path d="M12 8v5m0 3h.1"/>',
};

function svg(className: string, path: string): string {
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" focusable="false" aria-hidden="true">${path}</svg>`;
}

export function intentGlyphMarkup(kind: IntentStepKind): string { return svg("intent-glyph", shape[kind]); }
export function intentTargetMarkup(target: IntentTarget): string { return svg("intent-target-glyph", targetShape[target]); }
