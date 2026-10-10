# テストリスト

今回実施する変更（Dockerfile.prod の追加および docker-compose.prod.yml の調整）における品質確認のためのテスト項目です。

## テストの観点

本番用ビルド設定およびオーケストレーション設定の修正であるため、構文エラーがないことと、期待する設定が適切に施されていることを検証します。

## テスト項目

1. **Dockerfile.prod の存否確認**:
    - `docker-compose.prod.yml` が存在するすべてのゲームフォルダの `backend/` 配下に `Dockerfile.prod` がコピーされていること。
2. **Dockerfile.prod の内容一致確認**:
    - コピーされた `Dockerfile.prod` の内容が `game-template/backend/Dockerfile.prod` と完全に一致していること。
3. **docker-compose.prod.yml の構文検証**:
    - `docker-compose -f docker-compose.prod.yml config` コマンドがエラーなく正常終了し、構文的に正しい YAML であること。
4. **docker-compose.prod.yml の backend 設定検証**:
    - `build` の `context` が `./backend`、`dockerfile` が `Dockerfile.prod` に指定されていること。
    - `volumes`（本番用では不要なマウント）がコメントアウトまたは削除されていること。
    - 環境変数に `GIN_MODE=release` が定義されていること。

## リモートCI用の実行確認コマンド（ユーザー向け提示）

以下のコマンドを各ゲームディレクトリ（例: `6ball`）で実行することで、本番設定ファイルの整合性を確認できます。

```bash
# docker-compose.prod.yml の構文チェック
docker-compose --file docker-compose.prod.yml config
```
