# タスクリスト

- [x] 計画段階
    - [x] 調査と計画の策定
    - [x] `game-template/backend/Dockerfile.prod` の内容の確認
    - [x] `game-template/docker-compose.prod.yml` の内容の確認
    - [x] 各ゲームフォルダの `backend` フォルダの存在および `Dockerfile.prod` の有無の確認
    - [x] `docs/16_add_dockerfile_prod_and_sync_compose/` 配下にドキュメントを作成し、合意を得る
- [x] 実装段階
    - [x] ブランチ作成および実装の実行
    - [x] 各 backend フォルダに `Dockerfile.prod` を追加（無ければコピー）
    - [x] 各フォルダの `docker-compose.prod.yml` を `game-template/docker-compose.prod.yml` に合わせて修正
- [x] 検証段階
    - [x] `Dockerfile.prod` がすべての対象フォルダに正しく追加されたか確認
    - [x] `docker-compose.prod.yml` の修正に不備がないか確認
