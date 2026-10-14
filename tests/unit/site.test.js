const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const config=JSON.parse(fs.readFileSync(path.join(root,'site/site.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'docs/site.js'),'utf8');
const translations=vm.runInNewContext('('+script.split('const translations = ')[1].split(';\n\n  let currentLanguage')[0]+')');
const normalize=value=>value.replace(/\s+/g,' ').trim();
const text=html=>normalize(html.replace(/<[^>]*>/g,' ').replaceAll('&amp;','&').replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&nbsp;',' '));
test('all published product copy is retained in both locale sources',()=>{
  for(const page of config.pages) for(const locale of ['ja','en']) {
    const legacy=fs.readFileSync(path.join(root,'docs',page.slug+'.html'),'utf8').split(/<main[^>]*>/)[1].split('</main>')[0];
    const source=locale==='ja'?page.source:page.locales.en.source;
    const fragment=fs.readFileSync(path.join(root,'site',source),'utf8');
    for(const [,key] of legacy.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(text(fragment).includes(normalize(translations[locale][key])),`${locale}/${page.slug}: missing ${key}`);
    assert.doesNotMatch(fragment,/<(?:html|head|body|script)\b/);
  }
});
test('manual preserves published anchors, native controls, contact and policy',()=>{
  for(const locale of ['ja','en']) {
    const manual=fs.readFileSync(path.join(root,'site/content',locale,'manual.html'),'utf8');
    for(const anchor of ['setup','keyboard','playground','limitations'])assert.match(manual,new RegExp(`id="${anchor}"`));
    assert.equal((manual.match(/<select\b/g)||[]).length,3);
    assert.match(manual,/mailto:apricot.personal.labo@gmail.com/);
  }
  assert.deepEqual(fs.readFileSync(path.join(root,'site/public/googlef48cfc175b4cddb4.html')),fs.readFileSync(path.join(root,'docs/googlef48cfc175b4cddb4.html')));
  assert.deepEqual(fs.readFileSync(path.join(root,'site/assets/icon-128.png')),fs.readFileSync(path.join(root,'docs/assets/icon-128.png')));
});
