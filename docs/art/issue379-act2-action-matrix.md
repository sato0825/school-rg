# Act 2 action-art production matrix (#379)

Source of rules: `demo-battle.ts`, `encounter-variants.ts`, `extra-enemies.ts`, `run-enemies.ts`, `extra-bosses.ts`. Art is a presentation of the live Intent, not a source of combat values. This matrix is a production brief, **not** evidence that the art or behavior is complete.

| Enemy / group | Live Intent → ordered effect | Primary action silhouette to author | Status |
| --- | --- | --- | --- |
| `chalk-cloud` / normal | `chalk-intent-hit` → damage 4 player; `chalk-intent-weak` → Weak +1 player | Dust spear thrust left; chalk veil closes across eyes. Hit: cyclone crumples away. | 3 pose originals, runtime/real-screen gate open |
| `safety-sign` / normal | `safety-sign-intent-guard` → Block 5 self; `safety-sign-intent-hit` → damage 5 player | Sign rotates broad face forward as shield; sign lunges edge-first left. Hit: pole/face bends. | #387 |
| `lab-magnet` / normal | `magnet-intent-hit` → damage 5 player; `magnet-intent-focus` → Strength +1 self | Pole tips snap left; magnetic filings coalesce tightly to the poles for self-buff. Hit: filings scatter and body recoils. | #387 |
| `beaker-mist` / normal | `mist-intent-poison` → Poison +1 player; `mist-intent-hit` → damage 4 player | A drop-filled vapor tendril reaches player side; glass vessel bursts a directional jet for attack. Hit: glass sloshes/steam separates. | #387 |
| `lab-coil` / normal | `coil-intent-brace` → Block 4 self; `coil-intent-burst` → damage 7 player | Tight coil closes behind a broad wire plane; sprung coil extends/arc drives left. Hit: coil unspools unevenly. | #387 |
| `library-cart` / elite | `cart-intent-guard` → Block 6 self; `cart-intent-hit` → damage 5 player | Tall books close like a side wall; cart and books pitch toward player-left. Hit: books lift and wheels skid. | #384 |
| `stairwell-echo` / elite | `stairwell-intent-weak` → Weak +1 player; `stairwell-intent-hit` → damage 6 player | Receding footprint/echo rings cloud orientation; a heavy footfall plane converges on player side. Hit: echo breaks. | #384 |
| `library-index` / elite | `index-intent-brace` → damage 4 player, then Block 6 self; `index-intent-heavy` → damage 8 player | One authored two-step action must show a shelf thrust followed by a protected shelf face, in the same order. Heavy: multiple index drawers fall left. Hit: drawers jam/disperse. | #384 |
| `club-auditor` / boss | `auditor-intent-focus` → Strength +1 self; `auditor-intent-hit` → damage 5 player | Red correction/record marks collect toward its own form; dossier is thrust left. Hit: pages lose alignment. | #385 |
| `lab-ventilation` / boss | `vent-intent-pressure` → Frail +1 player, then Block 5 self; `vent-intent-hit` → damage 8 player | First a directional air-pressure veil crosses player side, then intake slats close as a shield. Attack: a broad outlet gust drives left. Hit: louvers shake open. | #385 |

## Shared screen gate

For each enemy, use the actual seeded GameShell with 1024×768 and 1440×900, one and five enemies, normal and quiet effects, plus label/HUD-hidden screenshots. Compare preview→action→resolved effect and card-hit reaction against the same enemy ID and idle reference. Stage bounds, bottom anchor, source/target and hit/block/status change must remain stable. Exact values and ordered effect names stay in #303 UI/AX. A human first-sight review and physical iPad check remain open until observed; automated pose/HP assertions cannot pass them.

The first production split is #387 (four remaining normal enemies), #384 (three elites), and #385 (two bosses), plus the `chalk-cloud` candidate in #386. Each group can move in parallel on its own worktree; integration must account for #374's generic action registry and #323's GameShell without changing domain rules.
