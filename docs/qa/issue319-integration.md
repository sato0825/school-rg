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
| 10 | #320 literature rig and effects continuity | `4cbaa57` | Merged after its check/Windows CI passed. Combined the asset register entries, `battle-view.ts` rig markup with stage place/target trajectory/item overlay, `game-shell.ts` quiet initialization with existing view/config, and both sets of CSS imports. Typecheck passed; combined runtime QA pending. Candidate rig remains unaccepted. |
| 11 | #335 additional card art | `1a0aff1` | Merged without conflict after its owning CI passed. Candidate coverage reaches 56/84 IDs; combined runtime QA pending. |
| 12 | #334 four location props | `fd08e9b` | Merged after owning CI passed. Combined location art imports and the treasure prop with relic/potion offer objects; shop/rest/event use the new prop candidates. Asset register retained prior entries. Full combined QA pending. |
| 13 | #350 long-run clock reproducibility | `eea6992` | Merged after owning CI passed, without conflict. Bot uses a fixed virtual input timeline while a separate test checks the real ten-second clock. Full combined QA pending. |
| 14 | #324 paper enemy action art | `003e519` | Merged after owning CI passed. Kept both item and resolved-Intent cue resets, stage metadata and enemy action art, and all CSS imports. Full combined QA pending. Only one enemy has action paintings. |

Do not count a source's earlier passing CI as a pass for this combined tree. The gate through order 9 is the validated core; orders 10-11 are a follow-up integration phase that requires its own combined-tree check.

## Combined-tree verification

Core integration HEAD `d6f1e0f` passed `CI=1 SCHOOL_RG_E2E_PORT=56319 npm run check`: lint, typecheck, 122 unit tests, 163 integration tests, art validation, production build, and 189/189 active E2E tests (three intentionally skipped capture-only cases). This includes every club clearing a normal 42-location/three-Act seeded run by typing, shorter three-Act victory and loss, save/load, IME, Intent, audio and quiet mode, and the four special locations. The same HEAD passed [GitHub CI](https://github.com/sato0825/school-rg/actions/runs/41204210188).

The combined tree also passed ten targeted 1440/1024 viewport cases for treasure, shop, rest, event and victory on `CI=1 SCHOOL_RG_E2E_PORT=56321`, and two live final-hit/loss cases on `CI=1 SCHOOL_RG_E2E_PORT=56322`. An isolated integration preview runs at `http://127.0.0.1:56320/?shortRun=1&seed=42`. A Playwright-operated first combat at both widths reached reward by typed cards and captured map, combat and reward. The location tests exercised choices, save restore and return to route; the victory/loss tests exercised terminal state and its controls. These are desktop-browser viewport checks, not physical iPad acceptance.

Combined screenshots are in the task `outputs/` directory under `issue319-integrated-` for map, battle, reward, treasure, shop, rest, event, victory and loss at 1440/1024. The original `issue286-live-*` and `issue268-loss-real-*` capture paths in this branch were refreshed by the integrated test run; owning branches were not altered. The viewport evidence still shows blank illustration slots in some initial hand cards and placeholder text/geometry in several location interactions. Candidate art is not approved. First-time understanding, physical iPad and final visual quality remain unverified.

The same code also passed the focused five-enemy interaction case at 1440; `outputs/issue319-integrated-five-enemies-1440.png` shows the repeated test enemy and visible target HP/Intent. `outputs/issue319-integrated-three-allies-{1440,1024}.png` shows a three-ally layout preview: slots two and three are explicit placeholders without battle rules or character art, so this is layout evidence only. The associated live `issue170-five-enemies-v6-1440x900.png` capture was refreshed on this combined branch. These captures do not establish first-time readability or a complete companion system.

Orders 10-14 have been added after the validated core and require their own combined-tree gate. The added rig is only for 文芸部; the other four clubs still use whole-body candidates, and the remaining 28 card IDs have no candidate painting.

## Follow-up rig/card gate

The first full check of #320/#335 at `12c2ea3` passed lint, typecheck, 130 unit, 168 integration, art check and build. E2E reached 202 passed, 5 failed, 3 intentionally skipped. Four failures were the same 文芸部 live victory mismatch: the rig's `animation:none!important` still applied to the victory portrait after all three Acts had genuinely cleared. The fifth was an old loss test looking for `.hero-art.react` while the new rig conveyed the hit through its separate head expression. The other four clubs' normal 42-location three-Act runs passed.

HEAD `ee93dc5` releases the rig's attributes and images only on victory/loss, retaining the same stage, actor and input elements. The loss test now checks the visible hit expression and HP zero, then verifies the loss portrait, new-run action and fresh rig on the next battle. Four new tests check quiet mode through each special location, reload and return to route. `npm run lint`, `npm run typecheck` and the eleven directly affected E2E cases passed on a dedicated port. Three further capture cases for loss and restored victory at 1024/1440 passed. `outputs/issue319-rig-card-final-{map,battle,reward}-{1024,1440}.png` and `outputs/issue319-rig-card-terminal/` show the updated combined tree. The first complete follow-up check was not a pass; CI on `ee93dc5` is the final full-tree gate and was pending when this entry was written.

Visual inspection confirms five initial 文芸部 hand cards now have candidate images after rig decoding; the image sheet/body seam and consistency still require art review. The hero remains anchored through battle/reward and the portrait changes to the dedicated victory/loss illustration at the terminal. This does not prove real-device acceptance, companions, or final art quality.

The visual Intent still has one misleading cue: without target selection, the red solid attack mark around the enemy has a left-pointing arrow tip and stops in empty stage space. It can be mistaken for a trajectory to the player. When the enemy is selected, the distinct dashed trajectory does reach the hero/notebook in the actual 1024 and 1440 viewport geometry (`outputs/issue319-selected-intent-{1024,1440}.png`): its 1024 endpoint is (225,265) inside the hero rectangle x61–389/y92–421; its 1440 endpoint is (317,297) inside x97–537/y93–550. The selected line is absent during card/result FX. Enemy-phase connection and first-time meaning remain unverified. The always-visible local arrow should be redesigned as a shorter stance cue, then rechecked at both sizes; do not treat the current visual Intent as accepted.

The new orders 12-14 follow the successful rig/card code gate, but have not yet passed as one combined tree. Their candidate art and the unchanged local arrow require a fresh source-bound review of attack, hit, card effects, terminal screens, Intent strength and statuses, as well as the four location objects. Text should only be the primary visual language when that is an intentional effect; the game scenes currently have several text-first interactions and remain below that acceptance criterion.

## Four-prop and enemy-art combined gate

The first complete check of orders 12-14 at `b6a1622` passed lint, typecheck, 130 unit, 168 integration, art validation and build. E2E had 231 passed, one failed and three intentionally skipped. Five clubs completed the normal 42-location/three-Act route. The failure was a real 1024px shop layout regression: item illustrations from #311 increased the five offer rows; the shelf occupied 251px, the scroll list only showed 261px of 314px content, and the card-removal summary was clipped while the exit button remained visible. The failed full check is not a pass.

The shop-only tablet max height changed from 61% to 70% of the stage in `src/ui/location-stage.css`. On the resulting viewport, the list displays all 314px of its 314px content, the removal summary spans y616–660 and the exit button y674–718. All five offers, removal and exit are simultaneously visible. The four prop scenes at both 1440/1024 plus the full-HP rest case passed the focused location E2E (9/9); the shop screenshot is `outputs/issue319-prop-integrated/shop-1024.png`. This is a scoped correction after the full run; a new final CI on the corrected tree is still required.

At 1024 the shop prop is painted and item/card thumbnails are visible, but the five large text-heavy choice rows have weak spatial correspondence to the physical items on the shelf. The encounter is operational, while #243's “shelf → item → inventory” visual meaning and first-time comprehension remain unaccepted. The other three prop scenes and the enemy attack/block/hit paintings are candidates, not formal art approval.
