# Issue #170 · 複数敵の情報設計

3〜5体編成では、重なった立ち絵を直接の選択先にせず、番号付きの敵一覧を操作先にする。各項目はHPの量と現在値を常時表示する。フォーカス・ポインタ・対象選択中の敵は名前、次の行動、HP、ブロック、状態を詳細札で読む。1〜2体編成は従来の敵札を使う。

| 役割 | 表現 |
| --- | --- |
| 敵の位置・雰囲気 | 立ち絵 |
| 敵の識別と選択 | 番号付きのボタン、フォーカス枠 |
| HPの残量 | 分節したバーと現在値/最大値 |
| 行動の種類 | 記号と短い種別名 |
| 行動・状態の意味 | フォーカス時の詳細札、スクリーンリーダー名 |

![390px・5体編成](previews/issue170-five-enemies-v3-390.png)

![1440px・5体編成](previews/issue170-five-enemies-v3-1440.png)

検証: `npm run lint`、`npm run typecheck`、`npx vitest run tests/integration/multi-enemy-ui.test.ts`（3件）、`SCHOOL_RG_E2E_PORT=4186 npx playwright test tests/e2e/multi-enemy-ui.spec.ts`（4件）。390pxでは3/4/5体、1440pxでは5体を確認。5体編成で敵を選んで `strike` を入力し、対象のHP減少も確認した。全体検証は親Issueへの統合後に実施する。

敵絵と背景は現在の制作候補であり、最終アートの採用判断は #29 のゲートに属する。
