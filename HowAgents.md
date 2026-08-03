# GitHub Pages → ローカルnpmブリッジ接続の検証

`https://<user>.github.io/JSLife/`のような静的Pages版から、`npm run dev`中のローカルCodexブリッジ（`http://127.0.0.1:4317`）へ接続できるかの検証手順。

## 前提

- `scripts/codex-bridge.mjs`は既にCORS（`Access-Control-Allow-Origin`が任意のhttps originを許可）と、Chrome Private Network Access向けの`Access-Control-Allow-Private-Network: true`ヘッダーを返す実装済み。
- 現行の`app/Playground.tsx`は`IS_STATIC_SHOWCASE`が真のとき`checkCodex()`が即座に`offline`を返し、fetch自体を実行しない（README記載の「AI chat and real-folder access are intentionally disabled」という意図的な無効化）。
- つまり接続はバックエンド側では技術的に可能だが、フロント側で意図的に止めてある。

## 手順

1. ローカルのUIとブリッジを起動する。

```bash
npm run dev
```

2. 別ターミナルで、github.io相当のOriginからPNA preflight（OPTIONS）が通るか確認する。

```bash
curl -i -X OPTIONS http://127.0.0.1:4317/health \
  -H "Origin: https://narumian.github.io" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Private-Network: true"
```

`Access-Control-Allow-Origin: https://narumian.github.io`と`Access-Control-Allow-Private-Network: true`が返っているか確認する。

3. 実際のGETが通るか確認する。

```bash
curl -i http://127.0.0.1:4317/health -H "Origin: https://narumian.github.io"
```

`{"ok":true,...}`（`COMPANION_TOKEN`設定時は401）が返れば通っている。

4. 実ブラウザでの確認。GitHub Pagesのページを開いた状態でDevToolsコンソールに直接:

```js
fetch("http://127.0.0.1:4317/health").then(r => r.json()).then(console.log)
```

コード側の早期returnを経由せずに直接fetchを叩くことで、PNAの許可プロンプトが出るかどうかや実際の到達可否を、フロントの`IS_STATIC_SHOWCASE`分岐と切り離して確認できる。

## 結論

- CORS/PNAレベルではバックエンドは対応済みで、接続自体は技術的に可能。
- 実際にPages版で使えるようにするには、`app/Playground.tsx`の`checkCodex`（`IS_STATIC_SHOWCASE`時の早期return）を外し、ペアリングUI（`companion_token`/`pairCompanion`は既存実装が残っている）をPages版でも表示するようにする実装変更が必要。
- ローカルで`npm run dev`が起動していないと当然繋がらない点、Chromeのローカルネットワークアクセス許可プロンプトが出る可能性がある点は変わらない。
