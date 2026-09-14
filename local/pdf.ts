import {browserOptions} from "./browser.mjs";
import { chromium } from "playwright";
import { PDFDocument } from "pdf-lib";
export async function renderPdf(
  origin: string,
  deckId: string,
  expectedVersion: number,
) {
  const browser = await chromium.launch({
    headless: true,
    ...browserOptions(),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
      deviceScaleFactor: 1,
    });
    await page.goto(`${origin}/export/${encodeURIComponent(deckId)}`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    await page
      .locator('.pdf-render[data-ready="true"]')
      .waitFor({ timeout: 15000 });
    await page.evaluate(async () => {await document.fonts.ready;await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));});
    const deck = await page.request.get(
      `${origin}/api/deck?deckId=${encodeURIComponent(deckId)}`,
    );
    const snapshot = await deck.json();
    if (snapshot.version !== expectedVersion)
      throw Error("PDF生成中にデッキが更新されました。再試行してください。");
    const pdf = await PDFDocument.create();
    pdf.setTitle(snapshot.deck.title);
    const slides = page.locator(".export-slide");
    const count = await slides.count();
    if (count !== snapshot.deck.slides.length)
      throw Error("スライドの読み込みが完了していません。");
    for (let i = 0; i < count; i++) {
      const bytes = await slides
        .nth(i)
        .screenshot({ type: "png", animations: "disabled", timeout: 15000 });
      const image = await pdf.embedPng(bytes);
      const sheet = pdf.addPage([960, 540]);
      sheet.drawImage(image, { x: 0, y: 0, width: 960, height: 540 });
    }
    return Buffer.from(await pdf.save());
  } finally {
    await browser.close();
  }
}
