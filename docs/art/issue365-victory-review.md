# Issue #365 — 3 Act victory sequence candidate review

## Sequence on the existing stage

The actual typed final card completes its combat hit before `showVictory` runs. The GameShell keeps the same `.stage`, `.ally-slot`, and `.typing-input` nodes. On the live terminal transition the visible defeated enemy recoils, loses balance and recedes locally over 0–820 ms. The prior hero image remains until 830 ms while the separate victory candidate appears at 690–1030 ms. The result notebook enters at 1080–1400 ms; three Act marks finish by 2000 ms. No camera shake or viewport movement is used. The input is disabled and the clock no longer advances. On save restore, quiet mode, or OS reduced motion, the final stage/pose/result appear without the transition.

## Evidence

- [Actual typed three-Act video, 1024×768](previews/issue365-victory-typed-3act-1024-v1.webm), SHA-256 `a2ee65bf8be6d5e849fdbca48b4c838759c60ed133f7029a0abe29bddc532fde`.
- [Actual typed result, 1024×768](previews/issue365-victory-typed-3act-1024-v1.png).
- [Literature, 1440×900](previews/issue365-victory-literature-1440-v1.png); [science, 1024×768](previews/issue365-victory-science-1024-v1.png); [kendo](previews/issue365-victory-kendo-1024-v1.png); [music](previews/issue365-victory-music-1024-v1.png); [art](previews/issue365-victory-art-1024-v1.png).
- Local: `npm run lint`, `npm run build`, and `npm run check:art` passed on the candidate register; targeted victory E2E 15/15 passed. The art check reports margin cautions for the new literature and kendo poses, so they remain candidates.

## Visual review

All five characters have recognisable hair, uniform and club prop continuity against their registered idle references. The result is a new, grounded full-body image rather than the card activation image. Kendo wipes her brow, music makes a small beat gesture, literature holds her book, art keeps her board, science settles with her notes. Their shoes appear over the same floor region in the 1024 previews and the result note remains readable without replacing the school scene. The science gesture is especially close to idle; a stronger distinct victory performance is still needed for art adoption. Literature and kendo visible pixels reach the candidate safety margin; they require source redraw or crop before approval. The generated cutouts retain faint atmospheric edge glow; review with final background/lighting is required.

## Gates still open

These five files are imagegen **candidates**, with no editable layered originals, no approved reference turnaround and no verified frame-to-frame identity. The enemy reaction uses the existing enemy image with a local transform; enemy-specific drawn defeat frames have not been made. Human art approval under #29, multi-frame character animation, iPad hardware QA and first-time comprehension testing under #243 remain open. Browser E2E and screenshots do not substitute for these gates.
