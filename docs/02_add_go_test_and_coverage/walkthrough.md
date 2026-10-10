# 修正内容の確認: CI への Go テストとカバレッジの追加

## 行った変更

### GitHub Workflows

#### [ci.yml](file:///home/yasuni/デスクトップ/makes/game-template/.github/workflows/ci.yml)

- `backend` ジョブに `Run Tests` ステップを追加しました。
- `go test -v -cover ./...` を実行し、詳細なログとカバレッジを出力するようにしました。

## 検証結果

### 自動テスト

- **CI 環境**: GitHub Actions 上で `Run Tests` ステップが実行されることを想定しています。ローカル環境に Go がインストールされていないため、ローカルでの実行確認はスキップしました。
- **検証方法**: プルリクエストを作成し、CI がパスすることを確認してください。
