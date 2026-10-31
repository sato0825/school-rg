# #304 地点小物4点・原画候補レビュー v1

状態: **候補**。本PRは画像の制作・出典台帳・背景合成確認まで。ゲーム内の状態接続、触れられる領域、選択結果、商品個別素材、実機iPad検査、最終採用は別工程。

| 地点 | 派生asset ID | 原本source ID | 派生寸法 | 焦点 (x,y) | 接地 (x,y) | 主要不足 |
| --- | --- | --- | --- | --- | --- | --- |
| 保管庫 | `archive-locker-candidate-v1` | `issue304-archive-locker-source-v1` | 1086×1448 | .56,.43 | .49,.95 | 閉・空状態、レリック/ポーション別レイヤー |
| 購買 | `school-shop-candidate-v1` | `issue304-school-shop-source-v1` | 1254×1254 | .53,.50 | .50,.95 | 商品別レイヤー、購入済み/売切状態 |
| 休憩 | `rest-bench-candidate-v1` | `issue304-rest-bench-source-v1` | 1536×1024 | .51,.49 | .50,.88 | 回復/強化の結果差分 |
| 掲示物イベント | `event-board-candidate-v1` | `issue304-event-board-source-v1` | 1220×1289 | .52,.43 | .50,.96 | 他イベントの原稿/忘れ物/備品の固有物体 |

原本と派生は別パス・別IDで `docs/art/asset-register.json` に登録。派生は原本PNGの無加工 identity copy なのでSHA256は同一。SHA256、透明度、寸法は `npm run check:art` で検査する。生成器はbuilt-in imagegen、モデル版は公開されない。第三者画像を原本に使っていない。ただし権利・絵柄・長期量産品質の人手採用判定は未完了。編集可能なレイヤー付き原本はまだなく、採用条件を満たさない。

## 実寸合成

背景はAct 1アトリウム、Act 3講堂ホワイエの候補。人物は文芸部idle候補。Playwrightの独立Chromiumで各地点をPC 1440×900、iPad相当1024×768に合成した静止比較であり、本編UI・タッチ・実機iPadの証拠ではない。`docs/art/previews/issue304/capture.mjs` で再撮影できる。

| 地点 | Act 1 PC | Act 1 iPad相当 | Act 3 PC | Act 3 iPad相当 |
| --- | --- | --- | --- | --- |
| 保管庫 | [表示](previews/issue304/act1-archive-pc1440.png) | [表示](previews/issue304/act1-archive-ipad1024.png) | [表示](previews/issue304/act3-archive-pc1440.png) | [表示](previews/issue304/act3-archive-ipad1024.png) |
| 購買 | [表示](previews/issue304/act1-shop-pc1440.png) | [表示](previews/issue304/act1-shop-ipad1024.png) | [表示](previews/issue304/act3-shop-pc1440.png) | [表示](previews/issue304/act3-shop-ipad1024.png) |
| 休憩 | [表示](previews/issue304/act1-rest-pc1440.png) | [表示](previews/issue304/act1-rest-ipad1024.png) | [表示](previews/issue304/act3-rest-pc1440.png) | [表示](previews/issue304/act3-rest-ipad1024.png) |
| 掲示物 | [表示](previews/issue304/act1-event-pc1440.png) | [表示](previews/issue304/act1-event-ipad1024.png) | [表示](previews/issue304/act3-event-pc1440.png) | [表示](previews/issue304/act3-event-ipad1024.png) |

### 目視所見

- 4点とも意味を持つ物体の輪郭が文字なしで判別でき、足元と人物の重なりは上記の固定合成では破綻しない。
- 原画の光がAct 1昼光基準なので、Act 3夕方の舞台では小物がやや明るい。採用時に地点照明への色調派生または演出側の調光を要する。
- 文芸部人物は比較用の候補であり、5部活すべての人物・各背景との組合せは未確認。
- 掲示板は「掲示物」イベントだけの代表。全イベントで使うと内容の視覚的な違いが失われるため、実イベントID別の素材を追加する。

## 本編統合時の契約

見た目の透明画素をクリック範囲にしない。物体の有効領域を別の安定したボタン/タッチ領域として定義し、キーボード・読み上げ名と結果を `RunSession` の実状態へ接続する。原画の対象部分に対応する焦点を可視化し、低刺激設定では静止状態でも取得/購入/回復/イベント結果を確認できるようにする。CSSだけの汎用記号を完成絵の代替として残さない。
