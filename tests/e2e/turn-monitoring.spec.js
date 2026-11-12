'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { test, expect } = require('@playwright/test');

test('자동 턴 종료와 학생·교사 결과 화면을 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(240000);
  const teacher = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const student = await browser.newPage({ viewport: { width: 1100, height: 760 } });
  const errors = [];
  for (const page of [teacher, student]) {
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  }

  await teacher.goto(baseURL);
  await teacher.locator('#pin').fill('6582');
  await teacher.getByRole('button', { name: '＋ 새 교실 만들기' }).click();
  await expect(teacher.locator('#teacher')).toBeVisible();
  const roomCode = await teacher.locator('#teacherRoomCode').textContent();

  await teacher.getByRole('button', { name: '⚙ 추가 설정' }).click();
  await teacher.locator('#turnDurationMinutes').selectOption('1');
  await teacher.locator('#totalTurns').selectOption('1');
  await teacher.getByRole('button', { name: '설정 저장' }).click();
  await expect(teacher.locator('#marketStatus')).toContainText('실제 턴 1/1', { timeout: 10000 });

  await student.goto(baseURL);
  await student.locator('#name').fill('턴테스트학생');
  await student.locator('#room').fill(roomCode);
  await student.locator('#joinButton').click();
  await expect(student.locator('#gameArea')).toBeVisible();
  await expect(teacher.locator('#roster')).toContainText('턴테스트학생');

  await teacher.getByRole('button', { name: '▶ 시작' }).click();
  await expect(student.locator('#turnHud')).toContainText('월요일');
  await student.getByRole('button', { name: /사업 시작/ }).click();
  await student.locator('#hubCompanyName').fill('뉴스테스트기업');
  await student.locator('#hubCompanySector').selectOption('electronics');
  await student.getByRole('button', { name: '기업 창업하기' }).click();
  await expect.poll(() => student.evaluate(() => latestState.companies.length)).toBe(1);
  await student.getByRole('button', { name: /내 가게/ }).click();
  const productionPlan = await student.evaluate(() => {
    const company = latestState.companies[0];
    const owner = latestState.players.find(player => player.id === myId);
    return Math.min(10, Math.floor(owner.money / company.unitCost));
  });
  expect(productionPlan, '창업 후 남은 현금으로 생산할 수 있는 수량을 계산한다').toBeGreaterThan(0);
  await student.locator('#myCompanyProduceQty').fill(String(productionPlan));
  await student.getByRole('button', { name: '제품 생산' }).click();
  // 자동 손님이 재고를 판매할 수 있으므로 생산량은 재고+판매량으로 검증한다.
  await expect.poll(() => student.evaluate(() => latestState.companies[0].producedUnits)).toBe(productionPlan);
  await expect.poll(() => student.evaluate(() => latestState.companies[0].inventory + latestState.companies[0].soldUnits)).toBe(productionPlan);
  await expect(student.locator('#turnHud')).toContainText('턴 1/1');
  await expect(teacher.locator('#marketStatus')).toContainText('실제 턴 1/1');
  await student.getByRole('button', { name: '닫기 ✕' }).click();

  await expect(student.locator('#finalResults')).toBeVisible({ timeout: 120000 });
  await expect(teacher.locator('#finalResults')).toBeVisible({ timeout: 10000 });
  await expect(student.locator('#finalResults')).toContainText('학생별 마감 현황');
  await expect(teacher.locator('#finalResults')).toContainText('턴테스트학생');
  await expect.poll(() => student.evaluate(() => latestState.newsFeed.length)).toBe(1);
  await expect.poll(() => student.evaluate(() => latestState.companies[0].customerDemand)).not.toBe(100);
  await expect(student.locator('#newsTicker')).toContainText(/호재 뉴스|악재 뉴스/);
  await expect(teacher.locator('#teacherNewsFeed')).toContainText('뉴스테스트기업');
  await expect(student.locator('#finalResults')).toContainText('뉴스테스트기업');
  await expect(student.locator('#turnSummaryOverlay')).toContainText('이번 턴 결과');
  const screenshotDir = path.resolve(__dirname, '..', '..', 'test-results', 'screenshots');
  fs.mkdirSync(screenshotDir, { recursive: true });
  await teacher.screenshot({ path: path.join(screenshotDir, 'pixel-town-teacher-news-monitor.png'), fullPage: true });
  await student.locator('#finalResults button').first().click();
  await expect(student.locator('#finalResults')).toBeHidden();
  await student.locator('.moreMenu > summary').click();
  await expect(student.getByRole('button', { name: /기업 뉴스/ })).toBeVisible();
  await student.getByRole('button', { name: /기업 뉴스/ }).click();
  await expect(student.locator('.newsCard').first()).toBeVisible();
  await student.screenshot({ path: path.join(screenshotDir, 'pixel-town-random-company-news.png'), fullPage: true });
  expect(errors).toEqual([]);

  await teacher.close();
  await student.close();
});
