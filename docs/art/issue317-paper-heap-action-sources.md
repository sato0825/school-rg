# Paper heap action source record (Issue #317)

Status: candidate. The existing idle image and three action poses are whole-body raster layers. They are editable as separate pose layers, but their internal paper/pencil parts are **not** separated. This does not satisfy #29's final reusable rig or 31-enemy production gate.

| Pose | Source | SHA-256 | Size |
| --- | --- | --- | --- |
| Idle reference | `src/assets/enemies/paper-heap-candidate-v1.png` | `cee6f637fa82fd2fa54eab1c223176283a748ccac87fb1ce891e93e29af5560f` | 1312×1199 |
| Attack anticipation | `src/assets/enemies/actions/paper-heap-attack-windup-candidate-v1.png` | `2a4a56902fd8559dbffc9b822bb6385c0617005da244c2b5eeedb951d59f1b4d` | 1312×1199 |
| Guard anticipation | `src/assets/enemies/actions/paper-heap-guard-windup-candidate-v1.png` | `80816eaa1ee104255681e3fb77eba10a56a4f415605aacfde342edf3b62fb07b` | 1254×1254 |
| Hit reaction | `src/assets/enemies/actions/paper-heap-hit-candidate-v1.png` | `1325aae86bce7f354c75e4f48e7e42c4aace4e3dcfed0975bc82f3fe77a1661e` | 1254×1254 |

Generated with the built-in image generation edit tool, using the idle reference as edit target each time and transparent output. The original candidate remains untouched.

## Prompt contracts

- Attack: keep amber eyes, marked exam-paper mound, red pencil, cool-blue folds, gouache/ink treatment and grounded compact camera. Raise the pencil toward player-left, peel top pages backward and sharpen front folds into an anticipation silhouette. No completed strike or flash.
- Guard: preserve the same identity and camera; fold broad exam sheets forward into a shield plane, keep eyes visible through a gap, lower the pencil behind the shield. No attack silhouette.
- Hit: preserve the same identity and camera; compress the mound, spring a few top sheets upward, dip the pencil and narrow eyes slightly. No gore or whole-screen flash.
- All: isolated genuine alpha, no stage, floor, UI, labels or additional character; no StS2 reference.

The generated outputs have different pixel dimensions despite the identical target. Runtime placement must normalize visible bounds and bottom contact. Reject if the pose visibly changes identity, scale, lighting or ground position in actual 1024/1440 GameShell screenshots and continuous transitions.

## Candidate v2: five-enemy silhouette study

The 1024-pixel five-enemy frame showed the v1 action pose at about 80 px; its attack pencil and guard sheet merged into the dense paper silhouette. Three new edits use the same idle and v1 pose references, but prioritize a long outward pencil, a wide shield plane, and a low broken recoil shape. The v1 files remain preserved for comparison. These remain whole-pose raster candidates, not editable-part rigs or approved runtime art.

| Pose | Source | SHA-256 | Size |
| --- | --- | --- | --- |
| Attack anticipation | `src/assets/enemies/actions/paper-heap-attack-windup-candidate-v2.png` | `519409c39533216568a31160daf8810acd4c108726b8f00a2245376596e19608` | 1312×1199 |
| Guard anticipation | `src/assets/enemies/actions/paper-heap-guard-windup-candidate-v2.png` | `012383d3c7cc37357517fe68613f84260d0f736abff2e0c3028203cce6913b26` | 1312×1199 |
| Hit reaction | `src/assets/enemies/actions/paper-heap-hit-candidate-v2.png` | `a0a8fea84ac921b52f8865a2ab0aafabef46b81c69b05f8b7821c9beec5b0511` | 1312×1199 |

Prompt contracts: maintain the original paper mound, amber eyes, cool blue-gray lines, grading marks, camera and grounded cutout; attack extends one red pencil beyond the left contour; defense folds three broad front sheets into a shield with the pencil hidden; hit compresses the mound low and separates three airborne sheets. No UI, text, effects, stage, flash or StS2 reference. The v2 edits were generated with the built-in image generation tool and genuine alpha.
