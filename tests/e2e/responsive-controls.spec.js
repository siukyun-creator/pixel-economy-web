'use strict';

const { test, expect } = require('@playwright/test');

test('PC와 태블릿 화면에서 메뉴 버튼과 패널이 정상 작동한다', async ({ page, baseURL }) => {
  test.setTimeout(90000);
  const viewports = [
    { name: 'PC', width: 1365, height: 768 },
    { name: '태블릿 가로', width: 1024, height: 768 },
    { name: '태블릿 세로', width: 820, height: 1024 },
    { name: '작은 태블릿', width: 768, height: 1024 }
  ];

  await page.goto(baseURL);
  await page.locator('#gameArea').evaluate(area => {
    area.style.display = 'block';
    document.querySelector('#login').style.display = 'none';
  });

  for (const viewport of viewports) {
    await test.step(viewport.name + ' 화면에서 은행·주식 메뉴 열기/닫기', async () => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      const bankButton = page.locator('.menus button').filter({ hasText: '은행' }).first();
      await bankButton.click();
      await expect(page.locator('#menuPanel')).toBeVisible();
      await expect(page.locator('#menuContent .cookCard').first()).toBeVisible();

      const bankBounds = await page.locator('#menuPanel').evaluate(panel => {
        const rect = panel.getBoundingClientRect();
        return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
      });
      expect(bankBounds.left, viewport.name + ' 은행 메뉴 왼쪽 잘림').toBeGreaterThanOrEqual(0);
      expect(bankBounds.top, viewport.name + ' 은행 메뉴 위쪽 잘림').toBeGreaterThanOrEqual(0);
      expect(bankBounds.right, viewport.name + ' 은행 메뉴 오른쪽 잘림').toBeLessThanOrEqual(viewport.width + 1);
      expect(bankBounds.bottom, viewport.name + ' 은행 메뉴 아래쪽 잘림').toBeLessThanOrEqual(viewport.height + 1);

      await page.getByRole('button', { name: '닫기 ✕' }).click();
      await expect(page.locator('#menuPanel')).toBeHidden();

      const stocksButton = page.locator('.menus button').filter({ hasText: '주식' }).first();
      await stocksButton.click();
      await expect(page.locator('#menuPanel')).toBeVisible();
      await expect(page.locator('#menuContent')).toContainText('아직 운영 중인 내 기업이 없어요.');
      await page.getByRole('button', { name: '닫기 ✕' }).click();
      await expect(page.locator('#menuPanel')).toBeHidden();

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        viewport.name + ' 가로 화면 넘침').toBe(true);
    });
  }

  await page.close();
});
