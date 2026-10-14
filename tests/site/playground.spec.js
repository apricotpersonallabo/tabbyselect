const {test,expect,chromium} = require('@playwright/test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
for (const locale of ['ja','en']) {
  test(`migrated ${locale} playground works with the installed extension`, async () => {
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'tabbyselect-site-'));
    const extension=path.resolve('src');
    const context=await chromium.launchPersistentContext(temp,{channel:'chromium',headless:true,args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
    try {
      const worker=context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
      await worker.evaluate(()=>chrome.storage.local.set({urlAllowPatterns:'',manualEnabledOverride:true,searchMode:'contains'}));
      const page=await context.newPage();
      await page.goto(`http://127.0.0.1:4173/product/${locale==='ja'?'':'en/'}manual.html#playground`);
      await expect(page.locator('html')).toHaveAttribute('lang',locale);
      await expect(page.locator('[data-playground] select')).toHaveCount(3);
      await page.locator('[data-playground-start]').focus();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Home');
      await expect(page.locator('[data-tabby-select-host] .query')).toBeFocused();
      await page.keyboard.type('Jap');
      await page.keyboard.press('Enter');
      await expect(page.locator('#country')).toHaveValue('Japan');
      await expect(page.locator('[data-selection-status]')).toContainText(`${locale==='ja'?'国・地域':'Country or region'}: Japan`);
      await expect(page.locator('[data-event-log]')).toContainText('input');
      await expect(page.locator('[data-event-log]')).toContainText('change');
      await page.locator('nav[aria-label="Languages"] a').filter({hasText:locale==='ja'?'English':'日本語'}).click();
      await expect(page.locator('html')).toHaveAttribute('lang',locale==='ja'?'en':'ja');
      await expect(page.locator('[data-playground] select')).toHaveCount(3);
    } finally {await context.close();fs.rmSync(temp,{recursive:true,force:true});}
  });
}
