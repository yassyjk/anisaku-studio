# 実装計画: CI への Go テストとカバレッジの追加

## 概要

GitHub Actions の CI パイプライン (`.github/workflows/ci.yml`) に、バックエンドの Go アプリケーションのテスト実行とカバレッジ計測のステップを追加します。

## ユーザーレビューが必要な事項

- 特になし

## 提案する変更

### GitHub Workflows

#### [MODIFY] [ci.yml](file:///home/yasuni/デスクトップ/makes/game-template/.github/workflows/ci.yml)

- `backend` ジョブに `Run Tests` ステップを追加します。
- コマンド: `go test -v -cover ./...`

## 検証計画

### 自動テスト

- GitHub Actions 上で CI が実行され、テストが成功することを確認します（ユーザーによる確認が必要です）。
