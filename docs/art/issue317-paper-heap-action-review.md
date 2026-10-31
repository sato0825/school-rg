# Paper heap action candidate review (#317)

Status: **candidate**, tested in the #261/#303 GameShell with the actual seeded encounter. This is one enemy among the 31 catalogued enemies. Source, SHA-256 and prompt contracts are in [the source record](issue317-paper-heap-action-sources.md). No human first-sight recognition study or physical iPad check has been completed.

## Gameplay image contract

| State | Image tells the player | Text/numeric supplement |
| --- | --- | --- |
| Attack Intent | The long red pencil reaches player-left beyond the paper body; the pages sweep backward. | Exact attack value and target stay in the Intent UI. |
| Guard Intent | Three broad exam sheets cover the body as a front shield; the pencil is hidden. | Exact Block value stays in the Intent UI. |
| Card hit | The mound compresses low and large pages break upward. | Exact HP change stays in the result mark. |
| Quiet / reduced motion | The chosen action pose stays still; there is no image cycling. | Exact values remain available. |

The domain Intent owns the choice. Image identity maps only `paper-intent-hit` and `paper-intent-guard`; unsupported intents fall back to idle. The 650 ms enemy windup shows the same pose before the Intent resolves. The resolved Intent ID remains attached through the result interval, so a new next-turn Intent does not change the depicted action early.

## Actual GameShell captures

Enemy labels, HUD, roster, body cues and trajectory are hidden in the visual-only captures. The rest of the battle stays visible to retain scene scale.

| Condition | Attack | Guard |
| --- | --- | --- |
| 1 enemy, 1440×900, visual-only | ![Single enemy attack](previews/issue317-v6/paper-heap-attack-visual-only-1440.png) | ![Single enemy guard](previews/issue317-v6/paper-heap-guard-visual-only-1440.png) |
| 5 enemies, 1024×768, visual-only | ![Five enemies attack](previews/issue317-v6/paper-heap-five-enemies-attack-visual-only-1024.png) | ![Five enemies guard](previews/issue317-v6/paper-heap-five-enemies-guard-visual-only-1024.png) |
| 1 enemy, 1024×768, quiet | ![Quiet attack](previews/issue317-v6/paper-heap-attack-quiet-1024.png) | ![Quiet guard](previews/issue317-v6/paper-heap-guard-quiet-1024.png) |

Additional checks: [five-enemy quiet guard](previews/issue317-v6/paper-heap-five-enemies-guard-quiet-visual-only-1024.png) and [single-enemy quiet hit](previews/issue317-v6/paper-heap-hit-quiet-1440.png).

## Judgment and remaining gate

The v2 pencil and shield separate in actual 1024-pixel five-enemy screenshots more clearly than v1, with both pose and source enemy identity retained. In the 5-enemy layout, each enemy is still about a tenth of the screen width. The exact action of all five enemies cannot be inferred from art alone; #303's localized Intent UI still carries that load. The action comparison is a candidate visual review, not proof that an unfamiliar player interprets the shapes correctly at 48–80 px. The hit pose has only been reviewed in a single-enemy scene. The PNGs remain whole-body pose layers with no separately editable pencil, shield or paper parts. A stable production rig, all 31 enemy action sets, target/strength vocabulary across enemy behaviors, first-sight user study and physical iPad confirmation remain open under #29/#245/#303.

### Unmade enemy action sets

The content registry and Act encounter table contain 31 enemies. `paper-heap` is the sole candidate with action poses; these 30 still have portrait-only art, with no enemy-specific attack/defense/status/hit action set. The list includes the Act 1 paired elite `paper-scrap`.

| Act | Enemy IDs without action sets |
| --- | --- |
| 1 | `late-pass`, `lost-homework`, `hall-mop`, `folded-school-map`, `hall-monitor`, `paper-scrap`, `notice-board`, `school-gate`, `final-exam`, `gym-scoreboard` |
| 2 | `chalk-cloud`, `safety-sign`, `lab-magnet`, `beaker-mist`, `lab-coil`, `library-cart`, `stairwell-echo`, `library-index`, `club-auditor`, `lab-ventilation` |
| 3 | `night-announcement`, `window-shadow`, `empty-desk`, `stage-spotlight`, `archive-clock`, `lost-and-found`, `night-locker`, `last-bus`, `closing-bell`, `graduation-curtain` |

## Verification

On the final v2 source tree: `npm run lint`, `npm run build`, `npm run check:art` passed. `CI=1 SCHOOL_RG_E2E_PORT=47227 ISSUE317_CAPTURE_DIR=docs/art/previews/issue317-v6 npx playwright test tests/e2e/enemy-action-art.spec.ts` passed **8/8**: 1024/1440 attack and guard, action/result timing, fixed stage bounds, quiet stills, single hit reaction, and 1024 five-enemy normal/quiet composition. This checks deterministic scene behavior, not first-sight comprehension.
