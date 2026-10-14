const {defineConfig} = require('@playwright/test');
const path = require('node:path');
const platform = path.resolve(process.env.SITE_PLATFORM_PATH || '../site-platform');
module.exports = defineConfig({
  testDir:'./tests/site',
  timeout:60000,
  workers:1,
  reporter:'list',
  use:{baseURL:'http://127.0.0.1:4173/product/'},
  webServer:{command:`node "${platform}/test/server.mjs"`,env:{SITE_DIST:path.resolve('site-dist')},url:'http://127.0.0.1:4173/product/index.html'}
});
