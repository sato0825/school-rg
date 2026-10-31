# #299 文芸部 被弾表情候補

- built-in imagegen 編集。モデル版・seedは公開されていない。
- 編集対象: `docs/art/candidates/literature-rig-parts-v1/head.png`。
- 補助参照: `docs/art/candidates/literature-hit-candidate-v2.png`（同一人物の既存候補）。
- 原出力: `docs/art/candidates/literature-rig-head-hit-generated-v1.png`、1312×1199、SHA256 `89d8af82de8d09c16181d0d32779f85bf655f5238063619a56aa1e7346662337`。
- 正規化派生: 主連結成分の `1246x1184+25+15` を切り出し、451×462へ縮尺、透明余白を含む459×470共通ヘッドキャンバスへ配置。`docs/art/candidates/literature-rig-parts-v1/head-hit.png`、SHA256 `64106e0057b11a2cd6e262b8c8fa2aae2ba96b916f1488ed2e7a9aae2b0cbc7a`。

## プロンプト

> Use case: identity-preserve. Asset type: a single transparent replacement head/hair layer for a 2D game character rig. Image 1 is the precise edit target: preserve its full hair silhouette, strands, curl at crown, red bow location and size, ear, skin color, head angle, neck cutout, line weight, painting texture, scale and 3/4-right direction. Image 2 is only an expression reference of the same character taking a mild hit. Change ONLY the facial expression in Image 1 from happy/open-mouthed to a clear brief startled recoil: eyebrows lifted and slightly drawn, eyes wide with concern, mouth small and tense, no injury or fear exaggeration. The result must remain unmistakably the same middle-school literature girl and fit the original rig head exactly. Keep the cutout complete with transparent background and ample margin. Output only the isolated head and hair, no shoulders, arms, notebook, body, labels, shadow or background.

この候補は未採用。表情差分の顔・髪の同一性と縮尺の歪みは実寸画面で人が確認し、問題があれば同じ元シートから再作画する。正規化で横方向の約8%の縮みが生じるため、最終原本での採用条件にはしない。
