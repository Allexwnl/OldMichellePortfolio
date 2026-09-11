import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser', workers:1, timeout:30000,
  use:{ baseURL:'http://127.0.0.1:4173', headless:true, launchOptions: process.env.PLAYWRIGHT_CHROME_PATH ? {executablePath:process.env.PLAYWRIGHT_CHROME_PATH} : {} },
  webServer:{ command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:true },
  reporter:'list'
});
