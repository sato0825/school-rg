# 忘れ物の山 v2 — 端の欠けを修正する候補

Issue [#155](https://github.com/sato0825/school-rg/issues/155)。編集対象は `src/assets/enemies/lost-and-found-candidate-v1.png`。透明背景のまま、同じ青灰色の金属かご、クリームと青緑のマフラー・リボン、琥珀色の目、金色の傘柄と飾りを保持する。元の線、陰影、配色、斜め前からの見え方を維持し、傘先・リボン・かごの隅・飾りを最後まで描く。四辺に透明な余白を設け、背景・地面・文字・余計な小物を描かない。

## 実際の入力文

> Use case: identity-preserving game enemy asset edit. Edit target: the attached transparent illustration of the school lost-and-found basket monster. Preserve the same single creature, its blue-gray metal basket, cream-and-teal scarves and ribbons, small amber eyes, folded umbrellas with gold handles, shoes, charms, painterly clean anime-game linework and muted teal/navy/gold palette. Keep the creature's central silhouette and school-fantasy tone. Recompose on a taller transparent canvas so EVERY umbrella tip, ribbon tail, basket corner and hanging charm is completely drawn and visible, with generous empty transparent padding on ALL four sides (at least 10% of canvas width left/right and 8% of canvas height top/bottom). Show one full isolated creature, no ground, no shadow, no text, no border, no backdrop, no extra props beyond those belonging to the creature. Do not crop or place any opaque/semitransparent pixel against an image edge. Maintain the original visual identity and approximate front three-quarter viewpoint; make only the needed uncropping and reconstruction.

`transparent_background: true`、参照画像はv1。出力の実測は 1065×1477、alpha 16以上の外接矩形が左47・上55・右1035・下1431。要求した余白割合には満たないが、#153の採用用安全余白11pxを満たす。生成モデルの版は公開されておらず、出力だけから同じ画像を再生成できるとは主張しない。
