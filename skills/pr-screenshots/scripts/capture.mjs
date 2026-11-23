#!/usr/bin/env node
// Generic Playwright screenshot driver for the pr-screenshots skill.
// Runs a JSON list of steps against one shared page, in order, so navigation
// (and any login session, in --cdp mode) carries over like a real user
// clicking through. See SKILL.md for the steps schema and examples.
//
// Usage:
//   node capture.mjs --steps steps.json --out-dir out/ \
//     [--base-url http://localhost:3001] [--cdp http://localhost:9222] \
//     [--viewport 1440x900]
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const get = (flag, fallback) => {
    const i = argv.indexOf(flag);
    return i === -1 ? fallback : argv[i + 1];
  };
  return {
    stepsPath: get("--steps"),
    outDir: get("--out-dir", "."),
    cdp: get("--cdp"),
    baseUrl: get("--base-url", ""),
    viewport: get("--viewport", "1440x900"),
  };
}

function resolveUrl(target, baseUrl) {
  return /^https?:\/\//.test(target) ? target : baseUrl + target;
}

async function runStep(page, step, { baseUrl, outDir }) {
  if (step.goto) {
    // "load" only — "networkidle" never fires against `next dev`, whose HMR
    // websocket keeps the network "busy" forever. Use an explicit `waitFor`
    // step for real readiness instead.
    await page.goto(resolveUrl(step.goto, baseUrl), { waitUntil: "load" });
  } else if (step.click) {
    await page.locator(step.click).first().click();
  } else if (step.waitFor) {
    await page.locator(step.waitFor).first().waitFor({ state: "visible" });
  } else if (step.waitForTimeout) {
    await page.waitForTimeout(step.waitForTimeout);
  } else if (step.screenshot) {
    const target = step.locator ? page.locator(step.locator).first() : page;
    await target.screenshot({
      path: path.join(outDir, step.screenshot),
      fullPage: step.locator ? undefined : Boolean(step.fullPage),
    });
    console.log("captured", step.screenshot);
  } else {
    throw new Error(`Unknown step: ${JSON.stringify(step)}`);
  }
}

async function main() {
  const { stepsPath, outDir, cdp, baseUrl, viewport } = parseArgs(process.argv.slice(2));
  if (!stepsPath) {
    console.error("Usage: capture.mjs --steps <file.json> --out-dir <dir> [--base-url <url>] [--cdp <url>]");
    process.exit(1);
  }

  const steps = JSON.parse(fs.readFileSync(stepsPath, "utf8"));
  fs.mkdirSync(outDir, { recursive: true });

  const [width, height] = viewport.split("x").map(Number);

  const browser = cdp ? await chromium.connectOverCDP(cdp) : await chromium.launch();
  const context = cdp
    ? browser.contexts()[0] ?? (await browser.newContext({ viewport: { width, height } }))
    : await browser.newContext({ viewport: { width, height } });
  const page = context.pages()[0] ?? (await context.newPage());

  for (const step of steps) {
    await runStep(page, step, { baseUrl, outDir });
  }

  // In --cdp mode this is a *real, user-logged-in* browser — disconnect
  // without closing it, so the user keeps their session and can review the
  // app themselves or close the window on their own terms.
  if (!cdp) {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
