const { test, expect } = require('@playwright/test');
const { ChatbotPage } = require('../pages/ChatbotPage'); // Make sure 'Pages' is capitalized if your folder is 'Pages'
const fixtures = require('../fixtures/chatbot.fixtures.json');

// Get priorities from env (defaults to P1 only if not specified)
const rawPriorities = process.env.RUN_PRIORITIES || (process.env.RUN_ALL ? 'P1,P2,P3' : 'P1');
const runPriorities = rawPriorities.split(',').map(p => p.trim().toUpperCase());

test.describe('LLM Chatbot Fixture Suite', () => {
  let chatbot;

  test.beforeEach(async ({ page }) => {
    chatbot = new ChatbotPage(page);
    await chatbot.goto();
  });

  // Loop through the cases in your JSON
  for (const testCase of fixtures.cases) {
    
    test(`[${testCase.manualRef}] ${testCase.id} | ${testCase.category} | ${testCase.priority}`, async () => {
      
      // Skip if priority is not selected 
      //test.skip(
       // !runPriorities.includes(testCase.priority),
        //`Skipped ${testCase.priority} case. Set RUN_PRIORITIES=${testCase.priority} to run.`
     // );

      let lastResponse;

      // Loop through the turns for multi-turn tests
      for (let i = 0; i < testCase.turns.length; i++) {
        const turn = testCase.turns[i];

        // Handle the 'New Chat' requirement
        if (turn.newChatBefore) {
          await chatbot.startNewChat();
        }
        
        await chatbot.sendMessage(turn.input);
        lastResponse = await chatbot.getLastBotResponse();

        // Validate that we actually got a response
        expect(lastResponse, 'Bot did not respond').not.toBeNull();

        // 1. Check Intent
        if (turn.expect.intent) {
          expect.soft(lastResponse.intent, `Turn ${i+1}: Expected intent "${turn.expect.intent}"`).toBe(turn.expect.intent);
        }

        // Only check text if we weren't blocked by the UI (e.g., empty input)
        if (lastResponse.intent !== 'blocked_by_ui') {
          
          // 2. Check Text Contains (Any of the keywords)
          if (turn.expect.containsAny && turn.expect.containsAny.length > 0) {
            const matchesAny = turn.expect.containsAny.some(keyword => 
              lastResponse.text.toLowerCase().includes(keyword.toLowerCase())
            );
            expect.soft(matchesAny, `Turn ${i+1}: Expected response to contain one of: ${turn.expect.containsAny.join(', ')}`).toBeTruthy();
          }

          // 3. Check Text Does NOT Contain (Forbidden keywords)
          if (turn.expect.notContains && turn.expect.notContains.length > 0) {
            const containsForbidden = turn.expect.notContains.some(keyword => 
              lastResponse.text.toLowerCase().includes(keyword.toLowerCase())
            );
            expect.soft(containsForbidden, `Turn ${i+1}: Response should NOT contain: ${turn.expect.notContains.join(', ')}`).toBe(false);
          }
        }
      }
    });
  }
});