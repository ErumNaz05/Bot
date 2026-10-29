// Data-driven suite: one Playwright test per case in fixtures/chatbot.fixtures.json
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const APP_URL = pathToFileURL(path.resolve(__dirname, '../app/chatbot.html')).href;
const { cases } = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../fixtures/chatbot.fixtures.json'), 'utf8')
);

const countWords = (s) => s.trim().split(/\s+/).filter(Boolean).length;

async function sendMessage(page, turn) {
  const text = turn.inputRepeat
    ? turn.inputRepeat.text.repeat(turn.inputRepeat.times)
    : turn.input;
  await page.locator('#user-input').fill(text);
  await page.locator('#send-btn').click();
  return text;
}

async function assertBotReply(page, expected, botCountBefore) {
  const bots = page.locator('[data-testid="bot-message"]');
  await expect(bots).toHaveCount(botCountBefore + 1);
  const last = bots.last();
  const reply = (await last.textContent()) || '';

  if (expected.intent) await expect(last).toHaveAttribute('data-intent', expected.intent);
  if (expected.lang) await expect(last).toHaveAttribute('data-lang', expected.lang);

  for (const s of expected.containsAll || []) {
    expect(reply.toLowerCase(), `reply should contain "${s}"`).toContain(s.toLowerCase());
  }
  if (expected.containsAny) {
    const ok = expected.containsAny.some((s) => reply.toLowerCase().includes(s.toLowerCase()));
    expect(ok, `reply should contain one of ${JSON.stringify(expected.containsAny)}`).toBe(true);
  }
  for (const s of expected.notContains || []) {
    expect(reply.toLowerCase(), `reply must NOT contain "${s}"`).not.toContain(s.toLowerCase());
  }
  if (expected.regex) expect(reply).toMatch(new RegExp(expected.regex, 's'));
  if (expected.maxWords) expect(countWords(reply)).toBeLessThanOrEqual(expected.maxWords);
  if (expected.jsonKeys) {
    let parsed;
    expect(() => { parsed = JSON.parse(reply); }, 'reply must be valid JSON').not.toThrow();
    for (const k of expected.jsonKeys) expect(parsed).toHaveProperty(k);
  }
  if (expected.noElementInLog) {
    await expect(page.locator(`[data-testid="chat-log"] :is(${expected.noElementInLog})`)).toHaveCount(0);
  }
}

for (const c of cases) {
  test(`${c.id} | ${c.manualRef} | ${c.category}: ${c.title} @${c.priority}`, async ({ page }) => {
    test.info().annotations.push({ type: 'manual-test-id', description: c.manualRef });

    // Any alert()/confirm()/prompt() means a script executed -> fail the test.
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss(); });

    await page.goto(APP_URL);

    for (const turn of c.turns) {
      if (turn.newChatBefore) await page.locator('#new-chat').click();

      const userBefore = await page.locator('[data-testid="user-message"]').count();
      const botBefore = await page.locator('[data-testid="bot-message"]').count();
      await sendMessage(page, turn);

      if (turn.expect.blocked) {
        // Nothing should be sent and the user should see a hint.
        await expect(page.locator('#input-hint')).toHaveText(/type a message/i);
        await expect(page.locator('[data-testid="user-message"]')).toHaveCount(userBefore);
        await expect(page.locator('[data-testid="bot-message"]')).toHaveCount(botBefore);
        continue;
      }
      await assertBotReply(page, turn.expect, botBefore);
    }

    expect(dialogs, 'no script should have executed').toEqual([]);
  });
}
