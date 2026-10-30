# 学園タイピングローグライク

GitHub [Epic #27](https://github.com/sato0825/school-rg/issues/27) に沿って開発中です。開発基盤 [#1](https://github.com/sato0825/school-rg/issues/1) とドメインスキーマ [#2](https://github.com/sato0825/school-rg/issues/2) を整備しています。戦闘は未実装です。カード名の直接入力を戦闘の核として実装します。

## 開発

Node.js 22 と npm を使用します。

```sh
npm ci
npm run dev
```

## 検証

```sh
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm run test:e2e
npm run check
```

E2E は Chromium が必要です。未導入の場合は `npx playwright install chromium` を先に実行します。CI は PR と main への push で clean install、Chromium 導入、`npm run check` を実行します。`check` は失敗した検査で終了します。

`src/domain` はゲーム規則、`src/ui` は表示とブラウザ入力、`tests` は単体・統合・E2E を分けています。確定していない仕様は [#26](https://github.com/sato0825/school-rg/issues/26) で設定として隔離します。

## コンテンツとランの境界

`src/domain/schema.ts` は `schemaVersion: 1` のコンテンツ台帳とラン状態を型・実行時スキーマで定義します。カードの英語入力文字列、効果ID、部活ごとの初期デッキとカードプールは別の項目です。`parseContentRegistry` と `parseRunState` は未登録ID、重複ID、山札・手札等の重複配置、存在しないマップ接続をパス付きエラーとして返します。

効果パラメータの個別意味、キーワードと発火トリガー、入力文字列の正規化・曖昧性、部活の正式名称と固有デッキ内容はまだ確定・実装されていません。テストの `club-a` / `club-b` はスキーマ検証専用の架空fixtureであり、完成コンテンツではありません。
