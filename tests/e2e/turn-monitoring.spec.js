'use strict';

const { test, expect } = require('@playwright/test');

test('자동 턴 종료와 학생·교사 결과 화면을 확인한다', async ({ browser, baseURL }) => {
  test.setTimeout(150000);
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

  await teacher.locator('#turnDurationMinutes').fill('1');
  await teacher.locator('#totalTurns').fill('1');
  await teacher.getByRole('button', { name: '턴 설정 적용' }).click();

  await student.goto(baseURL);
  await student.locator('#name').fill('턴테스트학생');
  await student.locator('#room').fill(roomCode);
  await student.locator('#joinButton').click();
  await expect(student.locator('#gameArea')).toBeVisible();
  await expect(teacher.locator('#roster')).toContainText('턴테스트학생');

  await teacher.getByRole('button', { name: '▶ 시작' }).click();
  await expect(student.locator('#turnHud')).toContainText('턴 1/1');
  await expect(teacher.locator('#marketStatus')).toContainText('실제 턴 1/1');

  await expect(student.locator('#finalResults')).toBeVisible({ timeout: 75000 });
  await expect(teacher.locator('#finalResults')).toBeVisible({ timeout: 10000 });
  await expect(student.locator('#finalResults')).toContainText('학생별 마감 현황');
  await expect(teacher.locator('#finalResults')).toContainText('턴테스트학생');
  await expect(student.locator('#turnSummaryOverlay')).toBeVisible();
  expect(errors).toEqual([]);

  await teacher.close();
  await student.close();
});
