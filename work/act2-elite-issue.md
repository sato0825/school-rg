Parent: #379. Depends on the live GameShell and representative action-art contract in #317/#303; follows #29 art quality gate and #245 Intent semantics.

## Scope

Produce original, replaceable action art for the Act 2 elite enemies `library-cart`, `stairwell-echo` and `library-index`. Their current portraits alone do not tell an unfamiliar player whether the next action damages, defends or inflicts Weak. Preserve identity, line, palette, camera, lighting and anchor for each enemy across idle, each live Intent and card-hit reaction. Keep domain rules and numeric values unchanged.

| Enemy | Live Intent and ordered effects to depict |
| --- | --- |
| `library-cart` | `cart-intent-guard`: Block 6; `cart-intent-hit`: player damage 5 |
| `stairwell-echo` | `stairwell-intent-weak`: player Weak +1; `stairwell-intent-hit`: player damage 6 |
| `library-index` | `index-intent-brace`: player damage 4 then self Block 6; `index-intent-heavy`: player damage 8 |

## Work and evidence

- Versioned transparent pose/part assets and original sources, edit prompts, SHA-256, review and rejected variants. Do not reuse StS2 expression.
- Live Intent ID to pose mapping with preview → enemy action → consequence and card-hit reaction. Status and mixed actions need distinct silhouettes; exact values, order and AX text remain in the HUD.
- Actual 1440×900 and 1024×768 GameShell captures at one and five enemies, selected/unselected, normal/quiet. Check fixed anchors, no screen shake, legibility with local labels hidden and source/target association.
- Automated checks for correct Intent/image/state association and Block/HP/status result, plus human first-sight and physical iPad review. Automated checks alone do not establish visual comprehension.

## DoD

Each of these three enemies passes all pose, runtime, source, timing, QA and human/device gates. Partial art is labeled candidate; missing enemies and gates remain open. Link implementation and test results in a Draft PR under this Issue.
