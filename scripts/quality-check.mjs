import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { homedir } from "node:os";
import { readFile, stat } from "node:fs/promises";

const require = createRequire(import.meta.url);
const root = normalize(join(import.meta.dirname, ".."));
const playwrightFallback = join(
  homedir(),
  ".cache",
  "codex-runtimes",
  "codex-primary-runtime",
  "dependencies",
  "node",
  "node_modules",
  "playwright",
);

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  ({ chromium } = require(playwrightFallback));
}

const contentTypes = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = new URL(request.url, "http://127.0.0.1").pathname;
    const relative = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
    const file = normalize(join(root, relative));

    if (!file.startsWith(root)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const fileStat = await stat(file);
    if (!fileStat.isFile()) throw new Error("Not a file");
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": contentTypes[extname(file).toLowerCase()] ?? "application/octet-stream",
    });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end("Not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const url = `http://127.0.0.1:${address.port}/`;

let browser;
try {
  browser = await chromium.launch({ channel: "msedge", headless: true });
} catch {
  browser = await chromium.launch({ headless: true });
}

const viewports = [
  { name: "cinema", width: 2560, height: 1080 },
  { name: "ultrawide", width: 1903, height: 1004 },
  { name: "wide", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile-lg", width: 430, height: 932 },
  { name: "mobile", width: 375, height: 812 },
  { name: "mobile-md", width: 360, height: 800 },
  { name: "mobile-sm", width: 320, height: 568 },
  { name: "landscape", width: 568, height: 320 },
  { name: "tablet-land", width: 915, height: 412 },
];

const failures = [];
const results = [];

for (const viewport of viewports) {
  const page = await browser.newPage({ viewport });
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.locator(".hero-visual img").waitFor({ state: "visible" });
  await page.waitForFunction(() => document.querySelector(".hero-visual img")?.naturalWidth > 0, null, {
    timeout: 5000,
  });
  const imageCount = await page.locator("img").count();
  for (let index = 0; index < imageCount; index += 1) {
    const image = page.locator("img").nth(index);
    if (!(await image.isVisible())) continue;
    await image.scrollIntoViewIfNeeded();
    await page.waitForFunction(
      (imageIndex) => {
        const candidate = document.images[imageIndex];
        return candidate?.complete && candidate.naturalWidth > 0;
      },
      index,
      { timeout: 10000 },
    );
  }
  await page.evaluate(() => scrollTo(0, 0));

  const result = await page.evaluate(() => {
    const hero = document.querySelector(".hero-visual");
    const image = hero.querySelector("img");
    const box = hero.getBoundingClientRect();
    const imageStyle = getComputedStyle(image);
    const [rawX = "50%", rawY = "50%"] = imageStyle.objectPosition.split(/\s+/);
    const percentage = (value) => (value.endsWith("%") ? Number.parseFloat(value) / 100 : 0.5);
    const positionX = percentage(rawX);
    const positionY = percentage(rawY);
    const scale = Math.max(box.width / image.naturalWidth, box.height / image.naturalHeight);
    const drawnWidth = image.naturalWidth * scale;
    const drawnHeight = image.naturalHeight * scale;
    const cropLeft = Math.max(0, drawnWidth - box.width) * positionX;
    const cropTop = Math.max(0, drawnHeight - box.height) * positionY;
    const visibleSource = {
      left: cropLeft / scale,
      top: cropTop / scale,
      right: (cropLeft + box.width) / scale,
      bottom: (cropTop + box.height) / scale,
    };
    // Core facial area expressed proportionally, so every responsive source is testable.
    const face = {
      left: image.naturalWidth * (690 / 2679),
      top: image.naturalHeight * (560 / 3750),
      right: image.naturalWidth * (1210 / 2679),
      bottom: image.naturalHeight * (1240 / 3750),
    };
    const faceVisible =
      visibleSource.left <= face.left &&
      visibleSource.top <= face.top &&
      visibleSource.right >= face.right &&
      visibleSource.bottom >= face.bottom;

    const desktopNavVisible = getComputedStyle(document.querySelector(".nav")).display !== "none";
    const mobileMenu = document.querySelector(".mobile-menu");
    const mobileMenuVisible = getComputedStyle(mobileMenu).display !== "none";
    let mobileDrawerAligned = true;
    if (mobileMenuVisible) {
      mobileMenu.open = true;
      const drawer = mobileMenu.querySelector("nav").getBoundingClientRect();
      mobileDrawerAligned = Math.abs(drawer.right - document.documentElement.clientWidth) <= 1;
      mobileMenu.open = false;
    }
    const remoteImages = [...document.images].filter((item) => /^https?:/.test(item.currentSrc || item.src));
    const imageTransferBytes = performance
      .getEntriesByType("resource")
      .filter((entry) => /\.(?:avif|webp)(?:$|\?)/.test(entry.name))
      .reduce((total, entry) => total + (entry.encodedBodySize || entry.transferSize || 0), 0);
    const duplicateIds = [...document.querySelectorAll("[id]")]
      .map((element) => element.id)
      .filter((id, index, ids) => ids.indexOf(id) !== index);

    return {
      brokenImages: [...document.images].filter(
        (item) => item.getClientRects().length > 0 && (!item.complete || !item.naturalWidth),
      ).length,
      clientWidth: document.documentElement.clientWidth,
      desktopNavVisible,
      duplicateIds,
      face,
      faceVisible,
      imageTransferBytes,
      mobileDrawerAligned,
      mobileMenuVisible,
      objectPosition: imageStyle.objectPosition,
      remoteImageCount: remoteImages.length,
      scrollWidth: document.documentElement.scrollWidth,
      visibleSource,
    };
  });

  const checks = {
    "face is fully framed": result.faceVisible,
    "no horizontal overflow": result.scrollWidth <= result.clientWidth + 1,
    "all images load": result.brokenImages === 0,
    "desktop/mobile navigation is exclusive":
      viewport.width > 900
        ? result.desktopNavVisible && !result.mobileMenuVisible
        : !result.desktopNavVisible && result.mobileMenuVisible,
    "mobile drawer reaches viewport edge": result.mobileDrawerAligned,
    "IDs are unique": result.duplicateIds.length === 0,
    "responsive image payload stays below 2.2 MB": result.imageTransferBytes <= 2_200_000,
  };

  for (const [label, passed] of Object.entries(checks)) {
    if (!passed) failures.push(`${viewport.name}: ${label}`);
  }
  results.push({ viewport, ...result, checks });
  await page.close();
}

const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: "domcontentloaded" });
const remoteImageCount = await page.locator("img[src^='http']").count();
if (remoteImageCount > 0) failures.push(`performance: ${remoteImageCount} images still depend on remote origins`);
await page.close();

for (const result of results) {
  const failed = Object.entries(result.checks).filter(([, passed]) => !passed).map(([label]) => label);
  const status = failed.length ? `FAIL: ${failed.join(", ")}` : "PASS";
  console.log(
    `${result.viewport.name.padEnd(11)} ${String(result.viewport.width).padStart(4)}×${String(result.viewport.height).padEnd(4)} ${status} | object-position ${result.objectPosition} | source top ${Math.round(result.visibleSource.top)} | images ${Math.round(result.imageTransferBytes / 1024)} KB`,
  );
  if (!result.faceVisible) {
    console.log(
      `             visible ${JSON.stringify(result.visibleSource)} | face ${JSON.stringify(result.face)}`,
    );
  }
}

console.log(`remote image dependencies: ${remoteImageCount}`);

await browser.close();
await new Promise((resolve) => server.close(resolve));

if (failures.length) {
  console.error("\nQuality check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nQuality check passed.");
}
