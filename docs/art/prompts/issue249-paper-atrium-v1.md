# Issue #249: 紙・ガッシュ調の校内舞台候補

組み込みImageGenで生成した、最終採用前のアート方向比較用1場面。画像は `src/assets/stages/act1-paper-atrium-candidate-v1.png`。モデルの詳細版は公開されていない。同じ指示でピクセル単位の再現は保証できない。既存背景は上書きしていない。

## 入力画像と役割

1. `src/assets/stage-hallway-v1.png`: カメラ高さ、広さ、比較対象。鏡面床の画風は継承しない。
2. `docs/art/reference/serious-student-approved-direction.png`: 中学生の人物線、濃紺の細線、平面的な色面。
3. `src/assets/enemies/paper-heap-candidate-v1.png`: 淡い紙・ガッシュの面、低彩度の涼色、細い濃紺の輪郭。

## 生成入力

> Use case: stylized-concept. Asset type: independent opaque 16:9 battle environment plate for a Japanese middle-school typing roguelike. Input images: Image 1 is ONLY the current corridor layout/camera and the appearance to improve (do not copy its glossy photographic floor); Image 2 is the approved schoolgirl drawing reference for thin deep-navy outlines and gentle 2D proportions; Image 3 is an enemy art reference for layered pale paper and gouache texture, deep-navy fine outlines, low-saturation cool grays and teal. Primary request: create a NEW broad school entrance atrium as the central battle stage, with high school windows far back, a navy framed stairwell only at the far left edge, a pale bulletin wall only at the far right edge, and a single distant doorway. The foreground and center must be a large, CLEAR, flat walkable school floor for 1–3 separately layered girl characters on the left and up to five enemy sprites on the right. Draw every plane as softly layered matte paper/gouache shapes with subtle fibrous grain, restrained deep-navy thin outlines and simple painterly shadows. Cool low-saturation slate, blue-gray, pale ivory and muted teal; no realistic photo textures, no mirror shine, no sharp cast-light grid, no orange sunset. Orthogonal school architecture with readable depth and generous negative space. Background stays calm so card effects can be vivid and HP/Intent readable. No people, characters, monsters, cards, labels, text, UI, effects, watermark. The outputs are a single environment plate only.

寸法とSHA-256、参照元、候補状態は[素材台帳](../asset-register.json)に記録した。実画面比較は[Issue #249レビュー](../issue249-stage-style-review.md)に記録する。採用と編集可能原本のゲートは #29 / #243 に残る。
