'use strict';

const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

function connect(url) {
  return io(url, { transports: ['websocket'], reconnection: false, timeout: 10000 });
}
function connected(socket) {
  return new Promise((resolve, reject) => {
    socket.once('connect_error', reject);
    socket.once('connect', resolve);
  });
}
function ack(socket, event, ...args) {
  return new Promise((resolve, reject) => {
    socket.timeout(7000).emit(event, ...args, (error, result) => error ? reject(error) : resolve(result));
  });
}
async function join(socket, name, roomCode) {
  await connected(socket);
  const result = await ack(socket, 'join', { name, room: roomCode });
  expect(result.ok).toBe(true);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('초기 상태 수신 시간 초과')), 7000);
    socket.once('state', state => { clearTimeout(timer); resolve(state); });
    socket.emit('sync');
  });
}
async function createRoom(baseURL) {
  const manager = connect(baseURL);
  await connected(manager);
  const result = await ack(manager, 'createClassroom', { pin: '6582' });
  expect(result.ok).toBe(true);
  return { manager, roomCode: result.roomCode, namespace: baseURL + result.namespace };
}
async function loginTeacher(namespace, pin = '6582') {
  const teacher = connect(namespace);
  await connected(teacher);
  return { teacher, result: await ack(teacher, 'teacherLogin', pin) };
}
function rejectedAction(socket, action) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(action.type + ' 거절 안내 시간 초과')), 5000);
    socket.once('notice', message => { clearTimeout(timer); resolve(message); });
    socket.emit('action', action);
  });
}
function sync(socket) {
  return new Promise(resolve => { socket.once('state', resolve); socket.emit('sync'); });
}

test('권한·잘못된 금액·중복 접속·재접속 시 학생 데이터 보존을 검사한다', async ({ baseURL }) => {
  test.setTimeout(60000);
  let manager, teacher, student, duplicate, reconnected, badTeacher;
  try {
    const room = await createRoom(baseURL);
    manager = room.manager;

    const bad = await loginTeacher(room.namespace, '0000');
    badTeacher = bad.teacher;
    expect(bad.result.ok).toBe(false);
    badTeacher.disconnect();
    badTeacher = null;

    const good = await loginTeacher(room.namespace);
    teacher = good.teacher;
    expect(good.result.ok).toBe(true);
    const started = await ack(teacher, 'teacherCommand', { pin: '6582', type: 'start', value: 1 });
    expect(started.gameStatus).toBe('running');

    student = connect(room.namespace);
    let state = await join(student, '경계테스트학생', room.roomCode);
    const oldId = state.players.find(p => p.name === '경계테스트학생').id;
    const player = current => current.players.find(p => p.name === '경계테스트학생');
    const initialMoney = player(state).money;

    duplicate = connect(room.namespace);
    await connected(duplicate);
    const duplicateResult = await ack(duplicate, 'join', { name: '경계테스트학생', room: room.roomCode });
    expect(duplicateResult.ok).toBe(false);
    expect(duplicateResult.message).toContain('이미 접속');

    expect(await rejectedAction(student, { type: 'loan', amount: 15000 })).toContain('10,000원 단위');
    state = await sync(student);
    expect(player(state).money).toBe(initialMoney);
    expect(player(state).loan).toBe(0);

    expect(await rejectedAction(student, { type: 'donate', amount: 500 })).toContain('1,000~100,000원');
    state = await sync(student);
    expect(player(state).money).toBe(initialMoney);
    expect(player(state).socialDonated).toBe(0);

    student.disconnect();
    await new Promise(resolve => setTimeout(resolve, 200));
    reconnected = connect(room.namespace);
    state = await join(reconnected, '경계테스트학생', room.roomCode);
    expect(player(state).id).not.toBe(oldId);
    expect(player(state).money).toBe(initialMoney);
    expect(player(state).loan).toBe(0);
    expect(player(state).socialDonated).toBe(0);
    expect(player(state).connected).toBe(true);
  } finally {
    for (const socket of [reconnected, duplicate, student, teacher, badTeacher, manager]) {
      if (socket) socket.disconnect();
    }
  }
});
