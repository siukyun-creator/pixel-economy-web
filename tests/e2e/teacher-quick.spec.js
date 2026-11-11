'use strict';

const { test, expect } = require('@playwright/test');

test('선생님 화면 핵심 기능과 태블릿 표시만 빠르게 확인한다', async ({ page, baseURL }) => {
  test.setTimeout(30000);
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto(baseURL);

  await page.locator('#pin').fill('6582');
  await page.getByRole('button', { name: '＋ 새 교실 만들기' }).click();

  const teacher = page.locator('#teacher');
  await expect(teacher).toBeVisible();
  await expect(page.locator('#teacherRoomCode')).toHaveText(/^\\d{4}$/);
  await expect(page.locator('#teacherCount')).toBeVisible();

  for (const label of ['▶ 시작', '⏸ 일시정지', '▶ 재개', '■ 종료']) {
    await expect(teacher.getByRole('button', { name: label })).toBeVisible();
  }
  await expect(page.locator('#teacherQuickNews')).toBeVisible();
  await expect(page.locator('#roster')).toBeVisible();

  // 세금·보너스·가게 관리용 복잡한 교사 패널은 화면에서 제거한다.
  await expect(page.locator('#teacherTaxReport')).toHaveCount(0);
  await expect(page.locator('#tax')).toHaveCount(0);
  await expect(page.locator('.teacherGrid')).toHaveCount(0);
  await expect(page.locator('#teacherAdvancedToggle')).toHaveCount(0);

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
