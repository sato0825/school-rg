# Hall monitor action source record (#375)

Status: **candidate**. The original `hall-monitor-candidate-v1.png` remains untouched. These three full-body PNGs are separate editable pose layers, but their internal cloth, whistle and bag parts are not separately editable. This is not #29's final rig or a claim that the other Act 1 enemies have action art.

| Pose | Source | SHA-256 | Dimensions |
| --- | --- | --- | --- |
| Attack toward player-left | `src/assets/enemies/actions/hall-monitor-attack-windup-candidate-v1.png` | `c40c65cfa7d14793231ba10b835e5221e5b75ae2208d9587ba2b14f406f2b736` | 1199×1312 |
| Guard | `src/assets/enemies/actions/hall-monitor-guard-windup-candidate-v1.png` | `ee84e02d6facd8cf225663ab9d58421f9f1f3b31a5cfe212f78cb8fe71c50690` | 1199×1312 |
| Hit reaction | `src/assets/enemies/actions/hall-monitor-hit-candidate-v1.png` | `c4f1b44987e08b8e946b268c1b2a185af86d95213e2d94afe0cbb4ef91625220` | 1199×1312 |

All were edited from the same transparent hall-monitor portrait with the built-in image generation tool (model version not exposed), genuine alpha requested. Identity anchors: amber eyes in a navy/teal striped cloth hood, red school bag, brass whistle, white indoor shoes, cool neutral light and bottom floor contact.

- Attack prompt: lunge toward player-left with a long striped cloth arm and brass whistle extending beyond the left body contour; no impact flash or painted damage. The first draft pointed toward player-right and is excluded from runtime. The second edit from that draft reversed the direction while retaining the identity.
- Guard prompt: wrap broad navy cloth and the red bag across the front as a physical shield, tuck the whistle behind it, show the eyes above the barrier.
- Hit prompt: compress the hood and body low, draw the bag/whistle inward, narrow the eyes and loosen the cloth tails.

No background, UI, numbers, lettering, other character or copied game expression was requested. Exact attack/Block values are domain/HUD data. The attack and guard still need scene-scale human review and physical iPad acceptance; the generated whole-body layers are not a production part rig.
