# 美術部の戦闘リグ候補 v2 検証記録

原画・動きは **candidate / 未採用**。画風、同一人物、肩・袖・足首・画材の接合は人による承認前です。実機 iPad、文字・HPを隠した初見視認と、画材の印だけでカード保持・複製・変化を区別できるかの人間評価は未検証です。

- `art-rig-1024.webm` / `art-rig-1440.webm`: GameShell で `frame` を直接タイプし、待機から発動へ進む連続録画。各サイズは 1024×768 / 1440×900。カードは自動テスト用の決定的な保存状態で手札に配置しました。
- `art-rig-idle-*.png` / `art-rig-card-use-*.png`: 同じ戦闘の待機と発動中の画面。1024 と 1440 の両方を目視確認し、顔、筆、ボード、靴、接地影が画面内に残ることを確認しました。
- `art-rig-two-enemies-1440.webm` / `.png`: 敵を2体にした決定的な戦闘状態で、カード発動と味方接地を確認。敵の組み合わせはテスト用の同種2体です。
- `art-rig-victory-1024.webm` / `art-rig-defeat-1024.webm` / `art-rig-last-hit-1024.png`: 最後の直接入力で敵HPが0になって報酬画面へ移るまで、また敵行動で味方HPが0になって敗北画面へ移るまでを確認。戦闘中の最後の姿勢が見えることは確認しましたが、勝敗専用の部位モーションはまだありません。
- `art-rig-copy-1024.webm` / `art-rig-transform-1024.webm`: `paint` / `redraw` を直接タイプし、対象の手札を選んだ後の画材印を録画。保持は `frame` の動画に含みます。印の選択はカード名の文字列ではなく実際の効果種別と保留キーワードから導いています。
- Playwright `tests/e2e/art-rig.spec.ts` 10件: 直接入力でのカード発動、リグDOMの同一性、舞台寸法、全PNGのデコードまで全身像を出すフォールバック、低刺激、保存復帰、被弾表情、複数敵、勝敗遷移、複製/変化の手札対象選択。最後の被弾試験は保存復帰と分離してイベント時計を使っています。`tests/unit/card-fx.test.ts` は効果定義から3種の画材印を分類することを確認します。
- `npm run check:art`、`npm run typecheck`、`npm run build`、`npx eslint scripts/extract-art-rig.mjs` は 2026-10-31 の候補ソースに対し成功。全体 lint は `process` import がないため一度失敗し、該当ファイルを修正して個別 lint に成功しました。変更のない他ファイルの lint 結果は再利用しています。

OpenRaster 原本は `docs/art/sources/art-rig-candidate-v2.ora`。`docs/art/rigs/art-rig-candidate-v2.json` に分離PNG、SHA-256、位置、関節、接地を記録しています。v1 には肩の暗い継ぎ目があったため、v2 を別候補として作り、v1 も保存しています。
