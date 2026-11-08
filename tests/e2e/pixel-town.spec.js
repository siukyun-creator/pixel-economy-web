'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');
const browserErrorsPath = path.join(resultsDir, 'browser-errors.json');
let browserErrors = [];
let roomCode;

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
  await test.step('교사가 새 교실을 만들고 수업을 시작한다', async () => {
    await page.locator('#pin').fill('2468');
    await page.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
    await expect(page.locator('#teacher')).toBeVisible();
    await expect(page.locator('#teacherRoomCode')).toHaveText(/^\d{4}$/);
    roomCode = await page.locator('#teacherRoomCode').textContent();
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
  await page.getByRole('button', { name: '＋ 가게 만들기' }).click();
  await expect(page.locator('.foodArtShelf')).toBeVisible();
  await expect(page.locator('.foodArtShelf img')).toHaveCount(5);

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
  expect(roomCode, '교실 생성 테스트에서 받은 코드').toMatch(/^\d{4}$/);

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

  await page.goto('about:blank');
  await page.close();
});
