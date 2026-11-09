'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

const resultsDir = path.resolve(__dirname, '..', '..', 'test-results');

function connectSocket(url) {
  return new Promise((resolve, reject) => {
    const client = io(url, { transports: ['websocket'], reconnection: false, timeout: 10000 });
    client.once('connect_error', reject);
    client.once('connect', () => resolve(client));
  });
}

function emitAck(client, event, payload) {
  return new Promise((resolve, reject) => {
    client.timeout(12000).emit(event, payload, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

test('30명이 동시에 가게를 창업하면 30개 건물이 마을에 생성된다', async ({ browser, baseURL }) => {
  test.setTimeout(120000);
  const manager = await connectSocket(baseURL);
  const clients = [];
  let teacher;
  let roomCode;

  try {
    const created = await emitAck(manager, 'createClassroom', { pin: '6582' });
    expect(created.ok).toBe(true);
    roomCode = created.roomCode;
    expect(roomCode).toMatch(/^\d{4}$/);

    teacher = await connectSocket(`${baseURL}/classrooms/${roomCode}`);
    const login = await emitAck(teacher, 'teacherLogin', '6582');
    expect(login.ok).toBe(true);
    teacher.emit('teacherCommand', { pin: '6582', type: 'start' });

    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseURL);
    await page.locator('#name').fill('가게테스트01');
    await page.locator('#room').fill(roomCode);
    await page.locator('#joinButton').click();
    await expect(page.locator('#gameArea')).toBeVisible();

    const others = await Promise.all(Array.from({ length: 29 }, async (_, index) => {
      const client = await connectSocket(`${baseURL}/classrooms/${roomCode}`);
      clients.push(client);
      const joined = await emitAck(client, 'join', {
        name: `가게테스트${String(index + 2).padStart(2, '0')}`,
        room: roomCode
      });
      expect(joined.ok).toBe(true);
      return client;
    }));
    expect(others).toHaveLength(29);

    await expect.poll(() => page.evaluate(() => latestState?.players?.length || 0), { timeout: 15000 }).toBe(30);

    const firstSocket = await page.evaluate(() => socket.id);
    const pageClient = page;
    const results = await Promise.all([
      pageClient.evaluate(() => new Promise((resolve, reject) => {
        const handler = result => {
          socket.off('storeCreated', handler);
          result?.ok ? resolve(result) : reject(new Error(result?.message || '첫 번째 가게 창업 실패'));
        };
        socket.on('storeCreated', handler);
        socket.emit('action', {
          type: 'createStore', name: '테스트가게01', sign: '01', food: 'bread',
          productId: 'milk_bread', color: '#e5a84b', wallColor: '#f4e3c1',
          signStyle: 'classic', signColor: '#fff4d6', awningStyle: 'classic', decor: 'plant'
        });
      })),
      ...clients.map((client, index) => new Promise((resolve, reject) => {
        const handler = result => {
          client.off('storeCreated', handler);
          result?.ok ? resolve(result) : reject(new Error(result?.message || '가게 창업 실패'));
        };
        client.on('storeCreated', handler);
        client.emit('action', {
          type: 'createStore', name: `테스트가게${String(index + 2).padStart(2, '0')}`,
          sign: String(index + 2), food: 'bread', productId: 'milk_bread',
          color: '#67b7d8', wallColor: '#f4e3c1', signStyle: 'classic',
          signColor: '#fff4d6', awningStyle: 'classic', decor: 'plant'
        });
      }))
    ]);
    expect(results).toHaveLength(30);
    expect(results.every(result => result.ok && result.store?.id)).toBe(true);

    await expect.poll(() => page.evaluate(() => latestState?.stores?.length || 0), { timeout: 20000 }).toBe(30);
    await expect.poll(() => page.evaluate(() => businessVisuals?.size || 0), { timeout: 20000 }).toBe(30);

    fs.mkdirSync(path.join(resultsDir, 'screenshots'), { recursive: true });
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-30-stores-village.png'),
      fullPage: false,
      animations: 'disabled'
    });
    await page.screenshot({
      path: path.join(resultsDir, 'screenshots', 'pixel-town-30-stores-ui.png'),
      fullPage: true,
      animations: 'disabled'
    });
    await test.info().attach('30개-가게-창업-결과.json', {
      body: Buffer.from(JSON.stringify({
        roomCode,
        students: 30,
        storesCreated: results.length,
        renderedStoreBuildings: await page.evaluate(() => businessVisuals.size),
        storeNames: results.map(result => result.store.name)
      }, null, 2)),
      contentType: 'application/json'
    });
    await page.close();
  } finally {
    clients.forEach(client => client.disconnect());
    teacher?.disconnect();
    manager.disconnect();
  }
});
