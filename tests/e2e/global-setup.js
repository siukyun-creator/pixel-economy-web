'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..', '..');
const resultsDir = path.join(projectRoot, 'test-results');
const serverLogPath = path.join(resultsDir, 'server.log');
const serverErrorsPath = path.join(resultsDir, 'server-errors.log');
const port = '4178';

function appendLine(filePath, stream, chunk) {
  const text = chunk.toString();
  fs.appendFileSync(filePath, `[${new Date().toISOString()}] ${stream}: ${text}`);
  return text;
}

module.exports = async function globalSetup() {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.writeFileSync(serverLogPath, '');
  fs.writeFileSync(serverErrorsPath, '');

  const server = spawn(process.execPath, [path.join(projectRoot, 'server.js')], {
    cwd: projectRoot,
    env: { ...process.env, PORT: port, TEACHER_PIN: '6582' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let spawnError;

  server.stdout.on('data', chunk => {
    const text = appendLine(serverLogPath, 'stdout', chunk);
    if (/\b(error|exception|uncaught|failed|EADDRINUSE)\b/i.test(text)) {
      appendLine(serverErrorsPath, 'stdout', chunk);
    }
  });
  server.stderr.on('data', chunk => {
    appendLine(serverLogPath, 'stderr', chunk);
    appendLine(serverErrorsPath, 'stderr', chunk);
  });
  server.on('error', error => {
    spawnError = error;
    appendLine(serverErrorsPath, 'spawn', `${error.stack || error}\n`);
  });

  const baseURL = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) {
      throw new Error(`게임 서버가 예기치 않게 종료됐습니다 (exit code: ${server.exitCode}).`);
    }
    try {
      const response = await fetch(baseURL);
      if (response.ok) {
        return async function globalTeardown() {
          if (server.exitCode !== null) return;
          await new Promise(resolve => {
            const timeout = setTimeout(resolve, 3000);
            server.once('exit', () => {
              clearTimeout(timeout);
              resolve();
            });
            server.kill();
          });
        };
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }

  server.kill();
  throw new Error(`게임 서버가 30초 안에 시작되지 않았습니다. 로그: ${serverLogPath}`);
};
