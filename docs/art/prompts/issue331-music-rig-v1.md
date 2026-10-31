# #331 軽音部部位別候補

参照は `docs/art/candidates/music-idle-candidate-v1.png`、`music-activate-candidate-v2.png`、`music-hit-candidate-v2.png` の3点。built-in imagegen を使用し、モデル版と seed は非公開。ほかの作品の素材は使っていない。

## v1

> Create a transparent 2D rig source sheet of the same middle-school music-club girl. Keep her short wavy dark-purple hair, lavender star clip, purple eyes, headphones, gray cardigan, purple bow, blue plaid skirt, purple high-top shoes, guitar case and mascot charm. Separate head, torso/skirt, left arm/case, right arm, left leg and right leg with transparent gutters; paint joint overlaps. No background, labels or extra objects.

v1 は左腕とケースが接触した6連結成分のため不採用候補として保持。

## v2 edit

> Edit v1 only: separate the guitar case and left arm into their own complete components, at least 50 transparent pixels apart. Preserve the other five components, face, outfit, colors and proportions. Remove dark halo from transparent gutters. Seven non-touching components, no assembled figure, labels or border.

v2 は10% alpha閾値で7つの大きな非接触成分。各接合部の補修と実画面の動き・同一性の審査前であり、正式採用していない。
