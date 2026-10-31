# #352 6候補の実ゲーム交換比較

基盤は[#341 / PR #344](https://github.com/sato0825/school-rg/pull/344)の `de77123`、原本は[#343 / PR #351](https://github.com/sato0825/school-rg/pull/351)の `19b30eb`。対象は KEN-002 stance v2、KEN-004 riposte v2、KEN-009 guard step v2、KEN-011 hasso **v4**、BASE-017 boost **v4**、BASE-023 delay v2。hasso v3とboost v3はsuperseded候補として保持。すべて **candidate** で、正式採用0、権利審査未実施、[#247](https://github.com/sato0825/school-rg/issues/247)レアリティへの影響なし。

`src/assets/cards/issue352/provenance.json` は旧/新両方のパスとSHA-256を固定する。旧PNGは `src/assets/cards/issue261/` と `issue329/` に残し、参照先だけ6 IDで交換した。カードID数は66/84候補のまま、欠落18。

## 画面検査

- `SCHOOL_RG_REVISION_STAGE=before` で旧版、`after` でboost v3、`v4` でboost v4を同じfixtureで撮影。各5部活、1024×768と1440×900で実戦闘の手札・報酬を比較した。剣道部の報酬は6件がすべて見えるよう2組。旧版8件＋fixture修正後の剣道2件、改稿版10件、v4版10件が通過し、画像ロード、候補版、入力語と効果の非重複、横はみ出しを確認した。
- 旧版の剣道部fixtureは、初期手札に6枚を追加して上限10を超えたため2件失敗。テスト用の生成時上限を解除し、最終手札6枚で再検証した。ゲーム側の手札上限は変更していない。
- [比較ページ](compare.html)では同一fixtureの新旧と[#327 / PR #337](https://github.com/sato0825/school-rg/pull/337)の剣道部実戦闘を並べる。#327は別シード・別敵・仮の取得頻度表示を含み、直接の前後差分ではない。参照画像は`reference/reference.json`に出所とSHAを記録。

## 目視判定と未解決

| ID | 改善 | 残る意味上の制約 |
|---|---|---|
| KEN-002/004/009/011 | 室内・商品写真風の影が減り、同じ紙地・輪郭に近づいた | riposteの反撃タイミング、hassoの特殊効果は絵だけでは確定しない |
| BASE-017 | v3の丸時計をv4では横長の時間帯と伸長矢印に置換。手札1024pxでdelayの丸時計と形が分かれる | 「時間+2秒」の正確な値は文字を読む必要がある。初見理解は未検証 |
| BASE-023 | 木机と写真風の時計を除き、紙地へ合わせた | v4のboostと輪郭が分かれたが、時間+4秒の確定には文字が必要 |

5部活の実寸画面では、線・影・紙地は旧版より近づいた。v3ではboost/delayの絵だけでの区別が不十分だった。v4では隣接した手札・報酬で横長の時間帯と丸時計を見分けられるが、**初見ユーザーの意味理解は採用ゲート未達**。画像と文字の併用で正確な効果は読める。実機iPad、権利審査、正式採用は未確認。発動後に時間が増えた原因を示す戦闘演出も別途確認が必要。
