# JSLIFE 作成レポート

## 目的

KodeLife のライブコーディング体験を JavaScript ファイル向けに再構成した、ブラウザベースのグラフィックコンテクストアプリを作成した。GLSL の断片を編集するシェーダー専用環境ではなく、通常の `.js` ファイルを表示・編集・実行する。

現在の第一コンテクストは Three.js。エディター上では次のような一般的なソース形式を扱う。

```js
import * as THREE from "three";

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
mount.appendChild(renderer.domElement);

export function frame({ time, delta, pointer }) {
  renderer.render(scene, camera);
}

export function resize({ width, height, pixelRatio }) {
  renderer.setSize(width, height, false);
}

export function dispose() {
  renderer.dispose();
}
```

## 作成手順

1. Next.js / React / TypeScript を使い、ブラウザ上で動作する制作画面を構築。
2. Three.js と型定義を追加し、WebGLRenderer をアプリ内で実行できるようにした。
3. JavaScript ソースの `import * as THREE from "three"` をアプリが解決するモジュールランタイムを実装。
4. JSファイルを一度実行して Scene / Camera / Renderer を構築し、公開された `frame()` のみを `requestAnimationFrame` から呼ぶ構成に変更。
5. ウィンドウサイズの変化を `resize()`、再実行前のGPUリソース解放を `dispose()`へ通知するライフサイクルを実装。
6. Neon Knot、Particle Current、Instanced Field の Three.js スターターを作成。
7. Run、再生・一時停止、Auto-run、FPS、経過時間、実行エラー表示を追加。
8. Saveで現在の名前とJSコードを `localStorage` のライブラリへ追加・更新できるようにした。
9. ライブラリ一覧からのロード・削除、ライブラリ全体のJSONバックアップと復元を追加。
10. 単体 `.js` ファイルのImport・Export、Command/Ctrl + Enterで実行、Command/Ctrl + Sで保存を追加。
11. PCの左右分割と、タブレット・スマートフォンの縦積みに対応。
12. Codex SDKを使うローカルAIブリッジと、エディター内の相談・修正チャットを追加。
13. AIが返す説明と完全なJS置換案を分け、ユーザーが確認してから適用・実行し、直前のコードへ戻せるようにした。
14. 本番ビルドでTypeScriptとCloudflare Worker互換出力を検証。

## Codexチャット

`npm run dev` はWebアプリ（localhost:3000）とローカルCodexブリッジ（127.0.0.1:4317）を同時に起動する。Codex CLIがChatGPTでログイン済みなら、そのローカル認証をCodex SDKが利用するため、この構成ではOpenAI APIキーを別途置かない。

1. 必要ならターミナルで `codex login` を実行し、ChatGPTアカウントでログインする。
2. `npm run dev` を実行する。
3. 画面上部または左レールの「Codex」を開く。
4. 現在の `main.js` の説明、エラー診断、演出変更などを依頼する。
5. Auto-runがOFFで修正案が返った場合は「適用」を押す。適用前のコードは「元に戻す」で1段階復元できる。

Auto-runがONの場合、Codexの完全なコード案は自動的にエディターへ適用され、同じ画面のままプレビューも更新される。返答待ちの間にコードが手作業で変わっていた場合は、競合する上書きを避けるため自動適用せず「適用」ボタンを表示する。Auto-runがOFFの場合も常に手動適用となる。

会話履歴とCodexのthread IDはブラウザの `localStorage` に保存する。「＋」で新しい会話を開始できる。現在のJS、実行エラー、プロジェクト名は問い合わせ時にローカルブリッジへ渡され、その先のCodexサービスで処理される。

問い合わせ時には現在のWebGL Canvasも最大768pxのJPEGへ縮小キャプチャし、Codex SDKのローカル画像入力として添付する。これにより、ユーザーがスクリーンショットを手作業で送らなくても、右下チャットが構図、色、白飛び、Bloom、視認性などを実画像から評価できる。一時画像はリクエスト完了時に削除する。Canvasが取得できない場合はコードとエラーだけで相談を継続する。

長いコード生成では15秒ごとに経過状態を表示し、ユーザーは「停止」でリクエストを中断できる。Codexから90秒間完了が返らない場合は自動的にタイムアウトし、入力不能な待機状態を解除する。

この接続は個人制作向けのローカル構成である。ChatGPT Proに含まれるCodex利用枠を使える一方、公開Webアプリとして他ユーザーへ配布する場合は各ユーザーの認証、利用量制御、サーバー側の安全設計が別途必要になる。OpenAI APIキー方式に切り替える場合のAPI課金もChatGPT契約とは別になる。

## 実行モデル

Canvas 2D の `ctx` へ毎フレーム同じコード断片を渡す方式ではない。編集対象はJSモジュール全体であり、Runのたびに次の処理を行う。

1. 現在のモジュールの `dispose()` を呼び、以前のDOMとGPUリソースを破棄。
2. 新しいJSソースを一度評価し、Three.jsのシーンを構築。
3. `resize()`へ描画領域とピクセル比を通知。
4. 再生中は `frame({ time, delta, frame, pointer })` を毎フレーム実行。

この方式なら Three.js の Scene、Camera、Renderer、Geometry、Material、Loader などを通常のJavaScriptとして扱える。必要ならThree.jsコード内で `ShaderMaterial` を使い、GLSLも文字列として併用できる。

## ブラウザ内保存

- 編集中のコード、プロジェクト名、開いている作品IDは変更のたびに端末の `localStorage` へ下書き保存し、リロード時に同じファイルを再実行する。
- Codexのチャット履歴と会話thread IDも `localStorage` からリロード後に復元する。
- Codexパネルの開閉状態とAuto-run設定も端末設定として保存し、次回表示時に復元する。
- Saveは新規作品を追加し、ロード済み作品の場合は同じIDを更新する。
- JSON Exportはライブラリ全体のバックアップ、JSON Importはバックアップのマージに使用する。
- `.js` Exportは現在のエディター内容だけを標準JavaScriptファイルとして出力する。
- ブラウザデータの消去や別端末への移動に備え、重要な作品はJSONまたはJSでExportする必要がある。

## p5.jsなどへの拡張方針

現時点の実行アダプターは Three.js 用で、任意パッケージのimportにはまだ対応していない。ランタイムを次のようなアダプター単位へ分割すれば、エディターと保存ライブラリを共通のまま拡張できる。

Three.js本体に加え、現在はポストプロセス用の `EffectComposer`、`RenderPass`、`UnrealBloomPass` の名前付きaddon importもランタイムが解決する。その他のaddonを増やす場合は、アプリ側の許可レジストリとCodexプロンプトへ同時に追加する。

- **Three.js**: WebGLRenderer / 将来のWebGPURenderer、3D、モデル、パーティクル。
- **p5.js**: instance modeで `setup()` / `draw()` / `remove()` をライフサイクルへ接続。
- **Canvas 2D**: 標準CanvasRenderingContext2Dを使う軽量2Dコンテクスト。
- **PixiJS**: 2D WebGL/WebGPUレンダラーとスプライト中心のコンテクスト。
- **Babylon.js**: Scene / Engineの生成と破棄をアダプターへ接続。

ライブラリごとに `compile`、`resize`、`frame`、`dispose` の4処理を実装し、保存データへ `runtimeId` と依存バージョンを記録する。外部パッケージを自由にimportする段階では、ブラウザ内バンドラー、import map、またはsandboxed iframe/Workerによる実行分離が必要になる。

## セキュリティ上の注意

入力されたJavaScriptは同一ページのブラウザコンテクストで実行される。現状は自分で書いた信頼できるコードを試す制作環境を想定する。第三者の作品を共有・実行する公開サービスへ拡張する場合は、sandboxed iframe、Worker、実行時間制限、ネットワーク制限などが必要。

Codexブリッジはループバックアドレスだけで待ち受け、JSLIFEのローカルOriginだけを許可する。AIスレッドの作業ディレクトリは隔離した一時フォルダーで、read-only sandbox、承認なし、ネットワーク・Web検索なしに固定している。AIはリポジトリを直接編集せず、構造化されたコード案だけをブラウザへ返す。ただし、AI生成コードを実行する前の内容確認は引き続き必要。

## ファイル構成

- `app/Playground.tsx`: JSモジュールランタイム、Three.js実行、保存・Import・Export、UI
- `app/page.tsx`: スタジオ画面のエントリー
- `app/globals.css`: エディター、プレビュー、ライブラリのデザイン
- `scripts/codex-bridge.mjs`: ローカルCodex認証を使うSSEチャットブリッジ
- `scripts/dev.mjs`: WebアプリとCodexブリッジの同時起動
- `app/layout.tsx`: ページ言語、検索・共有メタデータ
- `public/og.png`: 共有プレビュー画像
- `REPORT.md`: 本レポート
