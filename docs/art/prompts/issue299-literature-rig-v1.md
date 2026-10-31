# #299 文芸部 部位別候補 v1

## 入力

- 編集・同一人物参照: `docs/art/candidates/literature-idle-candidate-v1.png` (`bc9cb19acd347e6db53dfd20d0b495b6daeba25b6af4f4bf7e136e17e629e030`)
- 制作方式: built-in imagegen。モデル版とseedは公開されていない。
- 最初の出力: 胴体、頭、左右腕、脚を分ける指示。ただし頭・左腕が接触し、原本としての部品分離が不十分。
- 二回目の出力を `literature-rig-parts-sheet-candidate-v1.png` として保持。生成元は本リポジトリの人物候補のみで、他作品の素材は使用していない。

## 二回目のプロンプト（最終候補）

> Use case: identity-preserve. Asset type: transparent 2D game character cutout rig sheet. Image 1 is the edit target. Image 2 is the original character identity reference. Fix the layout of Image 1 only: separate all body parts with generous fully transparent gutters so no hair, arm, bag, torso, skirt or leg overlaps another component or enters another component's extraction rectangle. The head/hair piece must contain ONLY head and hair to the neck, with no arm or shoulder; move the left sleeve/hand/bag into its own isolated component. Torso/skirt must end cleanly at both upper-leg sockets; move each leg with its entire sock and shoe to its own isolated component. Keep right arm/notebook isolated. Preserve exactly the same face, eyes, red bow, clothing, rabbit notebook, navy bag/rabbit charm, proportions, colors, lighting and line texture. Do not redraw her into a different character. All cutouts must have full painted overlap under joint disks so rotation opens no hole. Transparent background, no labels, no borders, no new objects, no duplicate assembled character. This output is one editable-source parts sheet with six disjoint components: head, torso/skirt, left arm+bag, right arm+notebook, left leg, right leg.

## 状態

素材は **候補・未採用**。1枚目と2枚目は画像生成であり、同じキャラの再制作に必要な手描き・レイヤー原画の完成証拠ではない。2枚目の6つの大きな透過連結成分は分離できるが、接合部の線・肌・服がゲーム内の動きに耐えるかは実画面で審査する。
