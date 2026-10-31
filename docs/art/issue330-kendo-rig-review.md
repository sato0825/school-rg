# Issue #330 剣道部「佐伯 りつ」分離rig制作候補

状態: **制作候補・未承認**。#29/#31 のキャラクター差別化を剣道部の戦闘画面で確認するための成果物です。デッキの確定値や最終立ち絵の承認を示しません。

人物・制服・竹刀・向き・動きの再制作条件は [作画仕様](kendo-rig-production-spec.md) に固定します。初回生成時の完全な入力文は保存されておらず、再制作ではこの仕様を使います。

## 原本と再現性

- 原画: `docs/art/candidates/kendo-rig-parts-sheet-candidate-v1.png`。生成時の透明シートを保存し、抽出位置・SHAを `scripts/extract-kendo-rig.mjs` に固定。
- 竹刀袋と被弾表情の生成原画を別保存。機械的なクロップ/リサイズは `scripts/derive-kendo-rig-extras.mjs` で再現。
- 編集可能なOpenRaster原本: `docs/art/sources/kendo-rig-candidate-v1.ora`。竹刀袋、両脚、胴体、両腕、頭、被弾表情の8レイヤー。構図と関節は `docs/art/rigs/kendo-rig-candidate-v1.json` に固定。
- `npm run check:art` が各PNGのSHA、透過、寸法、レイヤー構成とOpenRaster内の原画一致を検査。

## 戦闘画面での確認

1440×900: [待機](previews/issue330/kendo-idle-1440.png) · [防御](previews/issue330/kendo-guard-1440.png) · [攻撃](previews/issue330/kendo-strike-1440.png) · [動画](previews/issue330/kendo-combat-1440.webm)

1024×768: [待機](previews/issue330/kendo-idle-1024.png) · [防御](previews/issue330/kendo-guard-1024.png) · [攻撃](previews/issue330/kendo-strike-1024.png) · [被弾](previews/issue330/kendo-hit-1024.png) · [動画](previews/issue330/kendo-combat-1024.webm)

敵2体: [1024×768](previews/issue330/kendo-two-enemies-1024.png) · [1440×900](previews/issue330/kendo-two-enemies-1440.png)。敵2枠と俳優の矩形重なりがないことをE2Eで確認。

短縮ラン seed=42 の剣道部で `counter`（防御）、`strike`（攻撃）を実入力し、敵の行動まで録画。防御は閉じた構え、攻撃は竹刀の振りと踏み込み、被弾は別表情と竹刀を戻す構えです。動きは手札入力完了を起点とし、入力途中では発火しません。敵の行動は既存ターン進行に従います。俳優DOMと舞台矩形はカード使用・被弾中も保持。全レイヤーのデコード完了まで既存の一枚絵を表示し、ロード途中の欠けを防ぎます。静音/動きを減らす設定では静止した構えと被弾表情に切り替えます。

## 目視の未解決点

- 頭と襟、右肩付近には近距離表示で継ぎ目が残るため、作画修正が必要。ブラウザのマスクで隠して承認扱いにはしません。
- 竹刀の握りと竹刀袋の重なり、攻防時の手首の角度、被弾表情の同一人物感は人による絵柄審査が必要。
- 勝利・敗北の固有ポーズは未制作。現行ラン結果演出は共通表現のままです。
- 実機iPadは未確認。1024×768のブラウザ録画を実機確認の代用にはしません。

## 検証結果

- `npm run check:art`: 成功。
- `npx vitest run tests/integration/kendo-rig-ui.test.ts tests/unit/actor-motion.test.ts`: 5件成功。
- `SCHOOL_RG_E2E_PORT=45333 npx playwright test tests/e2e/kendo-rig.spec.ts`: PC/iPad相当の4件成功。ステージ/actor矩形、DOM保持、ガード・攻撃・被弾、敵2体、原子ロード、再読込、静音を確認。
- `SCHOOL_RG_E2E_PORT=45332 npx playwright test tests/e2e/kendo-rig.spec.ts tests/e2e/app.spec.ts --grep 'Kendo rig|kendo deck clears three Acts'`: 剣道部の短縮3 ActとAscension解放を含む4件成功。
- 全E2E 148件の実行は69件成功後に停止。軽音部の通常尺ランで180秒のテスト制限に達した時点では画面は全Actクリア済みで、テスト補助関数が戦闘入力欄を待機していた。タイムアウトの原因切り分けと全件再実行は未完了。対象の剣道部通常尺3 Actテストは通過済み。
- `npm run typecheck`: 成功。
