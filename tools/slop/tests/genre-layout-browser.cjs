const { chromium } = require(process.env.SLOP_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
const base = process.env.SLOP_TEST_URL || "http://127.0.0.1:8766/tools/slop/";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SLOP_BROWSER_CHANNEL
      ? { channel: process.env.SLOP_BROWSER_CHANNEL }
      : {}),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1036 },
    });
    await page.route("https://archive.org/**", (r) => r.abort());
    await page.goto(base);
    await page.locator("#navGenres").click();
    await page.waitForSelector(".atlasFamily");
    const seed = await page.locator("#genreSeed").textContent();
    // Scroll a lower family into view and return to exactly that browsing position.
    const target = page.locator(".atlasFamily").nth(6).locator("h2 button");
    await target.scrollIntoViewIfNeeded();
    const position = await page
      .locator("#genreBrowse")
      .evaluate((n) => n.scrollTop);
    await target.focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.locator("#genreBrowse").isVisible(), false);
    assert.equal(
      await page
        .locator("#genreDetailTitle")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page.locator("#genreBrowse").evaluate((n) => n.scrollTop),
      position,
    );
    assert.equal(
      await target.evaluate((n) => n === document.activeElement),
      true,
    );
    assert.equal(await page.locator("#genreSeed").textContent(), seed);
    // Search and keyboard selection share state across every overlapping route.
    await page.locator("#genreQuery").fill("dub techno");
    await page.waitForFunction(() =>
      document
        .querySelector("#atlasStatus")
        .textContent.includes("matching names"),
    );
    await page
      .locator('#genreOptions [data-explore="dub-techno"]')
      .first()
      .click();
    const add = page.locator("#genreFocus [data-full-label]");
    await add.focus();
    await page.keyboard.press("Space");
    assert.equal(await add.getAttribute("aria-pressed"), "true");
    if (process.env.SLOP_SCREENSHOTS)
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genre-detail-desktop.png",
      });
    await page.locator("#closeGenreFocus").click();
    await page.locator("#genreQuery").fill("");
    await page.waitForFunction(
      () =>
        document.querySelector("#atlasStatus").textContent ===
        "4 starting points per family",
    );
    await page.locator("#genreBrowse").evaluate((n) => (n.scrollTop = 0));
    if (process.env.SLOP_SCREENSHOTS)
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genre-revision-desktop.png",
      });
    for (const [width, height] of [
      [1440, 1036],
      [1024, 600],
      [390, 844],
      [320, 640],
      [720, 400],
    ]) {
      await page.setViewportSize({ width, height });
      const bounds = await page.evaluate(() => {
        const r = (s) => document.querySelector(s).getBoundingClientRect();
        return {
          footer: r(".atlasSelection").bottom,
          player: r(".player").top,
          scrollHeight: r("#genreBrowse").height,
          overflow: document.documentElement.scrollWidth > innerWidth,
          bodyScroll: document.documentElement.scrollHeight > innerHeight + 1,
        };
      });
      assert.ok(
        bounds.footer <= bounds.player + 1,
        `selection behind player at ${width}`,
      );
      assert.ok(
        bounds.scrollHeight > 60,
        `no usable directory viewport at ${width}`,
      );
      assert.equal(bounds.overflow, false);
      assert.equal(bounds.bodyScroll, false);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.locator("#genreBrowse").evaluate((n) => (n.scrollTop = 0));
    await page.locator("#genreSelectionToggle").click();
    await page.locator("#selectedGenres [data-remove-tag]").first().click();
    assert.equal(await page.locator("#searchGenres").isDisabled(), true);
    assert.equal(
      await page
        .locator("#genreSelectionToggle")
        .evaluate((n) => n === document.activeElement),
      true,
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#genreSelectedPanel").isVisible(), false);
    await page.locator("#genreOrder").selectOption("families");
    assert.equal(await page.locator("#reshuffleGenres").isDisabled(), true);
    await page.locator("#genreOrder").selectOption("rotate");
    if (process.env.SLOP_SCREENSHOTS)
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genre-revision-phone.png",
      });
    await page.locator("#genreQuery").fill("dub techno");
    await page.waitForFunction(() =>
      document
        .querySelector("#atlasStatus")
        .textContent.includes("matching names"),
    );
    await page
      .locator('#genreOptions [data-explore="dub-techno"]')
      .first()
      .click();
    assert.equal(await page.locator(".genreContext").isVisible(), false);
    await page.locator("#genreFocus [data-full-label]").click();
    if (process.env.SLOP_SCREENSHOTS)
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genre-detail-phone.png",
      });
    await page.locator("#closeGenreFocus").click();
    await page.locator("#navigationToggle").click();
    await page.locator('nav [data-view="log"]').click();
    assert.equal(
      await page
        .locator("body")
        .evaluate((n) => n.classList.contains("genreView")),
      false,
    );
    await page.locator("#genre-directory-log").waitFor({ state: "visible" });
    console.log(
      "PASS: genre keyboard flow, scroll restoration, pinned controls, responsive viewports and Log navigation",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
