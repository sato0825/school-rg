# #299 文芸部 被弾表情候補 v2

- built-in imagegen 編集。入力: `head.png` と `head-hit.png`（前版の表情参照）。モデル版・seedは公開されていない。
- プロンプト: “Create one transparent isolated head edit. Preserve first image exactly except change the eyes brows and mouth to a mild startled hit expression like second reference. Keep full red-bow brown hair and ahoge outer silhouette, same size, direction, head tilt, watercolor line art and middle-school identity. One square-like head cutout only, no body or labels.”
- 原出力: `literature-rig-head-hit-generated-v2.png`、1239×1269、SHA256 `8d24c9d66a429e07a7e3a4dc25d4105f8df2b587c6d9133325bf1a3981e6cef1`。
- 正規化: アルファ境界で切り出し、縦横比を保持して451×462以内へ縮小、459×470透明キャンバスの中央へ配置。結果は可視451×459で、元の頭の可視451×462に対し幅差0、高さ差3ピクセル。`head-hit-v2.png`、SHA256 `5bc3b732f6f51edf174eb5982d9cc1523ef1ca4e2bf604c5365f22b9b7d77b3b`。
- v1の原出力・正規化結果とORA原本は保持。v2は候補であり、顔・髪の画風/同一性の人手承認前。
