# Issue #237: 校内背景6候補の制作入力

組み込み ImageGen の画像参照生成を各場面に1回使用した。参照画像は既存の同Act環境プレートで、色・カメラ高さ・建築様式の参照であり、新規候補は別の校内場所。モデルの詳細版は公開されておらず、同じ入力でピクセル単位の再現は保証できない。全候補は不透明16:9で、人物・敵・文字・UI・エフェクトを含めず、中央から下部を独立レイヤーの味方1〜3人と敵最大5体に空けた。背景は落ち着いた中立〜寒色とし、派手な演出はゲーム側に重ねる。編集可能原本と画風統一の最終採否は #29 に残す。

| 候補ID | 参照ID | 場所 | 構図の区別 |
| --- | --- | --- | --- |
| `act1-music-room-candidate-v1` | `stage-hallway-v1` | 音楽練習室 | 窓とピアノが見える広い室内 |
| `act1-covered-courtyard-candidate-v1` | `stage-hallway-v1` | 屋根付き中庭回廊 | 柱越しに庭が見える半屋外 |
| `act2-physics-room-candidate-v1` | `act2-science-wing-candidate-v1` | 物理実験室 | 天体模型と黒板のある室内 |
| `act2-observation-terrace-candidate-v1` | `act2-science-wing-candidate-v1` | 科学観測テラス | 気象観測器と屋外の空 |
| `act3-auditorium-stage-candidate-v1` | `act3-auditorium-foyer-candidate-v1` | 講堂の舞台 | 客席を遠景に見る木床 |
| `act3-assembly-courtyard-candidate-v1` | `act3-auditorium-foyer-candidate-v1` | 講堂前の集会広場 | 夕方の講堂外観と舗装 |

各候補の共通入力は `Use case: stylized-concept. Asset type: independent 16:9 battle environment plate for a 2D middle-school typing roguelike.`。既存同Act画像の色、描線、カメラ高さを参照しつつ、長い廊下や既存の部屋を反復しないよう指定した。床は既存の鏡面反射と人物アニメ調との差を弱めるため、マットで絵画的な陰影を指定した。人物、敵、読める文字、UI、効果、ロゴ、透かしはすべて禁止した。

## 場面別入力

- **Act 1 音楽練習室:** `Create a clearly NEW place: a spacious middle-school MUSIC PRACTICE ROOM seen from the entrance, with an upright piano and closed instrument storage against the far left wall, a large acoustic panel wall and music stands stored against the far right, tall rectangular windows at the back. Do not repeat the reference's long corridor, bookcases, or layout. Make the central and lower two-thirds an open matte wood floor. Soft clean hand-painted anime game background, flatter matte surfaces and painterly shadows than the glossy photoreal reference; no mirror-like floor reflections.`
- **Act 1 屋根付き中庭:** `Create a visibly DIFFERENT place in the same school: a broad covered courtyard passage at ground level, with a garden and school building visible beyond open columns, a muted blue metal canopy above, low planters at the distant edges, pale stone paving. Avoid the long corridor or library composition of the reference. Keep central and lower two-thirds a wide clear traversable matte floor. Flat painterly surfaces, soft shadows, only modest floor sheen, not photographic or mirror-like.`
- **Act 2 物理実験室:** `Create a NEW location in the science wing: a broad PHYSICS DEMONSTRATION ROOM with a distant chalkboard, a large orrery and telescope stored at the far sides, modular lab furniture pushed completely against the edges. Compose a symmetric open teaching floor in the central and lower two-thirds. Make this visibly a room, not another long science corridor or plant biology room. Calm, cool, painterly 2D anime game background with matte flooring and subdued shadows.`
- **Act 2 科学観測テラス:** `Create a clearly NEW place: the school's SCIENCE OBSERVATION TERRACE under a broad covered roof, with a distant weather station and small dome visible against the sky, low railings far behind the playable plane, glass doors and science notice boards at far sides. This is an open rooftop setting, visibly different from the indoor corridor and biology room. Keep the central and lower two-thirds a spacious unobstructed matte surface. Light cool overcast afternoon, restrained teal and slate, subtle painterly shading, not glossy photorealism.`
- **Act 3 講堂舞台:** `Create a distinctly NEW location: ON THE AUDITORIUM STAGE itself, looking across a broad empty wooden performance floor toward the distant seating and balcony; folded plum curtains and rigging frame the outer edges, a few soft cool rehearsal work lights illuminate the scene. The central and lower two-thirds must be unobstructed matte wood. Avoid repeating the reference's glass-walled foyer or hallway, avoid shiny mirrored tiles. Painterly 2D animation background, controlled values with character silhouettes and intent/HP overlays readable.`
- **Act 3 講堂前広場:** `Create a clearly DIFFERENT place in the same school at blue hour: the large open ASSEMBLY COURTYARD OUTSIDE THE AUDITORIUM, viewed from beneath a sheltered walkway. The auditorium's exterior wall and purple curtained windows are in the far background; a few closed equipment cases and low planters sit at far left and right. Broad open paved central and lower two-thirds, with no objects in the playable space. Calm neutral/cool dusk, soft 2D anime game background, matte paving and painterly shadow, less photoreal and less glossy than the reference. Do not recreate the reference's glass foyer corridor.`

全入力で、味方1〜3人を左側、敵最大5体を右側に重ねられる余白、Intent/HPの可読性も明示した。出力SHA・寸法・参照元・候補状態は[素材台帳](../asset-register.json)で固定する。これらは制作候補であり、安定した固定品質の制作工程および最終アート採用の証拠にはしない。
