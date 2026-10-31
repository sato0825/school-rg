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
| 6 | #312 four special locations | `4bf8125`, then `0d7b0be` | Resolved `app.ts` terminal/location branch and `game-shell.ts`/`main.ts` imports while retaining both terminal states and all four locations; `0d7b0be` updates the 42-location E2E's terminal selector. Owning CI passed on `4bf8125`; newer CI pending. |
| 7 | #306 audio | `2f4ae7c` | Combined the treasure acquisition sound with its 340ms local visual feedback; owner's focused 26/26 and CI passed |
| 8 | #307 visual Intent | `b60e87f`, then `a1d58d4` | Retained stage place metadata and added selected target trajectory to the battle stage. `a1d58d4` hides the preview trajectory while a card resolves; owning focused 4/4 passed, newer CI pending. Candidate visuals remain unaccepted. |

Pending source: #311 item visuals (final owning tests/CI in progress). #304 props and #320 character rig remain separate art candidates. Do not count a source's earlier passing CI as a pass for this combined tree.

After the terminal/location and visual Intent conflict resolutions, `npm run typecheck` passed on this integrated tree. Final batched tests and viewport checks remain pending.

The integrated tree has not yet run its final batched tests or viewport checks. Candidate art is not approved. iPad hardware and first-time understanding are unverified.
