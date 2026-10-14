# Repository agent rules

## GitHub Pages production state

GitHub Pagesの本番ソースは `site/` です。固定SHAの `apricotpersonallabo/site-platform` を使って生成・検証し、GitHub Actionsでデプロイします。

- 製品情報、日英翻訳、マニュアル、Playground、プライバシーは `site/` を更新する。
- `docs/` は切替前のロールバック用の旧ソースとして保持する。編集・削除・生成物による上書きをしない。
- `site/content/<locale>/*.html` は本文fragmentだけを持つ。共通shell・ナビゲーション・スタイルは共通基盤へ変更を入れる。
- 共通基盤の参照SHAを変更する際は、previewと製品のサイト検証を通す。
- 公開設定の変更やロールバックは明示されたタスクでのみ行う。

## Responsibility boundary

このリポジトリが所有するもの:

- 製品仕様と製品固有の説明
- マニュアルとプライバシー本文
- Store/GitHubリンク
- 製品固有の翻訳とメディア

共通サイト基盤が所有するもの:

- 共通レイアウトとHTML shell
- Header/Footer/Navigationの共通動作
- 共通CSSとdesign token
- アクセシビリティの基礎実装
- preview/build処理

共通UIの問題を製品側へ複製実装しないこと。
