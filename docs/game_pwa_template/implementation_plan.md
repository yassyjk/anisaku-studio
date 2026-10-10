# PWA ゲームテンプレート実装計画 (v3: QR コード機能追加)

この計画では、参照された 5 つのアプリ（特に `aiue` と `kites`）の要素を抽出し、SolidJS + Tailwind CSS + Go をベースとした汎用的なゲームテンプレートを `./` 直下に作成します。

## ユーザーレビューが必要な項目

- **画面デザイン**: Tailwind CSS を使用し、モバイルファーストでプレミアムなレスポンシブデザインを実装します。
- **通信方式**: `references/gang` の実装パターン（`websocket.go`, `websocket.ts`）を採用し、WebSocket 優先＋ HTTP ポーリング（2 秒間隔）自動切り替えを実装します。Backend では `GameHandler` によるルーム管理、Frontend では `createStore` による状態共有と `visibilitychange` 追従を含めます。
- **PWA 対応**: 開発環境でも PWA が有効（`devOptions.enabled: true`）な設定を `vite.config.ts` に含めます。
- **QR コード表示**: ロビー画面でルーム参加用の QR コードを表示し、他プレイヤーの参加を容易にします。

## 変更内容

### バックエンド (Go / Gin)

- `main.go`:
    - Gin を使用したルーティング。
    - メモリ内でのルーム管理（`sync.RWMutex`）。
    - `/create`, `/state`, `/action` (REST) と `/ws` (WebSocket) の提供。
- `handlers/websocket.go`:
    - WebSocket アップグレードと `hub` パターンによるブロードキャスト。
    - `visibilitychange` に対応した再接続と `join` 処理の統合。
- `.air.toml`: ホットリロード設定。
- `Dockerfile`: `golang:1.26-alpine` をベースに `air` をインストール。

### フロントエンド (SolidJS / Vite / Tailwind CSS)

- `package.json`: `qrcode` ライブラリを追加。
- `tailwind.config.js` & `postcss.config.js`: Tailwind CSS の基本設定。
- `vite.config.ts`:
    - `vite-plugin-pwa` で開発環境有効化、キャッシュパターン設定。
    - `allowedHosts: true` (or `process.env.ALLOWED_DOMAINS`) の設定。
- `src/websocket.ts`:
    - `kites` 風の `gameClient` (クラスベース) を実装。
    - 状態管理には SolidJS の `createStore` を使用。
    - WebSocket エラー、クローズ時に即座にポーリングへ移行。
- `src/App.tsx`:
    - `App` -> `Lobby` -> `Game` のコンポーネント構成。
    - localStorage による `playerId`, `nickname`, `lastRoomId` の保持。
    - ロビー画面での QR コード表示（`qrcode` ライブラリ使用）。
    - ゲーム中断ボタン、復帰ロジック（`visibilitychange`）。
- `src/index.css`: Tailwind CSS のベースディレクティブ。

### インフラ (Docker / Nginx)

- `docker-compose.yml`:
    - `nginx` (リバースプロキシ), `frontend` (Vite dev or static), `backend` (Go/Air) の 3 コンテナ。
    - `.env` でポート（`FRONTEND_PORT`, `BACKEND_PORT`, `NGINX_PORT`）と `ALLOWED_DOMAINS` を管理。
- `nginx.conf.template`:
    - `${ALLOWED_DOMAINS}` を使用したバーチャルホスト設定。
    - WebSocket 用の `Upgrade` ヘッダー設定。

## 検証計画

### 自動テスト

- `docker compose up` で全サービスが正常に起動することを確認。
- `npm install` 後、Tailwind CSS のビルドが通ることを確認。

### 手動検証

- PWA インストール確認（Chrome/Edge DevTools）。
- QR コードが正しく表示され、スマホで読み取って同じルームに参加できるか確認。
- WebSocket 切断時のポーリング切り替え確認（ブラウザの Network タブで観察）。
- モバイルビューでのレイアウト崩れチェック。
- リロード/タブ復帰時のゲーム継続確認。
