# 5部活の戦闘ステージ比較（Issue #96）

2026-10-31。`?artPreview=1` を付けてタイトルから各部活を選び、戦闘ノードでタイピング入力が有効な画面を確認した。開発用プレビューであり、画像はすべて未採用の候補。通常画面の仮素材は変更していない。

| 部活 | 1440 × 900 | 390 × 844 | 表示素材 |
| --- | --- | --- | --- |
| 文芸部 | [desktop](previews/issue96-literature-desktop-20261031.png) | [narrow](previews/issue96-literature-narrow-20261031.png) | 静止画1枚 |
| 科学部 | [desktop](previews/issue96-science-desktop-20261031.png) | [narrow](previews/issue96-science-narrow-20261031.png) | idle / activate / hit の3ポーズ候補 |
| 剣道部 | [desktop](previews/issue96-kendo-desktop-20261031.png) | [narrow](previews/issue96-kendo-narrow-20261031.png) | 静止画1枚 |
| 軽音部 | [desktop](previews/issue96-music-desktop-20261031.png) | [narrow](previews/issue96-music-narrow-20261031.png) | 静止画1枚 |
| 美術部 | [desktop](previews/issue96-art-desktop-20261031.png) | [narrow](previews/issue96-art-narrow-20261031.png) | 静止画1枚 |

## 実画面の確認結果

- 5部活とも人物は左、敵は右に収まり、中央に余白がある。背景は広い学校の廊下として独立し、人物と入力欄は背景に埋もれていない。
- 狭幅でも人物、敵、入力欄、手札は視認でき、重なりは見られない。人物は幅に対して小さめだが、同行者を置く余地を残している。
- 文芸部・剣道部・軽音部・美術部は別動作素材がない。画面に「静止画のみ・未採用」と明示し、発動や被弾で別ポーズがあるようには表示しない。
- 科学部は3ポーズ候補を接続している。人物の線、顔の密度、見かけの体格が他4人より控えめで、同一画面上では統一感を再調整する余地がある。敵と人物の縮尺も今後のアート制作時に評価する。

## 再現と限界

`npm run dev -- --host 127.0.0.1` のURLに `?artPreview=1` を付け、5部活を個別に選ぶ。ブラウザで各画像の `decode()` と表示境界を確認した。正式な人物採否、編集可能原本、残り4人の動作素材と品質基準、複数同行者の実演は親Issue #29・#30・#31に残る。画像生成1回の結果を継続的な品質保証とみなさない。
