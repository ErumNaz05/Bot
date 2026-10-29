# Chatbot Playwright Tests (JavaScript)

Fixture-driven Playwright tests for a sample chatbot UI. Each fixture case maps to a
manual test ID (`manualRef`) from `LLM_Chatbot_Manual_Test_Cases.xlsx`.

## Structure
```
app/chatbot.html                    Sample chatbot (mock "LLM" with deterministic rules)
fixtures/chatbot.fixtures.json      42 cases: inputs + expected results ("predictions")
tests/chatbot.fixture.spec.js       Data-driven: one test per fixture case
tests/chatbot.ui.spec.js            7 UI tests (Enter, Shift+Enter, typing indicator, scroll, ...)
playwright.config.js
```

## Run
```bash
npm install
npx playwright install chromium
npm test              # all 49 tests
npm run test:p1       # only P1 (critical) cases
npm run test:headed   # watch the browser
npm run report        # open the HTML report
```

## Fixture format
```json
{ "id": "T03", "manualRef": "FN-03", "category": "Functional", "priority": "P1",
  "title": "Support hours from knowledge base",
  "turns": [ { "input": "What are your support hours?",
               "expect": { "intent": "hours", "containsAll": ["Monday to Friday", "9am to 6pm"] } } ] }
```
Expectation keys: `intent`, `lang`, `containsAll`, `containsAny`, `notContains`, `regex`,
`maxWords`, `jsonKeys`, `blocked`, `noElementInLog`. Turn options: `newChatBefore`, `inputRepeat`.
Every test also fails if an `alert()/confirm()/prompt()` fires (script execution check).

## Testing your real chatbot instead
1. Change `APP_URL` in the specs to your URL (or set `baseURL` and use `page.goto('/')`).
2. Update the selectors: `#user-input`, `#send-btn`, `#new-chat`, `[data-testid="bot-message"]`.
3. Real LLMs vary their wording, so keep assertions to facts (`containsAll`, `notContains`, `regex`,
   `jsonKeys`) rather than exact text. `intent`/`lang` only work if your UI exposes them
   (e.g. via `data-` attributes); otherwise drop those keys.
4. For non-deterministic checks (consistency, hallucination) repeat the case 3-5 times.
