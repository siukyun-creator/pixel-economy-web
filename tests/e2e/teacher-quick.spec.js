'use strict';

const { test, expect } = require('@playwright/test');

test('선생님 화면 핵심 기능과 태블릿 표시만 빠르게 확인한다', async ({ page, baseURL }) => {
  test.setTimeout(90000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(baseURL);

  await page.locator('#pin').fill('6582');
  await page.getByRole('button', { name: '＋ 새 교실 만들기' }).click();

  const teacher = page.locator('#teacher');
  await expect(teacher).toBeVisible();
  await expect(page.locator('#teacherRoomCode')).toHaveText(/^[0-9]{4}$/);
  await expect(page.locator('#teacherCount')).toBeVisible();

  for (const label of ['▶ 시작', '⏸ 일시정지', '▶ 재개', '■ 종료']) {
    await expect(teacher.getByRole('button', { name: label })).toBeVisible();
  }
  await expect(page.locator('#teacherQuickNews')).toBeVisible();
  await expect(page.locator('#roster')).toHaveCount(1);

  // 세금 설정은 선생님 기본 화면에서 바로 조절할 수 있어야 한다.
  await expect(page.locator('#teacherTaxSettings')).toBeVisible();
  await expect(page.locator('#teacherTaxReport')).toBeVisible();
  await expect(page.locator('#tax')).toHaveValue('5');
  await page.locator('#tax').fill('12');
  await page.getByRole('button', { name: '세율 저장' }).click();
  await expect(page.locator('#teacherCount')).toContainText('세율 12%', { timeout: 10000 });
  await expect(page.locator('#teacherCount')).toContainText('세율 12%');
  await expect(page.locator('#teacherTaxReport')).toContainText('현재 세율 12%');
  await expect(page.locator('.teacherGrid')).toHaveCount(0);
  await expect(page.locator('#teacherAdvancedToggle')).toBeVisible();

  // 학생은 입장 버튼을 한 번만 눌러도 들어가고, 잔디 바닥이 실제 장면에 있어야 한다.
  const student = await page.context().newPage();
  await student.setViewportSize({ width: 1024, height: 768 });
  await student.goto(baseURL);
  await student.locator('#name').fill('한번입장학생');
  await student.locator('#room').fill(await page.locator('#teacherRoomCode').textContent());
  await student.getByRole('button', { name: '입장', exact: true }).click();
  await expect(student.locator('#gameArea')).toBeVisible({ timeout: 20000 });
  await expect(student.locator('#login')).toBeHidden();
  await expect(student.locator('#game canvas')).toHaveCount(1);
  await expect.poll(() => student.evaluate(() => typeof scene !== 'undefined' && Boolean(scene.getObjectByName('town-ground')?.visible))).toBe(true);
  await student.close();

  for (const viewport of [{ width: 820, height: 1024 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    const bounds = await teacher.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    });
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
  }
});
