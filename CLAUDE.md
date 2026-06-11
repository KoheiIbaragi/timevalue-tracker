# TimeValue Tracker — Claude Code 開発ルール

## 最優先原則
データ(特にtime_logs)を失わないこと。全判断はこれに従属する。
本アプリはtime_logs全消失を複数回経験。直接原因は「単一JSON行の全件upsert×React stale state」。

## 絶対禁止
1. time_logs配列のガードなし全件上書きコードを書くこと
2. saveToSupabaseの保存前ガード(件数比較・クラウドマージ・セッション確認)を弱める変更
3. mainへのforce push
4. WHEREなし(またはWHERE 1=1)のDROP/DELETE
5. RLSポリシーの変更(claude.ai側の管轄。Codeは触らない)

## アーキテクチャの現実
- 単一HTML(index.html)+ブラウザ内Babel。ビルド検証なし=構文ミスは本番で顕在化する
- 保存方式:user_data 1行にclients/tasks/time_logsをupsert+多層ガード(将来append-only RPC化予定)
- report.html:reportsはget_report RPC経由で読む。テーブル直SELECTに依存しない
- DB:Supabase qxsxfrphdtxxhxmhfhioのみ。dev用DBは存在しない=preview含む全書込が本番直結。テスト書込は本番を汚す

## ブランチ運用
- main=本番(pushで即Vercelデプロイ)/dev=作業用
- どのブランチに乗せたかを完了報告に必ず明記。指示と異なるブランチへのpush禁止

## 完了報告に必須
- コミットSHA/push先ブランチ/変更ファイルと行数
- データ書込ロジックに触れた場合:変更前後の挙動説明+[SYNC]ログ確認方法

## インフラ
- 本番URL:https://timevalue-tracker.vercel.app
- repo:KoheiIbaragi/timevalue-tracker(public—鍵のコード直書き厳禁・必ずVercel env)
- バックアップ:pg_cron日次03:00 JST→user_data_backups
