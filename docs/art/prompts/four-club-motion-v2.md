# Four club motion candidate brief v2

Issue #112. Generator: built-in imagegen (version not exposed). Each output was an edit of its own club's `*-idle-candidate-v1.png`, with transparent background requested. These are key-pose candidates, not frame animation or editable originals. The exact tool calls remain in the development chat; this brief records their image inputs and constraints for a later controlled production pass.

## Shared constraints

- One Japanese middle-school girl per image. Keep the source's youthful facial structure, hair, eye color, outfit, accessories, line weight, soft anime shading, and identity.
- 1024 × 1536 full-body vertical canvas; both shoes in frame, comparable subject scale and foot baseline. Preserve coherent hands, equipment, bag straps and clothing.
- Character-only transparent layer. No school background, colored glow, floor, motion effect, text or UI baked into the pose.
- `activate` is a short card-use gesture; `hit` is a safe startled recoil without wounds. The stage effects remain separate UI layers.

## Per-character pose directions

| Character | Image input | Activate | Hit |
| --- | --- | --- | --- |
| Literature | `../candidates/literature-idle-candidate-v1.png` | Lively small step, extend pink pen while holding rabbit notebook and navy bag. | Turn and tuck shoulders, hug rabbit notebook protectively; retain red bows and rabbit charm. |
| Kendo | `../candidates/kendo-idle-candidate-v1.png` | Raise bamboo sword from the navy gear bag in a controlled ready stance; keep towel, track jacket and blue shoes. | Small backward step, protective forearm, surprised focused face; retain gear bag and towel. |
| Music | `../candidates/music-idle-candidate-v1.png` | Playful rhythmic downbeat hand gesture, other hand steadying black-violet guitar bag; retain star clip, headphones and charm. | Small backward flinch, raised forearm; retain guitar bag, headphones, purple bow and shoes. |
| Art | `../candidates/art-idle-candidate-v1.png` | Lift drawing board and extend paintbrush, modest confident smile; retain paint-spattered cardigan and teal bag. | Small backward flinch while hugging drawing board; retain brushes, teal bow and shoes. |

All eight outputs were generated separately from the corresponding idle image. No output was used as another pose's source. The images and their SHA-256 values are recorded in `../asset-register.json`.
