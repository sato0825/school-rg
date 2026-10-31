# Issue #140 敵候補画像 制作入力 v2

残る15敵IDの個別候補を `school-rg` 用に制作した。組み込み ImageGen で透明背景を指定し、採用ファイルのSHA・寸法・alphaを `asset-register.json` に固定した。生成モデルの版は公開されておらず、同じ入力での完全再生成は保証できない。編集可能原本は未制作で、正式採用と継続制作の品質ゲートは #29 に残る。

## 共通入力

- 中学生の女子5人と同じゲーム内に置く、柔らかな手描きアニメ調の学校の怪異。一体ずつ形と小物で敵名を判別できること。
- インクと水彩風の質感、青灰・青緑・淡いクリーム色、控えめな真鍮色、琥珀色の目を既存10候補と共有する。
- 背景、床、影板、文字、ロゴ、他の敵を描かず、透過した単体の全身素材にする。
- Slay the Spire 2 の固有キャラクター、絵、文章、視覚表現を参照しない。

## 個別入力と参照連鎖

| 素材ID | 形と小物 | 制作時に与えた参照画像 |
| --- | --- | --- |
| paper-heap-candidate-v1 | 答案の束と目、赤い採点印 | 同系列の既存候補。個別参照記録なし |
| paper-scrap-candidate-v1 | 小さな答案の切れ端、折れた紙の足 | 同系列の既存候補。個別参照記録なし |
| hall-monitor-candidate-v1 | 廊下を見回る古い校内用品の影 | 同系列の既存候補。個別参照記録なし |
| late-pass-candidate-v1 | 遅刻札と紐、時間の気配 | 同系列の既存候補。個別参照記録なし |
| lost-homework-candidate-v1 | 迷子の宿題・答案、紙の小物 | 同系列の既存候補。個別参照記録なし |
| school-gate-candidate-v1 | 校門と格子、門扉の顔 | 同系列の既存候補。個別参照記録なし |
| gym-scoreboard-candidate-v1 | 体育館の得点板、球技の小物 | 同系列の既存候補。個別参照記録なし |
| safety-sign-candidate-v1 | 理科室の安全標識 | 同系列の既存候補。個別参照記録なし |
| stairwell-echo-candidate-v1 | 螺旋状の階段、手すり、反響する布 | stairwell-echo の不採用初稿。背景付き初稿は透過条件を満たさず不採用 |
| library-index-candidate-v1 | 図書の索引カード棚、開いた引き出し | stairwell-echo v1 |
| lab-ventilation-candidate-v1 | 実験棟の換気ファン、ダクト、フラスコ | stairwell-echo v1 |
| lost-and-found-candidate-v1 | 上履き、傘、水筒、マフラー入りの忘れ物籠 | library-index v1 |
| night-announcement-candidate-v1 | 校内放送スピーカー、電線と音の帯 | lab-ventilation v1 |
| empty-desk-candidate-v1 | 誰もいない机と椅子、開いた机の目 | library-index v1 |
| last-bus-candidate-v1 | 最終便の小型バス、時刻表と夕方の帯 | lost-and-found v1 |

参照画像は画風の比較用であり、別制作回で同じ線や質感を得られる保証はない。#29 で基準画・編集可能原本・目視審査と運用手順を確定する。
