
ブラウザベースでKodelifeライクな、JS版を作成します。
ブラウザコンテクストメモリ上にコードを保存して、Exportやimportできるようにする。
Saveでブラウザコンテクスト上にセーブしてライブラリに追加、一覧からロード可能にする。

グラフィックライブラリはThree.jsを筆頭にp5.jsや他のライブラリの使用も念頭に入れて報告する。

## Agent用ローカル起動

- ローカル画面の確認が必要なときは、まずUIの`http://localhost:3000`とブリッジの`http://127.0.0.1:4317/health`を確認し、起動済みなら再起動しない。
- 未起動の場合だけ`npm run dev`をAgent管理の長時間実行セッションで起動し、そのセッションIDを保持する。
- `npm run dev`はブラウザを自動では開かない。画面確認が必要な場合だけ、Agentがビルトインブラウザで`http://localhost:3000`を開く。
- 停止するときは保持している起動セッションへCtrl-Cを送る。

## 保留事項: ブリッジへのClaude追加

- Codexの`codex-bridge.mjs`と並列で、Claudeもチャット欄で選べるAgentにしたい（`codex login`と同じ感覚でローカルのClaude Pro/Max認証を再利用する想定）。
- 2026-08-03時点でClaude Agent SDKはローカルの`claude login`セッション再利用に対応しておらず、`ANTHROPIC_API_KEY`を別途要求する（Pro/Max契約とは別課金になる）。Anthropicはサードパーティ開発者がSDK経由でclaude.aiログインやレート制限つきアクセスを提供することを許可していない、との情報あり。この制約のため保留中。
- **Claude Agent SDKがローカルのClaude Pro/Max認証を再利用できるようになったら、ユーザーに知らせること。**（`codex-bridge.mjs`と同様に、追加のAPI課金なしでThreadを張れるようになったタイミングが実装再開の合図）
