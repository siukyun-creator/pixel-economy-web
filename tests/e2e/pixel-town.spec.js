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
    fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
    await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-teacher-dashboard.png'), fullPage: true });
    await page.getByRole('button', { name: '⚙ 추가 설정' }).click();
    await expect(page.locator('#teacherMarketControls')).toBeVisible();
    await page.locator('#teacherMarketControls details summary').click();
    await page.locator('#marketDay').selectOption('5');
    await page.locator('#marketTime').fill('14:45');
    await page.locator('#marketTurnMinutes').fill('45');
    await page.getByRole('button', { name: '거래 시간 저장' }).click();
    await expect(page.locator('#marketStatus')).toContainText('한 턴 45분');
    await page.locator('#turnDurationMinutes').selectOption('1');
    await page.locator('#totalTurns').selectOption('1');
    await page.getByRole('button', { name: '설정 저장' }).click();
    await expect(page.locator('#marketStatus')).toContainText('실제 턴 1/1', { timeout: 10000 });
    await page.getByRole('button', { name: '▶ 시작' }).click();
    await expect(page.locator('#teacherCount')).toContainText('진행 중');
    await expect(page.locator('#finalResults')).toBeVisible({ timeout: 75000 });
    await expect(page.locator('#finalResults')).toContainText('우리 반 경제 활동 시상식');
    await expect(page.locator('#teacherCeoAward')).toContainText('토요일 장 마감');
    await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-awards-teacher.png'),fullPage:true});
  });

  await page.goto('about:blank');
  await page.close();
});

test('상점·은행·주식·도매 메뉴와 음식 픽셀 아트를 PC·태블릿에서 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(120000);
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
  await expect(page.locator('#menuContent')).toContainText('아직 운영 중인 내 기업이 없어요.');
  await expect(page.locator('#menuContent .stockGrid')).toHaveCount(1);

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.locator('.moreMenu > summary').click();
  await page.getByRole('button', { name: '📦 도매상', exact: true }).click();
  await expect(page.locator('#menuContent .wholesaleHero')).toBeVisible();

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.locator('.moreMenu > summary').click();
  await page.getByRole('button', { name: /사업 시작/ }).click();
  // 드롭다운이 열린 채로 남으면 창업 패널의 닫기 버튼을 가릴 수 있어 접는다.
  await page.locator('.moreMenu').evaluate(menu => { menu.open = false; });
  await expect(page.locator('.businessChoice')).toHaveCount(3);
  await expect(page.locator('.businessChoice')).toContainText(['우리 동네 가게', '식자재 도매상', '주식회사']);
  await expect(page.locator('#hubCompanySector')).toHaveValue('electronics');
  await expect(page.locator('#companyProductDescription')).toContainText('픽셀 스마트폰');
  await page.locator('#hubCompanySector').selectOption('toys');
  await expect(page.locator('#companyProductDescription')).toContainText('로봇 조립 키트');
  await page.locator('#hubCompanySector').selectOption('electronics');
  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-business-hub.png'),
    fullPage: false
  });
  await page.getByRole('button', { name: '가게 만들기' }).click();
  await expect(page.locator('#newStoreName')).toBeVisible();
  await expect(page.locator('.storeWizardPanel')).toHaveCount(3);
  await page.locator('#newStoreName').fill('단계별 가게');
  await expect(page.locator('.storeWizardPanel')).toHaveCount(3);
  await expect(page.locator('#foodArtRegister')).toHaveCount(0);
  await expect(page.locator('.foodDrawingTools')).toHaveCount(0);
  await expect(page.locator('#foodProductChoices [role="radio"]')).toHaveCount(3);
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-store-step-1-menu.png'),fullPage:false});
  await page.getByRole('button',{name:'다음 단계'}).click();
  await expect(page.locator('.storeWizardPanel').nth(1)).toBeVisible();
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-store-step-2-design.png'),fullPage:false});
  await page.getByRole('button',{name:'다음 단계'}).click();
  await expect(page.locator('.storeWizardPanel').nth(2)).toBeVisible();
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-store-step-3-confirm.png'),fullPage:false});
  await page.getByRole('button',{name:'이전'}).click();
  await expect(page.locator('.storeWizardPanel').nth(1)).toBeVisible();
  await page.getByRole('button',{name:'이전'}).click();
  await expect(page.locator('#newStoreName')).toHaveValue('단계별 가게');
  await page.getByRole('button',{name:'닫기 ✕'}).click();
  await page.getByRole('button', { name: /내 가게/ }).click();
  await expect(page.locator('.communityReport')).toContainText('사회공헌과 나눔');
  await expect(page.locator('.communityReport')).toContainText('장애인 고용 지원');
  await expect(page.locator('.communityReport')).toContainText('어르신 지원');
  await page.locator('#donationCause').selectOption('inclusiveEmployment');
  await expect(page.locator('#donationCauseNote')).toContainText('정당한 보수');
  await expect(page.locator('.communityReport')).toContainText('실제 기관이나 공공사업으로 전달되지 않아요.');

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.locator('.moreMenu > summary').click();
  await page.getByRole('button', { name: /사업 시작/ }).click();
  await page.getByRole('button', { name: '가게 만들기' }).click();
  await page.locator('#newStoreName').fill('테스트 가게');
  const foodChoices = page.locator('#foodProductChoices [role="radio"]');
  await expect(foodChoices).toHaveCount(3);
  await expect(page.locator('#foodArtRegister')).toHaveCount(0);
  await expect(page.locator('.foodDrawingTools')).toHaveCount(0);
  await foodChoices.nth(1).click();
  await expect(page.locator('#foodProductChoices')).toHaveAttribute('data-selected', 'croissant');
  await expect(page.locator('#foodPreview')).toBeHidden();
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-menu-choice-no-drawing.png'),fullPage:false});
  await page.getByRole('button', { name: '다음 단계' }).click();
  await page.getByRole('button', { name: '다음 단계' }).click();
  await expect(page.locator('.storeWizardPanel').nth(2)).toBeVisible();
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-store-final-step.png'),fullPage:false});
  const artworkResponses = await Promise.all(['/assets/food/pixel-bread.svg','/assets/food/pixel-coffee.svg','/assets/food/pixel-pizza.svg','/assets/food/pixel-juice.svg','/assets/food/pixel-steak.svg'].map(assetPath => fetch(new URL(assetPath, baseURL).toString())));
  expect(artworkResponses.map(response => response.status)).toEqual([200,200,200,200,200]);
  expect(artworkResponses.map(response => response.headers.get('content-type'))).toEqual(Array(5).fill('image/svg+xml'));
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-shop-desktop.png'),fullPage:false});
  await page.setViewportSize({width:820,height:1024});
  const panelBounds=await page.locator('#menuPanel').evaluate(panel=>{const{x,y,width,height}=panel.getBoundingClientRect();return{x,y,width,height,viewportWidth:innerWidth,viewportHeight:innerHeight}});
  expect(panelBounds.x).toBeGreaterThanOrEqual(0);
  expect(panelBounds.y).toBeGreaterThanOrEqual(0);
  expect(panelBounds.x+panelBounds.width).toBeLessThanOrEqual(panelBounds.viewportWidth);
  expect(panelBounds.y+panelBounds.height).toBeLessThanOrEqual(panelBounds.viewportHeight);
  await page.screenshot({path:path.join(resultsDir,'screenshots','pixel-town-shop-tablet.png'),fullPage:false});
  await page.locator('.moreMenu').evaluate(menu => { menu.open = false; });
  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await expect(page.locator('#touchPad')).toBeVisible();
  await expect(page.locator('#jump')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({width:1024,height:768});
  await expect(page.locator('#touchPad')).toBeVisible();
  await expect(page.locator('#jump')).toBeVisible();
  const mapAndJump=await page.evaluate(()=>{const map=document.querySelector('#mapPanel').getBoundingClientRect();const jump=document.querySelector('#jump').getBoundingClientRect();return{mapBottom:map.bottom,jumpTop:jump.top}});
  expect(mapAndJump.mapBottom).toBeLessThan(mapAndJump.jumpTop);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: /내 가게/ }).click();
  const landscapeBounds=await page.locator('#menuPanel').evaluate(panel=>{const{x,y,width,height}=panel.getBoundingClientRect();return{x,y,width,height,viewportWidth:innerWidth,viewportHeight:innerHeight}});
  expect(landscapeBounds.x).toBeGreaterThanOrEqual(0);
  expect(landscapeBounds.y).toBeGreaterThanOrEqual(0);
  expect(landscapeBounds.x+landscapeBounds.width).toBeLessThanOrEqual(landscapeBounds.viewportWidth);
  expect(landscapeBounds.y+landscapeBounds.height).toBeLessThanOrEqual(landscapeBounds.viewportHeight);
  await page.goto('about:blank');await page.close();

});


test('기업 뉴스·제품 구매 메뉴가 분리되고 채용·가방·순위표가 없다', async ({ browser, baseURL }) => {
  browserErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  collectBrowserErrors(page);
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });
  await expect(page.locator('#newsTicker')).toBeVisible();
  await page.locator('.moreMenu > summary').click();
  await expect(page.getByRole('button', { name: /기업 뉴스/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /기업 제품/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /채용·지원/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /가방|순위표/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /새로고침/ })).toHaveCount(0);

  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.getByRole('button', { name: /기업 뉴스/ }).click();
  await expect(page.locator('.newsIntro')).toBeVisible();
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-company-news.png'), fullPage: true });

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.locator('.moreMenu > summary').click();
  await page.getByRole('button', { name: /기업 제품/ }).click();
  await expect(page.locator('#menuTitle')).toContainText('기업 제품 구매');
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-company-products.png'), fullPage: true });
  await page.close();
});

test('학생이 4자리 코드로 입장해 키보드로 이동한다', async ({ browser, baseURL }) => {
  test.setTimeout(300000);
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
  // 간단 화면에서 추가 설정을 열어 테스트에 필요한 턴 설정을 조정한다.
  await teacherPage.getByRole('button', { name: '⚙ 추가 설정' }).click();
  // 이 테스트는 입장·기업 거래 흐름을 검증하므로 중간에 자동 턴이 끝나지 않게 한다.
  await teacherPage.locator('#teacherMarketControls details').evaluate(details => { details.open = true; });
  await teacherPage.locator('#turnDurationMinutes').selectOption('60');
  await teacherPage.locator('#totalTurns').selectOption('6');
  await teacherPage.getByRole('button', { name: '설정 저장' }).click();
  await expect(teacherPage.locator('#marketStatus')).toContainText('실제 턴 1/6');
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
    const storefront = await page.evaluate(() => {
      syncStoreBuildings([{ id: 'e2e-front-check', name: '테스트 가게', sign: '테스트 가게', food: 'bread', x: 22, z: -12, face: 1 }]);
      const group = storeVisuals.get('e2e-front-check');
      const meshes = group.children.filter(object => object.isMesh);
      const door = meshes.some(object =>
        object.material?.color?.getHex() === 0x78472c &&
        Math.abs(object.position.x) < 0.1 &&
        Math.abs(object.position.y - 1.2) < 0.1 &&
        Math.abs(object.position.z - 3.12) < 0.1
      );
      const windows = meshes.filter(object =>
        object.material?.color?.getHex() === 0x9ddcf0 &&
        Math.abs(Math.abs(object.position.x) - 2.05) < 0.1 &&
        Math.abs(object.position.z - 3.16) < 0.1
      ).length;
      syncStoreBuildings([]);
      return { door, frontWindows: windows };
    });
    expect(storefront).toEqual({ door: true, frontWindows: 2 });
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
    await page.getByRole('button', { name: /사업 시작/ }).click();
    await page.locator('#hubCompanyName').fill('E2E기업');
    await page.locator('#hubCompanySector').selectOption('electronics');
    await page.getByRole('button', { name: '기업 창업하기' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies.length)).toBe(1);
    await page.getByRole('button', { name: /주식/ }).click();
    const price = page.locator('#menuContent .stockCard .stockPrice').first();
    await expect(price).toBeVisible();
    const previousPrice = await price.textContent();
    await expect(page.locator('#companyMarket')).toContainText('제품 생산');
    await page.locator('#menuContent .stockCard').first().getByRole('button', { name: /매수/ }).click();
    await expect(price).not.toHaveText(previousPrice);
    const companyTicker = await page.evaluate(() => latestState.companies[0].ticker);
    await expect(page.locator('#stockHoldings .stockHoldingRow[data-ticker="' + companyTicker + '"]')).toContainText('11주');
    await expect(page.locator('.stockHoldingsTotal')).toHaveText(/원/);
    await teacherPage.locator('#teacherMarketControls details').evaluate(details => { details.open = true; });
    await expect(teacherPage.locator('#advanceMarketButton')).toBeVisible();
    await teacherPage.locator('#advanceMarketButton').click();
    await expect(price).not.toHaveText(previousPrice);
    await expect(page.locator('#menuContent .stockCard .stockChange').first()).toHaveText(/[▲▼]/);
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-stock-holdings.png'),
      fullPage: false
    });
    await page.getByRole('button', { name: '닫기 ✕' }).click();
  });

  await test.step('사업 시작 허브에서 회사 운영과 도매상 창업을 확인한다', async () => {
    await page.getByRole('button', { name: /사업 시작/ }).click();
    await expect(page.locator('.businessChoice')).toHaveCount(3);
    await expect.poll(() => page.evaluate(() => latestState.companies.length)).toBe(1);
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(1);
    await expect(page.locator('.businessChoice').nth(2)).toContainText('이미 회사를 창업했어요.');
    await page.getByRole('button', { name: /내 가게/ }).click();
    await expect(page.locator('[data-my-company]')).toContainText('E2E기업');
    await expect(page.locator('[data-my-company]')).toContainText('픽셀 스마트폰');
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-company-dashboard.png'),
      fullPage: false
    });
    await page.getByRole('button', { name: '닫기 ✕' }).click();
    await page.getByRole('button', { name: /주식/ }).click();
    await expect(page.locator('#companyMarket')).toContainText('E2E기업 경영');
    await expect(page.locator('#companyMarket img').first()).toHaveAttribute('src', /pixel-smartphone\.svg$/);
    const wholesalePage = await browser.newPage({ viewport: { width: 960, height: 600 } });
    collectBrowserErrors(wholesalePage);
    await wholesalePage.goto(baseURL);
    await wholesalePage.locator('#name').fill('E2E도매학생');
    await wholesalePage.locator('#room').fill(roomCode);
    await wholesalePage.locator('#joinButton').click();
    await expect(wholesalePage.locator('#gameArea')).toBeVisible({ timeout: 15000 });
    await expect.poll(() => wholesalePage.evaluate(() => Boolean(myId && latestState?.players?.some(player => player.id === myId))), { timeout: 15000 }).toBe(true);
    await expect(wholesalePage.locator('#lobbyOverlay')).toBeHidden({ timeout: 15000 });
    await wholesalePage.getByRole('button', { name: /사업 시작/ }).click();
    await wholesalePage.locator('#hubWholesaleName').fill('E2E도매');
    await wholesalePage.getByRole('button', { name: '도매상 창업하기' }).click();
    await expect.poll(() => wholesalePage.evaluate(() => Boolean(latestState.wholesaleShop))).toBe(true);
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(2);
    await expect(wholesalePage.locator('.businessChoice').nth(1)).toContainText('내 도매상을 운영');
    await wholesalePage.getByRole('button', { name: '닫기 ✕' }).click();
    await wholesalePage.locator('.moreMenu > summary').click();
    await wholesalePage.getByRole('button', { name: /기업 제품/ }).click();
    await expect(wholesalePage.locator('.companyProductCard')).toContainText('픽셀 스마트폰');
    // 반드시 두 학생이 접속한 상태에서 확인: 재고 0개면 구매 불가여야 한다.
    await expect(wholesalePage.locator('.companyProductCard').getByRole('button', { name: '🛒 구매하기' })).toBeDisabled();
    await expect(wholesalePage.locator('.companyProductStats')).toContainText('재고 0개');
    // 회사 대표가 제품을 생산한 뒤, 구매자 화면에도 실시간으로 재고가 동기화되어야 한다.
    await page.getByRole('button', { name: '닫기 ✕' }).click();
    await page.getByRole('button', { name: /주식/ }).click();
    const productionPlan = await page.evaluate(() => {
      const company = latestState.companies[0];
      const owner = latestState.players.find(player => player.id === myId);
      return Math.min(10, Math.floor(owner.money / company.unitCost));
    });
    expect(productionPlan, '회사 대표가 보유한 현금으로 최소 1개는 생산할 수 있어야 한다').toBeGreaterThan(0);
    await page.locator('#companyProduceQty').fill(String(productionPlan));
    await page.locator('button[onclick="produceCompanyGoods()"]:visible').click();
    await expect.poll(() => page.evaluate(() => latestState.companies[0].inventory)).toBeGreaterThan(0);
    await expect.poll(() => wholesalePage.evaluate(() => latestState.companies[0].inventory), { timeout: 10000 }).toBeGreaterThan(0);
    await expect(wholesalePage.locator('.companyProductStats')).not.toContainText('재고 0개');
    const soldBeforePurchase = await page.evaluate(() => latestState.companies[0].soldUnits);
    const inventoryBeforePurchase = await page.evaluate(() => latestState.companies[0].inventory);
    const buyerMoneyBeforePurchase = await wholesalePage.evaluate(() => latestState.players.find(player => player.id === myId).money);
    await expect(wholesalePage.locator('.companyProductCard').getByRole('button', { name: '🛒 구매하기' })).toBeEnabled();
    await wholesalePage.locator('.companyProductCard').getByRole('button', { name: '🛒 구매하기' }).click();
    // 가방 기능은 없으므로 구매자의 돈과 회사 재고·판매량으로 거래 성공을 확인한다.
    await expect.poll(() => page.evaluate(() => latestState.companies[0].soldUnits)).toBeGreaterThan(soldBeforePurchase);
    await expect.poll(() => page.evaluate(() => latestState.companies[0].inventory)).toBeLessThan(inventoryBeforePurchase);
    await expect.poll(() => wholesalePage.evaluate(() => latestState.players.find(player => player.id === myId).money)).toBeLessThan(buyerMoneyBeforePurchase);
    await wholesalePage.close();
    await teacherPage.getByRole('button', { name: '■ 종료' }).click();
    await expect(page.locator('#finalResults')).toContainText('최고의 CEO상');
    await expect(page.locator('#finalResults')).toContainText('E2E기업');
  });

  await page.goto('about:blank');
  await teacherPage.goto('about:blank');
  await page.close();
  await teacherPage.close();
});

 
test('학생·선생님 세금 내역과 업종별 가게 3D 디자인을 확인한다', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });
  const result = await page.evaluate(() => {
    init3D();
    const sampleTax = [
      { id: 't1', at: Date.now(), source: '마을 아르바이트', gross: 10000, rate: .05, rawTax: 500, relief: 0, tax: 500, net: 9500 },
      { id: 't2', at: Date.now() - 1000, source: '상점 물품 판매', gross: 2000, rate: .05, rawTax: 100, relief: 0, tax: 100, net: 1900 }
    ];
    myId = 'tax-student';
    players = [{ id: myId, name: '세금학생', money: 100000, bank: 0, loan: 0, taxPaid: 600, taxHistory: sampleTax, earnedTotal: 11400, socialDonated: 0, donations: {}, job: '무직', shares: {}, inventory: {}, connected: true }];
    latestState = { players, taxRate: .05, stores: [], companies: [], gameStatus: 'running' };
    menu = 'taxHistory';
    drawMenu();
    const studentTaxVisible = document.querySelector('#menuContent .taxHistoryCard')?.innerText || '';
    teacher = true;
    renderTeacherTaxReport(latestState);
    const teacherTaxVisible = document.querySelector('#teacherTaxReport')?.innerText || '';
    const kinds = ['bread', 'cafe', 'pizza', 'juice', 'meat'];
    syncStoreBuildings(kinds.map((food, index) => ({ id: 'design-' + food, ownerId: 'owner-' + index, name: food + ' shop', sign: food, food, productId: ({ bread: 'milk_bread', cafe: 'coffee', pizza: 'pizza', juice: 'orange_juice', meat: 'steak' })[food], x: index * 10, z: -20, face: 1 })));
    const designs = kinds.map(food => {
      const group = storeVisuals.get('design-' + food);
      return { food, design: group?.userData.design, features: group?.userData.features || [], children: group?.children.length || 0 };
    });
    return { studentTaxVisible, teacherTaxVisible, designs };
  });
  expect(result.studentTaxVisible).toContain('마을 아르바이트');
  expect(result.studentTaxVisible).toContain('500원');
  expect(result.teacherTaxVisible).toContain('세금학생');
  expect(result.teacherTaxVisible).toContain('600원');
  expect(result.designs.map(item => item.design)).toEqual(['bread', 'cafe', 'pizza', 'juice', 'meat']);
  expect(result.designs.every(item => item.children >= 12)).toBe(true);
  expect(new Set(result.designs.map(item => item.features.join('|'))).size).toBe(5);
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-sector-store-designs.png'), fullPage: false });
  await page.close();
});

test('마트와 도매상 가격 비교, 메뉴 이름 편집, 회사별 개별 주가 그래프를 확인한다', async ({ browser, baseURL }) => {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => { area.style.display = 'block'; document.querySelector('#login').style.display = 'none'; });
  const result = await page.evaluate(() => {
    myId='menu-owner';
    const catalog=FOOD_PRODUCTS.bread;
    players=[{id:myId,name:'메뉴사장',money:200000,bank:0,loan:0,taxPaid:0,taxHistory:[],shares:{},inventory:{},connected:true}];
    latestState={players,stores:[{id:'s1',ownerId:myId,name:'빵집',food:'bread',productId:'milk_bread',stock:4,price:3500,menuNames:{milk_bread:'사장님표 식빵'},products:{milk_bread:{stock:4,price:3500,ingredients:3}}}],wholesaleShop:{name:'도매상',ownerId:'other',owner:'도매사장',inventory:{milk_bread:{stock:20,cost:1200,price:1700}}},stocks:{AAA:{name:'항공회사',price:1000}},stockHistory:{AAA:[1000,1050,1030]},companies:[],taxRate:.05};
    menu='mart';drawMenu();const martText=document.querySelector('#menuContent').innerText;
    menu='wholesale';drawMenu();const wholesaleText=document.querySelector('#menuContent').innerText;
    menu='kitchen';drawMenu();const kitchenText=document.querySelector('#menuContent').innerText;
    menu='stocks';drawMenu();updateStockCards(latestState);drawStockChart();
    return {martText,wholesaleText,kitchenText,graphCount:document.querySelectorAll('.companyStockChart').length,customName:storeMenuName(latestState.stores[0],catalog[0])};
  });
  expect(result.martText).toContain('PIXEL MART');
  expect(result.martText).toContain('4,800원');
  expect(result.wholesaleText).toContain('마트보다 3,100원 저렴해요');
  expect(result.kitchenText).toContain('사장님표 식빵');
  expect(result.graphCount).toBe(1);
  expect(result.customName).toBe('사장님표 식빵');
  await page.screenshot({path:path.join(resultsDir,'screenshots','mart-wholesale-menu-stock-ui.png'),fullPage:true});
  await page.close();
});


test('요리 타이밍 표시·주방 전체 화면과 가게 창업 단계 구성을 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(60000);
  browserErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  collectBrowserErrors(page);
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });

  await page.evaluate(() => {
    myId = 'cook-ui-owner';
    players = [{ id: myId, name: '요리학생', money: 200000, bank: 0, loan: 0, storeId: 'cook-ui-store', connected: true }];
    latestState = {
      players,
      stores: [{
        id: 'cook-ui-store', ownerId: myId, name: '테스트 베이커리', food: 'bread',
        productId: 'milk_bread', productName: '우유 식빵', price: 3500, stock: 10,
        products: { milk_bread: { stock: 10, price: 3500, ingredients: 3 } },
        menuNames: {}
      }],
      companies: [], stocks: {}, stockHistory: {}, taxRate: .05, gameStatus: 'running', storeFee: 30000
    };
    openMenu('kitchen');
  });

  await expect(page.locator('#menuPanel')).toHaveClass(/cook-fullscreen/);
  await expect(page.locator('body')).toHaveClass(/cookingMode/);
  await expect(page.locator('#cookGoodZone')).toBeVisible();
  await expect(page.locator('#cookStart')).toBeVisible();
  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-cooking-timing.png'), fullPage: false });

  await page.evaluate(() => startCookGame());
  await expect(page.locator('#cookStop')).toBeVisible();
  const firstPosition = await page.locator('#cookMarker').evaluate(marker => marker.style.left);
  await page.waitForTimeout(450);
  const nextPosition = await page.locator('#cookMarker').evaluate(marker => marker.style.left);
  expect(nextPosition).not.toBe(firstPosition);
  const zoneLeft = await page.locator('#cookGoodZone').evaluate(zone => parseFloat(zone.style.left));
  expect(zoneLeft).toBeGreaterThanOrEqual(30);
  expect(zoneLeft).toBeLessThanOrEqual(50);
  await page.evaluate(() => stopCookGame());
  await expect(page.locator('#cookResult')).toContainText('요리 점수');

  await page.evaluate(() => {
    players[0].storeId = null;
    latestState.stores = [];
    openMenu('createStore');
  });
  const panels = page.locator('.storeWizardPanel');
  await expect(panels).toHaveCount(3);
  await expect(panels.nth(0)).toContainText('가게 이름');
  await expect(panels.nth(0)).toContainText('간판 문구');
  await expect(panels.nth(0)).toContainText('업종 선택');
  await expect(panels.nth(0).locator('#newStoreName')).toBeVisible();
  await expect(panels.nth(1)).toContainText('기계와 물건');
  await expect(panels.nth(2)).toContainText('가게 개설');
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-store-wizard-fixed.png'), fullPage: false });
  await page.close();
});


test('Kenney 하늘 배경이 학생의 실제 마을 화면에 표시된다', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  browserErrors = [];

  const teacherPage = await browser.newPage({ viewport: { width: 960, height: 600 } });
  collectBrowserErrors(teacherPage);
  await teacherPage.goto(baseURL);
  await teacherPage.locator('#pin').fill('6582');
  await teacherPage.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
  await expect(teacherPage.locator('#teacher')).toBeVisible();
  const roomCode = await teacherPage.locator('#teacherRoomCode').textContent();
  await teacherPage.getByRole('button', { name: '▶ 시작' }).click();
  await expect(teacherPage.locator('#teacherCount')).toContainText('진행 중');

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  collectBrowserErrors(page);
  const skyboxResponsePromise = page.waitForResponse(response =>
    response.url().includes('/assets/skyboxes/kenney_skyboxes/Skyboxes/skybox-day.png')
  );
  await page.goto(baseURL);
  await page.locator('#name').fill('하늘배경확인');
  await page.locator('#room').fill(roomCode.trim());
  await page.locator('#joinButton').click();

  const skyboxResponse = await skyboxResponsePromise;
  expect(skyboxResponse.status(), 'Kenney skybox PNG HTTP 상태').toBe(200);
  expect(skyboxResponse.headers()['content-type']).toContain('image/png');
  await expect(page.locator('#game canvas')).toBeVisible();
  await expect(page.locator('#lobbyOverlay')).toBeHidden({ timeout: 20000 });
  await page.waitForFunction(() =>
    typeof scene !== 'undefined' &&
    scene.background?.isTexture === true &&
    scene.background.mapping === THREE.EquirectangularReflectionMapping &&
    scene.background.image?.width > 0 &&
    scene.background.image?.height > 0
  , null, { timeout: 20000 });

  const renderState = await page.evaluate(() => ({
    width: scene.background.image.width,
    height: scene.background.image.height,
    mapping: scene.background.mapping,
    canvasWidth: renderer.domElement.width,
    canvasHeight: renderer.domElement.height
  }));
  expect(renderState.width).toBeGreaterThan(0);
  expect(renderState.height).toBeGreaterThan(0);
  expect(renderState.canvasWidth).toBeGreaterThan(0);
  expect(renderState.canvasHeight).toBeGreaterThan(0);

  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.screenshot({
    path: path.join(resultsDir, 'screenshots', 'pixel-town-kenney-skybox-student.png'),
    fullPage: false
  });
  await page.close();
  await teacherPage.close();
});


test('가게 위치 할인·튼튼한 지붕·가게 나가기 동작을 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const teacherPage = await browser.newPage({ viewport: { width: 960, height: 700 } });
  await teacherPage.goto(baseURL);
  await teacherPage.locator('#pin').fill('6582');
  await teacherPage.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
  await expect(teacherPage.locator('#teacher')).toBeVisible();
  const roomCode = (await teacherPage.locator('#teacherRoomCode').textContent()).trim();
  await teacherPage.getByRole('button', { name: '▶ 시작' }).click();
  await expect(teacherPage.locator('#teacherCount')).toContainText('진행 중');

  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  await page.goto(baseURL);
  await page.locator('#name').fill('가게오류확인');
  await page.locator('#room').fill(roomCode);
  await page.locator('#joinButton').click();
  await expect(page.locator('#lobbyOverlay')).toBeHidden({ timeout: 20000 });

  await page.evaluate(() => socket.emit('action', {
    type: 'createStore', name: '거리 빵집', sign: '거리 빵집',
    food: 'bread', productId: 'milk_bread', equipment: []
  }));
  await expect.poll(() => page.evaluate(() => latestState?.stores?.length || 0)).toBe(1);
  const storeState = await page.evaluate(() => {
    const store = latestState.stores[0];
    const group = storeVisuals.get(store.id);
    return {
      price: store.products[store.productId].price,
      basePrice: store.basePrice,
      discount: store.locationDiscount,
      roofCaps: group?.children.filter(child => child.geometry?.type === 'ShapeGeometry').length || 0
    };
  });
  expect(storeState.discount).toBeGreaterThan(0);
  expect(storeState.price).toBeLessThan(storeState.basePrice);
  expect(storeState.roofCaps).toBe(2);

  await page.evaluate(() => {
    const store = latestState.stores[0];
    socket.emit('move3d', { x: store.x, z: store.z, jump: false });
    socket.emit('enterStore', store.id);
  });
  await expect.poll(() => page.evaluate(() => selectedStore?.name || '')).toBe('거리 빵집');
  await expect(page.locator('#menuPanel')).toBeVisible();
  await page.evaluate(() => closeMenu());
  await expect.poll(() => page.evaluate(() => selectedStore === null)).toBe(true);
  await expect.poll(() => page.evaluate(() => latestState.players.find(p => p.id === myId)?.insideStore ?? null)).toBeNull();
  await expect(page.locator('#menuPanel')).toBeHidden();
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-store-exit-fixed.png'), fullPage: false });
  await page.close();
  await teacherPage.close();
});
