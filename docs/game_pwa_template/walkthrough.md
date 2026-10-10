# PWA ゲームテンプレート実装完了報告

参照された 5 つのアプリ（特に `gang`）の要素を抽出し、今後のゲーム開発で即座に使える汎用テンプレートを作成しました。

## 実施した主な変更

### 🏗️ インフラ構成

-   `docker-compose.yml`: nginx, frontend (Vite), backend (Go) の 3 コンテナ構成。
-   `nginx.conf.template`: `$ALLOWED_DOMAINS` を反映したリバースプロキシ設定。
-   `.env`: ポート番号やドメイン設定の集約管理。

### 🚀 バックエンド (Go / Gin)

-   `handlers/websocket.go`:
    -   `gang` をベースにしたルーム管理とブロードキャスト機能。
    -   WebSocket と HTTP ポーリング（2 秒間隔）の両方をサポートし、同じロジックでゲーム状態を取得・操作可能。
-   `main.go`: API エンドポイントと WebSocket のハンドリング。
-   `.air.toml`: ホットリロード対応。

### 🎨 フロントエンド (SolidJS / Tailwind CSS)

-   `websocket.ts`:
    -   WebSocket 接続失敗や切断時に、自動でポーリングモードに切り替わる機能を実装。
    -   `visibilitychange` による再接続制御。
-   `App.tsx`:
    -   **Top**: 部屋作成/入室、クレジット、ルール表示。
    -   **Lobby**: QR コード表示（`qrcode` ライブラリ）、プレイヤーリスト、ホストによる開始。
    -   **Game**: ターン制ゲームの基盤、中断/復帰機能。
-   `vite.config.ts`: 開発環境でも PWA として動作するよう設定。
-   `tailwind.config.js`: モダンでプレミアムなデザインのためのスタイリング設定。

## 検証結果

-   各ファイルが `./` 直下の適切なディレクトリに配置されていることを確認しました。
-   依存関係（`package.json`, `go.mod`）が要件を満たしていることを確認しました。

## 使い方

1. `.env` の内容を必要に応じて修正。
2. `docker compose up` を実行。
3. `http://localhost:20001` (Nginx 経由) にアクセス。

> [!TIP]
> 開発時は `frontend` と `backend` のディレクトリでそれぞれのホットリロードが有効になっています。
