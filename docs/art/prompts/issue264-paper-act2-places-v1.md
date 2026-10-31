# Issue #264 Act 2 科学棟4場所の生成入力

組み込みImageGenで各場面1回、科学棟入口のみ構図が#249アトリウムに近かったため別プロンプトでv2を1回生成した。v1は保存・台帳登録したが、4場所の選定には含めない。詳細モデル版は公開されず、同一入力のピクセル再現性は保証されない。全画像は不透明16:9、薄い紙/ガッシュ面、濃紺細線、涼色低彩度、写実的床反射なし。人物・敵・文字・UI・効果を描かず、味方最大3人と敵最大5体を別レイヤーで置く中央・下部の余白を残す。

| 候補 | 参照画像の役割 | 選定 |
| --- | --- | --- |
| 科学棟入口v1 | #249=画風、物理室=科学棟の器具、女子=線 | アトリウムと正面入口が近く不採用候補 |
| 科学棟入口v2 | 女子=線、紙の敵=素材/色。建築画像は参照しない | 斜めの階段踊り場として比較対象 |
| 植物・生物室 | #249=画風、女子=線、紙の敵=素材/色 | ガラス温室と植物標本 |
| 観測テラス | 科学棟入口v2=画風、女子=線、紙の敵=素材/色 | 屋上の観測器と遠景 |

物理実験室は#266の `act2-paper-physics-candidate-v1` を4場所比較へ使う。

## 正確な生成入力

### 科学棟入口v1（4場所には数えない）

> Use case: stylized-concept. Asset type: independent opaque 16:9 battle stage plate for the science wing of a Japanese middle school. Image 1 is the #249 paper/gouache atrium reference for fine navy linework, matte paper texture, cool low saturation and camera height; DO NOT repeat its frontal entry hall. Image 2 is the Act 2 paper physics room reference for the science wing's fixtures and color continuity; this must be a different location. Image 3 is the approved middle-school girl linework reference. Create the ACT 2 SCIENCE-WING ENTRY LANDING from an ASYMMETRIC oblique view: a short stair flight and blue handrail recede at the far LEFT, specimen display cabinets and glass lab doors mark the RIGHT wall, a central double doorway leads deeper into the science wing. A subtle suspended solar-system model is high in the far background. This is a school junction and threshold, not a generic long corridor or a second physics room. Broad clear matte slate floor across lower and middle play area for independently layered 1–3 girl sprites on left and up to five enemies on right; any cabinet/rail stays at far sides, no obstruction between sides. Thin navy pen contours, softly layered pale gouache-on-paper planes, dry-brush grain, neutral/cool blue-gray and restrained teal, diffuse late-day indoor light. No photographic reflections, mirror polish, harsh floor grid, orange wash, people, monsters, legible text, UI, effects, logo, watermark.

### 科学棟入口v2

> Use case: stylized-concept. Asset type: independent opaque wide 16:9 environment plate for a middle-school typing roguelike. Image 1 is ONLY a style reference for schoolgirl linework: thin deep-navy outlines, 2D anime proportions and restrained flat colors. Image 2 is ONLY a texture/color reference: layered pale paper and hand gouache with dark-blue fine contours. DO NOT use a previously generated school-hall image as a layout. Invent a clearly asymmetrical ACT 2 SCIENCE-WING STAIR LANDING. Camera is positioned diagonally along a broad landing, with a short stairwell rising at FAR RIGHT BACK and a blue steel rail fading toward it; on FAR LEFT a run of glass classroom windows reveals rows of specimen cabinets; a single off-center science-room door sits back-left. The diagonal rise and visible rail are the main silhouette, not a central symmetric entrance; no centered doorway and no square-on atrium. Across center and lower foreground, provide a wide uninterrupted matte pale slate floor for 1–3 separate schoolgirl sprites left and up to five enemies right. Stylized 2D anime game background drawn on thin fibrous paper with layered gouache color shapes, fine dark navy linework, soft cool blue-gray/teal/ivory tones, diffused light and no photographic or mirror floor reflections. Keep depth readable and background calm. No people, creatures, text, signs, UI, effects, logos, watermark.

### 植物・生物室

> Use case: stylized-concept. Asset type: independent opaque wide 16:9 middle-school battle background. Image 1 is #249's paper-and-gouache school art style reference only: fine navy ink, soft matte pale paper, subdued cool colors. Image 2 is the approved schoolgirl linework reference. Image 3 is the paper-monster texture reference. Create a clearly distinct ACT 2 BOTANY / BIOLOGY ROOM adjoining a small school greenhouse. View diagonally from the room's right corner toward a long glass greenhouse wall and sloping skylight on the LEFT; low botanical specimen cabinets and a few plant shelves sit along FAR walls, a narrow laboratory door recedes at far right. Plants and vine silhouettes behind glass create a restrained sage/teal accent, but the central and lower floor remains broad, EMPTY, and matte for 1–3 overlaid girl sprites at left and up to five enemy sprites at right. It must read as a biology/plant study room, not the physics blackboard room, not a generic atrium or courtyard. Hand-painted gouache on fibrous pale paper, crisp thin dark-navy contours, cool blue-gray light, low-saturation green, diffuse shadows, slightly humid soft light; no photographic sheen, no mirror floor, no bright checkerboard sun, no warm orange, no jungle clutter. No people, monsters, labels, writing, UI, effects, logos, watermark.

### 観測テラス

> Use case: stylized-concept. Asset type: independent opaque wide 16:9 battle environment plate for a 2D middle-school game. Image 1 is the paper-gouache science-wing landing reference for fine navy ink lines, matte fibrous planes and restrained cool color; do not copy its stairs. Image 2 is the approved middle-school girl linework reference. Image 3 is the paper-monster material reference. Create a distinct ACT 2 SCIENCE OBSERVATION TERRACE on the school ROOF under a shallow shelter at blue-gray overcast late afternoon. Camera looks diagonally across a wide open rooftop toward a low distant railing and a small observatory dome at FAR LEFT BACK, plus a compact weather vane and rain gauge at FAR RIGHT BACK; a distant hazy skyline and uninterrupted sky occupy the upper frame. This must read as a real school weather-study roof and be obviously different from the leafy Act 1 courtyard, interior physics room and greenhouse biology room. Keep central and lower area a broad clear slate paving platform for 1–3 separate girl sprites left and up to five enemy sprites right. Instruments and railings stay distant and low. Thin deep-navy architectural linework, softly layered pale gouache on paper, low-saturation cool blue/periwinkle/teal, matte paving, diffuse shadows, slightly deeper sky than the other Act 2 scenes. No photographic sky or mirror floor, no bright checkerboard beams, no dramatic storm, no people, creatures, text, UI, effects, logos, watermark.

素材のSHA、寸法、版、原本有無、選定状態は[台帳](../asset-register.json)。候補制作を4場所のランタイム採用や#29最終アート承認と混同しない。
