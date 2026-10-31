# Issue #138 3 Act校舎背景レビュー

## 戦闘画面

| Act | 1280px | 390px |
| --- | --- | --- |
| 1・昼の校舎 | [desktop](previews/issue138-act1-1280-20261031.png) | [narrow](previews/issue138-act1-390-20261031.png) |
| 2・理科棟 | [desktop](previews/issue138-act2-1280-20261031.png) | [narrow](previews/issue138-act2-390-20261031.png) |
| 3・講堂前 | [desktop](previews/issue138-act3-1280-20261031.png) | [narrow](previews/issue138-act3-390-20261031.png) |

Playwright Chromium でAct別のセーブからマップを開き、戦闘へ進んで背景をデコードして撮影した。Act 1は昼の校舎、Act 2は理科棟、Act 3は青紫の講堂前として識別できる。背景は広い床を保ち、主人公・敵・Intent・残り時間・カード入力欄を別レイヤーで表示する。390pxでも横はみ出しを確認していない。実機での受入は未実施。

背景の選択は `src/ui/stage-presentation.ts` に集めた。マップと戦闘が同じActの環境プレートを使い、画像の差し替えはゲーム規則・セーブ形式を変えない。3点のSHAと制作入力を台帳へ登録した。Act 2/3と既存Act 1はいずれも制作候補で、編集可能原本と別制作回での再現性は #29 の未完了事項。
