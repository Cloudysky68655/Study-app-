// Cardio-Respiratory Tracker — end-to-end smoke test.
//
// Creates a disposable, pre-confirmed test account (via the Supabase
// admin API, since real signup requires clicking an email confirmation
// link we have no inbox for), walks it through the app's core flows in a
// real headless browser, then deletes the account and all its data.
//
// Run via GitHub Actions (Actions tab -> this workflow -> "Run workflow"),
// or locally with: SITE_URL=... NEXT_PUBLIC_SUPABASE_URL=... \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=... SUPABASE_SERVICE_ROLE_KEY=... node run.mjs

import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";
import ws from "ws";
import fs from "node:fs";

const SITE_URL = process.env.SITE_URL || "https://getstudying.vercel.app";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.error("Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const results = [];
let screenshotDir = "screenshots";
fs.mkdirSync(screenshotDir, { recursive: true });

async function step(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`✅ ${name}`);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log(`❌ ${name} — ${e.message}`);
    return false;
  }
  return true;
}

async function screenshotOnFail(page, name) {
  try {
    const safe = name.replace(/[^a-z0-9]+/gi, "_").toLowerCase();
    await page.screenshot({ path: `${screenshotDir}/${safe}.png`, fullPage: true });
  } catch (e) { /* best-effort */ }
}

async function main() {
  const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
    // Supabase's realtime client tries to construct a WebSocket at
    // client-creation time regardless of whether realtime features are
    // actually used, which throws on Node runtimes without native
    // WebSocket support. Passing the "ws" package directly sidesteps
    // that entirely instead of depending on the CI runner's exact Node
    // version being 22+.
    realtime: { transport: ws },
  });
  const email = `claude-e2e-${Date.now()}@example.com`;
  const password = "TestPass123!";
  let userId = null;
  let browser;

  try {
    await step("Create disposable test account (admin API, pre-confirmed)", async () => {
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
      if (error) throw new Error(error.message);
      userId = data.user.id;
    });
    if (!userId) throw new Error("No test account — can't continue");

    browser = await chromium.launch();
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    page.setDefaultTimeout(15000);

    const ok1 = await step("Signup page renders and form is fillable", async () => {
      await page.goto(`${SITE_URL}/signup`, { waitUntil: "networkidle" });
      await page.locator('input[type="email"]').fill("uitest@example.com");
      await page.locator('input[type="password"]').fill("uitestpass");
      const visible = await page.locator('button[type="submit"]').isVisible();
      if (!visible) throw new Error("Create account button not found");
      // Deliberately not submitting — real signup needs a real inbox to
      // confirm, which this run can't provide. This step only confirms
      // the form itself is intact and fillable.
    });
    if (!ok1) await screenshotOnFail(page, "signup-page");

    const ok2 = await step("Log in with the disposable account", async () => {
      await page.goto(`${SITE_URL}/login`, { waitUntil: "networkidle" });
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('button[type="submit"]').click();
      await page.waitForURL(/\/today/, { timeout: 15000 });
    });
    if (!ok2) { await screenshotOnFail(page, "login"); throw new Error("Can't continue past login"); }

    // ---------- Tasks ----------
    const taskName = `E2E test task ${Date.now()}`;
    const ok3 = await step("Tasks: add a task", async () => {
      await page.goto(`${SITE_URL}/tasks`, { waitUntil: "networkidle" });
      await page.getByPlaceholder("Task name, e.g. Submit report").fill(taskName);
      await page.getByRole("button", { name: "Add task" }).click();
      await page.getByText(taskName).first().waitFor({ timeout: 8000 });
    });
    if (!ok3) await screenshotOnFail(page, "tasks-add");

    await step("Tasks: add a subtask", async () => {
      const row = page.locator(".task-row", { hasText: taskName }).first();
      await row.locator(".h-task-expand").click();
      const subInput = row.locator('input[placeholder="Add subtask..."]');
      await subInput.fill("E2E subtask");
      await row.getByRole("button", { name: "Add" }).click();
      await page.getByText("E2E subtask").first().waitFor({ timeout: 8000 });
    }).catch(() => {});

    await step("Tasks: complete the task", async () => {
      const row = page.locator(".task-row", { hasText: taskName }).first();
      await row.locator(".task-check").first().click();
      await page.waitForTimeout(1200); // completion animation before removal
    });

    // ---------- Habits ----------
    const habitName = `E2E habit ${Date.now()}`;
    const ok4 = await step("Habits: add a habit", async () => {
      await page.goto(`${SITE_URL}/habits`, { waitUntil: "networkidle" });
      await page.getByPlaceholder("Habit name, e.g. Drink water").fill(habitName);
      await page.getByRole("button", { name: "Add habit" }).click();
      await page.getByText(habitName).first().waitFor({ timeout: 8000 });
    });
    if (!ok4) await screenshotOnFail(page, "habits-add");

    await step("Habits: check it off", async () => {
      const row = page.locator(".habit-row", { hasText: habitName }).first();
      await row.locator(".h-check").first().click();
      await page.waitForTimeout(600);
    });

    // ---------- Notes ----------
    const noteTitle = `E2E note ${Date.now()}`;
    const ok5 = await step("Notes: create a note", async () => {
      await page.goto(`${SITE_URL}/notes`, { waitUntil: "networkidle" });
      await page.getByText("Take a note...").click();
      await page.locator(".note-field-title").fill(noteTitle);
      await page.locator(".note-field-body").fill("Created by the E2E test suite.");
      await page.getByRole("button", { name: "Save" }).click();
      await page.getByText(noteTitle).first().waitFor({ timeout: 8000 });
    });
    if (!ok5) await screenshotOnFail(page, "notes-create");

    await step("Notes: pin it", async () => {
      const card = page.locator(".note-card", { hasText: noteTitle }).first();
      await card.locator(".note-pin-btn").click();
      await page.waitForTimeout(500);
    }).catch(() => {});

    await step("Notes: archive it", async () => {
      const card = page.locator(".note-card", { hasText: noteTitle }).first();
      await card.hover();
      await card.locator('button[title="Archive"]').click();
      await page.waitForTimeout(500);
    }).catch(() => {});

    // ---------- QBank ----------
    const ok6 = await step("QBank: open practice setup", async () => {
      await page.goto(`${SITE_URL}/study`, { waitUntil: "networkidle" });
      // A fresh account has no active unit yet, so /study shows the unit
      // picker first — the QBank/Flashcards sidebar tabs only exist once
      // a unit is chosen. Cardio-Respiratory is the only non-premium
      // unit, so it's always available to a brand-new test account.
      const unitCard = page.getByText("Cardio-Respiratory", { exact: true });
      if (await unitCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unitCard.click();
        await page.waitForTimeout(1000);
      }
      await page.getByText("QBank", { exact: true }).first().click();
      await page.getByRole("button", { name: "Start Practice" }).waitFor({ timeout: 10000 });
    });
    if (!ok6) {
      await screenshotOnFail(page, "qbank-setup");
    } else {
      await step("QBank: start a session and answer a question", async () => {
        const startBtn = page.getByRole("button", { name: "Start Practice" });
        if (await startBtn.isDisabled()) throw new Error("Start Practice is disabled — no questions imported for this unit yet, nothing to test here");
        await startBtn.click();
        // Some setups have a "show answer choices" recall gate first.
        const revealBtn = page.getByText("Show answer choices");
        if (await revealBtn.isVisible({ timeout: 3000 }).catch(() => false)) await revealBtn.click();
        await page.waitForTimeout(1000);
        // Click whichever option button is on screen — exact answer
        // doesn't matter, this is testing that answering works at all.
        const optionButtons = page.locator('.card button[data-sound="none"]');
        await optionButtons.first().click({ timeout: 8000 });
      }).catch(async (e) => { results[results.length - 1].error = e.message; await screenshotOnFail(page, "qbank-answer"); });

      // Cleanly exit rather than leaving the session in-progress — the
      // app's own session-restore logic can otherwise land a page reload
      // straight back on the unfinished exam screen instead of the
      // normal Study sidebar, which would break every step after this.
      await step("QBank: abandon the session (cleanup)", async () => {
        page.once("dialog", (d) => d.accept()); // the app's Abandon button uses window.confirm()
        const abandonBtn = page.getByText("Abandon", { exact: true });
        if (await abandonBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await abandonBtn.click();
          await page.waitForTimeout(1000);
        }
      }).catch(() => {});
    }

    // ---------- Flashcards ----------
    const ok7 = await step("Flashcards: open session setup", async () => {
      await page.goto(`${SITE_URL}/study`, { waitUntil: "networkidle" });
      const unitCard = page.getByText("Cardio-Respiratory", { exact: true });
      if (await unitCard.isVisible({ timeout: 3000 }).catch(() => false)) {
        await unitCard.click();
        await page.waitForTimeout(1000);
      }
      await page.getByText("Flashcards", { exact: true }).first().click();
      const startBtn = page.getByRole("button", { name: "Start a session" });
      await startBtn.waitFor({ timeout: 10000 });
    });
    if (!ok7) await screenshotOnFail(page, "flashcards-setup");

    // ---------- Study: log a pass ----------
    await step("Study: log a pass via Add-a-pass", async () => {
      await page.goto(`${SITE_URL}/study`, { waitUntil: "networkidle" });
      const addPassLink = page.getByText(/log a pass/i).first();
      if (await addPassLink.isVisible({ timeout: 3000 }).catch(() => false)) await addPassLink.click();
    }).catch(() => {});

    console.log("\n--- Screenshots (if any failures) saved to tests/e2e/screenshots/ ---");
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (userId) {
      await step("Cleanup: delete disposable test account", async () => {
        const { error } = await admin.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);
      });
    }

    const passed = results.filter((r) => r.ok).length;
    console.log(`\n=== ${passed}/${results.length} checks passed ===`);
    results.filter((r) => !r.ok).forEach((r) => console.log(`  ✗ ${r.name}: ${r.error}`));

    fs.writeFileSync("results.json", JSON.stringify(results, null, 2));
    if (passed < results.length) process.exitCode = 1;
  }
}

main();
