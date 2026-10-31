# Act 1 normal enemy action sources (#374)

Status: candidate. The following transparent whole-pose raster sources preserve the original portraits but do not provide separately editable part rigs. Runtime review and first-sight comprehension remain open until the generic action mapping in #375 is integrated.

## Late pass

Reference: `src/assets/enemies/late-pass-candidate-v1.png`. Keep the torn cream tardy-slip hood, black face and amber eyes, red rule/stamp, cool blue underside, dangling brass clock, ink and gouache treatment, camera and bottom anchor.

| Intent/event | Source | SHA-256 | Shape contract |
| --- | --- | --- | --- |
| `late-pass-intent-hit` / damage 4 | `src/assets/enemies/actions/late-pass-attack-candidate-v1.png` | `e12f112317bd0ba6f0e94efd03afec0f63a592f58583099cdd74cc385416c2a3` | A broad pointed slip leaves the left silhouette; clock trails low. |
| `late-pass-intent-weak` / player Weak 1 | `src/assets/enemies/actions/late-pass-debuff-candidate-v1.png` | `e146a91e8ed98f931046ff167c46ed9b120ccbb5de5a95bb32b63e8fc8cc8b78` | Ribbons loop broadly left around a raised clock; no pointed projectile. |
| Card damage / hit | `src/assets/enemies/actions/late-pass-hit-candidate-v1.png` | `8007ec385fff00d7e70b6bdd7189db6fab7dfe73400bf90a76f22a6295e9319d` | Hood compresses, eyes pinch and clock drops. |

All three are 1312×1199 RGBA PNG with alpha 0–255. They were edited separately from the same idle reference with built-in imagegen. Prompts held identity/lighting/camera and requested a single isolated enemy without floor, stage, UI, numeric values or StS2 reference. Source images remain in the versioned repository; the generated originals remain in Codex generated-images storage. Attack and Weak are deliberately different silhouettes, but this is an artist review, not proof of first-sight understanding at 70 px. Exact effect values stay in HUD/AX.

## Lost homework

Reference: `src/assets/enemies/lost-homework-candidate-v1.png`. Preserve the bound cream-and-blue answer-paper bundle, amber eyes, pale leaf marks, blue binding loop, pencil legs and camera.

| Intent/event | Source | SHA-256 | Shape contract |
| --- | --- | --- | --- |
| `homework-intent-hit` / damage 4 | `src/assets/enemies/actions/lost-homework-attack-candidate-v1.png` | `b3fe0a68f926097bf97eada376cce1b807a7cc295e5fa96026d50e708e293b1f` | One broad pointed answer sheet thrusts left; legs brace. |
| `homework-intent-weak` / player Weak 1 | `src/assets/enemies/actions/lost-homework-debuff-candidate-v1.png` | `d84c70553a3b2b70b7c99806626e5302651925bef36edd5b902a832df02d8a3f` | Several thin sheets fan outward as a disorienting cloud. |
| Card damage / hit | `src/assets/enemies/actions/lost-homework-hit-candidate-v1.png` | `9f98fb76d8f48c5bdbab82aec233f6e47e27ddf1cf3997ac08f46a0581de3f89` | Bundle folds low, eyes squeeze, loose corners jump up. |

The three PNGs were generated as separate transparent edits from the same idle target using built-in imagegen. They are whole-body poses, not independently adjustable paper/leg parts. The effect/target and all numbers stay in live UI/AX. At 70 px, the fan may still be confused with a paper attack; this needs an unfamiliar-player comparison.

## Unmade in this issue

`hall-mop` and `folded-school-map` still need their Intent-specific poses, hit reactions and source records. All four enemies still need runtime mapping, GameShell screenshots and first-sight/iPad checks. Do not close #374 based on source pose production.
