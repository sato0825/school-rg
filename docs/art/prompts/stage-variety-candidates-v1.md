# Issue #179 Act内ステージ候補 制作入力 v1

組み込み ImageGen の編集モードで、各Actの既存背景を**構図・画角・描写の参照**として1枚ずつ指定し、別の学校内の場所を制作した。いずれも人物、敵、文字、UI、エフェクトを含まない16:9の不透明な環境プレート。生成モデルの版は公開されておらず、同じ指示でピクセル単位の再現は保証できない。編集可能原本は未制作で、#29 の最終アートゲートは未通過。

| 出力ID | 参照ID | 場所 | 採否 |
| --- | --- | --- | --- |
| `act1-library-entrance-candidate-v1` | `stage-hallway-v1` | 図書室入口と閲覧室 | 候補、実画面で評価中 |
| `act2-biology-room-candidate-v1` | `act2-science-wing-candidate-v1` | 生物室と温室側の窓 | 候補、実画面で評価中 |
| `act3-backstage-candidate-v1` | `act3-auditorium-foyer-candidate-v1` | 講堂の舞台裏通路 | 候補、実画面で評価中 |

## 共通制約

`Use case: stylized-concept. Asset type: independent 16:9 battle environment plate for a 2D school typing roguelike.` 参照画像と同じカメラ高さ、十分に広い中央・下部の床面、落ち着いた中立寄りの青系の光、柔らかいアニメゲーム背景の描画を求めた。1〜3人の女子味方と最大5体の敵を別レイヤーに置く余白を保持し、文字・人物・敵・UI・効果・派手な暖色・暗いホラー演出を禁止した。

## 個別入力

### Act 1

`Image 1 is a style, camera-height, floor-space and school-architecture reference; create a NEW location in the same school, not an edit of its hall. A quiet middle-school library entrance and reading room after classes, with bookcases and notice displays at the far sides, cool daylight through broad left windows, slate blue and neutral cream, restrained teal details. The central and lower foreground must be a generous clear walkable polished floor for separately layered 1–3 girl characters and up to five enemies. Match Image 1's perspective height, soft clean anime-game background rendering, line density, nuanced cool light and wide uncluttered composition.`

### Act 2

`Image 1 is a style, camera-height, floor-space and same-school reference; create a NEW location in the same science wing: an airy greenhouse-connected biology classroom with high windows, distant specimen cabinets, closed lab benches only at far sides, a generous clear polished floor in central/lower foreground for separately layered 1–3 girl characters and up to five enemies. Match image 1's perspective, soft clean anime-game background rendering, cool blue-gray and restrained teal palette, daylight, line density, grounded school details and wide calm composition.`

### Act 3

`Image 1 is a style, camera-height, floor-space and same-school reference; create a NEW location in the same Act 3 school at blue hour: a broad backstage rehearsal corridor adjoining the auditorium, muted blue-violet evening windows on the left, closed storage/prop rooms and subtle stage curtains at far sides, a generous clear polished floor in central/lower foreground for separately layered 1–3 girl characters and up to five enemies. Match image 1's perspective, soft clean anime-game background rendering, controlled cool palette, grounded school details and wide calm composition. Light enough for readable character and intent overlays.`

各出力のファイル、SHA-256、寸法、候補状態は[素材台帳](../asset-register.json)に記録する。既存の背景も候補であり、制作回を跨ぐ安定した品質と編集可能原本の審査は#29に残す。
