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
    await expect(page.locator('#teacherMarketControls')).toBeVisible();
    fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
    await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-teacher-dashboard.png'), fullPage: true });
    await page.locator('#teacherMarketControls details summary').click();
    await page.locator('#marketDay').selectOption('5');
    await page.locator('#marketTime').fill('14:45');
    await page.locator('#marketTurnMinutes').fill('45');
    await page.getByRole('button', { name: '거래 시간 저장' }).click();
    await expect(page.locator('#marketStatus')).toContainText('토요일 14:45 · 거래 중 · 한 턴 45분');
    await page.locator('#turnDurationMinutes').selectOption('1');
    await page.locator('#totalTurns').selectOption('1');
    await page.getByRole('button', { name: '설정 저장' }).click();
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
  await page.getByRole('button', { name: /채용·지원/ }).click();
  await expect(page.locator('.employmentPanel')).toContainText('장애인 고용과 포용적인 일터');
  await expect(page.locator('.employmentPanel')).toContainText('자발적으로 지원한 학생만 채용');
  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /내 가게/ }).click();
  await expect(page.locator('.communityReport')).toContainText('사회공헌과 나눔');
  await expect(page.locator('.communityReport')).toContainText('장애인 고용 지원');
  await expect(page.locator('.communityReport')).toContainText('어르신 지원');
  await page.locator('#donationCause').selectOption('inclusiveEmployment');
  await expect(page.locator('#donationCauseNote')).toContainText('정당한 보수');
  await expect(page.locator('.communityReport')).toContainText('실제 기관이나 공공사업으로 전달되지 않아요.');

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /사업 시작/ }).click();
  await page.getByRole('button', { name: '가게 만들기' }).click();
  const foodChoices = page.locator('#foodProductChoices [role="radio"]');
  await expect(foodChoices).toHaveCount(3);
  await expect(page.locator('#foodArtRegister')).toHaveCount(0);
  await expect(page.locator('.foodDrawingTools')).toHaveCount(0);
  await foodChoices.nth(1).click();
  await expect(page.locator('#foodProductChoices')).toHaveAttribute('data-selected', 'croissant');
  await expect(page.locator('#foodPreview')).toBeVisible();
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
  await page.goto('about:blank');await page.close();

});


test('기업 뉴스·제품 구매·채용 메뉴가 분리되고 가방과 순위표가 없다', async ({ browser, baseURL }) => {
  browserErrors = [];
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  collectBrowserErrors(page);
  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });
  await expect(page.locator('#newsTicker')).toBeVisible();
  await expect(page.getByRole('button', { name: /기업 뉴스/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /기업 제품/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /채용·지원/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /가방|순위표/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /새로고침/ })).toHaveCount(0);

  fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
  await page.getByRole('button', { name: /기업 뉴스/ }).click();
  await expect(page.locator('.newsIntro')).toBeVisible();
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-company-news.png'), fullPage: true });

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /기업 제품/ }).click();
  await expect(page.locator('#menuTitle')).toContainText('기업 제품 구매');
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-company-products.png'), fullPage: true });

  await page.getByRole('button', { name: '닫기 ✕' }).click();
  await page.getByRole('button', { name: /채용·지원/ }).click();
  await expect(page.locator('#menuTitle')).toContainText('회사 채용·지원');
  await page.screenshot({ path: path.join(resultsDir, 'screenshots', 'pixel-town-company-jobs.png'), fullPage: true });
  await page.close();
});

test('학생이 4자리 코드로 입장해 키보드로 이동한다', async ({ browser, baseURL }) => {
  test.setTimeout(180000);
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
    await teacherPage.locator('#advanceMarketButton').click();
    await expect(price).not.toHaveText(previousPrice);
    await expect(page.locator('#menuContent .stockCard .stockChange').first()).toHaveText(/▲/);
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
    await page.getByRole('button', { name: '제품 생산' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies[0].inventory)).toBe(1);

    const wholesalePage = await browser.newPage({ viewport: { width: 960, height: 600 } });
    collectBrowserErrors(wholesalePage);
    await wholesalePage.goto(baseURL);
    await wholesalePage.locator('#name').fill('E2E도매학생');
    await wholesalePage.locator('#room').fill(roomCode);
    await wholesalePage.locator('#joinButton').click();
    await expect(wholesalePage.locator('#lobbyOverlay')).toBeHidden();
    await wholesalePage.getByRole('button', { name: /채용·지원/ }).click();
    const companyTicker = await page.evaluate(() => latestState.companies[0].ticker);
    await wholesalePage.locator('[data-company-employment="' + companyTicker + '"]')
      .getByRole('button', { name: '회사에 지원하기' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies[0].employmentApplications.length)).toBe(1);
    await page.getByRole('button', { name: /채용·지원/ }).click();
    await expect(page.locator('[data-company-employment="' + companyTicker + '"]')).toContainText('E2E도매학생');
    const employeeId = await wholesalePage.evaluate(() => myId);
    await page.locator('#company-offer-' + employeeId).fill('12000');
    await page.locator('[data-company-employment="' + companyTicker + '"]')
      .getByRole('button', { name: '채용하고 월급 정하기' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies[0].employees.length)).toBe(1);
    await expect.poll(() => wholesalePage.evaluate(() => latestState.players.find(player => player.id === myId).job))
      .toContain('회사 직원');
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-company-employment.png'),
      fullPage: true
    });
    await wholesalePage.getByRole('button', { name: /사업 시작/ }).click();
    await wholesalePage.locator('#hubWholesaleName').fill('E2E도매');
    await wholesalePage.getByRole('button', { name: '도매상 창업하기' }).click();
    await expect.poll(() => wholesalePage.evaluate(() => Boolean(latestState.wholesaleShop))).toBe(true);
    await expect.poll(() => page.evaluate(() => businessVisuals.size)).toBe(2);
    await expect(wholesalePage.locator('.businessChoice').nth(1)).toContainText('내 도매상을 운영');
    await wholesalePage.getByRole('button', { name: '닫기 ✕' }).click();
    await wholesalePage.getByRole('button', { name: /기업 제품/ }).click();
    await expect(wholesalePage.locator('.companyProductCard')).toContainText('픽셀 스마트폰');
    await wholesalePage.locator('.companyProductCard').getByRole('button', { name: '🛒 구매하기' }).click();
    await expect.poll(() => page.evaluate(() => latestState.companies[0].operatingProfit)).toBe(10000);
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
