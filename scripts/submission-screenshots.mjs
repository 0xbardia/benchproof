#!/usr/bin/env node
import { mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.SMOKE_URL || "http://127.0.0.1:8080";
const OUT = "/workspace/submission/assets";
const QA = "/workspace/screenshots";
mkdirSync(OUT, { recursive: true });
mkdirSync(QA, { recursive: true });

const shots = [];
const errors = [];

const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-dev-shm-usage"] });

async function pageFor(width, height) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  page.on("pageerror", (err) => errors.push(String(err)));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  return page;
}

async function waitReady(page, extra) {
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(400);
  if (extra) await extra(page);
}

async function shot(page, name, path, extra) {
  await waitReady(page, extra);
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  copyFileSync(file, `${QA}/${name}.png`);
  shots.push({ name, path: page.url(), file });
  console.log("shot", name);
}

const desk = await pageFor(1440, 900);

await desk.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await shot(desk, "01-hero", "/", async (p) => {
  await p.getByText("INSUFFICIENT_EVIDENCE").first().waitFor({ timeout: 15000 });
  await p.getByText("Live Studionet verdict").waitFor({ timeout: 5000 });
});

await desk.goto(`${BASE}/claims`, { waitUntil: "domcontentloaded" });
await shot(desk, "02-claims", "/claims", async (p) => {
  await p.getByText("Matched SWE-bench Verified").first().waitFor({ timeout: 15000 });
  await p.getByText("GenLayer").first().waitFor({ timeout: 5000 }).catch(() => {});
});

await desk.goto(`${BASE}/claims/onchain-1`, { waitUntil: "domcontentloaded" });
await shot(desk, "03-case-file", "/claims/onchain-1", async (p) => {
  await p.getByText("Insufficient").first().waitFor({ timeout: 15000 });
  await p.getByText("FINALIZED").first().waitFor({ timeout: 5000 });
});

await waitReady(desk);
const verdictEl = desk.locator("section").filter({ hasText: "What was decided" }).first();
await verdictEl.scrollIntoViewIfNeeded();
await desk.waitForTimeout(200);
await verdictEl.screenshot({ path: `${OUT}/04-verdict.png` });
copyFileSync(`${OUT}/04-verdict.png`, `${QA}/04-verdict.png`);
shots.push({ name: "04-verdict", path: desk.url(), file: `${OUT}/04-verdict.png` });
console.log("shot", "04-verdict");

const proofEl = desk.locator("section").filter({ hasText: "On-chain identifiers" }).first();
await proofEl.scrollIntoViewIfNeeded();
await desk.waitForTimeout(200);
await proofEl.screenshot({ path: `${OUT}/05-contract-proof.png` });
copyFileSync(`${OUT}/05-contract-proof.png`, `${QA}/05-contract-proof.png`);
shots.push({ name: "05-contract-proof", path: desk.url(), file: `${OUT}/05-contract-proof.png` });
console.log("shot", "05-contract-proof");

await desk.goto(`${BASE}/claims/seed-misleading`, { waitUntil: "domcontentloaded" });
await shot(desk, "06-misleading", "/claims/seed-misleading", async (p) => {
  await p.getByText("Misleading").first().waitFor({ timeout: 15000 });
  await p.getByText("worked example").first().waitFor({ timeout: 5000 });
});

const mobile = await pageFor(390, 844);
await mobile.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
await waitReady(mobile, async (p) => {
  await p.getByText("INSUFFICIENT_EVIDENCE").first().waitFor({ timeout: 15000 });
});
await mobile.screenshot({ path: `${QA}/qa-mobile-hero.png` });
await mobile.goto(`${BASE}/claims/onchain-1`, { waitUntil: "domcontentloaded" });
await waitReady(mobile, async (p) => {
  await p.getByText("Insufficient").first().waitFor({ timeout: 15000 });
});
await mobile.screenshot({ path: `${QA}/qa-mobile-onchain.png` });

const overflow = await desk.evaluate(() => {
  const doc = document.documentElement;
  return { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth };
});

await browser.close();

const report = {
  shots,
  errors: errors.filter((e) => !/favicon|Download the React DevTools/i.test(e)),
  overflow,
  at: new Date().toISOString(),
};
writeFileSync(`${OUT}/capture.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ shots: shots.length, errors: report.errors, overflow }, null, 2));
if (report.errors.length) process.exit(2);
