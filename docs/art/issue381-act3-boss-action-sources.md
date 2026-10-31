# Act 3 boss action art sources (#381)

Status: **candidate**. These are transparent whole-body pose PNGs edited from the corresponding existing enemy portrait with the built-in image generation tool. The originals were not overwritten. Each pose is a separate replaceable layer, but internal cloth, bell and cord parts are not independently editable. This does **not** satisfy the final #29 rig/source gate or human/device acceptance.

| Enemy | Pose | Source | SHA-256 | Live Intent / effect |
| --- | --- | --- | --- | --- |
| closing-bell | idle reference | `src/assets/enemies/closing-bell-candidate-v1.png` | `58f3a29beebfafc99f39bf723b4b21a7b96abaeb8c1d9a3b554c5280dea7693f` | — |
| closing-bell | attack | `src/assets/enemies/actions/closing-bell-attack-candidate-v1.png` | `61321edabcbcf10ee675e7bfaacc7a9ca8fe6cb9ffeb2c020d2a26b369e157f4` | `bell-intent-hit` / damage 6 |
| closing-bell | guard | `src/assets/enemies/actions/closing-bell-guard-candidate-v1.png` | `d272e22c84f0b0ade1c9998e883a704246d91f4cb6d89ae57d7c5063f66758a1` | `bell-intent-guard` / Block 7 |
| closing-bell | hit | `src/assets/enemies/actions/closing-bell-hit-candidate-v1.png` | `ce7466a599fd78b3aa51394067357f7aa34274786966c22223773274878cea22` | Card damage reaction |
| graduation-curtain | idle reference | `src/assets/enemies/graduation-curtain-candidate-v1.png` | `e0aa0b2c98a1f6340a0e20b33260a0524b2cc2e1eac8a6d7264f3f7fc9af1661` | — |
| graduation-curtain | attack | `src/assets/enemies/actions/graduation-curtain-attack-candidate-v1.png` | `e931d95646520cee9259341d877cedfa8e745413891526d2c83b04ef92e7a512` | `curtain-intent-hit` / damage 5×2 |
| graduation-curtain | enclosing preparation | `src/assets/enemies/actions/graduation-curtain-prepare-candidate-v1.png` | `27be4f2f45b2f99821d1725abe2585a30d753c8886095f489755f8a93a5c4889` | `curtain-intent-prepare` / Block 7 → Strength +1 |
| graduation-curtain | hit | `src/assets/enemies/actions/graduation-curtain-hit-candidate-v1.png` | `971da2a5374270699dedaf051bdf7869436eed1af813c56aa113bcbdbcf64cd7` | Card damage reaction |

All six output canvases are 1312×1199 RGBA. Source rights: original school-rg candidate generated from the original school-rg portrait; no StS2 image or text reference. The built-in tool does not expose a model version. Prompt records below are the stable subject/action constraints; details such as exact pixel arrangement vary across generation and must be reviewed against the portrait and live scene.

## Prompt contracts and review

- Common bell lock: aged blue-green metal, amber eyes under rim, gold clapper/gears, red braided cords/banners, weathered ink/gouache, cool balanced light, same 3/4 camera and lower anchor; genuine alpha, no scene, UI, effects or new props.
- Bell attack: clapper extends far toward player-left, cords taut, bell leans into ringing; long external silhouette at 70 px.
- Bell guard: cords cross broadly in front of the bell, clapper tucked back, eyes remain visible. Guard must differ from attack without color alone.
- Bell hit: heavy body recoils low toward its right, clapper off center, loose cords, narrowed eyes. The first generation added a white/gray haze; it was **rejected**. A second built-in edit removed only the haze and retained the pose; the clean cutout above is used.
- Common curtain lock: navy velvet, amber central eyes, two gold star poles, gold fringe/tassels, burgundy lining, cream star pennants, same 3/4 camera and lower edge; genuine alpha, no scene/UI/effects.
- Curtain attack: two broad lower wings sweep separately toward player-left for the live double hit. The wings extend beyond the idle contour.
- Curtain preparation: wings gather into one continuous protective front wall with a narrow eye slit; top tassels pull taut to imply stored strength. Block then Strength order stays numeric/UI owned.
- Curtain hit: cloth buckles and sags asymmetrically, pennants lift, poles lean slightly, eyes narrow; no damage text or flash.

Placement and animation: the idle and action images share the same 1312×1199 canvas; runtime `object-fit: contain` uses center/bottom anchoring. Preview alternates action and idle in standard motion but holds the action still in quiet/reduced-motion settings. The 650 ms action event applies a bell swing/cord lock or two cloth sweeps/gather in the enemy slot; the slot and stage must remain fixed. The hit pose appears only with a live card damage result. Exact damage, Block, Strength, target and effect order are not painted into the source.

Known gaps: the curtain preparation pose conveys a front wall but not the numerical Strength gain by itself; the gold tassels are a weak strength cue. The bell attack's clapper direction is visible, but whether a first-sight player reads it as damage is untested. At 5 enemies and 1024 px the boss body may be only around 80 px. Neither source has a part-separated rig. Human first-sight, continuous visual sequence and physical iPad acceptance remain open.
