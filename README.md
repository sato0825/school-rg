# 学園タイピングローグライク

GitHub [Epic #27](https://github.com/sato0825/school-rg/issues/27) に沿って開発中です。現在のソースは [#1](https://github.com/sato0825/school-rg/issues/1) の基盤のみで、戦闘は未実装です。カード名の直接入力を戦闘の核として実装します。

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
