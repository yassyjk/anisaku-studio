# タスクリスト

-   [x] プロジェクト構造の定義と初期化
-   [x] バックエンドの実装
    -   [x] `main.go` (Gin, ルーティング)
    -   [x] `handlers/websocket.go` (ルーム管理, `gang` 準拠の WebSocket/Polling 対応)
    -   [x] `.air.toml` (ホットリロード設定)
    -   [x] `Dockerfile`
-   [x] フロントエンドの実装
    -   [x] `package.json` & `vite.config.ts` (PWA 設定, qrcode 追加)
    -   [x] `index.html` (PWA 対応)
    -   [x] `src/websocket.ts` (`gang` 準拠の WebSocket/Polling 切り替えロジック)
    -   [x] `src/App.tsx` (Top, Lobby, Game 画面構成, QR コード表示)
    -   [x] `src/index.css` (スタイリング)
    -   [x] `Dockerfile`
-   [x] インフラ設定
    -   [x] `docker-compose.yml`
    -   [x] `nginx.conf.template`
    -   [x] `.env`
-   [x] 動作確認と最終調整
