# Issue #136 敵候補画像 制作入力 v1

10点はいずれも `school-rg` 用の独自制作候補。組み込み ImageGen、透明背景を指定した。生成モデルの版は公開されていないため完全な再生成は保証できない。画像のSHAと寸法は `asset-register.json` に固定する。編集可能原本は未制作で、最終アート承認は #29 のゲートに残る。

## 共通入力

- 中学生の女子5人と同じゲーム内に置く、柔らかな手描きアニメ調の学校の怪異。怖くしすぎず、形と小物で敵を判別できること。
- 冷たい青灰・青緑を主色、赤や金を小さなアクセントにする。インク線と水彩風の陰影、琥珀色の目を共有する。
- 敵一体を中央に全身で描く。背景、床、影、文字、枠、他のキャラを含めず、周囲に透過の余白を残す。
- StS2 の固有キャラクター、絵、文章、視覚表現を参照しない。

## 個別入力と参照連鎖

| 素材ID | 形と小物 | 制作時に与えた参照画像 |
| --- | --- | --- |
| chalk-cloud-candidate-v1 | チョーク粉の渦、黒板消し、2つの琥珀色の目 | なし。最初の透過生成 |
| library-cart-candidate-v1 | 3/4向きの図書台車、積み重なる本、しおり、車輪 | chalk-cloud v1 |
| final-exam-candidate-v1 | 追試の答案と封筒の塔、赤い判子の盾、インク瓶 | chalk-cloud v1、library-cart v1 |
| lab-magnet-candidate-v1 | 赤と青緑のU字磁石、クリップ、金属ワッシャーの足 | chalk-cloud v1、library-cart v1 |
| club-auditor-candidate-v1 | 予算書を挟んだクリップボード、鍵束、長い影 | library-cart v1、final-exam v1 |
| closing-bell-candidate-v1 | 青緑の終業鐘、赤い紐、時計部品 | library-cart v1、final-exam v1 |
| window-shadow-candidate-v1 | 夜の窓枠、暗いガラス、月と紙の星 | library-cart v1、final-exam v1 |
| night-locker-candidate-v1 | 開いた青灰のロッカー、鍵、体操着 | window-shadow v1、library-cart v1 |
| graduation-curtain-candidate-v1 | 講堂の紺色の幕、金の支柱、紙のプログラム | night-locker v1、closing-bell v1 |
| notice-board-candidate-v1 | 校内掲示板、風に揺れる張り紙、赤い画鋲、短い脚 | library-cart v1、club-auditor v1 |

この表は形の再指定と既存候補との比較に使う。参照画像を再利用しても別制作回で同じ顔や線が得られる保証はないため、#29 の基準画・編集可能原本・目視審査が必要。
