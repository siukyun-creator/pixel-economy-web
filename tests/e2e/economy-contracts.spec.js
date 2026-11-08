'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');

function createClassroom(baseURL) {
  const manager = io(baseURL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000
  });
  return new Promise((resolve, reject) => {
    manager.once('connect_error', reject);
    manager.once('connect', () => {
      manager.timeout(10000).emit('createClassroom', { pin: '2468' }, (error, result) => {
        if (error || !result?.ok) {
          manager.disconnect();
          reject(new Error(result?.message || error?.message || '교실 생성 실패'));
        } else {
          resolve({ manager, roomCode: result.roomCode });
        }
      });
    });
  });
}

function joinStudent(client, name, roomCode) {
  return new Promise((resolve, reject) => {
    let acknowledged = false;
    let joined = false;
    const timer = setTimeout(
      () => reject(new Error(`${name} 입장 시간 초과 (ack=${acknowledged}, joined=${joined})`)),
      20000
    );
    const syncIfReady = () => {
      if (!acknowledged || !joined) return;
      client.once('state', state => {
        clearTimeout(timer);
        resolve(state);
      });
      client.emit('sync');
    };

    client.once('connect_error', error => {
      clearTimeout(timer);
      reject(error);
    });
    client.once('joined', () => {
      joined = true;
      syncIfReady();
    });
    client.once('connect', () => {
      client.timeout(7000).emit('join', { name, room: roomCode }, (error, result) => {
        if (error || !result?.ok) {
          clearTimeout(timer);
          reject(new Error(result?.message || error?.message || `${name} 입장 실패`));
          return;
        }
        acknowledged = true;
        syncIfReady();
      });
    });
  });
}

function startClassroom(baseURL, roomCode) {
  const teacher = io(`${baseURL}/classrooms/${roomCode}`, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000
  });
  return new Promise((resolve, reject) => {
    teacher.once('connect_error', reject);
    teacher.once('connect', () => {
      teacher.timeout(7000).emit('teacherLogin', '2468', (loginError, login) => {
        if (loginError || !login?.ok) {
          teacher.disconnect();
          reject(new Error(login?.message || loginError?.message || '교사 접속 실패'));
          return;
        }
        teacher.once('teacherCommandResult', result => {
          if (result?.gameStatus === 'running') resolve(teacher);
          else reject(new Error('수업 시작 실패'));
        });
        teacher.emit('teacherCommand', { pin: '2468', type: 'start', value: 1 });
      });
    });
  });
}

test.afterEach(async () => {
  fs.mkdirSync(resultsDir, { recursive: true });
  expect(fs.readFileSync(path.join(resultsDir, 'server-errors.log'), 'utf8'), '경제 기능 서버 오류')
    .toBe('');
});

test('소득·소비·저축·대출·기부·투자·창업 경제 계약을 유지한다', async ({ baseURL }) => {
  test.setTimeout(90000);
  let manager;
  let teacher;
  let student;
  const extraStudents = [];

  try {
    const classroom = await createClassroom(baseURL);
    manager = classroom.manager;
    const roomCode = classroom.roomCode;
    teacher = await startClassroom(baseURL, roomCode);

    student = io(`${baseURL}/classrooms/${roomCode}`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });
    let state = await joinStudent(student, '경제계약학생', roomCode);
    const playerId = state.players.find(player => player.name === '경제계약학생').id;
    const playerFrom = current => current.players.find(player => player.id === playerId);

    const act = (target, action) => new Promise((resolve, reject) => {
      let actionNotified = false;
      const cleanup = () => {
        clearTimeout(timer);
        target.off('notice', onNotice);
        target.off('state', onState);
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error(`${action.type} 상태 응답 시간 초과`));
      }, 5000);
      const onNotice = () => {
        actionNotified = true;
      };
      const onState = next => {
        if (!actionNotified) return;
        cleanup();
        resolve(next);
      };
      target.on('notice', onNotice);
      target.on('state', onState);
      target.emit('action', action);
    });

    const initialMoney = playerFrom(state).money;
    state = await act(student, { type: 'work' });
    expect(playerFrom(state).money).toBe(initialMoney + 9500);
    expect(playerFrom(state).taxPaid).toBe(500);
    expect(playerFrom(state).earnedTotal).toBe(9500);

    state = await act(student, { type: 'deposit', amount: 1 });
    expect(playerFrom(state).bank).toBe(10000);
    state = await act(student, { type: 'withdraw', amount: 1 });
    expect(playerFrom(state).bank).toBe(0);

    state = await act(student, { type: 'loan', amount: 10000 });
    expect(playerFrom(state).loan).toBe(10000);
    state = await act(student, { type: 'repayLoan', amount: 10000 });
    expect(playerFrom(state).loan).toBe(0);

    state = await act(student, { type: 'donate', amount: 1000 });
    expect(playerFrom(state).socialDonated).toBe(1000);
    expect(playerFrom(state).taxRelief).toBe(100);

    state = await new Promise(resolve => {
      student.once('state', resolve);
      student.emit('move3d', { x: -13, z: -12, jump: false });
    });
    state = await act(student, { type: 'buy', item: 'apple', amount: 1 });
    expect(playerFrom(state).inventory.apple).toBe(1);
    state = await act(student, { type: 'sell', item: 'apple', amount: 1 });
    expect(playerFrom(state).inventory.apple).toBe(0);
    expect(playerFrom(state).money).toBeLessThan(initialMoney + 9500);

    state = await act(student, { type: 'stockBuy', item: 'SKY', amount: 1 });
    expect(playerFrom(state).shares.SKY).toBe(1);
    state = await act(student, { type: 'stockSell', item: 'SKY', amount: 1 });
    expect(playerFrom(state).shares.SKY).toBe(0);
    expect(playerFrom(state).taxPaid).toBeGreaterThan(500);

    state = await act(student, { type: 'startup', item: '경제회사' });
    const ticker = playerFrom(state).company;
    expect(ticker).toMatch(/^CO\d+$/);
    expect(playerFrom(state).shares[ticker]).toBe(10);

    const storeCreationPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('가게 생성 응답 시간 초과')), 5000);
      student.once('storeCreated', result => {
        clearTimeout(timer);
        resolve(result);
      });
    });
    state = await act(student, {
      type: 'createStore',
      name: '경제 베이커리',
      sign: '경제 베이커리',
      food: 'bread',
      productId: 'milk_bread'
    });
    const storeCreation = await new Promise((resolve, reject) => {
      storeCreationPromise.then(resolve, reject);
    });
    expect(storeCreation?.ok).toBe(true);
    const store = state.stores.find(entry => entry.id === storeCreation.store.id);
    expect(store).toBeTruthy();

    state = await act(student, { type: 'storeRestock', storeId: store.id });
    expect(state.stores.find(entry => entry.id === store.id).stock).toBe(store.stock + 5);
    state = await act(student, { type: 'setStorePrice', productId: 'milk_bread', amount: 4000 });
    expect(state.stores.find(entry => entry.id === store.id).products.milk_bread.price).toBe(4000);

    const wholesaler = io(`${baseURL}/classrooms/${roomCode}`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });
    extraStudents.push(wholesaler);
    state = await joinStudent(wholesaler, '경제유통학생', roomCode);
    const wholesalerId = state.players.find(entry => entry.name === '경제유통학생').id;
    const wholesalerFrom = current => current.players.find(player => player.id === wholesalerId);

    state = await act(wholesaler, { type: 'createWholesale', name: '경제 유통상' });
    expect(wholesalerFrom(state).money).toBe(120000);
    await new Promise(resolve => {
      wholesaler.once('state', resolve);
      wholesaler.emit('move3d', { x: -22, z: 17, jump: false });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('도매상 입장 시간 초과')), 5000);
      wholesaler.once('wholesaleEntered', () => {
        clearTimeout(timer);
        resolve();
      });
      wholesaler.emit('enterWholesale');
    });
    let wholesalerState = await act(
      wholesaler,
      { type: 'wholesaleStockUp', productId: 'milk_bread', amount: 5 }
    );
    expect(wholesalerState.wholesaleShop.inventory.milk_bread.stock).toBe(5);
    wholesalerState = await act(
      wholesaler,
      { type: 'setWholesalePrice', productId: 'milk_bread', amount: 1700 }
    );
    expect(wholesalerState.wholesaleShop.inventory.milk_bread.price).toBe(1700);

    await new Promise(resolve => {
      student.once('state', resolve);
      student.emit('move3d', { x: -22, z: 17, jump: false });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('도매 구매자 입장 시간 초과')), 5000);
      student.once('wholesaleEntered', () => {
        clearTimeout(timer);
        resolve();
      });
      student.emit('enterWholesale');
    });
    const receiptPromise = new Promise(resolve => student.once('receiptIssued', resolve));
    state = await act(student, { type: 'wholesaleCheckout', items: [{ productId: 'milk_bread', amount: 2 }] });
    expect((await receiptPromise).total).toBe(3400);
    expect(state.stores.find(entry => entry.id === store.id).products.milk_bread.ingredients).toBe(2);
    state = await act(student, { type: 'cook', productId: 'milk_bread', score: 80 });
    const cookedStore = state.stores.find(entry => entry.id === store.id);
    expect(cookedStore.products.milk_bread.ingredients).toBe(1);
    expect(cookedStore.products.milk_bread.stock).toBeGreaterThan(10);

    await new Promise(resolve => {
      wholesaler.once('state', resolve);
      wholesaler.emit('move3d', { x: store.x, z: store.z, jump: false });
    });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('가게 입장 시간 초과')), 5000);
      wholesaler.once('storeEntered', () => {
        clearTimeout(timer);
        resolve();
      });
      wholesaler.emit('enterStore', store.id);
    });
    state = await act(wholesaler, { type: 'storeBuy', storeId: store.id, productId: 'milk_bread', amount: 1 });
    expect(wholesalerFrom(state).money).toBeLessThan(120000);
    state = await act(student, { type: 'transfer', item: '경제유통학생', amount: 1000 });
    expect(playerFrom(state).money).toBeLessThan(100000);
  } finally {
    extraStudents.forEach(client => client.disconnect());
    if (student) student.disconnect();
    if (teacher) teacher.disconnect();
    if (manager) manager.disconnect();
  }
});
