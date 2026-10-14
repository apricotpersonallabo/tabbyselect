(() => {
  'use strict';
  const form = document.querySelector('[data-playground]');
  if (!form) return;
  const japanese = form.closest('[lang]').lang === 'ja';
  const history = [];
  const selects = [...form.querySelectorAll('select')];
  const status = form.querySelector('[data-selection-status]');
  const log = form.querySelector('[data-event-log]');
  const empty = status.textContent;
  const label = select => select.labels[0].textContent;
  function render() {
    status.textContent = selects.filter(select => select.value).map(select => `${label(select)}: ${select.selectedOptions[0].text}`).join(' / ') || empty;
    if (!history.length) return;
    log.replaceChildren(...history.slice(-8).reverse().map(entry => {
      const item = document.createElement('li');
      item.textContent = japanese ? `${entry.label}: ${entry.value}（${entry.type}）` : `${entry.label}: ${entry.value} (${entry.type})`;
      return item;
    }));
  }
  form.addEventListener('submit', event => event.preventDefault());
  form.querySelector('[data-playground-start]').addEventListener('click', event => event.currentTarget.focus());
  for (const select of selects) for (const type of ['input', 'change']) select.addEventListener(type, () => {
    history.push({label:label(select), value:select.selectedOptions[0].text, type});
    render();
  });
})();
