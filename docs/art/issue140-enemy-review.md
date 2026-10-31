# Issue #140 敵候補の画面確認

25敵IDに別々の候補画像を割り当てた。敵画像は戦闘の表示データであり、Intent、HP、カード効果、出現表は変更していない。

## 実画面

| 条件 | 保存画面 | 確認事項 |
| --- | --- | --- |
| Act 1、単体、1280px | `previews/issue140-paper-heap-1280-20261031.png` | 答案の束、HP、Intent、時計、入力欄 |
| Act 1、2体、1440px | `previews/issue140-two-enemies-1440-20261031.png` | 敵2体の外見、別々のIntent/HP、攻撃対象 |
| Act 1、2体、390px | `previews/issue140-two-enemies-390-20261031.png` | 横はみ出しなし。2体の名前、Intent、入力欄を表示 |
| Act 2、ボス、1280px | `previews/issue140-lab-ventilation-1280-20261031.png` | 換気ファンの形、ボスHP、Intent、入力欄 |
| Act 3、単体、390px | `previews/issue140-night-announcement-390-20261031.png` | 放送設備の形、HP、Intent、入力欄 |
| Act 3、単体、1280px | `previews/issue140-last-bus-1280-20261031.png` | バスの形、HP、Intent、入力欄 |

実画面では背景を広く使い、人物と敵を別レイヤーに置いた。狭幅の複数敵では画像の細部は小さくなるが、異なる輪郭と名前・Intentは確認できる。全25画像はブラウザーでdecodeを確認し、台帳のSHA、寸法、alphaを検査した。

これらは制作候補で、正式採用ではない。編集可能な原本、反復制作での線・色・表情の品質維持、最終的な動きの審査は #29 に残る。画像生成モデルの版と初期8点の個別参照連鎖は記録できていないため、同じ入力だけで完全な再生成は保証しない。
