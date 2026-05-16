# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: sprint3.spec.ts >> Sprint 3 — Editor Feature Suite >> 5 · Replace Selection inserts AI text into the editor and closes the panel
- Location: tests/sprint3.spec.ts:209:7

# Error details

```
TimeoutError: locator.waitFor: Timeout 25000ms exceeded.
Call log:
  - waiting for locator('.ProseMirror') to be visible

```

# Test source

```ts
  24  | const BACKEND  = "http://localhost:8000";
  25  | const FRONTEND = "http://localhost:3000";
  26  | 
  27  | const TEST_EMAIL    = `e2e_sprint3_${Date.now()}@example.com`;
  28  | const TEST_PASSWORD = "E2eSprintPass!3";
  29  | 
  30  | // Text to type into the editor during tests
  31  | const EDITOR_TEXT = "Authentic AI Voice makes writing better and faster.";
  32  | 
  33  | // ── Helpers ───────────────────────────────────────────────────────────────────
  34  | 
  35  | /** Register + login via API and return the JWT. */
  36  | async function apiLogin(context: BrowserContext): Promise<string> {
  37  |   // Register (ignore 400 if already exists)
  38  |   await context.request.post(`${BACKEND}/api/auth/register`, {
  39  |     data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  40  |   });
  41  | 
  42  |   const loginRes = await context.request.post(`${BACKEND}/api/auth/login`, {
  43  |     data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  44  |   });
  45  |   expect(loginRes.ok(), `Login failed: ${await loginRes.text()}`).toBeTruthy();
  46  |   const { access_token } = await loginRes.json();
  47  |   return access_token;
  48  | }
  49  | 
  50  | /** Create a document via API and return its ID. */
  51  | async function apiCreateDoc(context: BrowserContext, token: string): Promise<string> {
  52  |   const res = await context.request.post(`${BACKEND}/api/documents`, {
  53  |     data: { title: "E2E Sprint 3 Test Doc" },
  54  |     headers: { Authorization: `Bearer ${token}` },
  55  |   });
  56  |   expect(res.status()).toBe(201);
  57  |   return (await res.json()).id;
  58  | }
  59  | 
  60  | /** Delete a document via API (best-effort teardown). */
  61  | async function apiDeleteDoc(
  62  |   context: BrowserContext,
  63  |   token: string,
  64  |   docId: string
  65  | ): Promise<void> {
  66  |   await context.request.delete(`${BACKEND}/api/documents/${docId}`, {
  67  |     headers: { Authorization: `Bearer ${token}` },
  68  |   });
  69  | }
  70  | 
  71  | /** Inject the JWT into localStorage so Next.js treats us as logged-in. */
  72  | async function injectToken(page: Page, token: string): Promise<void> {
  73  |   await page.addInitScript((t: string) => {
  74  |     window.localStorage.setItem("auth_token", t);
  75  |   }, token);
  76  | }
  77  | 
  78  | /** Click inside the Tiptap editor and type text. */
  79  | async function typeInEditor(page: Page, text: string): Promise<void> {
  80  |   const editor = page.locator(".ProseMirror");
  81  |   await editor.waitFor({ state: "visible" });
  82  |   await editor.click();
  83  |   await editor.type(text, { delay: 30 });
  84  | }
  85  | 
  86  | /** Select all text in the editor via Ctrl+A. */
  87  | async function selectAllEditorText(page: Page): Promise<void> {
  88  |   const editor = page.locator(".ProseMirror");
  89  |   await editor.click();
  90  |   await page.keyboard.press("Control+a");
  91  | }
  92  | 
  93  | // ── Shared state ──────────────────────────────────────────────────────────────
  94  | let token = "";
  95  | let docId = "";
  96  | 
  97  | // ── Test Suite ────────────────────────────────────────────────────────────────
  98  | test.describe("Sprint 3 — Editor Feature Suite", () => {
  99  | 
  100 |   // Set up once: API login + create document
  101 |   test.beforeAll(async ({ browser }) => {
  102 |     const context = await browser.newContext();
  103 |     token = await apiLogin(context);
  104 |     docId = await apiCreateDoc(context, token);
  105 |     await context.close();
  106 |   });
  107 | 
  108 |   // Tear down: delete the test document
  109 |   test.afterAll(async ({ browser }) => {
  110 |     const context = await browser.newContext();
  111 |     await apiDeleteDoc(context, token, docId);
  112 |     await context.close();
  113 |   });
  114 | 
  115 |   // Each test: fresh page pre-authenticated to the test document
  116 |   let page: Page;
  117 | 
  118 |   test.beforeEach(async ({ browser }) => {
  119 |     const context = await browser.newContext();
  120 |     page = await context.newPage();
  121 |     await injectToken(page, token);
  122 |     await page.goto(`${FRONTEND}/documents/${docId}`);
  123 |     // Wait for editor to be fully ready
> 124 |     await page.locator(".ProseMirror").waitFor({ state: "visible", timeout: 25_000 });
      |                                        ^ TimeoutError: locator.waitFor: Timeout 25000ms exceeded.
  125 |   });
  126 | 
  127 |   test.afterEach(async () => {
  128 |     await page.context().close();
  129 |   });
  130 | 
  131 |   // ── Test 1: Typing in the editor ──────────────────────────────────────────
  132 |   test("1 · types text into the Tiptap editor and word count updates", async () => {
  133 |     await typeInEditor(page, EDITOR_TEXT);
  134 | 
  135 |     // Editor content must contain the typed text
  136 |     const editorContent = await page.locator(".ProseMirror").innerText();
  137 |     expect(editorContent).toContain("Authentic AI Voice");
  138 | 
  139 |     // Toolbar word count must be > 0
  140 |     const wordCountEl = page.locator("text=/\\d+ words?/");
  141 |     await expect(wordCountEl).toBeVisible({ timeout: 5_000 });
  142 |     const countText = await wordCountEl.innerText();
  143 |     const count = parseInt(countText, 10);
  144 |     expect(count).toBeGreaterThan(0);
  145 |   });
  146 | 
  147 |   // ── Test 2: Text selection → Bubble Menu appears ──────────────────────────
  148 |   test("2 · selecting text shows the AI Enhance bubble menu button", async () => {
  149 |     await typeInEditor(page, EDITOR_TEXT);
  150 |     await selectAllEditorText(page);
  151 | 
  152 |     // BubbleMenu renders a button with this aria-label
  153 |     const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
  154 |     await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
  155 |     await expect(bubbleBtn).toContainText("AI Enhance");
  156 |   });
  157 | 
  158 |   // ── Test 3: Click bubble → AI Panel slides open ───────────────────────────
  159 |   test("3 · clicking the bubble button opens the AI Panel", async () => {
  160 |     await typeInEditor(page, EDITOR_TEXT);
  161 |     await selectAllEditorText(page);
  162 | 
  163 |     const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
  164 |     await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
  165 |     await bubbleBtn.click();
  166 | 
  167 |     // Panel is role="dialog" aria-label="AI Enhance Panel"
  168 |     const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
  169 |     await expect(aiPanel).toBeVisible({ timeout: 6_000 });
  170 | 
  171 |     // Must show the selected text in the preview box
  172 |     await expect(aiPanel).toContainText("Authentic AI Voice");
  173 | 
  174 |     // Enhance button must be present and enabled
  175 |     const enhanceBtn = aiPanel.locator("button", { hasText: /^Enhance$/ });
  176 |     await expect(enhanceBtn).toBeVisible();
  177 |     await expect(enhanceBtn).not.toBeDisabled();
  178 |   });
  179 | 
  180 |   // ── Test 4: Click Enhance → SSE streams into the output box ──────────────
  181 |   test("4 · clicking Enhance triggers SSE and populates the AI Output box", async () => {
  182 |     await typeInEditor(page, EDITOR_TEXT);
  183 |     await selectAllEditorText(page);
  184 | 
  185 |     const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
  186 |     await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
  187 |     await bubbleBtn.click();
  188 | 
  189 |     const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
  190 |     await expect(aiPanel).toBeVisible();
  191 | 
  192 |     // Click Enhance
  193 |     await aiPanel.locator("button", { hasText: /^Enhance$/ }).click();
  194 | 
  195 |     // "AI Output" label appears once streaming starts
  196 |     await expect(aiPanel.locator("text=AI Output")).toBeVisible({ timeout: 60_000 });
  197 | 
  198 |     // "Replace Selection" button appears when stream is done
  199 |     const replaceBtn = aiPanel.locator("button", { hasText: "Replace Selection" });
  200 |     await expect(replaceBtn).toBeVisible({ timeout: 60_000 });
  201 | 
  202 |     // The output must contain actual text (not empty)
  203 |     // The cursor block ▌ disappears once !isStreaming — text is adjacent to it
  204 |     const outputText = await aiPanel.locator("text=AI Output").locator("..").locator("div").last().innerText();
  205 |     expect(outputText.trim().length).toBeGreaterThan(5);
  206 |   });
  207 | 
  208 |   // ── Test 5: Replace Selection → editor content updates ────────────────────
  209 |   test("5 · Replace Selection inserts AI text into the editor and closes the panel", async () => {
  210 |     await typeInEditor(page, EDITOR_TEXT);
  211 |     await selectAllEditorText(page);
  212 | 
  213 |     const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
  214 |     await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
  215 |     await bubbleBtn.click();
  216 | 
  217 |     const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
  218 |     await expect(aiPanel).toBeVisible();
  219 | 
  220 |     await aiPanel.locator("button", { hasText: /^Enhance$/ }).click();
  221 | 
  222 |     const replaceBtn = aiPanel.locator("button", { hasText: "Replace Selection" });
  223 |     await expect(replaceBtn).toBeVisible({ timeout: 60_000 });
  224 |     await replaceBtn.click();
```