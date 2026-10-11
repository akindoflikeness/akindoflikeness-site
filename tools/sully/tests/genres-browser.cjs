const { chromium } = require(process.env.SLOP_PLAYWRIGHT || "playwright");
const assert = require("node:assert/strict");
const directory = require("../genres.json");
const base = process.env.SLOP_TEST_URL || "http://127.0.0.1:8766/tools/sully/";
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.SLOP_BROWSER_CHANNEL
      ? { channel: process.env.SLOP_BROWSER_CHANNEL }
      : {}),
  });
  try {
    const context = await browser.newContext({
        viewport: { width: 1440, height: 1024 },
      }),
      errors = [];
    let archiveRequests = 0;
    await context.route("https://archive.org/**", (r) => {
      archiveRequests++;
      return r.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          response: {
            numFound: 1,
            docs: [
              {
                identifier: "test-release",
                title: "A reference",
                creator: "Example",
                subject: ["ambient", "unclassified local scene"],
              },
            ],
          },
        }),
      });
    });
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.locator("#navGenres").click();
    await page.waitForSelector(".atlasFamily");
    assert.equal(
      await page.locator(".atlasFamily").count(),
      directory.families.length,
    );
    const order = () =>
      page
        .locator(".atlasFamily>div>.atlasNode>.atlasRow>.genreName")
        .allTextContents();
    const initial = await order(),
      seed = await page.locator("#genreSeed").textContent();
    assert.equal(initial.length, directory.families.length * 4);
    await page.waitForTimeout(300);
    const before = archiveRequests;
    await page.locator(".familyRest > summary").first().click();
    await page.waitForSelector(".familyRest[open] .genreName");
    await page.locator(".familyRest > summary").nth(1).click();
    assert.equal(await page.locator(".familyRest[open]").count(), 2);
    assert.equal(
      archiveRequests,
      before,
      "Browsing genre routes must not fetch Archive data",
    );
    await page.locator("#genreQuery").fill("dub techno");
    await page.waitForFunction(() =>
      document
        .querySelector("#atlasStatus")
        .textContent.includes("matching names"),
    );
    assert.equal(
      await page.locator('#genreOptions [data-explore="dub-techno"]').count(),
      2,
    );
    await page
      .locator('#genreOptions [data-explore="dub-techno"]')
      .first()
      .click();
    assert.equal(
      await page.locator("#genreCount").textContent(),
      "0 genres selected",
    );
    assert.match(
      await page.locator("#genreFocus").textContent(),
      /availability not checked/,
    );
    await page
      .locator('#genreFocus [data-full-label][data-add-tag="dub techno"]')
      .first()
      .click();
    assert.equal(
      await page
        .locator('#genreOptions [data-add-tag="dub techno"][aria-pressed=true]')
        .count(),
      2,
    );
    assert.equal(
      await page.locator("#genreCount").textContent(),
      "1 genre selected",
    );
    await page.locator("#closeGenreFocus").click();
    assert.equal(await page.evaluate(() => document.activeElement.dataset.explore), "dub-techno");
    await page.locator("#genreQuery").fill("");
    await page.waitForFunction(
      () =>
        document.querySelector("#atlasStatus").textContent ===
        "4 starting points per family",
    );
    assert.deepEqual(await order(), initial);
    await page.locator('nav [data-view="saved"]').click();
    await page.locator("#navGenres").click();
    assert.deepEqual(await order(), initial);
    await page.reload();
    await page.locator("#navGenres").click();
    await page.waitForSelector(".atlasFamily");
    assert.deepEqual(await order(), initial);
    assert.equal(await page.locator("#genreSeed").textContent(), seed);
    await page.locator("#reshuffleGenres").click();
    assert.notEqual(await page.locator("#genreSeed").textContent(), seed);
    assert.notDeepEqual(await order(), initial);
    assert.ok(
      (
        await page.evaluate(() =>
          JSON.parse(localStorage.getItem("slop-genre-rotation-v1")),
        )
      ).length <= 200,
    );
    await page.locator('[data-genre-mode="families"]').click();
    await page.locator("#genreQuery").fill("dnb");
    await page.waitForFunction(() =>
      document
        .querySelector("#atlasStatus")
        .textContent.includes("matching names"),
    );
    assert.ok(await page.locator('[data-explore="drum-and-bass"]').count());
    await page.locator("#genreQuery").fill("");
    await page.locator('[data-genre-mode="alpha"]').click();
    await page.waitForSelector(".atlasAlphabet");
    assert.equal(
      await page.locator(".atlasAlphabet>div>.atlasNode").count(),
      directory.genres.length,
    );
    assert.equal(await page.locator("#reshuffleGenres").isDisabled(), true);
    await page.locator("#sourceTagPanel summary").click();
    assert.match(
      await page.locator("#sourceGenres").textContent(),
      /unclassified local scene/,
    );
    await page.locator("#customGenre").fill("another local scene");
    await page.locator("#customGenreForm button").click();
    const request = page.waitForRequest((r) =>
      r.url().includes("advancedsearch.php"),
    );
    await page.locator("#searchGenres").click();
    assert.match(
      new URL((await request).url()).searchParams.get("q"),
      /subject:"another local scene"/,
    );
    await page.locator("#navGenres").click();
    await page.locator('[data-genre-mode="rotate"]').click();
    for (const [width, height] of [
      [1440, 1024],
      [1024, 600],
      [390, 844],
      [320, 640],
    ]) {
      await page.setViewportSize({ width, height });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `overflow at ${width}`,
      );
    }
    if (process.env.SLOP_SCREENSHOTS) {
      await page.setViewportSize({ width: 1440, height: 1024 });
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genres-desktop.png",
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: process.env.SLOP_SCREENSHOTS + "/genres-mobile.png",
      });
    }
    assert.deepEqual(errors, []);
    await context.close();
    // Storage denial must not prevent browsing, selection or reshuffle.
    const blocked = await browser.newContext();
    await blocked.addInitScript(() => {
      for (const k of ["localStorage", "sessionStorage"])
        Object.defineProperty(window, k, {
          get() {
            throw new Error("Blocked");
          },
        });
    });
    await blocked.route("https://archive.org/**", (r) => r.abort());
    const p = await blocked.newPage();
    await p.goto(base);
    await p.locator("#navGenres").click();
    await p.waitForSelector(".atlasFamily");
    await p.locator("#reshuffleGenres").click();
    assert.match(await p.locator("#atlasStorage").textContent(), /unavailable/);
    await blocked.close();
    // Failed data load has a usable custom-tag path and can be retried.
    const failure = await browser.newContext();
    await failure.route("**/genres.json*", (r) => r.abort());
    await failure.route("https://archive.org/**", (r) => r.abort());
    const f = await failure.newPage();
    await f.goto(base);
    await f.locator("#navGenres").click();
    await f.waitForSelector("#retryGenres");
    await f.locator("#sourceTagPanel summary").click();
    await f.locator("#customGenre").fill("still works");
    await f.locator("#customGenreForm button").click();
    assert.equal(await f.locator("#searchGenres").isDisabled(), false);
    await failure.unroute("**/genres.json*");
    await f.locator("#retryGenres").click();
    await f.waitForSelector(".atlasFamily");
    assert.equal(await f.locator("#genreOrder").isDisabled(), false);
    await failure.close();
    console.log(
      "PASS: dense directory, overlap, aliases, balanced stable rotation, source tags, responsive layout, storage denial and retry",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
