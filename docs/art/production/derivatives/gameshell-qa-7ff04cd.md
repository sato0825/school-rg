# #283 候補派生の GameShell 実寸検査

検査対象は #261 の `7ff04cd`、派生側は `cbc88aa`。#261 のカードDOMと候補絵対応は `38750e4` から不変。隔離Playwright Chromiumで `1024×768`、DPR 2、`shortRun=1&seed=42` を使った。HTTPで対象5枚の元PNG要求に対して、#283の候補WebPを返した。リポジトリのゲームUI・元PNG・台帳は変更していない。

各部活で通常の部活選択→マップ→戦闘へ入り、対象IDが手札に出るまで時計を進めて撮影した。各WebPの `decode()` 成功、DOMの絵・カード名・効果の矩形が重ならないことを確認した。手札絵窓の下表寸法は実測の外枠で、CSSによる回転・境界線を含む。

| カード | 手札に出たターン | 絵窓（CSS px、概数） | 読み込み・文字干渉 | 証拠 |
| --- | ---: | ---: | --- | --- |
| LIT-002 | 2 | 115×59 | 320×144 WebP読込、重なりなし | [切り出し](../../previews/issue283-gameshell-7ff04cd/LIT-002-hand-card-crop.png) |
| SCI-001 | 1 | 115×59 | 同上 | [切り出し](../../previews/issue283-gameshell-7ff04cd/SCI-001-hand-card-crop.png) |
| KEN-001 v2 | 1 | 115×59 | 同上 | [切り出し](../../previews/issue283-gameshell-7ff04cd/KEN-001-hand-card-crop.png) |
| MUS-001 | 1 | 115×59 | 同上 | [切り出し](../../previews/issue283-gameshell-7ff04cd/MUS-001-hand-card-crop.png) |
| ART-002 | 1 | 116×61 | 同上 | [切り出し](../../previews/issue283-gameshell-7ff04cd/ART-002-hand-card-crop.png) |

文芸部の戦闘を実際にカード名入力で終え、LIT-002 が報酬に出た。`reward-2x`（512×192 WebP）の読込成功、報酬絵窓はカード回転後の外接矩形で約160×96 CSS px、カード名・効果との重なりなし。[手札全景](../../previews/issue283-gameshell-7ff04cd/LIT-002-hand-full.png)・[報酬全景](../../previews/issue283-gameshell-7ff04cd/LIT-002-reward-full.png)。中央の主題は両画面で残っている。

比較板 `review-v2.html` を同じ1024×768/DPR 2で白黒表示に切り替え、代表例LIT-002について元PNGと手札・報酬・詳細の1x/2xを比較した。35画像の読み込みに失敗はなく、[白黒比較画面](../../previews/issue283-gameshell-7ff04cd/LIT-002-grayscale-board.png)でも中央の紙の輪郭は残る。ただし白黒時の意味の読み取りは初見ユーザーに未確認。

この検査は5枚の縮小・焦点・読み込みだけに限る。候補絵の意味や画風、編集可能原本、権利、残りカードID、実機iPadでの見え方は未承認・未検証。UIへの正式なURL差し替えは行わない。#248/#29の採用ゲートも未達。#261のCIは検査時点で進行中だった。
