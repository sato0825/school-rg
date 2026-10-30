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

## 暫定設定と未決定事項

`src/domain/config.ts` に設定の値、決定状態、根拠、担当Issueを集めています。`provisional` は初期検証用で、承認済み仕様ではありません。`unresolved` は値を持たず、使用しようとするとエラーになります。設定の値を変えたテストで差分を検証できます。

| 項目 | 現在の扱い | 担当Issue |
| --- | --- | --- |
| 毎ターンのドロー枚数 | 暫定5枚（設計書の初期検証値） | #6 |
| プレイヤーターン時間 | 暫定10秒（設計書の初期検証値） | #6 |
| 接頭辞衝突の確定キー | 暫定Enter（キー自体は未承認） | #5 |
| 入力取消キー | 暫定Escape（設計書の暫定仕様） | #5 |
| 空白・句読点・大文字小文字・同名カードの扱い | 未決定 | #5 |
| 手札上限 | 未決定 | #7 |
| 時間上限 | 未決定 | #6 |
| X効果の端数 | 未決定 | #9 |
| 正式な5部活名 | 未決定 | #12 |
| エナジー相当の時間加算 | 2秒（Epic #27の確定事項） | #9 |

未決定項目を設定ファイルで暗黙の既定値に置き換えず、各Issueの仕様判断とテストで更新します。
