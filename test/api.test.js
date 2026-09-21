const test = require('node:test');
const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const path = require('node:path');

const PORT = 3311;
const NODE = process.execPath;
const APP = path.join(__dirname, '..', 'server.js');

function startServer() {
  return new Promise((resolve, reject) => {
    const child = execFile(NODE, [APP], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(PORT) } });
    child.stdout.on('data', (data) => { if (String(data).includes('BBN Bank Nigeria running')) resolve(child); });
    child.stderr.on('data', (data) => reject(new Error(String(data))));
  });
}

test('health and login work', async () => {
  const server = await startServer();
  const health = await fetch(`http://localhost:${PORT}/api/health`).then(response => response.json());
  const login = await fetch(`http://localhost:${PORT}/api/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ phone: '8012345678', credential: '123456', method: 'pin' }) }).then(response => response.json());
  assert.equal(health.status, 'ok');
  assert.equal(login.user.accountNumber, '7000000001');
  server.kill();
});

test('dashboard, card and products are available', async () => {
  const server = await startServer();
  for (const route of ['/api/dashboard/7000000001', '/api/card/7000000001', '/api/products/7000000001', '/api/transactions/7000000001']) {
    const response = await fetch(`http://localhost:${PORT}${route}`);
    assert.equal(response.status, 200, route);
  }
  server.kill();
});

test('transfer validates and returns a receipt', async () => {
  const server = await startServer();
  const response = await fetch(`http://localhost:${PORT}/api/transfer`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ accountNumber: '7000000001', recipientAccount: '7000000002', amount: 1, paymentPin: '1234', note: 'Test' }) });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.transaction.status, 'Successful');
  server.kill();
});
