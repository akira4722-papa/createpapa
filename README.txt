# わが家の記録帳（分割版）

## ファイル構成
- `index.html`: 画面のHTML構造
- `css/style.css`: 既存デザインのCSS
- `js/app.js`: Supabase接続、ログイン、画面遷移、カレンダー、予定登録・削除などのJavaScript
- `supabase_schedule.sql`: スケジュール用テーブル・ポリシーのSQL（同梱されている場合）

## GitHubへの配置
このフォルダ内のファイルとフォルダを、GitHubリポジトリのルートに同じ構成で配置してください。`index.html` だけを置き換えるのではなく、`css` と `js` フォルダも一緒にアップロードしてください。

## 注意
`js/app.js` の `SUPABASE_URL` は元ファイルの値を維持しています。`SUPABASE_PUBLISHABLE_KEY` が `YOUR_SUPABASE_PUBLISHABLE_KEY` のままなら、以前ログインに成功したPublishable keyをそこに設定してください。キーを設定したファイルは公開リポジトリに置かないでください。公開リポジトリを使う場合、SupabaseのPublishable keyとRLSポリシーを適切に設定してください。Secret/service_role keyは絶対にフロントエンドに置かないでください。
