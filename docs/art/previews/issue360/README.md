#360 Intent causality candidate

This is a code-native visual candidate for #303 and #243, based on #317's enemy action art. It does not change combat rules.

- `five-preview-*`: five attacking enemies, each with a short windup on its body. No target line is drawn until the player selects an enemy.
- `one-resolved-*`: after four enemies are defeated, the one remaining attacker is connected to the actual ally damage mark. The HP meter updates in the same scene.
- `five-resolved-*`: five attackers resolve to an aggregate player damage mark. No single enemy is falsely credited with the whole result.
- `quiet` has the same static shapes and values without animation or glow.

Captured from real GameShell at 1024×768 and 1440×900 using the deterministic Playwright fixtures in `tests/e2e/intent-scene-continuity.spec.ts` (`seed=42`). The test checks cue containment, source/target attributes, result marks, stable stage geometry and quiet animation behavior. Targeted E2E: 17 passed; lint, typecheck and build passed on this branch.

**Still unverified:** human first-sight interpretation and physical iPad use. The five-attacker result is an aggregate; attributing each separate hit needs per-enemy effect timing from the action resolver. The artwork and the visual style remain candidates pending the #29 art gate.
