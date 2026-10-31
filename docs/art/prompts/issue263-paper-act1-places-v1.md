# Issue #263 Act 1 校内4場所の制作入力

#249のアトリウムを視覚基準にしたAct 1の場面差の検討。3枚を組み込みImageGenで各1回生成した。モデルの詳細版は公開されず、同一入力のピクセル再現性は保証されない。既存の候補画像は上書きせず、図書室v1の正面構図は残し、斜め視点のv2を別候補として追加した。

| 場所 | ファイル | 参照画像の役割 | 構図・時間帯 |
| --- | --- | --- | --- |
| 図書室v2 | `act1-paper-library-candidate-v2.png` | #249アトリウム=画風、図書室v1=家具、承認方向の女子=細線 | 斜めの書架、奥の閲覧席、右の中庭出口、遅い午後 |
| 音楽練習室 | `act1-paper-music-room-candidate-v1.png` | #249アトリウム=画風、承認方向の女子=線、紙の敵=面 | 右角からの側面、左の窓、右のピアノ、放課後 |
| 屋根付き中庭 | `act1-paper-covered-courtyard-candidate-v1.png` | #249アトリウム=画風、承認方向の女子=線、紙の敵=面 | 斜め回廊、庭・門・校舎外観、曇りの遅い午後 |

共通制約は、不透明16:9、薄い紙/ガッシュ面、濃紺の細線、涼色低彩度、写実的床反射なし。味方最大3人と敵最大5体を独立レイヤーで重ねる中央/下部の余白を確保し、人物・敵・文字・UI・効果・ロゴ・透かしを背景に描かない。

## 正確な生成入力

### 図書室v2

> Use case: stylized-concept. Asset type: independent opaque 16:9 battle environment plate for a Japanese middle-school typing roguelike. Input images: Image 1 is the #249 atrium's thin paper/gouache surfaces, navy ink lines, cool low-saturation palette and camera height reference. Image 2 is the existing library V1 reference for school furniture only; create a noticeably NEW composition, not a duplicate. Image 3 is the approved schoolgirl drawing reference for fine dark-blue contours. Create ACT 1 LIBRARY READING ROOM V2 from an OBLIQUE three-quarter camera near the left entry. Long bookshelves along the LEFT wall recede diagonally into depth, a reading alcove with desks is distant at RIGHT, and a second open doorway to the courtyard is visible far-right. The diagonal shelf wall and visible exit must clearly distinguish this from the square-on atrium and V1 library. Keep a broad continuous empty foreground across central and lower frame for separately overlaid 1–3 girl sprites left and up to five enemies right; furniture and vertical structures remain above/at far edges, no shelf between sides. Gentle later-afternoon blue-gray daylight, matte floor with soft diffuse gouache shadows, small dry-brush paper grain, fine deep-navy outlines, restrained slate/teal/cream. No photographic reflections, no mirror tile, no bright checkerboard sunlight, no warm orange wash. No people, monsters, cards, text, UI, effects, logos, watermark.

### 音楽練習室

> Use case: stylized-concept. Asset type: opaque 16:9 Act 1 school battle background plate. Image 1 is the #249 atrium reference ONLY for paper/gouache texture, fine navy ink lines, cool low-saturation school palette and camera height. Image 2 is the approved middle-school girl linework reference. Image 3 is the layered-paper enemy texture reference. Create a clearly DIFFERENT middle-school MUSIC REHEARSAL ROOM viewed from a RIGHT-HAND CORNER, with a diagonal receding wall of tall north-facing windows on the left, acoustic wood panels along the back, an upright piano and closed instrument cases clustered at far right, a subtle doorway at rear left leading toward the atrium. Side-angle composition and matte desaturated pale-wood floor distinguish it from the frontal atrium and library. Keep a broad clean lower-center gameplay zone with no stands or chairs in it, sufficient for 1–3 separately layered girl sprites at left and up to five enemy sprites at right. Quiet after-school cool daylight with a slightly deeper blue-gray than the atrium; soft hand-painted gouache planes, dry paper grain, fine deep-navy outlines, restrained teal accents, diffuse shadows. No photographic shine, no mirrored piano reflection, no sunbeam grid, no theatrical lighting or warm orange. No students, characters, enemies, readable sheet music or letters, UI, effects, logos, watermark.

### 屋根付き中庭

> Use case: stylized-concept. Asset type: independent opaque 16:9 Act 1 middle-school battle environment plate. Input images: Image 1 is #249 atrium's matte paper/gouache texture, fine navy linework and low-saturation cool palette reference, but the new scene must NOT repeat its symmetrical enclosed hall. Image 2 is approved schoolgirl linework reference. Image 3 is the layered-paper enemy art texture reference. Create a distinctive COVERED SCHOOL COURTYARD at the end of Act 1, viewed obliquely along a sheltered open arcade. Broad slate paving in foreground, asymmetric square pillars at extreme left and far right, an open green inner garden with a school building and a clear exit gate visible beyond the far side. The roof edge and garden should make this unmistakably OUTDOORS, unlike the atrium/library/music room. Cool soft overcast late-afternoon light and slightly deeper blue-gray shadows mark time progression, without sunset orange. Wide clear lower-center fighting plane for separately overlaid 1–3 girls on left and up to five enemies on right; keep columns, benches and plants at edges or distant background, never between combat sides. Paint as layered pale paper with hand-gouache broad shapes, fine dark-navy outlines, matte paving and soft diffuse shadows. Avoid the glossy mirror floor, photographic textures, repeated front-facing corridor, hard window-grid light or high-contrast clutter. No people, monsters, text, labels, UI, effects, logos, watermark.

寸法・SHA・採否・編集可能原本は[台帳](../asset-register.json)。4場所全体の採用とランタイム切替は、この候補比較のみでは完了しない。
