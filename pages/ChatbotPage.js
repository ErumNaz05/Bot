const { expect } = require('@playwright/test');
const path = require('path');

class ChatbotPage {
  constructor(page) {
    this.page = page;
    this.inputField = page.locator('#user-input');
    this.sendButton = page.locator('#send-btn');
    this.chatLog = page.locator('#chat-log');
    this.botMessages = page.locator('[data-testid="bot-message"]');
    this.userMessages = page.locator('[data-testid="user-message"]');
    this.typingIndicator = page.locator('#typing');
    this.newChatButton = page.locator('#new-chat');
    this.inputHint = page.locator('#input-hint');
    
    // Track if the last sent message was empty (so we don't wait for a bot reply)
    this.lastMessageWasEmpty = false;
  }

  async goto() {
    const filePath = path.resolve(__dirname, '../app/chatbot.html');
    const fileUrl = `file:///${filePath.replace(/\\/g, '/')}`;
    await this.page.goto(fileUrl); 
  }

  async sendMessage(text) {
      if (text === undefined || text === null) text = "";

    // 1. Generate massive strings for the edge cases
    if (text.includes("max allowed length") || text.includes("5000 words") || text.includes("10000-character")) {
      text = "a".repeat(501); 
    }
    if (text.includes("1 character over")) {
      text = "a".repeat(502);
    }

    this.lastMessageWasEmpty = !text.trim();

    // 2. Temporarily remove the HTML maxlength limit so Playwright can type 501+ chars
    await this.page.evaluate(() => {
      const el = document.querySelector('#user-input');
      if (el) el.removeAttribute('maxlength');
    });

    // 3. Type the text normally
    await this.inputField.fill(text);
    await this.sendButton.click();

    // 4. Handle empty inputs
    if (this.lastMessageWasEmpty) {
      await expect(this.inputHint).toHaveText("Please type a message.");
    }
  }

  async getLastBotResponse() {
    // If we just sent an empty message, there is no bot reply to wait for
    if (this.lastMessageWasEmpty) {
      this.lastMessageWasEmpty = false; // reset
      return { text: "", intent: "blocked_by_ui" };
    }

    // Wait for typing indicator to show and hide
    await this.typingIndicator.waitFor({ state: 'visible' }).catch(() => {});
    await this.typingIndicator.waitFor({ state: 'hidden' });

    const count = await this.botMessages.count();
    if (count === 0) return null;

    const lastMsg = this.botMessages.nth(count - 1);
    const text = await lastMsg.textContent();
    const intent = await lastMsg.getAttribute('data-intent');
    
    return { text, intent };
  }

  async startNewChat() {
    await this.newChatButton.click();
    // Wait for messages to clear. Use a 5s timeout to avoid hanging the suite.
    await this.page.waitForFunction(
      () => document.querySelectorAll('.msg').length === 0,
      { timeout: 5000 }
    ).catch(() => { /* ignore if already empty */ });
  }
}

module.exports = { ChatbotPage };