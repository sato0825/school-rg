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

## Folded school map

Reference: `src/assets/enemies/folded-school-map-candidate-v1.png`. Preserve the broad cream accordion map, blue-green rooms, red corridor lines, central dark triangular hood/amber eyes and red tassel/bell on the left.

| Intent/event | Source | SHA-256 | Shape contract |
| --- | --- | --- | --- |
| `map-intent-hit` / damage 4 | `src/assets/enemies/actions/folded-school-map-attack-candidate-v1.png` | `1da15149b89ecac453195807404de0826981c23403c4bb2d3ab890c892a92845` | Left fold extends as a large pointed beak. |
| `map-intent-call` / summon `paper-scrap` | `src/assets/enemies/actions/folded-school-map-summon-candidate-v1.png` | `829cb83ab1131e831cfa39d109a08b7d6400ee99766ae8d85a6f376499177309` | Accordion opens a round negative-space gate; no second creature is painted. |
| Card damage / hit | `src/assets/enemies/actions/folded-school-map-hit-candidate-v1.png` | `69f8d011592d72dc584c039198335b9fc6a0e8d204898a9358e22ea28a6477c3` | Map folds down and tassel swings; this recoil is subtle at small sizes. |

These are built-in imagegen transparent edits of the same portrait. The wide floating enemy has no physical floor contact; its center/bottom placement must remain stable in the GameShell. The hit candidate may fail the small-scale reaction gate and must be checked alongside a runtime shot before adoption.

## Hall mop portrait gate

The current `hall-mop-candidate-v1/v2` portraits have an opaque dark background and a more textured, near-real rendering than the other school-paper enemies. Deriving three action poses directly from this portrait would preserve that mismatch and prevent clean cutout motion. A versioned, transparent style-aligned idle reference is needed before its `mop-intent-sweep` (damage twice, then Block), `mop-intent-hit` and hit reaction can pass the #29 art gate. This is a per-enemy block; the other three candidates can continue to runtime validation.

## Unmade in this issue

`hall-mop` still needs a style-aligned transparent idle and all Intent-specific poses and hit reaction. The other three candidates still need runtime mapping, GameShell screenshots, mixed 5-enemy composition, first-sight/iPad checks and part-editable source rigs. Do not close #374 based on source pose production.
