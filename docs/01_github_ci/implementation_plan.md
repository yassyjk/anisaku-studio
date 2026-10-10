# GitHub CI 環境の構築

フロントエンドとバックエンドのビルドおよび検証を自動化する GitHub Actions ワークフローを設定します。

## 提案される変更

### [GitHub Actions]

#### [NEW] [ci.yml](file:///.github/workflows/ci.yml)

-   **バックエンド (Go)**:
    -   Go のセットアップ (v1.21 以上)
    -   依存関係のインストール (`go mod download`)
    -   静的解析 (`go vet ./...`)
    -   ビルド (`go build -o /dev/null ./main.go`)
-   **フロントエンド (Solid JS)**:
    -   Node.js のセットアップ (v20 以上)
    -   依存関係のインストール (`npm install`)
    -   ビルドと型チェック (`npm run build`)

## 検証プラン

### 自動テスト

-   作成したワークフローファイルが GitHub にプッシュされた際、正しく実行され、すべてのステップが成功することを確認します。
-   ローカルで以下のコマンドが成功することを確認します：
    -   バックエンド: `go vet ./...` および `go build -o /dev/null ./main.go`
    -   フロントエンド: `npm run build` (in `frontend` directory)
