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
| 6 | #312 four special locations | `4bf8125` | Resolved `app.ts` terminal/location branch and `game-shell.ts`/`main.ts` imports while retaining both terminal states and all four locations; owner's targeted 3/3 and CI passed |

Pending sources: #306 audio (26 focused E2E passed; new owning CI pending), #307 visual Intent, #311 item visuals. Each remains on its owning branch. Do not count a source's earlier passing CI as a pass for this combined tree.

After the terminal/location conflict resolution, `npm run typecheck` passed on this integrated tree. Final tests and viewport checks remain pending.

The integrated tree has not yet run its final batched tests or viewport checks. Candidate art is not approved. iPad hardware and first-time understanding are unverified.
