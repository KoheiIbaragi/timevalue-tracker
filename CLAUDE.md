# TimeValue Tracker

## 概要
時間の価値を記録・管理するWebアプリ。
本番URL: https://timevalue-tracker.vercel.app
リポジトリ: https://github.com/KoheiIbaragi/timevalue-tracker

## ブランチ運用
- `main`: 本番（触らない）
- `dev`: 開発用（ここで作業する）

## デプロイ
devブランチにpushするとVercelが自動でプレビューURLを生成する。
mainにマージすると本番に反映される。

## 技術スタック
- 単一HTMLファイル（index.html）
- Vercelでホスティング

## 開発ルール
1. 必ずdevブランチで作業する
2. 変更したらgit commit & push
3. 本番反映前に必ず確認を取る

## データベース（Supabase）
テーブル: `user_data`（1テーブル構成）

| カラム | 型 | 内容 |
|---|---|---|
| user_id | string | ユーザー識別子（主キー） |
| clients | JSON | 取引先リスト |
| tasks | JSON | タスクリスト（カテゴリ・繰り返し・ステータス等を含む） |

操作パターン:
- 取得: `.from('user_data').select('*').eq('user_id', userId).single()`
- 新規: `.from('user_data').insert({user_id})`
- 保存: `.from('user_data').upsert({user_id, clients, tasks})`

※ データは clients・tasks をまとめて upsert する設計。カラム単位での部分更新は行わない。
