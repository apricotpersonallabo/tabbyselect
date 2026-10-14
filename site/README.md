# Site migration

このディレクトリは共通サイト基盤へ移行するための次期サイトソースです。

**現在のGitHub Pages本番ソースは引き続き `docs/` です。**

明示的な切替PRがマージされるまでは次を守ります。

- `docs/` を本番品質のまま維持する。
- 製品仕様に関する `docs/` と `site/` の内容を意味的に同期する。
- `site/` をGitHub Pagesへデプロイしない。
- 生成物を `docs/` へ上書きしない。
- 新構成は Site preview workflow のartifactで確認する。

共通レイアウト、CSS、レンダリング処理は共通サイト基盤側の責務です。
