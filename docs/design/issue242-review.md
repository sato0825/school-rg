# #242 ゲーム画面の一体設計 — レビュー用

敵Intentと手札を読み、限られた秒数で綴り・順序・対象を選び、カード発動の結果を見て次の入力を決め、報酬・経路・部活デッキを組み替え3 Act進む。画面はこの判断が毎秒追えるように、人物と敵を校内の舞台に置き、カードを手元の実物、経路と記録を校内の紙として扱う。

## 実寸モック

`issue242-game-screen.html` は保存データや本編に接続しない独立した画面案。`?review=1` で検証用の状態切替を開ける。`?scene=combat|allies|multi|turn-end|impact|reward|route|detail|relic|last-hit|defeat`、`&typed=st`（入力途中）、`&focus=1`（5敵の選択詳細）、`&quiet=1`（動きなし）、`&bg=paint|atrium|existing`（背景比較）を指定できる。提示デフォルトは #249 アトリウム候補。直接キー入力の簡易演出は画面案の操作確認用であり、ゲームの入力判定・敵AI・報酬確定を実装したものではない。

| 状態 | 1440×900 | 1024×768 |
| --- | --- | --- |
| 戦闘 | [PC](previews/issue242-combat-1440-atrium.png) | [iPad相当](previews/issue242-combat-1024-atrium.png) |
| 入力途中 | [PC](previews/issue242-partial-1440-atrium.png) | [iPad相当](previews/issue242-partial-1024-atrium.png) |
| 味方3人の舞台 | [PC](previews/issue242-allies-1440-atrium.png) | [iPad相当](previews/issue242-allies-1024-atrium.png) |
| 5敵・複合Intent | [PC](previews/issue242-multi-1440-atrium.png) | [iPad相当](previews/issue242-multi-1024-atrium.png) |
| 5敵の選択詳細 | [PC](previews/issue242-multi-focus-1440-atrium.png) | [iPad相当](previews/issue242-multi-focus-1024-atrium.png) |
| カード発動 | [PC](previews/issue242-impact-1440-atrium.png) | [iPad相当](previews/issue242-impact-1024-atrium.png) |
| 時間切れ→敵行動 | [PC](previews/issue242-turn-end-1440-atrium.png) | [iPad相当](previews/issue242-turn-end-1024-atrium.png) |
| 報酬 | [PC](previews/issue242-reward-1440-atrium.png) | [iPad相当](previews/issue242-reward-1024-atrium.png) |
| 経路 | [PC](previews/issue242-route-1440-atrium.png) | [iPad相当](previews/issue242-route-1024-atrium.png) |
| カード詳細 | [PC](previews/issue242-detail-1440-atrium.png) | [iPad相当](previews/issue242-detail-1024-atrium.png) |
| レリック取得 | [PC](previews/issue242-relic-1440-atrium.png) | [iPad相当](previews/issue242-relic-1024-atrium.png) |
| 最後の被弾 | [PC](previews/issue242-last-hit-1440-atrium.png) | [iPad相当](previews/issue242-last-hit-1024-atrium.png) |
| 敗北後 | [PC](previews/issue242-defeat-1440-atrium.png) | [iPad相当](previews/issue242-defeat-1024-atrium.png) |

静止キャプチャはすべて `quiet=1` とブラウザの reduced motion で撮った。同じ情報を残して全体揺れを省いた低刺激構図のレビュー用であり、実際のユーザー選択・実機アクセシビリティ検証ではない。

## 画面の読み順と役割

1. 敵の絵・足元のHP/格/Intent。Intentは効果の順序、値、対象方向を同じ敵プレート内で読む。区分と状態は同じ情報に混ぜず別の印にする。多敵時にはプレートを敵の足元へ結び、画面上端へ説明票を増やさない。#245の全effectIds文法を採用する前提で、1敵では攻撃6×2→防御4、5敵では攻撃/防御/強化/毒/弱体を効果順と対象つきで例示し、選択時に詳細を開く。
2. 手札のカード固有絵、綴り、効果。絵は瞬間認識、綴りは入力、効果アイコン＋値は判断に使う。カード種別（攻撃・技能・持続）とレアリティを別軸で符号化する。現モックの Common/Uncommon/Rare 割当は仮提案であり仕様ではない。`data-art-id` と `data-art-version` を交換点としておく。
3. 中央下の秒数と進行線。タイプされた綴りを手札の候補に直接反映する。フォームの入力欄を置かない。誤キー無視の視覚デモでは組成中キーを除外するが、IME入力、候補競合、時間切れ競合は本編の入力実装で検証する。
4. 結果は対象の近くに出す。発動時は敵HPの減少と局所軌跡、敗北時は主人公のポーズとHP 0で表す。ステージ全体の揺れを恒常的な通知にしない。
5. 戦闘後は同じ舞台の上でカードを選び、経路は薄い校内紙面として重ねる。背景・人物は残す。経路モックは1–3/15Fの抜粋で、3階だけのActを意味しない。本編の全階層、到達可能性、スクロールと分岐は別途データ検証が必要。
6. 最後の被弾→敗北の画面では主人公を消さず、敵の位置も残し、校内ノート状の結果札を右に置く。先行は既存hit候補を仮用し、現在は #252 の文芸部専用座り込み候補へ更新した。専用敗北ポーズ、静止残像量、再挑戦の実際の動線は敗北演出Issueで評価する。

## アート判断

既存背景 `src/assets/stage-hallway-v1.png` は床の反射と細部が写実寄りで、人物の2D線画とやや離れる。ガッシュ廊下候補 `issue242-assets/corridor-gouache-candidate-v1.png` は反射を抑える。#249アトリウム候補 `issue242-assets/paper-atrium-issue249-candidate-v1.png` は同じ実寸配置で1–5敵の立つ余地が広く、人物と敵の線画にも近いため提示デフォルトにした。背景の最終採用には複数校内場面への展開と描画一貫性の検収が必要。

現モックのカード8点とレリック1点はレイアウト確認用の生成候補で、いずれも正式採用していない。手札の `sweep` / `jot` / `strike` / `verse` / `draw` は #246 の画風に寄せた候補へ差し替えた。旧版は `art=legacy` で比較できる。報酬カード3点は依然として質感差があり、レリックには縮小時の輪郭不足がある。#246の紙/ガッシュ・濃紺輪郭・低彩度涼色のアートバイブルと候補を優先比較し、全カード84点、レリック11点、ポーション6点の図像を制作・検収する。レアリティ仕様は #247 の判断まで仮提案のままとする。テンプレートの `artId` / `version`、安全な画角、手札縮小・報酬サイズでの読みやすさ、カード種別とレアリティの独立符号を品質ゲートにする。

## 判定

- **画面案として成立**: PC/iPad相当で、カード名直接入力、敵の次手、HPと状態、山札/捨て札、報酬、経路、詳細、レリック、敗北の情報配置を実寸で比較できる。
- **ブラウザ操作確認**: 1440×900・1024×768の26状態を Playwright で撮影し、画像欠損・JS例外なしを確認。検証メニュー、部分入力、5敵選択詳細、レリック時の手札非表示とAX除外、Pause、`strike` 後の敵HP 24→18と戦闘への復帰、組成中キーの無視を確認。これは画面案の因果確認でありゲームエンジンのテストではない。
- **未検証**: 実機iPad、初見の中学生/感覚過敏ユーザーによる理解、5敵の初見理解と味方3人時の初見理解、実際の時間制限とIME、入力中の詳細表示と休止、暗部/色覚差、アニメーション品質。
- **未完成**: 本編UI統合、全Act/5部活の固有絵、経路全階、効果の全種類、全効果を反映する選択対象と多敵プレート、敗北専用ポーズの採用判断、音と振動の強度設定。モックのクリックは保存状態を変更しない。
