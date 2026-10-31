# #331 軽音部部位別候補

参照は `docs/art/candidates/music-idle-candidate-v1.png`、`music-activate-candidate-v2.png`、`music-hit-candidate-v2.png` の3点。built-in imagegen を使用し、モデル版と seed は非公開。ほかの作品の素材は使っていない。

## v1

> Create a transparent 2D rig source sheet of the same middle-school music-club girl. Keep her short wavy dark-purple hair, lavender star clip, purple eyes, headphones, gray cardigan, purple bow, blue plaid skirt, purple high-top shoes, guitar case and mascot charm. Separate head, torso/skirt, left arm/case, right arm, left leg and right leg with transparent gutters; paint joint overlaps. No background, labels or extra objects.

v1 は左腕とケースが接触した6連結成分のため不採用候補として保持。

## v2 edit

> Edit v1 only: separate the guitar case and left arm into their own complete components, at least 50 transparent pixels apart. Preserve the other five components, face, outfit, colors and proportions. Remove dark halo from transparent gutters. Seven non-touching components, no assembled figure, labels or border.

v2 は10% alpha閾値で7つの大きな非接触成分。各接合部の補修と実画面の動き・同一性の審査前であり、正式採用していない。

## 被弾表情 v1 edit

> Edit the isolated head layer only. Preserve its head silhouette, short wavy dark-purple hair, lavender star clip, purple eyes, youthful facial proportions, palette, linework, neck contour and orientation. Change only her face to a mild readable hit reaction with eyes squeezed closed, brows raised at the center and a small tense mouth. Keep alignment with the same neck joint. Use the full-character hit pose only as expression reference. Output an isolated head on true transparency with no body, glow, shadow, text or border.

生成原本 `music-rig-head-hit-generated-v1.png` SHA256 `ae284374479d29ed40db4f39ff979c2cd0dcf9402fe49ab5b4f6792bb49e8c72`。ランタイム層 `music-rig-parts-v1/head-hit-v1.png` は 381×348 へ機械的に縮小したもの。SHA256 `65ac7ca3ce95470fe4076a578b2f5e42d92242d5d78cd73d90754344aebeb195`。表情は候補であり、ユーザー承認を意味しない。
