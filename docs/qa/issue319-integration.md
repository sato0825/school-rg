# Issue #319 integration ledger

Status: Draft integration tree. This is not final visual, art or device acceptance.

| Order | Source PR | Source HEAD | Result |
| --- | --- | --- | --- |
| 0 | main after #240 | `307bad7` | Starting tree |
| 1 | #260 GameShell | `32cb1fa` | Merged without conflict; owning CI passed |
| 2 | #273 live battle/reward/route | `7ff04cd` | Merged without conflict; owning CI passed |
| 3 | #294 stage runtime | `739598e` | Merged without conflict; owning CI passed |
| 4 | #271 loss | `9f5ae27` | `game-shell.ts` import conflict resolved: retain `stageSelectionForRun` and add loss view imports; owning CI passed |
| 5 | #321 combined loss and victory | `f1676c6` | Merged without conflict; owner's focused E2E 27/27 and CI passed |
| 6 | #312 four special locations | `4bf8125`, then `0d7b0be` | Resolved `app.ts` terminal/location branch and `game-shell.ts`/`main.ts` imports while retaining both terminal states and all four locations; `0d7b0be` updates the 42-location E2E's terminal selector. Owning CI passed on final HEAD. |
| 7 | #306 audio | `2f4ae7c` | Combined the treasure acquisition sound with its 340ms local visual feedback; owner's focused 26/26 and CI passed |
| 8 | #307 visual Intent | `b60e87f`, then `a1d58d4` | Retained stage place metadata and added selected target trajectory to the battle stage. `a1d58d4` hides the preview trajectory while a card resolves; owning focused 4/4 passed, newer CI pending. Candidate visuals remain unaccepted. |
| 9 | #311 relic/potion visuals | `22e08e8` | Combined item art and detail/activation in `app.ts`/`battle-view.ts`/`main.ts` while retaining sound activation and selected target trajectory; owner check passed (119 unit, 163 integration, 155 E2E), owning CI passed. Candidate art remains unaccepted. |

Later candidate branches include #334 four location prop images, #320 character rig and #335 additional card art. They are separate from this core integration gate until their own branches settle. Do not count a source's earlier passing CI as a pass for this combined tree.

## Combined-tree verification

Core integration HEAD `d6f1e0f` passed `CI=1 SCHOOL_RG_E2E_PORT=56319 npm run check`: lint, typecheck, 122 unit tests, 163 integration tests, art validation, production build, and 189/189 active E2E tests (three intentionally skipped capture-only cases). This includes every club clearing a normal 42-location/three-Act seeded run by typing, shorter three-Act victory and loss, save/load, IME, Intent, audio and quiet mode, and the four special locations. The same HEAD passed [GitHub CI](https://github.com/sato0825/school-rg/actions/runs/41204210188).

The combined tree also passed ten targeted 1440/1024 viewport cases for treasure, shop, rest, event and victory on `CI=1 SCHOOL_RG_E2E_PORT=56321`, and two live final-hit/loss cases on `CI=1 SCHOOL_RG_E2E_PORT=56322`. An isolated integration preview runs at `http://127.0.0.1:56320/?shortRun=1&seed=42`. A Playwright-operated first combat at both widths reached reward by typed cards and captured map, combat and reward. The location tests exercised choices, save restore and return to route; the victory/loss tests exercised terminal state and its controls. These are desktop-browser viewport checks, not physical iPad acceptance.

Combined screenshots are in the task `outputs/` directory under `issue319-integrated-` for map, battle, reward, treasure, shop, rest, event, victory and loss at 1440/1024. The original `issue286-live-*` and `issue268-loss-real-*` capture paths in this branch were refreshed by the integrated test run; owning branches were not altered. The viewport evidence still shows blank illustration slots in some initial hand cards and placeholder text/geometry in several location interactions. Candidate art is not approved. First-time understanding, physical iPad and final visual quality remain unverified.

Later candidates #334 (four location props; held because its CI found a real Act 2 loss), #320 (character rig and effect propagation), #335 (additional card art) and #324 (one enemy action painting) are outside this validated core HEAD. They require a new combined-tree gate if included.
