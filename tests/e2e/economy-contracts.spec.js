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
      manager.timeout(10000).emit('createClassroom', { pin: '6582' }, (error, result) => {
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
      teacher.timeout(7000).emit('teacherLogin', '6582', (loginError, login) => {
        if (loginError || !login?.ok) {
          teacher.disconnect();
          reject(new Error(login?.message || loginError?.message || '교사 접속 실패'));
          return;
        }
        teacher.once('teacherCommandResult', result => {
          if (result?.gameStatus === 'running') resolve(teacher);
          else reject(new Error('수업 시작 실패'));
        });
        teacher.emit('teacherCommand', { pin: '6582', type: 'start', value: 1 });
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
    const teacherCommand = (type, value = 1) => new Promise(resolve => {
      teacher.once('teacherCommandResult', resolve);
      teacher.emit('teacherCommand', { pin: '6582', type, value });
    });
    const syncStudent = () => new Promise(resolve => {
      student.once('state', resolve);
      student.emit('sync');
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

    state = await act(student, { type: 'donate', amount: 1000, cause: 'disability' });
    expect(playerFrom(state).socialDonated).toBe(1000);
    expect(playerFrom(state).donations.disability).toBe(1000);
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

    const stockOwner = io(`${baseURL}/classrooms/${roomCode}`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });
    extraStudents.push(stockOwner);
    let stockOwnerState = await joinStudent(stockOwner, '주식회사학생', roomCode);
    stockOwnerState = await act(stockOwner, { type: 'createCompany', item: '주식회사', sector: 'electronics' });
    const publicTicker = stockOwnerState.players.find(player => player.name === '주식회사학생').company;
    expect(Object.keys(stockOwnerState.stocks)).toEqual([publicTicker]);
    state = await syncStudent();
    expect(state.stocks.SKY).toBeUndefined();
    expect(state.stocks.PIX).toBeUndefined();
    state = await act(student, { type: 'stockBuy', item: publicTicker, amount: 1 });
    expect(playerFrom(state).shares[publicTicker]).toBe(1);
    const priceBeforeDemand = state.stocks[publicTicker].price;
    await teacherCommand('advanceMarket');
    state = await syncStudent();
    expect(state.stocks[publicTicker].price).toBeGreaterThan(priceBeforeDemand);
    state = await act(student, { type: 'stockSell', item: publicTicker, amount: 1 });
    expect(playerFrom(state).shares[publicTicker]).toBe(0);
    const priceBeforeSupply = state.stocks[publicTicker].price;
    await teacherCommand('advanceMarket');
    state = await syncStudent();
    expect(state.stocks[publicTicker].price).toBeLessThan(priceBeforeSupply);
    expect(playerFrom(state).taxPaid).toBeGreaterThan(500);

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
    const companyNotice = new Promise(resolve => student.once('notice', resolve));
    student.emit('action', { type: 'startup', item: '두 번째 회사' });
    expect(await companyNotice).toContain('한 학생은');

    const entrepreneur = io(`${baseURL}/classrooms/${roomCode}`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });
    extraStudents.push(entrepreneur);
    let entrepreneurState = await joinStudent(entrepreneur, '경제창업학생', roomCode);
    const entrepreneurId = entrepreneurState.players.find(player => player.name === '경제창업학생').id;
    const entrepreneurFrom = current => current.players.find(player => player.id === entrepreneurId);
    entrepreneurState = await act(entrepreneur, { type: 'createCompany', item: '경제회사', sector: 'electronics' });
    const ticker = entrepreneurFrom(entrepreneurState).company;
    expect(ticker).toMatch(/^CO\d+$/);
    expect(entrepreneurFrom(entrepreneurState).shares[ticker]).toBe(10);
    const company = entrepreneurState.companies.find(entry => entry.ticker === ticker);
    expect(company.sector).toBe('electronics');
    expect(company.productName).toBe('픽셀 스마트폰');
    entrepreneurState = await act(entrepreneur, { type: 'produceCompanyGoods', amount: 1 });
    expect(entrepreneurState.companies.find(entry => entry.ticker === ticker).inventory).toBe(1);
    state = await act(student, { type: 'buyCompanyGoods', ticker, amount: 1 });
    const operatedCompany = state.companies.find(entry => entry.ticker === ticker);
    expect(operatedCompany.soldUnits).toBe(1);
    expect(operatedCompany.operatingProfit).toBe(10000);
    expect(operatedCompany.inventory).toBe(0);
    const secondBusinessNotice = new Promise(resolve => entrepreneur.once('notice', resolve));
    entrepreneur.emit('action', {
      type: 'createStore',
      name: '두 번째 사업',
      food: 'bread',
      productId: 'milk_bread'
    });
    expect(await secondBusinessNotice).toContain('한 학생은');

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

    const employmentCandidates = [];
    for (let index = 0; index < 4; index += 1) {
      const candidate = io(`${baseURL}/classrooms/${roomCode}`, {
        transports: ['websocket'],
        reconnection: false,
        timeout: 10000
      });
      extraStudents.push(candidate);
      const candidateName = `취업학생${index + 1}`;
      const candidateState = await joinStudent(candidate, candidateName, roomCode);
      const candidateId = candidateState.players.find(entry => entry.name === candidateName).id;
      employmentCandidates.push({ client: candidate, id: candidateId, name: candidateName });
      await act(candidate, { type: 'employmentApply', storeId: store.id });
    }

    for (const [index, candidate] of employmentCandidates.slice(0, 3).entries()) {
      state = await act(student, {
        type: 'hireEmployee',
        storeId: store.id,
        employeeId: candidate.id,
        salary: (index + 1) * 10000
      });
    }
    expect(state.stores.find(entry => entry.id === store.id).employees).toHaveLength(3);
    const fourthHireNotice = new Promise(resolve => student.once('notice', resolve));
    student.emit('action', {
      type: 'hireEmployee',
      storeId: store.id,
      employeeId: employmentCandidates[3].id,
      salary: 10000
    });
    expect(await fourthHireNotice).toContain('최대 3명');

    state = await act(student, {
      type: 'setEmployeeSalary',
      storeId: store.id,
      employeeId: employmentCandidates[0].id,
      salary: 15000
    });
    const payrollBalance = playerFrom(state).money;
    state = await act(student, { type: 'payroll', storeId: store.id });
    expect(playerFrom(state).money).toBe(payrollBalance - 65000);
    for (const [index, candidate] of employmentCandidates.slice(0, 3).entries()) {
      expect(state.players.find(entry => entry.id === candidate.id).money)
        .toBe(200000 + (index === 0 ? 15000 : (index + 1) * 10000));
    }
    const duplicatePayrollNotice = new Promise(resolve => student.once('notice', resolve));
    student.emit('action', { type: 'payroll', storeId: store.id });
    expect(await duplicatePayrollNotice).toContain('이번 달 월급은 이미 지급');

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
    const moneyBeforeTransfer = playerFrom(state).money;
    state = await act(student, { type: 'transfer', item: '경제유통학생', amount: 1000 });
    expect(playerFrom(state).money).toBe(moneyBeforeTransfer - 1000);

    await teacherCommand('marketTime', { dayIndex: 5, time: '15:00', turnMinutes: 30 });
    const saturdayFinalStatePromise = new Promise(resolve => {
      const onState = next => {
        if (next.gameStatus !== 'ended') return;
        teacher.off('state', onState);
        resolve(next);
      };
      teacher.on('state', onState);
    });
    await teacherCommand('advanceMarket');
    const finalState = await saturdayFinalStatePromise;
    expect(finalState.marketClock.day).toBe('토요일');
    expect(finalState.marketClock.time).toBe('15:30');
    expect(finalState.finalAwards).toBeTruthy();
    expect(finalState.finalAwards.ceo.name).toBe('경제회사');
    expect(finalState.finalAwards.ceo.operatingProfit).toBe(10000);

    const resetStatePromise = new Promise(resolve => {
      const onState = next => {
        if (next.companies.length) return;
        student.off('state', onState);
        resolve(next);
      };
      student.on('state', onState);
    });
    const resetResultPromise = new Promise(resolve => teacher.once('teacherCommandResult', resolve));
    teacher.emit('teacherCommand', { pin: '6582', type: 'resetEconomy' });
    const resetResult = await resetResultPromise;
    expect(resetResult.ok).toBe(true);
    const resetState = await resetStatePromise;
    expect(resetState.companies).toHaveLength(0);
    expect(resetState.stocks[publicTicker]).toBeUndefined();
    expect(playerFrom(resetState).company).toBeNull();
    expect(playerFrom(resetState).donations).toEqual({
      community: 0,
      disability: 0,
      seniors: 0,
      inclusiveEmployment: 0
    });
    expect(playerFrom(resetState).shares).toEqual({});
  } finally {
    extraStudents.forEach(client => client.disconnect());
    if (student) student.disconnect();
    if (teacher) teacher.disconnect();
    if (manager) manager.disconnect();
  }
});
