const test = require('node:test');
const assert = require('node:assert/strict');

const { execFile } = require('node:child_process');

const APP_PATH = require('node:path').join(__dirname, '..', 'server.js');
const NODE_BIN = 'C:\\Program Files\\nodejs\\node.exe';
const TEST_PORT = 3301;

function runServer() {
  return new Promise((resolve, reject) => {
    const child = execFile(NODE_BIN, [APP_PATH], {
      cwd: require('node:path').join(__dirname, '..'),
      env: { ...process.env, PORT: String(TEST_PORT) }
    }, (error) => {
      if (error && error.code !== 1) reject(error);
    });

    child.stdout.on('data', (data) => {
      if (String(data).includes('API running')) {
        resolve(child);
      }
    });

    child.stderr.on('data', (data) => {
      reject(new Error(String(data)));
    });
  });
}

test('server boots and health endpoint responds', async () => {
  const child = await runServer();

  const response = await fetch(`http://localhost:${TEST_PORT}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');

  child.kill('SIGTERM');
});

test('dashboard summary exposes realistic bank metrics', async () => {
  const child = await runServer();

  const response = await fetch(`http://localhost:${TEST_PORT}/api/dashboard/8012345678`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.accountStatus, 'Active');
  assert.ok(typeof body.availableBalance === 'number');
  assert.ok(body.summary && Array.isArray(body.summary));

  child.kill('SIGTERM');
});

test('insights endpoint exposes premium account analytics', async () => {
  const child = await runServer();

  const response = await fetch(`http://localhost:${TEST_PORT}/api/insights/8012345678`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.ok(body.monthlyIncome > 0);
  assert.ok(Array.isArray(body.categories));
  assert.ok(Array.isArray(body.activeCards));

  child.kill('SIGTERM');
});

test('wallet and savings goals endpoints expose premium financial products', async () => {
  const child = await runServer();

  const cardsResponse = await fetch(`http://localhost:${TEST_PORT}/api/cards/8012345678`);
  const cardsBody = await cardsResponse.json();
  const goalsResponse = await fetch(`http://localhost:${TEST_PORT}/api/goals/8012345678`);
  const goalsBody = await goalsResponse.json();

  assert.equal(cardsResponse.status, 200);
  assert.equal(goalsResponse.status, 200);
  assert.ok(Array.isArray(cardsBody));
  assert.ok(Array.isArray(goalsBody));
  assert.ok(cardsBody[0].last4);
  assert.match(cardsBody[0].number, /^\d{4}( \d{4}){3}$/);
  assert.match(cardsBody[0].cvc, /^\d{3}$/);
  assert.ok(goalsBody[0].target > 0);

  child.kill('SIGTERM');
});

test('portfolio and beneficiaries endpoints expose premium banking products', async () => {
  const child = await runServer();

  const portfolioResponse = await fetch(`http://localhost:${TEST_PORT}/api/investments/8012345678`);
  const portfolioBody = await portfolioResponse.json();
  const beneficiariesResponse = await fetch(`http://localhost:${TEST_PORT}/api/beneficiaries/8012345678`);
  const beneficiariesBody = await beneficiariesResponse.json();

  assert.equal(portfolioResponse.status, 200);
  assert.equal(beneficiariesResponse.status, 200);
  assert.ok(Array.isArray(portfolioBody));
  assert.ok(Array.isArray(beneficiariesBody));
  assert.ok(portfolioBody[0].value > 0);
  assert.ok(beneficiariesBody[0].name);

  child.kill('SIGTERM');
});
