'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { io } = require('socket.io-client');
const { test, expect } = require('@playwright/test');

const projectRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');

test.afterEach(async () => {
  expect(fs.readFileSync(path.join(resultsDir, 'server-errors.log'), 'utf8'), '30명 접속 서버 오류')
    .toBe('');
});

function joinClassroom(baseURL, roomCode, name, clients) {
  return new Promise((resolve, reject) => {
    const client = io(`${baseURL}/classrooms/${roomCode}`, {
      transports: ['websocket'],
      reconnection: false,
      timeout: 10000
    });
    clients.push(client);
    client.once('connect_error', reject);
    client.once('connect', () => {
      client.timeout(10000).emit('join', { name, room: roomCode }, (error, result) => {
        if (error) reject(error);
        else resolve({ client, result });
      });
    });
  });
}

test('30명의 동시 학생 접속은 허용하고 31번째 신규 접속은 거부한다', async ({ baseURL }) => {
  test.setTimeout(90000);
  const manager = io(baseURL, {
    transports: ['websocket'],
    reconnection: false,
    timeout: 10000
  });
  const clients = [];

  try {
    const roomCode = await new Promise((resolve, reject) => {
      manager.once('connect_error', reject);
      manager.once('connect', () => {
        manager.timeout(10000).emit('createClassroom', { pin: '6582' }, (error, result) => {
          if (error || !result?.ok) {
            reject(new Error(result?.message || error?.message || '부하 테스트 교실 생성 실패'));
          } else {
            resolve(result.roomCode);
          }
        });
      });
    });
    expect(roomCode).toMatch(/^\d{4}$/);

    const joined = await Promise.all(
      Array.from({ length: 30 }, (_, index) =>
        joinClassroom(baseURL, roomCode, `동접${String(index + 1).padStart(2, '0')}`, clients)
      )
    );
    expect(joined).toHaveLength(30);
    expect(joined.every(entry => entry.result?.ok)).toBe(true);
    expect(new Set(joined.map(entry => entry.result.ok)).size).toBe(1);

    const overflow = await joinClassroom(baseURL, roomCode, '동접초과', clients);
    expect(overflow.result?.ok).toBe(false);
    expect(overflow.result?.message).toContain('30명');
    await test.info().attach('30명-동시접속-결과.json', {
      body: Buffer.from(JSON.stringify({
        roomCode,
        acceptedStudents: joined.length,
        overflowRejected: !overflow.result.ok
      }, null, 2)),
      contentType: 'application/json'
    });
  } finally {
    clients.forEach(client => client.disconnect());
    manager.disconnect();
  }
});
