# Issue #195 · 日本語IME中の英語カード入力実験

2026-10-31、Macの選択入力源が `com.apple.inputmethod.Kotoeri.RomajiTyping`（日本語）であることを確認した。Chromeでローカルの [実測用ページ](../../tests/fixtures/ime-probe.html) を開き、ネイティブUI操作で `strike` の各キーを送った。記録した入力はゲームの英語カード名だけで、ユーザー文書や個人情報は含まない。

| 観察 | 結果 |
| --- | --- |
| 最初の `s` | `keydown` は `key=s`, `code=KeyS`, `isComposing=false`。続いて `compositionstart` |
| 続く `t/r/i/k/e` | `keydown` は各英字の `key` と `code=Key*`, `isComposing=true` |
| IMEの中間テキスト | `compositionupdate` は `stりk` などに変わり、英単語の綴りを保持しない |
| `preventDefault()` | 英字の `keydown` をキャンセルしても、Chromeでは `compositionupdate` と `insertCompositionText` が続いた |
| Layout Map | Chromeでは `KeyA=a`, `KeyQ=q`, `KeyY=y`, `KeyZ=z`。他配列での実測ではない |
| 変換確定 | `Enter` は `isComposing=true` で、`compositionend` の後に `keyup`。Enterをカード確定へ送ってはいけない |

試作では、変換中でも `KeyboardEvent.key` が単一の英字なら、その英字を既存の決定的な入力エンジンへ渡す。`key=Process` など英字が得られない場合のみ、対応ブラウザーでは Keyboard Layout Map の `code` に対応する英字を使う。生の `code` を英字へ直結しない。Layout Mapがない場合は現在の案内へ戻す。IMEの確定テキストは別のカード入力として扱わない。

この試作を専用のViteポート4208から配信し、同じMac/Chromeで日本語入力源を切り替えずに `strike` を操作した。アクセシビリティ表示で「`strike を発動`」、敵HP `24/24 → 20/24`、入力欄のフォーカス維持を確認した。実OS操作に近いネイティブキー送出の結果であり、物理キーボードを人が押した試験とは区別する。

単体テスト3件、E2E4件、lint、型検査が成功。E2Eには変換中の誤キー、繰り返しキー、Enter/Space、`Process` と模擬非QWERTY Layout Map、IME確定テキストの重複入力防止を含めた。

実機iPadソフトキーボードと外付けキーボード、Safari、非QWERTY物理配列は未検証。特にiPad Safariでは [Keyboard Layout Map](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap) の対応が限定されるため、`key=Process` しか届かない場合は入力できない。日本語かなキーボードから英語カード名へ変換する仕様も未決定。[W3C UI Events](https://www.w3.org/TR/uievents/) のcompositionイベント順序と、[MDN KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) の`key`/`code`の区別を前提に、対象環境の実測を継続する。
