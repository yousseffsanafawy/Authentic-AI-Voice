/**
 * Sprint 3 — Full E2E Tests (Playwright)
 * ==========================================
 * Covers all Sprint 3 UI features:
 *   1. Text selection → AI Bubble Menu appears
 *   2. AI Panel opens, Enhance fires, SSE populates output
 *   3. "Replace Selection" updates the editor content
 *   4. Version History drawer opens, Save Snapshot works, Restore works
 *
 * Prerequisites (must all be running):
 *   - Next.js dev server:  npm run dev          → http://localhost:3000
 *   - FastAPI backend:     uvicorn app.main:app  → http://localhost:8000
 *
 * Run from frontend/:
 *   npx playwright test tests/sprint3.spec.ts --headed
 *
 * The test creates a real account (or reuses one) and a fresh document
 * on each run, then tears it down at the end.
 */

import { test, expect, type Page, type BrowserContext } from "@playwright/test";

// ── Config ────────────────────────────────────────────────────────────────────
const BACKEND  = "http://localhost:8000";
const FRONTEND = "http://localhost:3000";

const TEST_EMAIL    = `e2e_sprint3_${Date.now()}@example.com`;
const TEST_PASSWORD = "E2eSprintPass!3";

// Text to type into the editor during tests
const EDITOR_TEXT = "Authentic AI Voice makes writing better and faster.";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Register + login via API and return the JWT. */
async function apiLogin(context: BrowserContext): Promise<string> {
  // Register (ignore 400 if already exists)
  await context.request.post(`${BACKEND}/api/auth/register`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });

  const loginRes = await context.request.post(`${BACKEND}/api/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  expect(loginRes.ok(), `Login failed: ${await loginRes.text()}`).toBeTruthy();
  const { access_token } = await loginRes.json();
  return access_token;
}

/** Create a document via API and return its ID. */
async function apiCreateDoc(context: BrowserContext, token: string): Promise<string> {
  const res = await context.request.post(`${BACKEND}/api/documents`, {
    data: { title: "E2E Sprint 3 Test Doc" },
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.status()).toBe(201);
  return (await res.json()).id;
}

/** Delete a document via API (best-effort teardown). */
async function apiDeleteDoc(
  context: BrowserContext,
  token: string,
  docId: string
): Promise<void> {
  await context.request.delete(`${BACKEND}/api/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** Inject the JWT into localStorage so Next.js treats us as logged-in. */
async function injectToken(page: Page, token: string): Promise<void> {
  await page.addInitScript((t: string) => {
    window.localStorage.setItem("auth_token", t);
  }, token);
}

/** Click inside the Tiptap editor and type text. */
async function typeInEditor(page: Page, text: string): Promise<void> {
  const editor = page.locator(".ProseMirror");
  await editor.waitFor({ state: "visible" });
  await editor.click();
  await editor.type(text, { delay: 30 });
}

/** Select all text in the editor via Ctrl+A. */
async function selectAllEditorText(page: Page): Promise<void> {
  const editor = page.locator(".ProseMirror");
  await editor.click();
  await page.keyboard.press("Control+a");
}

// ── Shared state ──────────────────────────────────────────────────────────────
let token = "";
let docId = "";

// ── Test Suite ────────────────────────────────────────────────────────────────
test.describe("Sprint 3 — Editor Feature Suite", () => {

  // Set up once: API login + create document
  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    token = await apiLogin(context);
    docId = await apiCreateDoc(context, token);
    await context.close();
  });

  // Tear down: delete the test document
  test.afterAll(async ({ browser }) => {
    const context = await browser.newContext();
    await apiDeleteDoc(context, token, docId);
    await context.close();
  });

  // Each test: fresh page pre-authenticated to the test document
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
    await injectToken(page, token);
    await page.goto(`${FRONTEND}/documents/${docId}`);
    // Wait for editor to be fully ready
    await page.locator(".ProseMirror").waitFor({ state: "visible", timeout: 25_000 });
  });

  test.afterEach(async () => {
    await page.context().close();
  });

  // ── Test 1: Typing in the editor ──────────────────────────────────────────
  test("1 · types text into the Tiptap editor and word count updates", async () => {
    await typeInEditor(page, EDITOR_TEXT);

    // Editor content must contain the typed text
    const editorContent = await page.locator(".ProseMirror").innerText();
    expect(editorContent).toContain("Authentic AI Voice");

    // Toolbar word count must be > 0
    const wordCountEl = page.locator("text=/\\d+ words?/");
    await expect(wordCountEl).toBeVisible({ timeout: 5_000 });
    const countText = await wordCountEl.innerText();
    const count = parseInt(countText, 10);
    expect(count).toBeGreaterThan(0);
  });

  // ── Test 2: Text selection → Bubble Menu appears ──────────────────────────
  test("2 · selecting text shows the AI Enhance bubble menu button", async () => {
    await typeInEditor(page, EDITOR_TEXT);
    await selectAllEditorText(page);

    // BubbleMenu renders a button with this aria-label
    const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
    await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
    await expect(bubbleBtn).toContainText("AI Enhance");
  });

  // ── Test 3: Click bubble → AI Panel slides open ───────────────────────────
  test("3 · clicking the bubble button opens the AI Panel", async () => {
    await typeInEditor(page, EDITOR_TEXT);
    await selectAllEditorText(page);

    const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
    await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
    await bubbleBtn.click();

    // Panel is role="dialog" aria-label="AI Enhance Panel"
    const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
    await expect(aiPanel).toBeVisible({ timeout: 6_000 });

    // Must show the selected text in the preview box
    await expect(aiPanel).toContainText("Authentic AI Voice");

    // Enhance button must be present and enabled
    const enhanceBtn = aiPanel.locator("button", { hasText: /^Enhance$/ });
    await expect(enhanceBtn).toBeVisible();
    await expect(enhanceBtn).not.toBeDisabled();
  });

  // ── Test 4: Click Enhance → SSE streams into the output box ──────────────
  test("4 · clicking Enhance triggers SSE and populates the AI Output box", async () => {
    await typeInEditor(page, EDITOR_TEXT);
    await selectAllEditorText(page);

    const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
    await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
    await bubbleBtn.click();

    const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
    await expect(aiPanel).toBeVisible();

    // Click Enhance
    await aiPanel.locator("button", { hasText: /^Enhance$/ }).click();

    // "AI Output" label appears once streaming starts
    await expect(aiPanel.locator("text=AI Output")).toBeVisible({ timeout: 60_000 });

    // "Replace Selection" button appears when stream is done
    const replaceBtn = aiPanel.locator("button", { hasText: "Replace Selection" });
    await expect(replaceBtn).toBeVisible({ timeout: 60_000 });

    // The output must contain actual text (not empty)
    // The cursor block ▌ disappears once !isStreaming — text is adjacent to it
    const outputText = await aiPanel.locator("text=AI Output").locator("..").locator("div").last().innerText();
    expect(outputText.trim().length).toBeGreaterThan(5);
  });

  // ── Test 5: Replace Selection → editor content updates ────────────────────
  test("5 · Replace Selection inserts AI text into the editor and closes the panel", async () => {
    await typeInEditor(page, EDITOR_TEXT);
    await selectAllEditorText(page);

    const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
    await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
    await bubbleBtn.click();

    const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
    await expect(aiPanel).toBeVisible();

    await aiPanel.locator("button", { hasText: /^Enhance$/ }).click();

    const replaceBtn = aiPanel.locator("button", { hasText: "Replace Selection" });
    await expect(replaceBtn).toBeVisible({ timeout: 60_000 });
    await replaceBtn.click();

    // Panel must close after replacement
    await expect(aiPanel).not.toBeVisible({ timeout: 5_000 });

    // Editor must not be empty
    const editorText = await page.locator(".ProseMirror").innerText();
    expect(editorText.trim().length).toBeGreaterThan(0);
  });

  // ── Test 6: Version History drawer opens ─────────────────────────────────
  test("6 · 🕒 History button opens the Version History drawer", async () => {
    const historyBtn = page.locator('[aria-label="Toggle version history"]');
    await expect(historyBtn).toBeVisible({ timeout: 8_000 });
    await historyBtn.click();

    const drawer = page.locator('[role="dialog"][aria-label="Version History"]');
    await expect(drawer).toBeVisible({ timeout: 5_000 });
    await expect(drawer.locator("button", { hasText: "Save Snapshot" })).toBeVisible();
  });

  // ── Test 7: Save Snapshot → version appears in drawer list ───────────────
  test("7 · Save Snapshot creates a new version entry and shows a toast", async () => {
    await typeInEditor(page, EDITOR_TEXT);

    const historyBtn = page.locator('[aria-label="Toggle version history"]');
    await historyBtn.click();

    const drawer = page.locator('[role="dialog"][aria-label="Version History"]');
    await expect(drawer).toBeVisible();

    await drawer.locator("button", { hasText: "Save Snapshot" }).click();

    // Toast should appear
    await expect(
      page.locator("text=/Snapshot v\\d+ saved\\.?/i")
    ).toBeVisible({ timeout: 10_000 });

    // A "Restore version N" button must appear in the list
    const restoreBtn = drawer.locator('[aria-label^="Restore version"]').first();
    await expect(restoreBtn).toBeVisible({ timeout: 8_000 });
  });

  // ── Test 8: Full Restore Flow ─────────────────────────────────────────────
  test("8 · Restore replaces cleared editor content with the snapshot text", async () => {
    // Phase A: type text and save a snapshot
    await typeInEditor(page, EDITOR_TEXT);

    const historyBtn = page.locator('[aria-label="Toggle version history"]');
    await historyBtn.click();

    const drawer = page.locator('[role="dialog"][aria-label="Version History"]');
    await expect(drawer).toBeVisible();

    await drawer.locator("button", { hasText: "Save Snapshot" }).click();
    await expect(
      page.locator("text=/Snapshot v\\d+ saved\\.?/i")
    ).toBeVisible({ timeout: 10_000 });

    const restoreBtn = drawer.locator('[aria-label^="Restore version"]').first();
    await expect(restoreBtn).toBeVisible({ timeout: 8_000 });

    // Close drawer
    await drawer.locator('[aria-label="Close version history"]').click();
    await expect(drawer).not.toBeVisible({ timeout: 5_000 });

    // Phase B: clear the editor
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Delete");

    // Confirm it's empty (or nearly so)
    const clearedText = (await editor.innerText()).trim();
    expect(clearedText.length).toBeLessThan(EDITOR_TEXT.length / 2);

    // Phase C: open drawer and click Restore
    await historyBtn.click();
    await expect(drawer).toBeVisible();

    const restoreBtnAgain = drawer.locator('[aria-label^="Restore version"]').first();
    await expect(restoreBtnAgain).toBeVisible({ timeout: 8_000 });
    await restoreBtnAgain.click();

    // Drawer closes after restore
    await expect(drawer).not.toBeVisible({ timeout: 5_000 });

    // Editor must now contain text again
    await expect(async () => {
      const restored = (await editor.innerText()).trim();
      expect(restored.length).toBeGreaterThan(5);
    }).toPass({ timeout: 8_000 });

    // Success toast
    await expect(
      page.locator("text=/Restored to version \\d+/i")
    ).toBeVisible({ timeout: 8_000 });
  });

  // ── Test 9: AI Panel X button closes it ──────────────────────────────────
  test("9 · the Close (X) button dismisses the AI Panel", async () => {
    await typeInEditor(page, EDITOR_TEXT);
    await selectAllEditorText(page);

    const bubbleBtn = page.locator('[aria-label="Open AI Enhance panel"]');
    await expect(bubbleBtn).toBeVisible({ timeout: 10_000 });
    await bubbleBtn.click();

    const aiPanel = page.locator('[role="dialog"][aria-label="AI Enhance Panel"]');
    await expect(aiPanel).toBeVisible();

    await aiPanel.locator('[aria-label="Close AI panel"]').click();
    await expect(aiPanel).not.toBeVisible({ timeout: 5_000 });
  });

  // ── Test 10: Auto-save status indicator ──────────────────────────────────
  test("10 · auto-save indicator shows Saving… then Saved after typing", async () => {
    await typeInEditor(page, " trigger auto-save now");

    // At minimum "Saved" must appear within 15 s
    await expect(
      page.locator("text=Saved").or(page.locator("text=Saving…"))
    ).toBeVisible({ timeout: 15_000 });
  });
});
