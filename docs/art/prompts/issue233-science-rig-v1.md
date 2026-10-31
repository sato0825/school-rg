# 科学部リグ部位シート候補 v1

- Status: candidate; no final art acceptance.
- Tool: built-in imagegen, transparent output, 2026-10-31.
- Fixed identity reference: `docs/art/candidates/serious-student-idle-candidate-v2.png`.
- Supporting pose references: Issue #233 Draft PR #236's `serious-student-activate-candidate-v3.png` and `serious-student-hit-candidate-v3.png`.
- Output: `docs/art/candidates/science-rig-parts-sheet-candidate-v1.png`, SHA256 `5032d0f23e3e9ea57e9775b043d7d4cc78a33870a5a0f044a4e878ebe6f36f23`.

## Prompt

Use case: identity-preserve. Asset type: editable 2D cutout animation parts sheet for a school typing roguelike. Image 1 is the fixed science-club girl's idle identity, Image 2 her card-use pose, Image 3 her hit expression. Create ONE transparent PNG sprite parts sheet with exactly six disconnected components, laid out with generous transparent gutters: (1) complete head and bob hair with two teal hairpins, calm face; (2) torso with navy school blazer, white collar and teal bow, no arms or head; (3) her right arm and hand holding a teal pen, starting at a clean shoulder seam; (4) her left arm and hand holding a blue-gray tabbed notebook, starting at a clean shoulder seam; (5) left skirt/leg/sock/loafer piece; (6) right skirt/leg/sock/loafer piece. Every component must match the same middle-school girl's exact face, hair, navy blazer, gold buttons, teal bow and pen, backpack and bag tag, skirt plaid, socks and loafers from the references. Keep front three-quarter view and coherent diffuse cool light, clean anime storybook gouache edges. Draw joints with overlap allowance and no cut-off hands/feet. Separate components with at least 80px empty transparent space so connected-component extraction works. No background, no shadows, no labels, no text, no extra limbs, no duplicated parts, no StS2 reference.

## Early inspection

The source has six large alpha-connected components at a 10% threshold. Identity signs (bob, teal pins/bow/pen, notebook, bag tag, uniform) are present. Limb joins and visible pose still require an assembled in-game review.
