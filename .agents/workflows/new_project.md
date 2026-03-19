---
description: 新規プロジェクトを作成し、.codexと.agentsを自動セットアップする
---

# /new-project ワークフロー

新規プロジェクトの作成と初期化を行う。以下の手順を順番に実行すること。

## ステップ 1: プロジェクト名の確認

ユーザーが指定したプロジェクト名を確認する。  
指定がない場合は「プロジェクト名を教えてください」と聞くこと。

## ステップ 2: 初期化スクリプトの実行

// turbo

```
zsh /Users/takumashinnyo/Workspace/projects/.agents/new_project.sh <プロジェクト名>
```

## ステップ 3: フレームワークのセットアップ（任意）

ユーザーが希望する場合、以下のいずれかをプロジェクトディレクトリで実行する。

- **Next.js**: `cd /Users/takumashinnyo/Workspace/projects/<名前> && npx -y create-next-app@latest . --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbo`
- **Vite**: `cd /Users/takumashinnyo/Workspace/projects/<名前> && npx -y create-vite@latest . --template react-ts`
- **素のHTML/JS**: 追加セットアップ不要

## ステップ 4: 完了報告

以下を日本語でユーザーに報告する。

- 作成したプロジェクトのパス
- セットアップ済みのファイル一覧（.codex/rules、.agents/workflows）
- 次のアクション（開発サーバーの起動方法など）
