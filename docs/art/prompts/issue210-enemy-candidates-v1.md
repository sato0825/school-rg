# Issue #210: 通常敵6体の素材候補 v1

親: #203、#68、#29。組み込み imagegen を使用し、各敵を**別の生成呼び出し**で制作した。`transparent_background: true`。モデルの版と乱数シードは公開されていないため、同じ入力で同一ピクセルを再生成できる保証はない。採用PNG、SHA、寸法は素材台帳に固定する。編集可能原本と反復制作の品質判定は #29 に残る。

既存の校内用品の怪異に合わせ、線のある手描きアニメ、水彩・ガッシュの質感、青灰・青緑・アイボリー、控えめな赤と真鍮色、琥珀色の目を共通条件にした。背景、床、UI、文字、既存作品の固有表現を含めない。以下は各呼び出しに与えた主題と輪郭の指定である。

| Act | 敵ID | 遠目の輪郭 | 行動とのつながり | 候補ファイル |
| --- | --- | --- | --- | --- |
| 1 | `hall-mop` | 柄が高い縦長、下端に広がるモップ | 打撃・防御 | `hall-mop-candidate-v1.png` |
| 1 | `folded-school-map` | 左右へ広がる蛇腹折りの紙 | 紙片召喚 | `folded-school-map-candidate-v1.png` |
| 2 | `beaker-mist` | 丸いフラスコと内側の霧 | 毒・打撃 | `beaker-mist-candidate-v1.png` |
| 2 | `lab-coil` | 上下に伸びる螺旋 | 蓄力・防御・強打 | `lab-coil-candidate-v1.png` |
| 3 | `stage-spotlight` | 上の灯体から下へ広がる光の円錐 | 脆弱化・打撃 | `stage-spotlight-candidate-v1.png` |
| 3 | `archive-clock` | 円形の時計と近接する紙帯 | 強化・連撃 | `archive-clock-candidate-v1.png` |

## 生成入力

各呼び出しは、次の共通スタイル指定と個別主題指定を一つの文章として与えた。文言は制作時の意味を保つよう整理して記録し、完全なAPIパラメータやシードを再現できるという主張はしない。

**共通スタイル:** Original transparent cutout enemy illustration for a Japanese school fantasy typing roguelike. One isolated school-object monster, hand-drawn anime ink contour, textured watercolor/gouache shading, muted blue-gray and teal, warm ivory, sparse vermilion and aged brass accents, tiny amber eyes. Playful eerie school mood, not horror. Full subject centered with true transparent margins and clean alpha edges. No environment, floor, cast shadow, human, readable text, logo, UI, watermark, extra creature, or famous franchise motifs. Legible at small battle-sprite size over a wide school background.

- **hall-mop:** Strong tall vertical silhouette: long worn wooden handle rising high, small dark teal cleaning-bucket ring, broad cream mop strands spreading at the bottom, amber eyes beneath strands, restrained red cloth ties. No arms or legs.
- **folded-school-map:** Strong wide horizontal silhouette: accordion-fold floor plan spreading left and right like origami wings, map creases, tiny route lines, amber eyes in central dark fold, red string route marker. No readable writing.
- **beaker-mist:** Squat round glass laboratory beaker with short neck, teal-blue and pale lavender vapor inside, amber eyes in fog, loose droplets and stopper near vessel, red warning ribbon. Distinct from magnet and clock.
- **lab-coil:** Tall spiral made of one thick dark teal induction coil, three winding loops from weighted brass stand, small blue electrical arcs, amber eyes inside center, red warning thread. No horseshoe shape.
- **stage-spotlight:** Compact old theater spotlight suspended diagonally, amber eyes in lens, broad translucent cone of pale light widening downward, stage dust, red pull cord. The cone is part of the isolated sprite, not a background.
- **archive-clock:** Round school-archive wall clock with teal rim, amber eyes under the hands, catalog strips and bookmark ribbons close around it, brass fasteners and red seal. Distinct from a bell; no readable numerals.

## 現時点の採否

6枚とも `candidate`。透明PNGの実ファイル、寸法、SHA、視覚上の輪郭差を確認する。輪郭の一部がキャンバス端に近い候補があるため、#29の最終採用ゲート（余白・編集可能原本・同一品質の再制作）は未達。既存敵素材や部活アートと同条件で並べて人が比較するまで、正式採用扱いにしない。
