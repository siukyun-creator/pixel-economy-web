'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');
const browserErrorsPath = path.join(resultsDir, 'browser-errors.json');
let browserErrors = [];

function collectBrowserErrors(page) {
  page.on('console', message => {
    if (message.type() === 'error') {
      browserErrors.push({ type: 'console', message: message.text() });
    }
  });
  page.on('pageerror', error => {
    browserErrors.push({ type: 'pageerror', message: error.message });
  });
}

test.afterEach(async () => {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(browserErrorsPath, JSON.stringify(browserErrors, null, 2));
  expect(browserErrors, '브라우저 콘솔 및 페이지 오류').toEqual([]);

  const serverErrors = fs.readFileSync(path.join(resultsDir, 'server-errors.log'), 'utf8');
  expect(serverErrors, '서버 오류 로그').toBe('');
});

test('교사가 새 교실을 만들고 4자리 코드를 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  browserErrors = [];

  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  collectBrowserErrors(page);

  await page.goto(baseURL);
  await expect(page.locator('#login')).not.toContainText('6582');
  await test.step('교사가 새 교실을 만들고 수업을 시작한다', async () => {
    await page.locator('#pin').fill('6582');
    await page.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
    await expect(page.locator('#teacher')).toBeVisible();
    await expect(page.locator('#teacherRoomCode')).toHaveText(/^\d{4}$/);
    await page.getByRole('button', { name: '▶ 시작' }).click();
    await expect(page.locator('#teacherCount')).toContainText('진행 중');
  });

  await page.goto('about:blank');
  await page.close();
});

test('상점·은행·주식·도매 메뉴와 음식 픽셀 아트를 PC·태블릿에서 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(60000);
  browserErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });
  collectBrowserErrors(page);
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });

  await page.getByRole('button', { name: /은행/ }).click();
  await expect(page.locator('#menuContent .cookCard').first()).toBeVisible();

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /주식/ }).click();
  await expect(page.locator('#stockChart')).toBeVisible();

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: '📦 도매상', exact: true }).click();
  await expect(page.locator('#menuContent .wholesaleHero')).toBeVisible();

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /사업 시작/ }).click();
  await expect(page.locator('.businessChoice')).toHaveCount(3);
  await expect(page.locator('.businessChoice')).toContainText(['우리 동네 가게', '식자재 도매상', '주식회사']);
  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-business-hub.png'),
    fullPage: false
  });
  await page.getByRole('button', { name: '가게 만들기' }).click();
  await expect(page.locator('#newStoreName')).toBeVisible();
  await expect(page.locator('.storeWizardPanel')).toHaveCount(3);
  await page.locator('#newStoreName').fill('단계별 가게');
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page.locator('.storeWizardPanel').nth(1)).toBeVisible();
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page.locator('.storeWizardPanel').nth(2)).toBeVisible();
  await page.getByRole('button', { name: '이전' }).click();
  await expect(page.locator('.storeWizardPanel').nth(1)).toBeVisible();
  await page.getByRole('button', { name: '이전' }).click();
  await expect(page.locator('#newStoreName')).toHaveValue('단계별 가게');
  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /내 가게/ }).click();
  await expect(page.locator('.employmentPanel')).toContainText('장애인 고용과 포용적인 일터');
  await expect(page.locator('.employmentPanel')).toContainText('자발적으로 지원한 학생만 채용');
  await expect(page.locator('.communityReport')).toContainText('사회공헌과 나눔');
  await expect(page.locator('.communityReport')).toContainText('장애인 고용 지원');
  await expect(page.locator('.communityReport')).toContainText('어르신 지원');
  await page.locator('#donationCause').selectOption('inclusiveEmployment');
  await expect(page.locator('#donationCauseNote')).toContainText('정당한 보수');
  await expect(page.locator('.communityReport')).toContainText('실제 기관이나 공공사업으로 전달되지 않아요.');

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /사업 시작/ }).click();
  await page.getByRole('button', { name: '가게 만들기' }).click();
  await expect(page.locator('.foodChoices .foodPixelArt')).toHaveCount(3);
  const foodChoices = page.locator('#foodProductChoices [role="radio"]');
  await expect(foodChoices).toHaveCount(3);
  await expect(page.locator('#foodProductChoices [aria-checked="true"]')).toHaveCount(1);
  await foodChoices.nth(1).click();
  await expect(page.locator('#foodProductChoices [aria-checked="true"]')).toHaveCount(1);
  await expect(page.locator('#foodProductChoices')).toHaveAttribute('data-selected', 'croissant');
  const breadArt = await page.locator('.foodChoices .foodPixelArt').evaluateAll(images =>
    images.map(image => image.src)
  );
  expect(new Set(breadArt).size).toBe(3);
  await page.locator('#newStoreFood').selectOption('cafe');
  await expect(page.locator('.foodChoices .foodPixelArt')).toHaveCount(3);
  const cafeArt = await page.locator('.foodChoices .foodPixelArt').evaluateAll(images =>
    images.map(image => image.src)
  );
  expect(new Set(cafeArt).size).toBe(3);
  expect(cafeArt).not.toEqual(breadArt);
  await expect(page.locator('#foodProductChoices [aria-checked="true"]')).toHaveCount(1);
  const coffeeModel = await page.evaluate(() => {
    const product = FOOD_PRODUCTS.cafe[0];
    const pixels = new Set(product.layers.flatMap(layer => layer.flatMap(row => Array.from(row))));
    const canvas = document.querySelector('#foodPreview');
    const ctx = canvas.getContext('2d');
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minY = canvas.height, maxY = 0, minX = canvas.width, maxX = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        if (image.data[index] !== 234 || image.data[index + 1] !== 245 || image.data[index + 2] !== 255) {
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
        }
      }
    }
    return {
      layers: product.layers.length,
      materials: [...pixels].filter(pixel => pixel !== '.'),
      width: maxX - minX + 1,
      height: maxY - minY + 1
    };
  });
  expect(coffeeModel.layers).toBeGreaterThanOrEqual(12);
  expect(coffeeModel.materials).toEqual(expect.arrayContaining(['i', 'a', 'e', 'h', 's']));
  expect(coffeeModel.height).toBeGreaterThan(coffeeModel.width * 0.7);
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-iced-americano.png'),
    fullPage: false
  });

  const artworkResponses = await Promise.all([
    '/assets/food/pixel-bread.svg',
    '/assets/food/pixel-coffee.svg',
    '/assets/food/pixel-pizza.svg',
    '/assets/food/pixel-juice.svg',
    '/assets/food/pixel-steak.svg'
  ].map(assetPath => fetch(new URL(assetPath, baseURL).toString())));
  expect(artworkResponses.map(response => response.status)).toEqual([200, 200, 200, 200, 200]);
  expect(artworkResponses.map(response => response.headers.get('content-type')))
    .toEqual(Array(5).fill('image/svg+xml'));

  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-shop-desktop.png'),
    fullPage: false
  });

  await page.setViewportSize({ width: 820, height: 1024 });
  const panelBounds = await page.locator('#menuPanel').evaluate(panel => {
    const { x, y, width, height } = panel.getBoundingClientRect();
    return { x, y, width, height, viewportWidth: innerWidth, viewportHeight: innerHeight };
  });
  expect(panelBounds.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds.y).toBeGreaterThanOrEqual(0);
  expect(panelBounds.x + panelBounds.width).toBeLessThanOrEqual(panelBounds.viewportWidth);
  expect(panelBounds.y + panelBounds.height).toBeLessThanOrEqual(panelBounds.viewportHeight);
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-shop-tablet.png'),
    fullPage: false
  });

  await page.goto('about:blank');
  await page.close();
});

test('학생이 4자리 코드로 입장해 키보드로 이동한다', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  browserErrors = [];

  const teacherPage = await browser.newPage({ viewport: { width: 960, height: 600 } });
  collectBrowserErrors(teacherPage);
  await teacherPage.goto(baseURL);
  await teacherPage.locator('#pin').fill('6582');
  await teacherPage.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
  await expect(teacherPage.locator('#teacher')).toBeVisible();
  await expect(teacherPage.locator('#teacherRoomCode')).toHaveText(/^\d{4}$/);
  const roomCode = await teacherPage.locator('#teacherRoomCode').textContent();
  await teacherPage.getByRole('button', { name: '▶ 시작' }).click();
  await expect(teacherPage.locator('#teacherCount')).toContainText('진행 중');
  const page = await browser.newPage({ viewport: { width: 960, height: 600 } });
  collectBrowserErrors(page);
  await page.goto(baseURL);

  await test.step('학생이 받은 4자리 코드로 입장한다', async () => {
    await page.locator('#name').fill('E2E학생');
    await page.locator('#room').fill(roomCode);
    await page.locator('#joinButton').click();
    await expect(page.locator('#gameArea')).toBeVisible();
    await expect(page.locator('#game canvas').first()).toBeVisible();
    await expect(page.locator('#lobbyOverlay')).toBeHidden();
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(0);
    await expect.poll(() => page.evaluate(() =>
      world.children.filter(object =>
        object.material?.color?.getHex() === 0x8a5a35 &&
        Math.abs(Math.round(object.position.x)) === 7 &&
        Math.abs(Math.abs(object.position.z) - 5) < 0.3
      ).length
    )).toBe(0);

    fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-game.png'),
      fullPage: false,
      timeout: 20000
    });
  });

  await test.step('진행 중인 마을에서 W 키로 이동한다', async () => {
    const before = await test.step(
      '이동 전 캐릭터 좌표를 읽는다',
      () => page.evaluate(() => ({ x: me.position.x, z: me.position.z })),
      { timeout: 10000 }
    );
    await test.step('W 키를 누르고 놓는다', async () => {
      await page.keyboard.down('w');
      await page.waitForTimeout(700);
      await page.keyboard.up('w');
    }, { timeout: 10000 });
    const after = await test.step(
      '이동 후 캐릭터 좌표를 읽는다',
      () => page.evaluate(() => ({ x: me.position.x, z: me.position.z })),
      { timeout: 10000 }
    );
    expect(Math.hypot(after.x - before.x, after.z - before.z)).toBeGreaterThan(1);
  }, { timeout: 45000 });

  await test.step('주식 가격이 변하고 화면에 갱신된다', async () => {
    await page.getByRole('button', { name: /주식/ }).click();
    const price = page.locator('#menuContent .stockCard .stockPrice').first();
    await expect(price).toBeVisible();
    const previousPrice = await price.textContent();
    await expect(price).not.toHaveText(previousPrice, { timeout: 10000 });
    await expect(page.locator('#menuContent .stockCard .stockChange').first()).toHaveText(/(▲|▼)/);
    await page.locator('#menuContent .stockCard').first().getByRole('button', { name: /매수/ }).click();
    await expect(page.locator('#stockHoldings .stockHoldingRow[data-ticker="SKY"]')).toContainText('1주');
    await expect(page.locator('.stockHoldingsTotal')).toHaveText(/원/);
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-stock-holdings.png'),
      fullPage: false
    });
    await page.getByRole('button', { name: '닫기 ✕' }).click();
  });

  await test.step('사업 시작 허브에서 기업과 도매상을 창업한다', async () => {
    await page.getByRole('button', { name: /사업 시작/ }).click();
    await expect(page.locator('.businessChoice')).toHaveCount(3);
    await page.locator('#hubCompanyName').fill('E2E기업');
    await page.getByRole('button', { name: '기업 창업하기' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(1);
    await expect(page.locator('.businessChoice').nth(0)).toContainText('이미 회사');
    await expect(page.locator('.businessChoice').nth(1)).toContainText('이미 회사');

    const wholesalePage = await browser.newPage({ viewport: { width: 960, height: 600 } });
    collectBrowserErrors(wholesalePage);
    await wholesalePage.goto(baseURL);
    await wholesalePage.locator('#name').fill('E2E도매학생');
    await wholesalePage.locator('#room').fill(roomCode);
    await wholesalePage.locator('#joinButton').click();
    await expect(wholesalePage.locator('#lobbyOverlay')).toBeHidden();
    await wholesalePage.getByRole('button', { name: /사업 시작/ }).click();
    await wholesalePage.locator('#hubWholesaleName').fill('E2E도매');
    await wholesalePage.getByRole('button', { name: '도매상 창업하기' }).click();
    await expect.poll(() => wholesalePage.evaluate(() => Boolean(latestState.wholesaleShop))).toBe(true);
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(2);
    await expect(wholesalePage.locator('.businessChoice').nth(1)).toContainText('내 도매상을 운영');
    await wholesalePage.close();
  });

  await page.goto('about:blank');
  await teacherPage.goto('about:blank');
  await page.close();
  await teacherPage.close();
});
