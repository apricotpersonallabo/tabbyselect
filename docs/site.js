(() => {
  "use strict";

  const GITHUB_URL = "https://github.com/apricotpersonallabo/tabbyselect";
  const LANGUAGE_STORAGE_KEY = "tabby-select-support-language";
  const translations = {
    ja: {
      homeMetaDescription: "TabbySelectは、Webページのselect要素をキーボードで素早く検索・選択できるブラウザ拡張機能です。",
      manualMetaDescription: "TabbySelectの設定方法、キーボード操作、Playgroundを掲載した利用マニュアルです。",
      privacyMetaDescription: "TabbySelectが端末内で処理する情報と、保存・共有・削除に関する方針を説明します。",
      homeTitle: "TabbySelect | サポート", manualTitle: "使い方 | TabbySelect", privacyTitle: "プライバシーポリシー | TabbySelect", homeAriaLabel: "TabbySelect ホーム", mainNavigation: "メインナビゲーション", navOverview: "概要", navManual: "使い方", navPrivacy: "プライバシー", navGitHub: "GitHub", switchLanguage: "英語に切り替える",
      heroEyebrow: "FOR FASTER FORMS", heroTitle: "長いドロップダウンを、迷わず選ぶ。", heroLead: "文字を入力して候補を絞り込み、キーボードだけで選択を完了。TabbySelectは、Webフォームのselect操作を軽快にします。", readManual: "使い方を見る", viewGitHub: "GitHubで見る", browserSupport: "Chrome・Edge・Firefox対応",
      featuresEyebrow: "SMALL TOOL, QUICK FLOW", featuresTitle: "フォーム入力の小さな手間を減らします", featureSearchTitle: "前方一致で検索", featureSearchText: "selectにフォーカスして文字を入力すると、先頭から一致する選択肢だけを表示します。", featureKeyboardTitle: "キーボードで完結", featureKeyboardText: "矢印キーで移動し、EnterまたはTabで確定。選択後のフォーム入力もスムーズです。", featureScopeTitle: "URLごとに制御", featureScopeText: "対象URLをパターンで指定できます。設定を空欄にすれば、すべてのhttp/httpsページで有効になります。",
      flowEyebrow: "THREE STEPS", flowTitle: "使い始めるまで", flowOneTitle: "対象URLを設定", flowOneText: "設定ページに1行1パターンで入力します。すべてのURLで使う場合は空欄のままで構いません。", flowTwoTitle: "トグルをオン", flowTwoText: "対象ページでツールバーアイコンを開き、拡張機能を有効にします。", flowThreeTitle: "文字を入力", flowThreeText: "Tabキーでselectへ移動し、探したい選択肢の先頭文字を入力します。", openFullManual: "詳しい手順とPlaygroundを開く →", contact: "お問い合わせ",
      manualEyebrow: "MANUAL & PLAYGROUND", manualHeading: "使い方", manualLead: "設定から基本操作までを順番に確認し、ページ下部のPlaygroundで実際の動きを試せます。", tableOfContents: "目次", contents: "目次", tocSetup: "1. 初期設定", tocKeyboard: "2. キーボード操作", tocPlayground: "3. Playground", tocLimitations: "4. 対象と制限",
      setupTitle: "初期設定", setupOneTitle: "設定ページを開く", setupOneText: "ツールバーのTabbySelectアイコンをクリックし、「設定ページを開く」を選択します。", setupTwoTitle: "有効URLを指定する", setupTwoText: "URLパターンを1行ずつ入力します。*は任意の文字列に一致します。空欄の場合は、すべてのhttp/https URLが対象です。", setupThreeTitle: "対象ページでオンにする", setupThreeText: "アイコンを再度クリックし、ポップアップのトグルをオンにします。設定変更は開いているページにも反映されます。",
      keyboardTitle: "キーボード操作", keyboardIntro: "Tabキーでselectにフォーカスしてから文字を入力します。マウスクリックでフォーカスした場合、そのフォーカス中は候補UIを表示しません。", keyboardTableLabel: "キーボード操作", keyType: "先頭から一致する候補に絞り込む", keyArrows: "候補のハイライトを移動する", keyBackspace: "検索文字を1文字削除する", keyEscape: "検索をクリアし、空の状態でもう一度押すと候補を閉じる", keyEnter: "候補を確定して次の入力項目へ移動する", keyTab: "候補を確定して通常どおり次へ移動する",
      playgroundIntro: "拡張機能を有効にした状態で、下の「練習を始める」ボタンからTabキーでselectへ移動してください。文字入力、候補移動、確定を試せます。", playgroundNote: "このページでは拡張機能の動作を再実装していません。通常のselect要素に対する実際の拡張機能の動作を確認できます。", startPractice: "練習を始める", countryLabel: "国・地域", departmentLabel: "部署", priorityLabel: "優先度", chooseOption: "選択してください", departmentAccounting: "経理", departmentDesign: "デザイン", departmentEngineering: "開発", departmentMarketing: "マーケティング", departmentSales: "営業", departmentSupport: "サポート", priorityLow: "低", priorityMedium: "中", priorityHigh: "高", priorityUrgent: "緊急", focusTarget: "次のフォーカス先", currentSelection: "現在の選択", nothingSelected: "まだ選択されていません。", eventHistory: "イベント履歴", noEvents: "まだイベントはありません。", eventMessage: "{field}: {value}（{type}）",
      limitationsTitle: "対象と制限", limitationNative: "対象はネイティブHTMLの単一選択selectです。独自UIのドロップダウンとselect[multiple]は対象外です。", limitationDom: "トップフレームの通常DOM内にあるselectが対象です。iframeとページ側Shadow DOM内は対象外です。", limitationProtocol: "有効化できるのはhttp://またはhttps://のページです。ブラウザ設定ページなどでは動作しません。", limitationMouse: "マウスでselectをクリックした場合、そのフォーカス中はブラウザ標準の操作を優先します。", needHelpEyebrow: "NEED HELP?", needHelpTitle: "解決しない場合", needHelpText: "状況と対象ページのURLを添えてお問い合わせください。", contactUs: "問い合わせる",
      privacyEyebrow: "PRIVACY POLICY", privacyHeading: "プライバシーポリシー", privacyUpdated: "最終更新日: 2026年9月22日", privacyIntro: "TabbySelectは、ネイティブHTML select要素のキーボード検索と、現在のページで拡張機能を有効にするかを判断するために必要な情報だけを端末内で処理します。",
      privacyProcessedTitle: "処理する情報", privacyProcessedUrl: "現在のタブURL。有効URLパターンとの照合とツールバーアイコンの状態表示に使用します。", privacyProcessedContent: "ネイティブselect要素の選択肢テキストと状態。候補の表示と絞り込みに使用します。", privacyProcessedActivity: "対応するselect要素にフォーカスしている間のキー入力とフォーカスイベント。検索、候補移動、選択確定に使用します。", privacyProcessedSettings: "有効URLパターン、有効・無効状態、デバッグ設定などの拡張機能設定。chrome.storage.localを使って端末内に保存します。",
      privacySharingTitle: "収集・送信・共有", privacySharingText: "TabbySelectは、これらの情報を開発者または第三者のサーバーへ送信、販売、共有しません。広告、解析、トラッキング、外部API、リモートコード、開発者が運用するサーバーは使用しません。",
      privacyRetentionTitle: "保存期間と削除", privacyRetentionText: "ページ内容、URL、キー入力は機能提供中だけ一時的に処理され、開発者には保存されません。拡張機能設定は端末内に残り、設定ページで変更するか、拡張機能をアンインストールすることで削除できます。",
      privacyPermissionsTitle: "ブラウザ権限", privacyPermissionsText: "storage権限は設定保存に、tabs権限とWebサイトへのアクセスはURL判定、アイコン更新、select要素への機能提供に使用します。権限はこの単一目的のためだけに使用します。",
      privacyChangesTitle: "ポリシーの変更", privacyChangesText: "機能またはデータ取扱いを変更する場合は、このページを更新し、最終更新日を変更します。", privacyContactTitle: "お問い合わせ", privacyContactText: "本ポリシーに関する質問は、apricot.personal.labo@gmail.com までお送りください。"
    },
    en: {
      homeMetaDescription: "TabbySelect is a browser extension that lets you quickly search and select native HTML select options with the keyboard.",
      manualMetaDescription: "Setup instructions, keyboard controls, limitations, and a live playground for TabbySelect.",
      privacyMetaDescription: "How TabbySelect processes information on your device, including storage, sharing, retention, and deletion.",
      homeTitle: "TabbySelect | Support", manualTitle: "Manual | TabbySelect", privacyTitle: "Privacy Policy | TabbySelect", homeAriaLabel: "TabbySelect home", mainNavigation: "Main navigation", navOverview: "Overview", navManual: "Manual", navPrivacy: "Privacy", navGitHub: "GitHub", switchLanguage: "Switch to Japanese",
      heroEyebrow: "FOR FASTER FORMS", heroTitle: "Find the right option without the scroll.", heroLead: "Type to narrow the list, then finish the selection without leaving your keyboard. TabbySelect makes native web forms feel faster.", readManual: "Read the manual", viewGitHub: "View on GitHub", browserSupport: "Available for Chrome, Edge, and Firefox",
      featuresEyebrow: "SMALL TOOL, QUICK FLOW", featuresTitle: "Less friction in every form", featureSearchTitle: "Prefix search", featureSearchText: "Focus a select and start typing to show only options that match from the beginning.", featureKeyboardTitle: "Stay on the keyboard", featureKeyboardText: "Move with arrow keys and confirm with Enter or Tab to keep the form moving.", featureScopeTitle: "Control by URL", featureScopeText: "Limit the extension with URL patterns, or leave the setting empty to enable it on every http/https page.",
      flowEyebrow: "THREE STEPS", flowTitle: "Get started", flowOneTitle: "Set target URLs", flowOneText: "Enter one URL pattern per line. Leave the setting empty if you want to use it everywhere.", flowTwoTitle: "Turn it on", flowTwoText: "Open the toolbar icon on a target page and enable the extension.", flowThreeTitle: "Start typing", flowThreeText: "Use Tab to focus a select, then type the beginning of the option you need.", openFullManual: "Open the full manual and playground →", contact: "Contact",
      manualEyebrow: "MANUAL & PLAYGROUND", manualHeading: "How to use", manualLead: "Follow the setup and controls, then try the extension on real select elements in the playground below.", tableOfContents: "Table of contents", contents: "Contents", tocSetup: "1. Setup", tocKeyboard: "2. Keyboard controls", tocPlayground: "3. Playground", tocLimitations: "4. Scope and limits",
      setupTitle: "Setup", setupOneTitle: "Open settings", setupOneText: "Click the TabbySelect toolbar icon and choose “Open settings.”", setupTwoTitle: "Set enabled URLs", setupTwoText: "Enter one URL pattern per line. * matches any text. An empty setting enables every http/https URL.", setupThreeTitle: "Enable it on the page", setupThreeText: "Open the icon again and turn on the popup toggle. Setting changes also apply to pages already open.",
      keyboardTitle: "Keyboard controls", keyboardIntro: "Use Tab to focus a select, then start typing. When you focus it with a mouse click, suggestions remain hidden for that focus session.", keyboardTableLabel: "Keyboard controls", keyType: "Filter options that match from the beginning", keyArrows: "Move the highlighted suggestion", keyBackspace: "Remove one character from the query", keyEscape: "Clear the query; press again while empty to close suggestions", keyEnter: "Confirm and move to the next field", keyTab: "Confirm and continue with normal Tab navigation",
      playgroundIntro: "With the extension enabled, use Tab from the “Start practice” button to enter the selects below. Try typing, moving through suggestions, and confirming a value.", playgroundNote: "This page does not reimplement the extension. It uses ordinary select elements so you can test the real installed extension.", startPractice: "Start practice", countryLabel: "Country or region", departmentLabel: "Department", priorityLabel: "Priority", chooseOption: "Choose an option", departmentAccounting: "Accounting", departmentDesign: "Design", departmentEngineering: "Engineering", departmentMarketing: "Marketing", departmentSales: "Sales", departmentSupport: "Support", priorityLow: "Low", priorityMedium: "Medium", priorityHigh: "High", priorityUrgent: "Urgent", focusTarget: "Next focus target", currentSelection: "Current selection", nothingSelected: "Nothing selected yet.", eventHistory: "Event history", noEvents: "No events yet.", eventMessage: "{field}: {value} ({type})",
      limitationsTitle: "Scope and limits", limitationNative: "The extension supports native, single-choice HTML select elements. Custom dropdowns and select[multiple] are not supported.", limitationDom: "Selects must be in the top frame's light DOM. Iframes and page-owned Shadow DOM are not supported.", limitationProtocol: "Only http:// and https:// pages can be enabled. Browser settings pages are not supported.", limitationMouse: "When a select is clicked with the mouse, native browser behavior takes priority for that focus session.", needHelpEyebrow: "NEED HELP?", needHelpTitle: "Still stuck?", needHelpText: "Contact us with a description of the issue and the URL where it happened.", contactUs: "Contact support",
      privacyEyebrow: "PRIVACY POLICY", privacyHeading: "Privacy Policy", privacyUpdated: "Last updated: September 22, 2026", privacyIntro: "TabbySelect processes only the information needed to provide keyboard search for native HTML select elements and to determine whether the extension is enabled on the current page. Processing takes place on your device.",
      privacyProcessedTitle: "Information processed", privacyProcessedUrl: "The current tab URL, used to evaluate enabled URL patterns and display the correct toolbar icon.", privacyProcessedContent: "The text and state of native select options, used to display and filter suggestions.", privacyProcessedActivity: "Keyboard and focus events while a supported select is active, used to search, move through suggestions, and confirm a selection.", privacyProcessedSettings: "Extension settings such as URL patterns, enabled state, and debug preferences, stored locally using chrome.storage.local.",
      privacySharingTitle: "Collection, transmission, and sharing", privacySharingText: "TabbySelect does not transmit, sell, or share this information with the developer or third parties. It does not use advertising, analytics, tracking, external APIs, remote code, or developer-operated servers.",
      privacyRetentionTitle: "Retention and deletion", privacyRetentionText: "Page content, URLs, and keystrokes are processed temporarily while providing the feature and are not retained by the developer. Extension settings remain on your device until you change them or uninstall the extension.",
      privacyPermissionsTitle: "Browser permissions", privacyPermissionsText: "The storage permission saves settings. The tabs permission and website access are used to evaluate URLs, update the toolbar icon, and provide the feature on select elements. Permissions are used only for this single purpose.",
      privacyChangesTitle: "Changes to this policy", privacyChangesText: "If the feature or its data handling changes, this page and its last-updated date will be revised.", privacyContactTitle: "Contact", privacyContactText: "Questions about this policy may be sent to apricot.personal.labo@gmail.com."
    }
  };

  let currentLanguage = resolveInitialLanguage();
  const eventHistory = [];

  function resolveInitialLanguage() {
    try {
      const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === "ja" || stored === "en") return stored;
    } catch {
      return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
    }
    return navigator.language.toLowerCase().startsWith("ja") ? "ja" : "en";
  }

  function translate(key) {
    return translations[currentLanguage][key] || translations.en[key] || key;
  }

  function applyLanguage(language) {
    currentLanguage = language;
    document.documentElement.lang = language;
    document.querySelectorAll("[data-i18n]").forEach((element) => {
      element.textContent = translate(element.dataset.i18n);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
      element.setAttribute("aria-label", translate(element.dataset.i18nAriaLabel));
    });
    document.querySelectorAll("[data-i18n-content]").forEach((element) => {
      element.setAttribute("content", translate(element.dataset.i18nContent));
    });
    document.querySelectorAll("[data-language-toggle]").forEach((button) => {
      button.textContent = language === "ja" ? "EN" : "日本語";
      button.setAttribute("aria-label", translate("switchLanguage"));
    });
    renderPlayground();
  }

  function saveLanguage(language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    } catch {
      return;
    }
  }

  function renderPlayground() {
    const form = document.querySelector("[data-playground]");
    if (!form) return;
    const selects = Array.from(form.querySelectorAll("select"));
    const selected = selects.filter((select) => select.value).map((select) => `${translate(select.dataset.fieldKey)}: ${select.options[select.selectedIndex].text}`);
    const status = form.querySelector("[data-selection-status]");
    const log = form.querySelector("[data-event-log]");
    status.textContent = selected.length ? selected.join(" / ") : translate("nothingSelected");
    log.replaceChildren();
    if (!eventHistory.length) {
      const item = document.createElement("li");
      item.textContent = translate("noEvents");
      log.append(item);
      return;
    }
    eventHistory.slice(-8).reverse().forEach((entry) => {
      const item = document.createElement("li");
      item.textContent = translate("eventMessage").replace("{field}", translate(entry.fieldKey)).replace("{value}", entry.value).replace("{type}", entry.type);
      log.append(item);
    });
  }

  document.querySelectorAll("[data-github-link]").forEach((link) => {
    link.href = GITHUB_URL;
  });
  document.querySelectorAll("[data-language-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextLanguage = currentLanguage === "ja" ? "en" : "ja";
      saveLanguage(nextLanguage);
      applyLanguage(nextLanguage);
    });
  });

  const playground = document.querySelector("[data-playground]");
  if (playground) {
    playground.querySelector("[data-playground-start]").addEventListener("click", (event) => event.currentTarget.focus());
    playground.querySelectorAll("select").forEach((select) => {
      ["input", "change"].forEach((type) => select.addEventListener(type, () => {
        eventHistory.push({ fieldKey: select.dataset.fieldKey, value: select.options[select.selectedIndex].text, type });
        renderPlayground();
      }));
    });
  }

  applyLanguage(currentLanguage);
})();
