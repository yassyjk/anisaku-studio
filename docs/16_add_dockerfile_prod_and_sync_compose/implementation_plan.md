# バックエンド本番用 Dockerfile.prod 追加と docker-compose.prod.yml 同期計画

各ゲームプロジェクトの `backend` フォルダに本番用 `Dockerfile.prod` が存在しない場合に `game-template/backend/Dockerfile.prod` から追加し、同時に各プロジェクトの `docker-compose.prod.yml` を `game-template` の仕様に合わせて本番環境で問題が起きないように修正・同期させます。

## 設計変更およびライブラリ選定の意図

- **本番用 Dockerfile (`Dockerfile.prod`) の追加意図**:
  本番環境では軽量・高速で不要なツール（開発用ホットリロードツール `air` など）を含まないマルチステージビルドの Dockerfile が必要です。`game-template/backend/Dockerfile.prod` は Go をビルド後に軽量な `alpine` イメージのみで動作させる構成となっており、本番コンテナのサイズ削減とセキュリティ向上に寄与するため、これを選定・コピーします。
- **`docker-compose.prod.yml` の同期・修正意図**:
  各プロジェクトで `docker-compose.prod.yml` がローカル開発用と同じようにボリュームマウントされたままになっていたり、`Dockerfile.prod` が指定されていなかったりする不整合を解消します。`game-template/docker-compose.prod.yml` にあわせ、本番用のビルドコンテキストの指定（`dockerfile: Dockerfile.prod`）、不要な `volumes` のコメントアウト、および本番環境（リリースモード起動）のための `GIN_MODE=release` 環境変数の追加を行います。

## 対象プロジェクト一覧 (全28フォルダ)

以下のフォルダにおいて、`backend/Dockerfile.prod` を新規作成 (コピー) し、`docker-compose.prod.yml` を修正します。

1. `6ball`
2. `aiue`
3. `anagura`
4. `bodoge`
5. `bomb`
6. `bus-off`
7. `doresuki`
8. `draft18`
9. `freeze`
10. `gang-poker`
11. `hagetakano`
12. `hanabi`
13. `hitotoiro`
14. `kites`
15. `korenona`
16. `macha`
17. `nonbei`
18. `obake`
19. `plants`
20. `poteto`
21. `ranmemo`
22. `shincucco`
23. `sort-memory`
24. `stella`
25. `tank`
26. `tri-color`
27. `yon-kakumei`
28. `zikan`

※すでに Dockerfile.prod が存在する `bbq` および `game-template` は対象外（必要に応じて docker-compose のみ調整）とします。

## Proposed Changes

### game-template

#### [NEW] [task.md](file:///home/yasuni/デスクトップ/makes/game-template/docs/16_add_dockerfile_prod_and_sync_compose/task.md)

#### [NEW] [implementation_plan.md](file:///home/yasuni/デスクトップ/makes/game-template/docs/16_add_dockerfile_prod_and_sync_compose/implementation_plan.md)

#### [NEW] [test_list.md](file:///home/yasuni/デスクトップ/makes/game-template/docs/16_add_dockerfile_prod_and_sync_compose/test_list.md)

### 各ゲームプロジェクト（上記28フォルダ）

#### [NEW] `[各プロジェクト]/backend/Dockerfile.prod`

- `game-template/backend/Dockerfile.prod` をコピーして配置します。

#### [MODIFY] `[各プロジェクト]/docker-compose.prod.yml`

- backend サービスのビルド設定に `dockerfile: Dockerfile.prod` を指定し、不要なボリュームマウントをコメントアウトまたは削除し、`GIN_MODE=release` を環境変数に追加します。

## Verification Plan

### Automated Tests

- 本テストはリモート CI で行われるため、ローカルでのテスト実行は行いません。ただし、検証として以下のコマンドが有用です。
    - 各プロジェクトで `docker compose -f docker-compose.prod.yml config --quiet` などを実行して構文チェックを行う。

### Manual Verification

- コピーされた `Dockerfile.prod` の内容が正しい（`game-template` と同一）ことの確認。
- 各 `docker-compose.prod.yml` の修正箇所が適切に変更されていることのインスペクション。
