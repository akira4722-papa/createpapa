わが家の記録帳：画面分割版

ファイル構成
- index.html: GitHub Pagesの入口。home.htmlへ転送します。
- home.html: ホーム画面
- calendar.html: カレンダー画面
- css/style.css: 共通デザイン
- js/app.js: 共通JavaScript、Supabaseログイン、予定登録・削除
- supabase_schedule.sql: 予定テーブル用SQL

GitHubへの配置
1. ZIPを展開し、中身をリポジトリのルートに同じ構成で配置してください。
2. js/app.js 内の SUPABASE_PUBLISHABLE_KEY を、以前ログインに成功したときのキーに設定してください。
3. Commit changes で反映してください。
4. サイトを開き、ホームとカレンダー間の移動、ログイン、予定の登録・削除を確認してください。

注意
- 写真画面など、未実装のメニューは今回も未実装のままです。
- デザインは既存の css/style.css を共通利用しています。
- SUPABASE_URLは現在のプロジェクトURLを維持しています。
