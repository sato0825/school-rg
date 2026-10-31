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

統合レビューで、英字が通る場合にも変換開始・終了の案内が「英数入力に切り替える」と表示される矛盾を修正した。変換開始、Enter/Space、解決できた英字では案内を出さず、かな文字や解決できない `Process` キーだけで復帰案内を出す。`key=あ, code=KeyA` をLayout Mapの `a` として誤発動させない条件も追加した。表示の連続状態と発動をE2Eで確認した。Mac/Chromeのネイティブキー送出ではカード発動とHP変化を確認したが、短い入力時間の途中で案内の消灯を直接捕捉した画面証拠はない。

この試作を専用のViteポート4208から配信し、同じMac/Chromeで日本語入力源を切り替えずに `strike` を操作した。アクセシビリティ表示で「`strike を発動`」、敵HP `24/24 → 20/24`、入力欄のフォーカス維持を確認した。実OS操作に近いネイティブキー送出の結果であり、物理キーボードを人が押した試験とは区別する。

初回の単体テスト3件、E2E4件、lint、型検査が成功。E2Eには変換中の誤キー、繰り返しキー、Enter/Space、`Process` と模擬非QWERTY Layout Map、IME確定テキストの重複入力防止を含めた。

#182と#196を含むmainで、IME・カード束・戦闘ヘルプの対象E2EをPC 1440×900、iPad相当 1024×768、390×844で再確認した。IME入力時のカード発動・HP変化・フォーカスとヘルプ開閉、束表示が成立し、1024/1440の画像は `docs/art/previews/issue195-ime-typing-v1-1024.png` と `issue195-ime-typing-v1-1440.png` に保存した。12件中10件が初回成功、2件は#176の案内テストが `Process/KeyA` を解決不可と仮定していたため失敗した。試作ではLayout Mapにより解決可能なので、テスト入力を実際に解決不可のかな `あ/KeyA` に変更して2/2成功。戦闘ヘルプの対象E2Eも3/3成功。さらに#209はテストと文書のみの差分として最新mainへ取り込んだ。

実機iPadソフトキーボードと外付けキーボード、Safari、非QWERTY物理配列は未検証。特にiPad Safariでは [Keyboard Layout Map](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard/getLayoutMap) の対応が限定されるため、`key=Process` しか届かない場合は入力できない。日本語かなキーボードから英語カード名へ変換する仕様も未決定。[W3C UI Events](https://www.w3.org/TR/uievents/) のcompositionイベント順序と、[MDN KeyboardEvent](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent) の`key`/`code`の区別を前提に、対象環境の実測を継続する。

#198透過マップ統合後のmainでは、IME変換中にマップを開くと時計が停止し、マップ内の入力をカードへ送らず、閉じた後にtextboxへフォーカスが戻ることを確認した。未解決のかなキーを入力した案内から、マップを閉じた後に英字 `strike` を発動すると案内が消え、敵HPが減る。対象E2E15/15、戦闘ヘルプ3/3、単体5/5、lint、型検査が成功。PC/iPad相当の画像は `issue195-ime-typing-v2-1440.png` と `issue195-ime-typing-v2-1024.png` に再撮影し、旧v1画像は#198統合前の記録として残した。

## Mac Safari と WebKit の追加調査（#229）

Macの選択入力源が日本語RomajiTypingの状態でSafariの実測ページを開いた。SafariではKeyboard Layout Mapが利用できず、ページは `Layout Map: unavailable` と表示した。computer-useのネイティブキー送出で `strike` と `ka` を入力すると、各 `keydown` は英字の `key` と `code=Key*`、`isComposing=false`、`beforeinput=insertText` で、compositionイベントは発生しなかった。入力源を一度US Extendedへ切り替え、日本語へ戻しても同じだった。この送出経路はSafariの日本語IME変換状態を再現できていない可能性があるため、SafariでIMEオンの発動成功とは扱わない。ゲーム本体の10秒ターン中の長語送出も時間切れと交錯し、発動確認には使えなかった。

別の自動回帰として、Playwright WebKitエンジンに合成中のキーイベントを模擬し、Layout Mapがない場合の未解決 `Process`、長めのカード名 `outline`、ポーション名 `clock`、確定文字の二重入力防止、フォーカスと時間経過を確認した。対象E2E 2/2、lint、型検査が成功。これはWebKitのコード経路の検査であり、macOS Safariの実IMEやiPad実機の受入証拠ではない。
