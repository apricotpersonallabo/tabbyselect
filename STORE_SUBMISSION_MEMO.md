# TabbySelect ストア提出メモ

最終確認日: 2026-09-23

Chrome Web Store、Microsoft Edge Add-ons、Firefox Add-ons (AMO) の申請画面へ転記するためのメモ。文面はバージョン `1.1.0` の実装を基準とする。

## 提出前チェック

- `[x]` GitHubアカウント、リポジトリ名、公開URLを確定
- `[x]` `docs/privacy.html` を追加
- `[x]` Apache-2.0ライセンスを採用
- `[x]` Firefox Extension IDを `tabbyselect@apricotpersonallabo.github.io` に固定
- `[x]` Chrome用1280 x 800スクリーンショットを作成
- `[x]` Chrome用128 x 128アイコンと440 x 280プロモーション画像を作成
- `[x]` Edge掲載用300 x 300ロゴを作成（各掲載言語で同じロゴを使用可能）
- `[x]` ストアへ提出するバージョンと `src/manifest.json` の `version` を `1.1.0` で一致
- `[x]` `main`をGitHubへpushし、GitHub Pagesの3 URLがHTTP 200になることを確認
- `[ ]` 各ストア管理画面へ掲載文、画像、プライバシー回答を登録

## 共通基本情報

| 項目 | 転記内容 |
|---|---|
| 製品名（英語） | TabbySelect |
| 製品名（日本語） | TabbySelect |
| ブランド名 | TabbySelect |
| バージョン | 1.1.0 |
| 種別 | Browser extension / ブラウザ拡張機能 |
| カテゴリ（Chrome / Edge） | Productivity / 仕事効率化 |
| カテゴリ（Firefox） | Other (`other`) |
| 価格 | Free / 無料 |
| 広告 | なし |
| アプリ内購入 | なし |
| 成人向けコンテンツ | なし |
| 子ども向け | 子どもを主な対象としていない |
| 問い合わせ先 | apricot.personal.labo@gmail.com |
| Homepage URL | https://apricotpersonallabo.github.io/tabbyselect/ |
| Support URL | https://apricotpersonallabo.github.io/tabbyselect/manual.html |
| Privacy Policy URL | https://apricotpersonallabo.github.io/tabbyselect/privacy.html |
| Source code URL | https://github.com/apricotpersonallabo/tabbyselect |
| 公開範囲 | Public / Listed |
| 対応ブラウザ | Chrome、Microsoft Edge、Firefox Desktop、Firefox for Android |
| 対応言語 | English、Deutsch、Español、日本語、한국어、简体中文、繁體中文 |

## ストア要約

### 日本語

```text
Webページのドロップダウンを文字入力で絞り込み、キーボードだけで素早く選択できるようにします。
```

### English

```text
Search native dropdown options by typing, then select with the keyboard on any enabled web page.
```

ChromeのItem summaryは132文字以内にする。EdgeのShort descriptionはパッケージ内manifest由来で読み取り専用になるため、現在のローカライズ済み `description` と内容を合わせる。

## 詳細説明

### 日本語

```text
TabbySelectは、WebページにあるネイティブHTMLのドロップダウン（select要素）へ、前方一致のインクリメンタル検索を追加するブラウザ拡張機能です。

長い選択肢をスクロールして探す代わりに、Tabキーでselectへフォーカスして文字を入力すると、入力文字から始まる候補だけを一覧表示します。上下矢印キーで候補を移動し、EnterまたはTabで選択を確定できます。Backspaceで検索文字を削除し、Escで検索のクリアまたは候補一覧の終了ができます。

主な機能:
・ネイティブselect要素の前方一致検索
・キーボードだけで行える候補移動と確定
・選択確定後の次フォーム項目へのフォーカス移動
・URLパターンによる有効ページの制御
・ツールバーアイコンからの有効・無効切り替え
・ページの状態に応じたカラー／グレースケールアイコン表示

有効URL設定には1行ごとにURLパターンを入力でき、*を任意の文字列として使用できます。設定を空欄にすると、すべてのhttp/httpsページで有効になります。

対象はトップフレームの通常DOM内にある単一選択のネイティブselect要素です。独自実装のドロップダウン、select[multiple]、iframe内、ページ側Shadow DOM内、ブラウザ設定ページは対象外です。マウスクリックでselectへフォーカスした場合はブラウザ標準の操作を優先し、そのフォーカス中は候補一覧を表示しません。

拡張機能は現在URL、selectの選択肢、select操作中のキー入力を端末内でのみ処理します。これらの情報を開発者または第三者のサーバーへ送信しません。広告、解析、トラッキング、リモートコードは使用しません。
```

### English

```text
TabbySelect adds prefix-based incremental search to native HTML dropdowns (select elements) on web pages.

Instead of scrolling through a long list, focus a select with the Tab key and begin typing. The extension displays only options that start with the entered text. Use the Up and Down arrow keys to move through the results, then press Enter or Tab to confirm. Backspace removes a character from the search query, while Escape clears the query or closes the suggestion list.

Key features:
• Prefix search for native select elements
• Keyboard-only suggestion navigation and confirmation
• Focus movement to the next form control after confirmation
• URL patterns that control where the extension is enabled
• A toolbar toggle for quickly enabling or disabling the feature
• Color and grayscale toolbar icons that show the current state

Enter one URL pattern per line and use * as a wildcard. Leaving the URL setting empty enables the extension on every http/https page.

The extension supports native, single-choice select elements in the top frame's light DOM. Custom dropdowns, select[multiple], iframes, page-owned Shadow DOM, and browser settings pages are not supported. When a select is focused by a mouse click, native browser behavior takes priority and suggestions stay hidden for that focus session.

The extension processes the current URL, select option content, and keystrokes entered while a select is active only on the user's device. It does not transmit this information to the developer or any third party. It contains no advertising, analytics, tracking, or remotely hosted code.
```

EdgeのDescriptionは掲載言語ごとに250〜10,000文字が必要。上記の日本語・英語説明は短縮せずに使用する。

## 単一目的

### 日本語

```text
WebページのネイティブHTML select要素に、キーボード操作による前方一致検索と候補選択を追加し、長いドロップダウンから目的の選択肢を素早く選べるようにすることです。
```

### English

```text
The extension's single purpose is to add keyboard-driven prefix search and option selection to native HTML select elements, helping users choose from long dropdown lists more efficiently.
```

## 権限の理由

### `storage`

日本語:

```text
有効URLパターンとツールバーの有効・無効状態など、ユーザーが選択した拡張機能設定をchrome.storage.localへ保存し、開いているページへ設定変更を反映するために使用します。設定はユーザー端末内にのみ保存し、外部へ送信しません。
```

English:

```text
Used to save user-selected extension settings, including enabled URL patterns and the toolbar on/off state, in chrome.storage.local and to apply setting changes to open pages. Settings remain on the user's device and are not transmitted externally.
```

### `tabs`

日本語:

```text
アクティブタブと開いているタブの現在URLを確認し、有効URLパターンとの一致判定、タブごとのツールバーアイコン状態更新、SPAを含むURL変更の検知を行うために使用します。閲覧履歴を保存せず、URLを外部へ送信しません。
```

English:

```text
Used to read the current URL of active and open tabs so the extension can evaluate enabled URL patterns, update the toolbar icon for each tab, and react to URL changes including single-page application navigation. Browsing history is not stored and URLs are not transmitted externally.
```

### Host access / `<all_urls>`

日本語:

```text
ユーザーが利用するWebページ上のネイティブselect要素へ検索候補UIとキーボード操作を追加するため、コンテンツスクリプトをページへ読み込む必要があります。実際に機能を有効化できるのはhttp/httpsページだけで、ユーザーはURLパターンとツールバートグルで対象を制御できます。ページ内容を保存または外部送信しません。
```

English:

```text
Required to load the content script on web pages where the user may want keyboard search for native select elements. The feature can only become active on http/https pages, and users can control its scope with URL patterns and the toolbar toggle. Page content is not stored or transmitted externally.
```

## データ利用とプライバシー回答

### 実装に基づく事実

- 外部サーバーへのユーザーデータ送信: なし
- 開発者または第三者による保存: なし
- 広告、解析、トラッキング: なし
- アカウント作成、ログイン、決済: なし
- リモートコード: なし。実行コードはすべて拡張パッケージに同梱
- 端末内に永続保存する情報: 有効URLパターン、有効・無効状態などの拡張機能設定
- 端末内で一時処理する情報: 現在URL、selectのoption表示内容、select操作中のキー入力とフォーカス状態
- 第三者への共有・販売: なし
- 人による閲覧: なし

### Chrome Web Store / Edge Privacy

Chromeの公式定義では、端末内だけの処理もユーザーデータの取扱いに含まれる。申請画面の選択肢名を確認し、少なくとも次の該当カテゴリを申告する。

- Web history / Browsing activity: 現在URLを有効判定とアイコン更新に使用
- Website content: selectのoption表示内容を候補表示と検索に使用
- User activity: selectにフォーカス中のキー操作を検索・候補操作に使用

用途はすべて「App functionality / 拡張機能の機能提供」のみ。広告、マーケティング、分析、信用評価、パーソナライズには使用しない。

Edgeで「個人情報へアクセス、収集、送信するか」を一つのYes/Noで質問された場合は、ページ内容とURLへアクセスするため `Yes` を選び、詳細欄で「端末内処理のみで収集・保存・送信はしない」と説明し、公開済みPrivacy Policy URLを入力する。

### Remote code

選択:

```text
No, I am not using remote code.
```

補足欄がある場合:

```text
All executable JavaScript and CSS are bundled with the extension package. The extension does not download, import, or execute remotely hosted code.
```

## プライバシーポリシー用下書き

この文面は `docs/privacy.html` 作成時の原稿として使用する。公開前に実装と一致していることを再確認する。

```text
TabbySelect Privacy Policy

TabbySelect processes only the information needed to provide keyboard search for native HTML select elements and to determine whether the extension is enabled on the current page.

Information processed on the user's device:
- The current tab URL, used to evaluate the user's enabled URL patterns and display the correct toolbar icon.
- Text and state of native select options, used to display and filter suggestions.
- Keyboard and focus events while a supported select element is active, used to control the search and selection interface.
- Extension settings, including URL patterns and the enabled state, stored locally through browser storage.

No information is transmitted to the developer or to third parties. The extension does not use analytics, advertising, tracking, remote code, external APIs, or developer-operated servers. Information processed for the feature is not sold, shared, retained by the developer, or used for purposes unrelated to the extension's single purpose.

Users can change or remove locally stored settings from the extension settings page or by uninstalling the extension.

The use of information received from browser APIs adheres to the applicable browser extension store user data policies, including limited-use requirements.

Contact: apricot.personal.labo@gmail.com
Last updated: 2026-09-08
```

## Chrome Web Store

### 推奨入力

| 項目 | 内容 |
|---|---|
| Category | Productivity |
| Language | Englishをデフォルト。対応する7ロケールを追加 |
| Homepage URL | 共通基本情報を参照 |
| Support URL | 共通基本情報を参照 |
| Privacy Policy URL | 共通基本情報を参照。公開後に入力 |
| Mature content | No |
| Regions | All regions |
| Remote code | No |
| Single purpose | 上記「単一目的」を転記 |
| Permission justifications | 上記3項目を転記 |
| Data use | Web history、Website content、User activity。App functionalityのみ |

### 必要素材

- Store icon: `store-listing/assets/chrome-store-icon-128.png`（128 x 128 PNG）
- Screenshot: `store-listing/screenshots/01-search.png`（1280 x 800 PNG）
- Small promo tile: `store-listing/assets/small-promo-440x280.png`（440 x 280 PNG）
- Marquee promo tile: 1400 x 560 PNG/JPEG（任意）

推奨スクリーンショット:

1. 長いselectで `Jap` を入力し、候補が絞り込まれている画面
2. ポップアップの有効・無効トグル
3. 有効URLパターンの設定画面

## Microsoft Edge Add-ons

### 推奨入力

| 項目 | 内容 |
|---|---|
| Visibility | Public |
| Markets | All markets |
| Category | Productivity |
| Website | Homepage URL |
| Support contact detail | Support URL または問い合わせメールアドレス |
| Mature content | No |
| Privacy | ページ内容へローカルアクセスするためYes。収集・外部送信なしと説明 |
| Privacy Policy URL | 共通基本情報を参照。公開後に入力 |
| Remote code | No |
| Search terms (ja) | ドロップダウン, select, インクリメンタル検索, フォーム, キーボード |
| Search terms (en) | dropdown, select, incremental search, form, keyboard |

掲載言語ごとに250文字以上のDescriptionとロゴが必要。ロゴは1:1、最低128 x 128、推奨300 x 300。スクリーンショットは最大6枚で、640 x 480または1280 x 800。

掲載用ロゴ: `store-listing/assets/edge-logo-300.png`。全掲載言語へ同じファイルを登録する。

### Certification notes

```text
This extension adds keyboard-driven prefix search to native HTML select elements. No account or test credentials are required.

Review steps:
1. Install the extension and open any http/https page containing a native single-choice select element.
2. Leave Enabled URL settings empty to allow all http/https pages, or add the current page URL pattern.
3. Make sure the toolbar popup toggle is enabled.
4. Use the Tab key to focus the select. Do not click the select, because mouse focus intentionally keeps the browser's native dropdown behavior.
5. Type the beginning of an option label, use the arrow keys to move, and press Enter or Tab to confirm.

The extension processes URLs, select option content, and relevant keyboard events locally. It does not transmit data, use analytics or advertising, or execute remote code.
```

## Firefox Add-ons (AMO)

### 推奨入力

| 項目 | 内容 |
|---|---|
| Distribution channel | Listed |
| Category | Other (`other`) |
| Homepage | Homepage URL |
| Support site | Support URL |
| Support email | apricot.personal.labo@gmail.com |
| Privacy policy | Privacy Policy URL |
| Data collection | None。配布用manifestは `data_collection_permissions.required: ["none"]` |
| License | `Apache-2.0` |
| Firefox Extension ID | `tabbyselect@apricotpersonallabo.github.io` |
| Desktop minimum version | 140.0 |
| Android minimum version | 142.0 |

初回のListed提出では、AMO metadataの `categories`、`summary`、`version.license` が必要。ライセンス決定後の最小例:

```json
{
  "summary": {
    "en-US": "Search native dropdown options by typing, then select with the keyboard on any enabled web page.",
    "ja": "Webページのドロップダウンを文字入力で絞り込み、キーボードだけで素早く選択できるようにします。"
  },
  "categories": ["other"],
  "version": {
    "license": "Apache-2.0",
    "approval_notes": "<下記Reviewer notesを転記>"
  }
}
```

### Reviewer notes

```text
No account, external service, or test credentials are required. The source is plain, unobfuscated JavaScript and CSS included in the extension package.

To test the main feature, open an http/https page with a native single-choice select element. Leave the Enabled URL setting empty, ensure the toolbar toggle is on, use Tab to focus the select, and type the beginning of an option label. Use arrow keys to move and Enter or Tab to confirm. Mouse-click focus intentionally keeps native browser behavior and does not open the extension's suggestion UI.

The add-on does not collect or transmit data. Current URLs, select option content, and keyboard events required for the feature are processed only on the user's device. No remote code, analytics, ads, tracking, or external API calls are used.
```

## リリースノート 1.0.0

### 日本語

```text
初回リリース。

・ネイティブselect要素の前方一致インクリメンタル検索
・キーボードによる候補移動とEnter／Tabでの確定
・URLパターンによる有効ページ設定
・ツールバーからの有効・無効切り替え
・Chrome、Edge、Firefoxに対応
```

### English

```text
Initial release.

• Prefix-based incremental search for native select elements
• Keyboard suggestion navigation and confirmation with Enter or Tab
• Enabled-page control using URL patterns
• Quick enable/disable control from the toolbar
• Support for Chrome, Edge, and Firefox
```

## ローカライズ済みmanifest表示名

| Locale | Name | Short description |
|---|---|---|
| de | TabbySelect | Ermöglicht die inkrementelle Suche in allen Dropdown-Elementen (select) auf jeder Seite. |
| en | TabbySelect | Enables incremental search for all dropdown (select) elements on any page. |
| es | TabbySelect | Permite la búsqueda incremental en todos los elementos desplegables (select) de cualquier página. |
| ja | TabbySelect | あらゆるページのドロップダウン（select）要素でインクリメンタル検索を有効にします。 |
| ko | TabbySelect | 모든 페이지의 드롭다운(select) 요소에서 증분 검색을 사용할 수 있게 합니다. |
| zh_CN | TabbySelect | 为任意页面上的所有下拉列表（select）元素启用增量搜索。 |
| zh_TW | TabbySelect | 為任何頁面上的所有下拉選單（select）元素啟用增量搜尋。 |

## 提出パッケージと公開手順

- Chrome / Edge: 同じChromium向けZIPを使用
- Firefox: 配布時にGecko ID、Firefox用background scripts、最小バージョン、データ非収集宣言を追加したZIPを使用
- GitHub Actions: `src/manifest.json` の `main` への反映時にタグとReleaseを自動作成。ストア申請時は `Release and publish browser stores` を `main` から手動実行
- `version`: `src/manifest.json` から自動取得
- `target`: 初回は `all`。部分失敗時は失敗したストアだけを再実行
- Edgeの `certification_notes`: 上記Certification notesを使用
- GitHub Releases: `v<version>`にChromium向けZIPとFirefox向けZIPが掲載される。同じバージョンの再実行時は既存ZIPが上書きされる

## 公式資料

- Chrome Web Store listing: https://developer.chrome.com/docs/webstore/cws-dashboard-listing/
- Chrome listing best practices: https://developer.chrome.com/docs/webstore/best-listing
- Chrome privacy fields: https://developer.chrome.com/docs/webstore/cws-dashboard-privacy
- Chrome user data FAQ: https://developer.chrome.com/docs/webstore/program-policies/user-data-faq/
- Microsoft Edge submission: https://learn.microsoft.com/en-us/microsoft-edge/extensions/publish/publish-extension
- Microsoft Edge developer policies: https://learn.microsoft.com/en-us/legal/microsoft-edge/extensions/developer-policies
- Firefox Add-on policies: https://extensionworkshop.com/documentation/publish/add-on-policies/
- Firefox `web-ext` AMO metadata: https://extensionworkshop.com/documentation/develop/web-ext-command-reference/#amo-metadata
