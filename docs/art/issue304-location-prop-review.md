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

## 本編への候補接続

後続の地点GameShell候補では4点の透過派生を `src/ui/location-stage.ts` から asset ID を伴って表示する。物体は選択ボタンとは別レイヤーで、既存の `RunSession` 選択・保存・時計停止・読み上げ名を維持する。保管庫では取得した棚の領域とカードを短く強調してから経路へ進む。動き軽減時は強調を静止表示する。

| 地点 | PC 1440×900 | iPad相当 1024×768 |
| --- | --- | --- |
| 保管庫 | [実画面](previews/issue304-runtime/treasure-1440.png) | [実画面](previews/issue304-runtime/treasure-1024.png) |
| 購買 | [実画面](previews/issue304-runtime/shop-1440.png) | [実画面](previews/issue304-runtime/shop-1024.png) |
| 休憩（満タン時） | [実画面](previews/issue304-runtime/rest-full-1440.png) | [実画面](previews/issue304-runtime/rest-full-1024.png) |
| イベント | [実画面](previews/issue304-runtime/event-1440.png) | [実画面](previews/issue304-runtime/event-1024.png) |

[保管庫取得の局所反応 1024](previews/issue304-runtime/treasure-claim-1024.png)。画像は仮のAct 1地点ノードを `RunSession` に保存して本編UIを描いた証拠で、自然ランの全地点や実機iPadの証拠ではない。`SHA256SUMS` は同ディレクトリに記録した。Playwrightの独立Chromiumで4地点×2寸法の画像読み込み・スクロール外への逸脱なし、購買全5品と整理選択の表示、実時計で保管庫取得→経路→ボス突入を確認した。地点の既存状態/保存フローと合わせて対象E2E 20/20。

満タン休憩で未強化カードが残る場合は、0回復を選ぶボタンを無効にして「HPは満タン」を同じボタン内に示し、Tabで次のノート強化に進める。未強化カードもない場合は「効果なしで進む」を明示して進行できる。これらは対象E2E 4/4で確認した。休憩の旧スクリーンショット `rest-1440.png` / `rest-1024.png` は比較履歴として残し、上表は修正後の画像へ更新した。

依然として候補の段階。各商品の個別絵、保管庫の開閉/空状態、回復/強化の動作差分、イベントID別の掲示内容、Act 3の色調、5部活との組合せ、人手の画風・権利採用判定、実機iPad操作は未完了。
