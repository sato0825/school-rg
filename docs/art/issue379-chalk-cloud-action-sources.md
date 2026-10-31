# Chalk cloud action candidate source record (#379)

Status: **candidate**, not accepted as final production art. The four transparent images are independent whole-body pose originals. Pencil/eraser, ribbons, eyes, and dust are not separately editable parts. The existing idle remains the identity reference. Original school enemy design; no Slay the Spire 2 art or expression used.

| Pose | Workspace source | SHA-256 | Pixels |
| --- | --- | --- | --- |
| Idle identity reference | `src/assets/enemies/chalk-cloud-candidate-v1.png` | `8eec0e49a0338615d0a0dde7f18fed22cab4dccbdb26662513deb20a0c341a5b` | 1312×1199 |
| Attack anticipation | `src/assets/enemies/actions/chalk-cloud-attack-candidate-v1.png` | `51684ca7207c0413d970a7247815a027d1dae006d96724eca75ef631c5464d23` | 1312×1199 |
| Weak debuff anticipation | `src/assets/enemies/actions/chalk-cloud-weak-candidate-v1.png` | `e89fc9894ff1a7a37d31f91e9567429f421e1ced0f1935b54283e559a75738ba` | 1312×1199 |
| Card-hit reaction | `src/assets/enemies/actions/chalk-cloud-hit-candidate-v1.png` | `10a4426f10528ba24c9b9af10db808aec113f8547836a68574b9314dcd4c64c5` | 1312×1199 |

## Source and intent contract

The three variants were made with the built-in image generation edit tool, always using the idle cutout as the edit target, transparent output, and distinct prompts. The tool originals are preserved in `/Users/mikoto/.codex/generated_images/01a1926c-9cd5-77f0-b51c-5cb61b8c6a98/`; the project copies above are the versioned sources consumed by the app. All prompts preserved these invariants: the same cool blue-grey chalk cyclone, diagonal green chalkboard eraser, two amber eyes, ink/gouache texture, 3/4 compact camera, light, hovering tapered foot, and true alpha; no stage, text, values, UI, other character, flash, or existing-game reference.

- `chalk-intent-hit` (`chalk-hit`, damage 4 to player): a broad chalk-dust spear/ribbon extends past the body toward player-left. The core twists and both eyes aim left. Avoid a generic icon or detached projectile.
- `chalk-intent-weak` (`chalk-weak`, Weak 1 to player): the eraser lifts while the body cups inward; a broad veil of chalk mist closes around the face. This is a different silhouette from the spear. The pose indicates obscured sight; exact status name/stack remain in HUD and AX.
- Card hit: the cyclone crumples and bends away from player-left, the eraser tilts, and three broad ribbons break away. It must remain the same enemy rather than swapping to a generic impact symbol.

The images are not yet human-approved. A first-sight visual-only comparison at one and five enemies, 1024×768 and 1440×900, normal and quiet modes is required before art adoption. If the veil reads as another attack or the floating base shifts, revise the images rather than relying on the label.

## Exact edit prompts

All three prompts used `src/assets/enemies/chalk-cloud-candidate-v1.png` as the only reference image and `transparent_background: true`.

**Attack:**

> Use case: identity-preserve. Asset type: isolated transparent action pose for an original school typing roguelike enemy. Edit target: the provided chalk-cloud idle illustration. Preserve the exact same individual: a cool blue-grey white-chalk dust cyclone, green chalkboard eraser embedded diagonally at upper left, two small amber eyes, ink-and-gouache painterly texture, soft blue contour, compact 3/4 camera, hovering tapered bottom, no limbs. Action: ATTACK windup, visibly distinct at 80px silhouette. The cloud twists like a spring while a broad chalk-dust spear/ribbon extends forcefully toward screen-left, outside the original body contour, with the eraser still embedded and both amber eyes aimed left. Preserve palette, lighting and recognizable core. Whole body stays in frame, centered at approximately same scale and anchored bottom. Transparent real alpha only; no stage/background, no UI, no values, no words, no extra characters, no flash. Original design, no imitation of any existing game.

**Weak:**

> Use case: identity-preserve. Asset type: isolated transparent action pose for an original school typing roguelike enemy. Edit target: the provided chalk-cloud idle image. Preserve exactly the same cool blue-grey white-chalk dust cyclone, green chalkboard eraser embedded diagonally at upper left, two small amber eyes, ink-and-gouache texture, compact camera, hovering tapered bottom, scale and lighting. Action: DEBUFF windup, visibly unlike a leftward attack at 80px. It cups itself inward and lifts the green eraser high; a broad soft ring of chalk mist curls around the hero-facing left side like a veil obscuring sight, while the core stays compact and eyes watch. No spear, projectile, attack pose or shield. Actual transparent background, entire body in frame, center/bottom alignment, no stage/UI/numbers/words/additional character/flash. Original design; no existing-game imitation.

**Hit:**

> Use case: identity-preserve. Asset type: isolated transparent hit-reaction pose for an original school typing roguelike enemy. Edit target: the provided chalk-cloud idle image. Preserve the same individual: cool blue-grey chalk dust cyclone, green board eraser embedded in the upper swirl, two small amber eyes, ink-and-gouache painterly surface, camera/scale/light and tapered bottom. Action: clearly hit by a card from screen-left: the central cyclone crumples and bends back to screen-right, broad chalk ribbons break into three distinct floating chunks, the eraser tilts and the eyes squint. Distinct at 80px; no attack toward left, no status veil, no gore, no comic impact text. Entire body in frame; transparent real alpha; no background, stage, UI, values, words, other characters or flash. Original design, no imitation of any existing game.
