# #268 敗北ランタイム確認（候補）

この記録は Draft PR #271 の実装と候補画像の画面証拠です。ポーズ画像の正式採用、画風統一、実機 iPad での受け入れは含みません。#261 の全画面 GameShell 舞台上で、最終被弾から結果ノートまで同じ舞台・人物アンカーを使います。

## 実画面と連続動作

| 状態 | PC 1440 | iPad 相当 1024 |
| --- | --- | --- |
| 最終被弾 | [PNG](previews/issue268-transition-hit-1440-v6.png) | [PNG](previews/issue268-transition-hit-1024-v6.png) |
| 実戦敗北結果 | [PNG](previews/issue268-loss-real-1440-v11.png) | [PNG](previews/issue268-loss-real-1024-v11.png) |
| 被弾→結果の連続録画 | [WebM](previews/issue268-transition-1440-v6.webm) | [WebM](previews/issue268-transition-1024-v6.webm) |
| 低刺激 | — | [結果 PNG](previews/issue268-transition-result-quiet-1024-v6.png) · [連続 WebM](previews/issue268-transition-quiet-1024-v6.webm) |

録画はテスト用の実ゲーム状態で敵の最後の攻撃を進めて採取しました。舞台と人物アンカーの矩形座標差は 2 px 未満、入力帯のみ局所的に退きます。低刺激設定では被弾待ち時間を置かずに結果を表示します。PC/iPad 相当はブラウザの画面幅であり、実機 iPad の確認ではありません。

## 5 部活の配置

| 部活 | PC 1440 | iPad 相当 1024 | 候補 PNG SHA-256 |
| --- | --- | --- | --- |
| 文芸 | [PNG](previews/issue268-loss-literature-demo-1440-v11.png) | [PNG](previews/issue268-loss-literature-demo-1024-v11.png) | `7d9b6656891c030c31a31f410f728f0ec1b6f1c1e490ab783afaf260d21b5c5b` |
| 科学 | [PNG](previews/issue268-loss-science-demo-1440-v11.png) | [PNG](previews/issue268-loss-science-demo-1024-v11.png) | `1cf476aae06825c68cf84427e6136a58883e17ae52f3aeb9f634652dbdf5f018` |
| 剣道 | [PNG](previews/issue268-loss-kendo-demo-1440-v11.png) | [PNG](previews/issue268-loss-kendo-demo-1024-v11.png) | `79cad789c5240a0b7aa8c0ea919528001efb3181c25e12ca7b98e90f03560aad` |
| 軽音 | [PNG](previews/issue268-loss-music-demo-1440-v11.png) | [PNG](previews/issue268-loss-music-demo-1024-v11.png) | `e53498281c4e029e77efbb8be439999200b5fcbde27d674937f17d9dc5a2872f` |
| 美術 | [PNG](previews/issue268-loss-art-demo-1440-v11.png) | [PNG](previews/issue268-loss-art-demo-1024-v11.png) | `72ae07f4ff528c4f5c2fcd8c0aeb74b3275494e6ded6fde1ed4673632a58d640` |

画像は #252 と #259 の制作候補をそのまま使用し、表示マッピングから交換できます。文芸は他候補と元キャンバス寸法が違い、縮尺と接地の採用判断が残ります。剣道は右端余白と影を調整する必要があります。5 部活の最終画風・編集可能原本・演技の統一も未承認です。

## 状態と操作

- HP 0 時にタイマーと入力を止め、既存の舞台 DOM と人物 DOM を維持します。敵 Intent の表示は結果時に消し、敵の残像は薄くします。
- 最後の被弾内容は実際の戦闘ログから示します。ラン情報と HP はヘッダに一度だけ示し、ノートには結果と次の操作を置きます。
- ノートの可視主見出しを「敗北」、副表現を「今日はここまで」とし、最後の被弾値を見出しの直下に大きく配置します。敗北ポーズは待機・被弾との顔の見かけ寸法差を抑えるため、人物スロット内の描画幅を 78% に調整しました。位置アンカーと接地は維持します。
- 音 OFF、低刺激、保存済み敗北からの復帰、キーボード/タッチ操作とフォーカス移動を E2E で確認しました。
- 低刺激の最終被弾で即結果へ進む場合、被弾音を省き敗北音だけを再生します。通常演出は被弾音の後に敗北音、音 OFF は無音であることを実音発生イベントの E2E で確認しました。
- 実機 iPad、初見プレイヤーの理解、最終アート品質は未確認です。候補画像だけで #243/#252/#259 全体の完了とは扱いません。
