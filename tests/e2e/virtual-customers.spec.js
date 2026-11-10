'use strict';

const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

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

function requestState(client) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      client.off('state', onState);
      reject(new Error('상태 동기화 시간 초과'));
    }, 5000);
    const onState = state => {
      clearTimeout(timer);
      client.off('state', onState);
      resolve(state);
    };
    client.once('state', onState);
    client.emit('sync');
  });
}

test('선생님이 정한 100% 확률로 가상 손님이 방문하고 재고·매출·현금이 반영된다', async ({ browser, baseURL }) => {
  test.setTimeout(90000);
  const manager = await connectSocket(baseURL);
  let teacher;
  let student;
  let page;
  try {
    const created = await emitAck(manager, 'createClassroom', { pin: '6582' });
    expect(created.ok).toBe(true);
    const roomCode = created.roomCode;

    teacher = await connectSocket(`${baseURL}/classrooms/${roomCode}`);
    expect((await emitAck(teacher, 'teacherLogin', '6582')).ok).toBe(true);
    const rateResult = await emitAck(teacher, 'teacherCommand', {
      pin: '6582', type: 'storeCustomerRate', value: 100
    });
    expect(rateResult.ok).toBe(true);
    const startResult = await emitAck(teacher, 'teacherCommand', { pin: '6582', type: 'start' });
    expect(startResult.ok).toBe(true);

    page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
    await page.goto(baseURL);
    await page.locator('#name').fill('가상손님테스트학생');
    await page.locator('#room').fill(roomCode);
    await page.locator('#joinButton').click();
    await expect(page.locator('#gameArea')).toBeVisible();

    student = await connectSocket(`${baseURL}/classrooms/${roomCode}`);
    const joined = await emitAck(student, 'join', { name: '가상손님테스트주인', room: roomCode });
    expect(joined.ok).toBe(true);

    const createdStore = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('가게 생성 응답 시간 초과')), 10000);
      student.once('storeCreated', result => {
        clearTimeout(timer);
        result?.ok ? resolve(result.store) : reject(new Error('가게 생성 실패'));
      });
      student.emit('action', {
        type: 'createStore', name: '가상손님빵집', sign: '빵집',
        food: 'bread', productId: 'milk_bread', equipment: ['oven_premium', 'display_premium', 'seat_lounge']
      });
    });
    expect(createdStore.products.milk_bread.stock).toBe(10);
    expect(createdStore.setupCost).toBe(112000);
    expect(createdStore.customerBoost).toBeCloseTo(0.40, 5);
    expect(createdStore.equipment.map(item => item.name)).toEqual(['대형 데크 오븐', '프리미엄 쇼케이스', '베이커리 라운지']);

    const initialMoney = 200000 - createdStore.setupCost;
    await expect.poll(async () => {
      const state = await requestState(student);
      const store = state.stores.find(item => item.id === createdStore.id);
      return store?.visitorCount || 0;
    }, { timeout: 15000, intervals: [500, 1000] }).toBeGreaterThanOrEqual(1);

    const finalState = await requestState(student);
    const finalStore = finalState.stores.find(item => item.id === createdStore.id);
    const owner = finalState.players.find(item => item.name === '가상손님테스트주인');
    expect(finalStore.visitorCount).toBeGreaterThanOrEqual(1);
    expect(finalStore.products.milk_bread.stock).toBeLessThan(10);
    expect(finalStore.soldUnits).toBeGreaterThanOrEqual(1);
    expect(finalStore.revenue).toBeGreaterThanOrEqual(3500);
    expect(owner.money).toBeGreaterThan(initialMoney);
    await page.screenshot({ path: 'test-results/virtual-customer-store.png', fullPage: true });
  } finally {
    student?.disconnect();
    teacher?.disconnect();
    manager.disconnect();
    await page?.close();
  }
});
