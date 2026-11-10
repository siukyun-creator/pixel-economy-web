'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = probe.address().port;
      probe.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function startServer(port, dataDir) {
  const child = spawn(process.execPath, [path.join(projectRoot, 'server.js')], {
    cwd: projectRoot,
    env: { ...process.env, PORT: String(port), TEACHER_PIN: '6582', DATA_DIR: dataDir },
    stdio: 'ignore'
  });
  const baseURL = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`저장 테스트 서버가 종료됐어요: ${child.exitCode}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return { child, baseURL };
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  child.kill('SIGKILL');
  throw new Error('저장 테스트 서버가 시작되지 않았어요.');
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  await new Promise(resolve => {
    const timer = setTimeout(() => {
      if (child.exitCode === null) child.kill('SIGKILL');
      resolve();
    }, 4000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill('SIGTERM');
  });
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = io(url, { transports: ['websocket'], reconnection: false, timeout: 10000 });
    socket.once('connect', () => resolve(socket));
    socket.once('connect_error', reject);
  });
}

function emitAck(socket, event, payload) {
  return new Promise((resolve, reject) => {
    socket.timeout(10000).emit(event, payload, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
  });
}

function nextEvent(socket, event, trigger) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${event} 이벤트 시간 초과`)), 10000);
    socket.once(event, value => {
      clearTimeout(timer);
      resolve(value);
    });
    trigger();
  });
}

test('서버 재시작 후 교실 코드와 학생 잔액을 복구한다', async () => {
  test.setTimeout(60000);
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pixel-town-save-'));
  const port = await freePort();
  let processInfo;
  let manager;
  let student;
  let teacher;
  let resumed;
  try {
    processInfo = await startServer(port, dataDir);
    manager = await connect(processInfo.baseURL);
    const created = await emitAck(manager, 'createClassroom', { pin: '6582' });
    expect(created.ok).toBe(true);
    const roomCode = created.roomCode;
    const namespace = `${processInfo.baseURL}/classrooms/${roomCode}`;
    student = await connect(namespace);
    expect((await emitAck(student, 'join', { name: '저장학생', room: roomCode })).ok).toBe(true);
    teacher = await connect(namespace);
    expect((await emitAck(teacher, 'teacherLogin', '6582')).ok).toBe(true);
    expect((await emitAck(teacher, 'teacherCommand', { pin: '6582', type: 'bonus', value: 12345 })).ok).toBe(true);

    const before = await nextEvent(student, 'state', () => student.emit('sync'));
    expect(before.players.find(player => player.name === '저장학생').money).toBe(212345);
    manager.disconnect();
    student.disconnect();
    teacher.disconnect();
    manager = student = teacher = null;
    await new Promise(resolve => setTimeout(resolve, 500));
    await stopServer(processInfo.child);
    processInfo = await startServer(port, dataDir);

    resumed = await connect(`${processInfo.baseURL}/classrooms/${roomCode}`);
    const joinedEvent = nextEvent(resumed, 'joined', () => {});
    const joinResult = await emitAck(resumed, 'join', { name: '저장학생', room: roomCode });
    const joined = await joinedEvent;
    expect(joinResult.ok).toBe(true);
    expect(joined.resumed).toBe(true);
    const after = await nextEvent(resumed, 'state', () => resumed.emit('sync'));
    expect(after.players.find(player => player.name === '저장학생').money).toBe(212345);
    expect(after.players).toHaveLength(1);
  } finally {
    manager?.disconnect();
    student?.disconnect();
    teacher?.disconnect();
    resumed?.disconnect();
    if (processInfo?.child) await stopServer(processInfo.child);
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});
