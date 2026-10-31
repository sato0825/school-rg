# #281: 校舎内の12場所を実ランへ割り当てる計画

この文書は [#281](https://github.com/sato0825/school-rg/issues/281) の実装契約と検証計画です。#261 GameShell の関連テストが通り、統合面が安定するまで、画面の runtime には組み込みません。画像は #29 の最終採用前の候補です。3 Act 完走、実機確認、約60分の達成を意味しません。

## 現行状態と依存

- `src/domain/map-generation.ts` は既定で各 Act に通常12階、4レーン、13階のボス、0階の開始地点を生成します。`floorsPerAct` は #15 の仮値です。地点IDは `a{act}-f{floor}-n{lane}`。種類は `start / combat / elite / event / shop / rest / treasure / boss` です。
- `src/ui/stage-presentation.ts` は現在、各 Act 前半・後半の2枚を `currentNodeId` と階から選びます。戦闘とマップは同じ選択関数を参照しています。
- 12枚の紙・ガッシュ候補は #249/#266/#263/#264/#265 の Draft PR に分散しています。新画面の #261 は #243/#256 に依存します。候補の版管理・採否は `docs/art/asset-register.json` と #29 が所有します。

## 暫定の場所データ

各行は校内を進む順序です。`placeId` は画面で使う安定ID、括弧内は差し替え可能な候補 `artId` です。画像 URL や配列番号をセーブデータの識別子にしません。

| Act | 0階・第1帯 | 第2帯 | 第3帯 | 第4帯・ボス |
| --- | --- | --- | --- | --- |
| 1 登校から放課後 | 入口アトリウム (`act1-paper-atrium-candidate-v1`) | 図書室 (`act1-paper-library-candidate-v2`) | 音楽室 (`act1-paper-music-room-candidate-v1`) | 屋根付き中庭 (`act1-paper-covered-courtyard-candidate-v1`) |
| 2 科学棟 | 科学棟入口 (`act2-paper-science-entry-candidate-v2`) | 物理室 (`act2-paper-physics-candidate-v1`) | 生物室 (`act2-paper-biology-room-candidate-v1`) | 観測テラス (`act2-paper-observation-terrace-candidate-v1`) |
| 3 講堂 | 講堂前広場 (`act3-paper-auditorium-plaza-candidate-v1`) | ホワイエ (`act3-paper-auditorium-foyer-candidate-v1`) | 舞台裏 (`act3-paper-backstage-candidate-v1`) | 講堂舞台 (`act3-paper-auditorium-stage-candidate-v1`) |

Act 2 入口 v1 はアトリウムと似た構図のため #264 台帳で非選択としています。上表の場所と帯境界は演出上の仮配置であり、正式な舞台採用ではありません。

## 決定規則

1. `run.map.currentNodeId` で現在の `MapNode` を引きます。ノードの `act`、`floor`、`kind` と同 Act のボス階から `placeId` を得ます。`run.act` は無効ID時の fallback にだけ用います。
2. 通常階数 `N = boss.floor - 1` の場合、0階は第1帯、通常階 `f` は `min(3, floor((f - 1) * 4 / N))` の帯、ボスは第4帯です。既定の `N=12` は 1–3、4–6、7–9、10–12＋ボスとなります。`N=1/2` の短縮ランは中間帯を飛ばしても逆行しません。
3. `seed` はマップ生成に反映済みです。場面の選択自体は乱数を使わず、`run.rngState`、時計、描画順、画面種別を変えません。同じシード・同じ選択経路・同じセーブ状態なら同じ `placeId` です。異なるレーンでも同階なら同じ場所です。
4. 候補 `artId` が未搭載なら、既存の Act 背景へ決定的に fallback します。無効 `currentNodeId` はゲーム状態の異常として別途検出し、表示だけは Act 背景に fallback します。選択関数はセーブスキーマを変えません。

## 地点種類と画面遷移

| 地点・画面 | 場所の扱い |
| --- | --- |
| 通常戦闘・エリート・ボス | 現地点のプレートに人物・敵・効果を独立レイヤーで重ねます。ボス固有演出を加えても第4帯の場所を維持します。 |
| イベント・購買・休憩・宝箱 | 現地点のプレート上に選択層を出します。無関係な部屋へ自動転送しません。専用内装が必要なら別Issueで subscene と画像を定義します。 |
| 報酬・経路マップ | 解決した現地点の場所を維持します。次地点へ移動した時だけ背景を切り替えます。 |
| Act遷移 | ボス後、次 Act の0階で新 Act の第1帯に切り替えます。 |

同一帯の連続地点は意図した地理的連続性です。既定値で同じ場所は最大4地点連続（第4帯はボスを含む）。画面上で冗長に感じる場合は、実測後に帯境界または追加の subscene を見直します。候補4枚を1つの Act 内で表示することと、背景の体感的な多様性は別の検証です。

## 実装順序と証拠

1. **依存ゲート:** #261 の関連テスト通過、戦闘・報酬・経路・特殊地点が同一 `RunState` を参照する統合面の確認。未達なら runtime の編集を保留します。
2. **データ:** `placeId` と `artId` の対応を1か所に定義し、アセット台帳の版・採否に追従します。旧光沢背景の #244 を流用しません。
3. **選択:** 純粋関数で地点→場所を解決し、GameShell の全画面へ同じ結果を渡します。`currentNodeId` の移動を唯一の通常切替契機にします。
4. **単体/統合:** 既定帯境界、`N=1/2/任意`、全地点種類、3 Act/ボス/Act遷移、無効ID/未搭載画像、同 seed/経路、セーブ・ロード一致、乱数状態不変、戦闘→報酬→経路→次地点の一致を検査します。
5. **実ラン:** seed を記録した通常経路を2種以上通し、各地点の `act/floor/kind/placeId/artId` と最長連続数を採取します。PC 1440×900 と iPad 相当 1024×768 で同一人物・敵・カード・Intent/HP を重ね、切替時のちらつき・画面移動・可読性を比較します。共有Chromeは使いません。物理 iPad の合格は実機で別途記録します。
6. **完了判定:** 上記の PR に検証結果を添えます。#29 の最終採用、編集可能原本、3 Act のゲーム全体完成、約60分の達成はそれぞれ別ゲートです。
