# #367 第7波10枚の実ゲーム表示候補

[#338 / PR #342](https://github.com/sato0825/school-rg/pull/342) の原本10 IDを、[#352 / PR #359](https://github.com/sato0825/school-rg/pull/359)のBOOST v4・剣道改稿候補と同じ戦闘画面へ接続した。基盤は[#341 / PR #344](https://github.com/sato0825/school-rg/pull/344)。`src/assets/cards/issue367/provenance.json` にID・版・原本パス・SHA-256・権利状態を記録する。BASE-022 finish v1/v2とKEN-005 kata v1は原本台帳でsupersededのため表示しない。

対象は BASE-019 barrier、020 focus、021 sacrifice、022 finish **v3**、024 shield break、LIT-010 bookmark、SCI-011 test tube、KEN-005 kata **v2**、MUS-009 pickup、ART-010 palette。finish v1/v2とkata v1は原本・runtimeに保持し、表示対象から外した。カードの候補絵表示は76/84、欠落8 IDは ART-011、KEN-010/012、LIT-008/011、MUS-011/012、SCI-012。正式採用は0。レアリティ仕様[#247](https://github.com/sato0825/school-rg/issues/247)は変更していない。

## 画面検査

同一シード・手札・報酬を5部活×1024×768/1440×900でPlaywright撮影した。第1撮影の8枚手札は1024pxで両端のカードがレール外に見切れたため、画像ロードだけで全カードが視認できるとは判定できない。`*-hand.png`をその診断記録として保持し、手札6枚の`*-hand-v2.png`で全カードが画面内に収まる比較を行った。finish v3交換後は`*-hand-v3.png`/`*-reward-*-v3.png`を追加。10ケースすべて画像ロード・版・入力語/効果の非重複・各カードの画面内収まり・ページ横はみ出しなしを確認した。

[比較ページ](compare.html)に5部活の実手札と、行為の違いを見せる報酬を並べた。画像のみでは、barrierは障壁、focusはノート、sacrificeは破れたノート、kataは竹刀、pickupは音具、paletteは画材と判別しやすい。finish v2とshield breakはどちらも黒い板への打撃で、1024px手札の絵だけでは区別が弱かった。v3は傷んだ丸標的への一撃、shield breakは割れた角形の盾で、隣接した手札・報酬の輪郭が分かれる。**初見で条件付き大ダメージと防御破壊まで理解できるかは未検証**。文字では現在の正確な効果を読めるが、特殊効果の内訳はカード外の説明に依存する。

実機iPad、初見ユーザーの行為理解、権利審査、全画像の正式採用は未検証。旧版・候補原本は保持した。ゲームロジック・効果・綴り・レアリティは変更していない。
