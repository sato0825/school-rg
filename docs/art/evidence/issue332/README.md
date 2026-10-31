# 美術部の戦闘リグ候補 v2 検証記録

原画・動きは **candidate / 未採用**。画風、同一人物、肩・袖・足首・画材の接合は人による承認前です。実機 iPad、初見視認、勝敗演出、複数敵、カード保持・生成・変化ごとの画材表現も未検証です。

- `art-rig-1024.webm` / `art-rig-1440.webm`: GameShell で `frame` を直接タイプし、待機から発動へ進む連続録画。各サイズは 1024×768 / 1440×900。カードは自動テスト用の決定的な保存状態で手札に配置しました。
- `art-rig-idle-*.png` / `art-rig-card-use-*.png`: 同じ戦闘の待機と発動中の画面。1024 と 1440 の両方を目視確認し、顔、筆、ボード、靴、接地影が画面内に残ることを確認しました。
- Playwright `tests/e2e/art-rig.spec.ts` 5件: 直接入力でのカード発動、リグDOMの同一性、舞台寸法、全PNGのデコードまで全身像を出すフォールバック、低刺激、保存復帰、被弾表情。最後の被弾試験は保存復帰と分離してイベント時計を使っています。
- `npm run check:art`、`npm run typecheck`、`npm run build`、`npx eslint scripts/extract-art-rig.mjs` は 2026-10-31 の候補ソースに対し成功。全体 lint は `process` import がないため一度失敗し、該当ファイルを修正して個別 lint に成功しました。変更のない他ファイルの lint 結果は再利用しています。

OpenRaster 原本は `docs/art/sources/art-rig-candidate-v2.ora`。`docs/art/rigs/art-rig-candidate-v2.json` に分離PNG、SHA-256、位置、関節、接地を記録しています。v1 には肩の暗い継ぎ目があったため、v2 を別候補として作り、v1 も保存しています。
