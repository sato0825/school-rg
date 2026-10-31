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
