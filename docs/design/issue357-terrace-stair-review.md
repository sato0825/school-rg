# #357 Act 2 terrace stair landing: candidate review

Issue: [#357](https://github.com/sato0825/school-rg/issues/357). Stacked on #340/#353 because the same `GameShell` stage switching and #304 location prop runtime are required. This is **preview-only** via `?experimentalTerraceStair=on`; it does not approve the new plate as final art or alter map, RNG, battle state or save schema.

## Geography and route effect

The science building entry and exterior observation terrace already existed. The new enclosed switchback landing is between them. It changes only Act 2 floors 11 and 12, leaving floor 10 and the floor 13 boss at the terrace. Both seed routes traverse four consecutive terrace points before this comparison:

| Seed | 10F | 11F | 12F | 13F | Candidate route |
| --- | --- | --- | --- | --- | --- |
| 42 | combat | combat | treasure | boss | terrace → stair → stair → terrace |
| 97 | combat | treasure | combat | boss | terrace → stair → stair → terrace |

The committed 42-node route fixture gives **30/41 adjacent identical plate IDs** with the original assignment, **28/41** with this candidate, for both seeds. These are ID transitions, not a score of perceived variety or evidence of a naturally played 42-node run. The plate adds **one** genuinely different space; two adjacent nodes still share it. Time-of-day and activity layers are not counted as new places.

## PC / iPad-width same-state comparison

[`issue357-comparison.html`](previews/issue357-comparison.html) places the original terrace and stair candidate side by side for seed 42 11F combat and 12F treasure, and seed 97 11F treasure and 12F combat, each at 1440×900 and 1024×768. The 16 full-page captures are indexed with SHA-256 in [`issue357-capture-manifest.json`](previews/issue357-capture-manifest.json). Each page was loaded from the same serialized `RunSession` for its node, clicked through the available map edge, reloaded, and checked for stage art/place, same stage element, persisted node ID, background decode, and #304 locker decode on treasure. Screenshot capture waits two animation frames after decode to avoid an initially missing locker image. The same screen state, hero, enemy and card hand are shown in each base/candidate pair.

The new background is distinct from the current exterior terrace and from the science entry's right-side straight stair. The switchback stair and upper roof door communicate the route to the terrace; the open right recess holds the separately rendered #304 locker. In the inspected 1440 and 1024 combat/treasure captures, the main character's feet align near a stair tread, the UI remains readable, and the locker is visible without covering the choices. The scene remains strongly blue and quite detailed; the character line style and the room's denser hatch texture should be compared against the #29 paint standard before any adoption. Only one enemy is visible in these captures, so multi-enemy composition is not proven.

## Provenance and gate

The exact two imagegen prompts, attached reference IDs, accepted and rejected SHA values are in [`issue357-terrace-stair-v1.md`](../art/prompts/issue357-terrace-stair-v1.md). The first image was rejected because it resembled the science entry; it is preserved under `docs/art/rejected`. The selected candidate PNG and an OpenRaster source are in the asset register as **candidate**. OpenRaster contains the flattened generated plate and blank correction layers, not individually editable walls, stairs and floor. It does **not** meet #29's final editable-original gate. #304 locker art is also a candidate.

## Verification and remaining work

- Lint, typecheck, 126 unit tests, 163 integration tests, art SHA/alpha validation and Vite production build passed on this branch.
- Target Playwright E2E passed for four map arrivals × two concepts × two viewports, including save/reload and the locker asset.
- Two-capture byte-hash reproducibility, a physical iPad review, a naturally played 42-node run and human art acceptance remain unverified. No simulator was used.
- If this place is approved, connect it through the normal art adoption process and recheck the whole Act 2 geography with #29 and #304 assets. Do not count this one new plate as completion of the three-Act stage set.
