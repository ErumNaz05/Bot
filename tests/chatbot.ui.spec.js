// UI behaviour checks (UI-xx cases from the manual workbook)
const { test, expect } = require('@playwright/test');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_URL = pathToFileURL(path.resolve(__dirname, '../app/chatbot.html')).href;
const bots = (page) => page.locator('[data-testid="bot-message"]');
const users = (page) => page.locator('[data-testid="user-message"]');

test.beforeEach(async ({ page }) => { await page.goto(APP_URL); });

test('UI-01 | typing indicator shows while reply is generated, then hides @P3', async ({ page }) => {
  await page.locator('#user-input').fill('Hi');
  await page.locator('#send-btn').click();
  await expect(page.getByTestId('typing-indicator')).toBeVisible();
  await expect(bots(page)).toHaveCount(1);
  await expect(page.getByTestId('typing-indicator')).toBeHidden();
});

test('UI-06 | Enter sends the message @P2', async ({ page }) => {
  await page.locator('#user-input').fill('Hi');
  await page.locator('#user-input').press('Enter');
  await expect(users(page)).toHaveCount(1);
  await expect(bots(page)).toHaveCount(1);
  await expect(page.locator('#user-input')).toHaveValue('');
});

test('UI-07 | Shift+Enter inserts a newline and does not send @P3', async ({ page }) => {
  const box = page.locator('#user-input');
  await box.fill('line one');
  await box.press('Shift+Enter');
  await box.type('line two');
  await expect(box).toHaveValue('line one\nline two');
  await expect(users(page)).toHaveCount(0);
});

test('UI-08 | chat auto-scrolls to the latest message @P2', async ({ page }) => {
  for (let i = 1; i <= 8; i++) {
    await page.locator('#user-input').fill('What are your support hours?');
    await page.locator('#send-btn').click();
    await expect(bots(page)).toHaveCount(i);
  }
  const atBottom = await page.locator('#chat-log').evaluate(
    (el) => el.scrollTop + el.clientHeight >= el.scrollHeight - 5
  );
  expect(atBottom).toBe(true);
  await expect(bots(page).last()).toBeInViewport();
});

test('UI-30 | New chat clears the conversation @P2', async ({ page }) => {
  await page.locator('#user-input').fill('Hi');
  await page.locator('#send-btn').click();
  await expect(bots(page)).toHaveCount(1);
  await page.locator('#new-chat').click();
  await expect(users(page)).toHaveCount(0);
  await expect(bots(page)).toHaveCount(0);
  await expect(page.locator('#welcome')).toBeVisible();
});

test('UI-19 | keyboard-only: Tab reaches input, Send and New chat @P2', async ({ page }) => {
  await page.keyboard.press('Tab');
  await expect(page.locator('#new-chat')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#user-input')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#send-btn')).toBeFocused();
});

test('UI-03 | usable on a phone-sized viewport @P2', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await expect(page.locator('#user-input')).toBeVisible();
  await expect(page.locator('#send-btn')).toBeVisible();
  const overflowX = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflowX).toBe(false);
});
