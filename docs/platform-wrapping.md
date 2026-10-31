# Mac・Windows・iPad アプリ化

Issue #185。Web版と同じ TypeScript/Vite の戦闘・セーブ・画像を Tauri 2 のWebViewに同梱する。Electronは公式の対応先がデスクトップ（macOS/Windows/Linux）であり、iPadを含む本作では Tauri 2 を選ぶ。選定根拠: [Tauri配布](https://v2.tauri.app/distribute/)、[Tauri前提条件](https://v2.tauri.app/start/prerequisites/)、[Electron概要](https://www.electronjs.org/docs/latest)。

## リポジトリ内の構成

- `src-tauri/tauri.conf.json`: Vite成果物 `dist/`、PCの初期/最小ウィンドウサイズ、同梱アイコン、最小のWebView権限。
- `src-tauri/gen/apple/`: `tauri ios init` で作成したXcodeプロジェクト。`project.yml` と `.xcodeproj` の `TARGETED_DEVICE_FAMILY = 2` でiPadを対象にする（[Appleの設定値](https://developer.apple.com/documentation/xcode/build-settings-reference)）。
- `src-tauri/app-icon-source.svg` と `app-icons/`: 再生成できる暫定アプリアイコン。最終アート審査は #29。Tauri初期ロゴは使用しない。
- 保存は既存 `SaveStore` アダプタの `localStorage` を使う。アプリのWebView内での実際の保存/ロードはMac・iPad実操作で検証する。

## 開発とビルド

1. `npm ci`
2. `npm run check:platform` と `npm run build`
3. Macで `npm run app:dev`、配布候補は `npm run app:build`
4. WindowsではTauri公式の[Microsoft C++ Build Tools と WebView2](https://v2.tauri.app/start/prerequisites/)を準備し、同じ `npm run app:build` を実行する。
5. iPadはXcodeを備えたMacで既存 `src-tauri/gen/apple/` を使い、必要なRustのiOS targetを入れて `npm run app:ios:build`。署名チーム/証明書は環境変数やXcodeで指定し、リポジトリに書き込まない。

このリポジトリのXcodeプロジェクトはiPad専用に調整済み。`tauri ios init` を再実行した場合は `TARGETED_DEVICE_FAMILY = 2` を `project.yml` に戻して `xcodegen generate --spec project.yml` を実行し、`npm run check:platform` で照合する。Simulator/Emulatorは通常QAで使わず、接続できる実機iPadを使う。

## 受入確認

Macアプリで起動→部活選択→カード名のタイピング→画像/演出→保存→終了/再起動→ロードを確認する。iPadは実機でタッチと外付けキーボード、保存、横向き表示を確認する。Windowsは実機で起動・入力・画像・保存を確認する。未実施の対象は合格として扱わない。
