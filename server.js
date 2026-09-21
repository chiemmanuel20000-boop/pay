const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3001;

const DATA_PATH = path.join(__dirname, 'data');
const USERS_PATH = path.join(DATA_PATH, 'users.json');

if (!fs.existsSync(DATA_PATH)) {
  fs.mkdirSync(DATA_PATH, { recursive: true });
}

if (!fs.existsSync(USERS_PATH)) {
  fs.writeFileSync(USERS_PATH, JSON.stringify([], null, 2));
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

seedDemoAccounts();

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_PATH, 'utf8'));
  } catch (error) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_PATH, JSON.stringify(users, null, 2));
}

function createAccountNumber() {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function publicUserShape(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    phone: user.phone,
    accountNumber: user.accountNumber,
    balance: user.balance,
    availableBalance: user.balance,
    accountStatus: user.accountStatus || 'Active',
    accountType: user.accountType || 'Savings',
    dailyTransferLimit: user.dailyTransferLimit || 500000,
    cardLast4: user.cardLast4 || '0001',
    branchName: user.branchName || 'Victoria Island',
    bankName: user.bankName || 'V PAY',
    email: user.email || '',
    profileImage: user.profileImage || '',
    loginMethod: user.loginMethod || 'pin',
    theme: user.theme || 'light',
    cardNumber: user.cardNumber || '',
    cardExpiry: user.cardExpiry || '08/29',
    cardCvc: user.cardCvc || '482',
    txPin: user.txPin,
    history: user.history || []
  };
}

function seedDemoAccounts() {
  const users = readUsers();
  if (users.length > 0) return;

  const demoUsers = [
    {
      id: cryptoId(),
      fullName: 'Adaeze Okafor',
      phone: '8012345678',
      accountNumber: '7000000001',
      loginPin: '123456',
      txPin: '1234',
      idType: 'NIN',
      idNumber: '12345678901',
      faceVerified: true,
      accountStatus: 'Active',
      accountType: 'Savings',
      dailyTransferLimit: 500000,
      cardLast4: '0001',
      branchName: 'Victoria Island Branch',
      bankName: 'V PAY',
      email: 'adaeze.okafor@example.com',
      loginMethod: 'pin',
      theme: 'light',
      cardNumber: '5399 4412 7810 0001',
      cardExpiry: '08/29',
      cardCvc: '482',
      balance: 250000,
      history: [
        { id: cryptoId(), type: 'Welcome Bonus', title: 'Account Opening Bonus', amount: 250000, isCredit: true, senderName: 'V PAY', receiverName: 'Adaeze Okafor', date: new Date().toISOString(), ref: createTransactionRef('VIPY-WELCOME') }
      ]
    },
    {
      id: cryptoId(),
      fullName: 'Chinedu Eze',
      phone: '8098765432',
      accountNumber: '7000000002',
      loginPin: '654321',
      txPin: '4321',
      idType: 'BVN',
      idNumber: '22345678901',
      faceVerified: true,
      accountStatus: 'Active',
      accountType: 'Current',
      dailyTransferLimit: 750000,
      cardLast4: '3456',
      branchName: 'Lekki Phase 1 Branch',
      bankName: 'V PAY',
      email: 'chinedu.eze@example.com',
      loginMethod: 'pin',
      theme: 'light',
      cardNumber: '5399 4412 7810 3456',
      cardExpiry: '11/29',
      cardCvc: '731',
      balance: 175000,
      history: [
        { id: cryptoId(), type: 'Welcome Bonus', title: 'Account Opening Bonus', amount: 175000, isCredit: true, senderName: 'V PAY', receiverName: 'Chinedu Eze', date: new Date().toISOString(), ref: createTransactionRef('VIPY-WELCOME') }
      ]
    }
  ];

  writeUsers(demoUsers);
}

function normalizePhone(raw) {
  return String(raw || '').replace(/\D/g, '').replace(/^234/, '0');
}

function createTransactionRef(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function findUserByPhone(phone) {
  const normalized = normalizePhone(phone);
  return readUsers().find((user) => normalizePhone(user.phone) === normalized);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', app: 'V PAY backend' });
});

app.post('/api/register', (req, res) => {
  const { fullName, phone, loginPin, txPin, idType, idNumber, faceVerified } = req.body || {};

  if (!fullName || !phone || !loginPin || !txPin) {
    return res.status(400).json({ message: 'Missing required registration fields' });
  }

  if (String(loginPin).length !== 6 || !/^\d{6}$/.test(String(loginPin))) {
    return res.status(400).json({ message: 'Login PIN must be exactly 6 digits' });
  }

  if (String(txPin).length !== 4 || !/^\d{4}$/.test(String(txPin))) {
    return res.status(400).json({ message: 'Transaction PIN must be exactly 4 digits' });
  }

  const normalizedPhone = normalizePhone(phone);
  if (findUserByPhone(normalizedPhone)) {
    return res.status(409).json({ message: 'User already exists' });
  }

  const users = readUsers();
  const user = {
    id: cryptoId(),
    fullName,
    phone: normalizedPhone,
    accountNumber: createAccountNumber(),
    loginPin: String(loginPin),
    txPin: String(txPin),
    idType: idType || 'NIN',
    idNumber: String(idNumber || ''),
    faceVerified: Boolean(faceVerified),
    accountStatus: 'Active',
    accountType: 'Savings',
    dailyTransferLimit: 500000,
    cardLast4: String(Math.floor(1000 + Math.random() * 9000)),
    branchName: 'Victoria Island Branch',
    bankName: 'V PAY',
    email: '',
    profileImage: '',
    loginMethod: 'pin',
    theme: 'light',
    cardNumber: `5399 4412 7810 ${String(Math.floor(1000 + Math.random() * 9000))}`,
    cardExpiry: '08/29',
    cardCvc: String(Math.floor(100 + Math.random() * 900)),
    balance: 5000,
    history: [
      {
        id: cryptoId(),
        type: 'Welcome Bonus',
        title: 'Account Opening Bonus',
        amount: 5000,
        isCredit: true,
        senderName: 'V PAY',
        receiverName: fullName,
        date: new Date().toISOString(),
        ref: createTransactionRef('VIPY-WELCOME')
      }
    ]
  };

  users.push(user);
  writeUsers(users);

  return res.status(201).json({
    message: 'Account created successfully',
    user: publicUserShape(user)
  });
});

app.post('/api/login', (req, res) => {
  const { phone, loginPin, loginPattern } = req.body || {};
  const user = findUserByPhone(phone);

  if (!user) {
    return res.status(404).json({ message: 'Account not found' });
  }

  const credentialMatches = user.loginMethod === 'pattern'
    ? Boolean(user.loginPattern) && String(user.loginPattern) === String(loginPattern)
    : String(user.loginPin) === String(loginPin);
  if (!credentialMatches) {
    return res.status(401).json({ message: user.loginMethod === 'pattern' ? 'Incorrect login pattern' : 'Incorrect login PIN' });
  }

  return res.json({
    message: 'Login successful',
    user: publicUserShape(user)
  });
});

app.patch('/api/profile/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);
  if (!user) return res.status(404).json({ message: 'Account not found' });

  const { fullName, phone, email, profileImage } = req.body || {};
  const nextPhone = normalizePhone(phone || user.phone);
  if (!fullName || fullName.trim().length < 2 || nextPhone.length < 10) {
    return res.status(400).json({ message: 'Name and a valid phone number are required' });
  }

  const users = readUsers();
  const index = users.findIndex((entry) => entry.id === user.id);
  const duplicate = users.find((entry) => entry.id !== user.id && normalizePhone(entry.phone) === nextPhone);
  if (duplicate) return res.status(409).json({ message: 'That phone number is already in use' });

  users[index].fullName = fullName.trim();
  users[index].phone = nextPhone;
  users[index].email = String(email || '').trim();
  users[index].profileImage = String(profileImage || '');
  writeUsers(users);
  return res.json({ message: 'Profile updated', user: publicUserShape(users[index]) });
});

app.patch('/api/security/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);
  if (!user) return res.status(404).json({ message: 'Account not found' });

  const { loginPin, txPin, loginMethod, loginPattern } = req.body || {};
  if (loginPin && (!/^\d{6}$/.test(String(loginPin)))) {
    return res.status(400).json({ message: 'Login PIN must be exactly 6 digits' });
  }
  if (txPin && (!/^\d{4}$/.test(String(txPin)))) {
    return res.status(400).json({ message: 'Payment PIN must be exactly 4 digits' });
  }
  if (loginMethod && !['pin', 'pattern'].includes(loginMethod)) {
    return res.status(400).json({ message: 'Choose PIN or pattern login' });
  }
  if (loginMethod === 'pattern' && (!loginPattern || String(loginPattern).length < 4)) {
    return res.status(400).json({ message: 'Pattern must contain at least 4 points' });
  }

  const users = readUsers();
  const index = users.findIndex((entry) => entry.id === user.id);
  if (loginPin) users[index].loginPin = String(loginPin);
  if (txPin) users[index].txPin = String(txPin);
  if (loginMethod) users[index].loginMethod = loginMethod;
  if (loginPattern) users[index].loginPattern = String(loginPattern);
  writeUsers(users);
  return res.json({ message: 'Security settings updated', user: publicUserShape(users[index]) });
});

app.patch('/api/preferences/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  const { theme } = req.body || {};
  if (!['light', 'dark'].includes(theme)) return res.status(400).json({ message: 'Theme must be light or dark' });
  const users = readUsers();
  const index = users.findIndex((entry) => entry.id === user.id);
  users[index].theme = theme;
  writeUsers(users);
  return res.json({ message: 'Preferences updated', user: publicUserShape(users[index]) });
});

app.post('/api/transfer', (req, res) => {
  const { phone, recipientAccountNumber, amount, narration, txPin } = req.body || {};

  const sender = findUserByPhone(phone);
  if (!sender) {
    return res.status(404).json({ message: 'Sender account not found' });
  }

  if (String(sender.txPin) !== String(txPin)) {
    return res.status(401).json({ message: 'Incorrect transaction PIN' });
  }

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ message: 'Invalid transfer amount' });
  }

  if (sender.dailyTransferLimit && amountNumber > sender.dailyTransferLimit) {
    return res.status(400).json({ message: `Transfer exceeds your daily limit of ₦${sender.dailyTransferLimit.toLocaleString()}` });
  }

  if (sender.balance < amountNumber) {
    return res.status(400).json({ message: 'Insufficient funds' });
  }

  const users = readUsers();
  const senderIndex = users.findIndex((user) => user.id === sender.id);
  const recipient = users.find((user) => user.accountNumber === String(recipientAccountNumber));

  if (!recipient) {
    return res.status(404).json({ message: 'Recipient account not found' });
  }

  users[senderIndex].balance -= amountNumber;
  users[senderIndex].history.unshift({
    id: cryptoId(),
    type: 'Bank Transfer',
    title: 'Bank Transfer',
    amount: amountNumber,
    isCredit: false,
    senderName: sender.fullName,
    receiverName: recipient.fullName,
    date: new Date().toISOString(),
    ref: createTransactionRef('VIPY-TX'),
    narration: narration || 'Bank transfer'
  });

  const recipientIndex = users.findIndex((user) => user.id === recipient.id);
  users[recipientIndex].balance += amountNumber;
  users[recipientIndex].history.unshift({
    id: cryptoId(),
    type: 'Incoming Transfer',
    title: 'Incoming Transfer',
    amount: amountNumber,
    isCredit: true,
    senderName: sender.fullName,
    receiverName: recipient.fullName,
    date: new Date().toISOString(),
    ref: createTransactionRef('VIPY-CR'),
    narration: narration || 'Incoming transfer'
  });

  writeUsers(users);

  return res.json({
    message: 'Transfer successful',
    balance: users[senderIndex].balance,
    transaction: {
      amount: amountNumber,
      senderAccount: sender.accountNumber,
      recipientAccount: recipient.accountNumber,
      recipientName: recipient.fullName,
      ref: users[senderIndex].history[0].ref
    }
  });
});

app.post('/api/deposit', (req, res) => {
  const { phone, amount } = req.body || {};
  const user = findUserByPhone(phone);

  if (!user) {
    return res.status(404).json({ message: 'Account not found' });
  }

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ message: 'Invalid deposit amount' });
  }

  const users = readUsers();
  const index = users.findIndex((item) => item.id === user.id);
  users[index].balance += amountNumber;
  users[index].history.unshift({
    id: cryptoId(),
    type: 'Deposit',
    title: 'Instant Top Up',
    amount: amountNumber,
    isCredit: true,
    senderName: 'Bank Deposit',
    receiverName: user.fullName,
    date: new Date().toISOString(),
    ref: createTransactionRef('VIPY-DEP')
  });

  writeUsers(users);

  return res.json({
    message: 'Deposit successful',
    balance: users[index].balance,
    ref: users[index].history[0].ref
  });
});

app.get('/api/accounts/:accountNumber', (req, res) => {
  const accountNumber = String(req.params.accountNumber || '').replace(/\D/g, '');
  const users = readUsers();
  const user = users.find((entry) => entry.accountNumber === accountNumber);

  if (!user) {
    return res.status(404).json({ message: 'Account not found' });
  }

  return res.json({ accountNumber: user.accountNumber, fullName: user.fullName, bank: 'V PAY', phone: user.phone, accountStatus: user.accountStatus || 'Active' });
});

app.get('/api/dashboard/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const summary = [
    { label: 'Available Balance', value: `₦${user.balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`, type: 'balance' },
    { label: 'Monthly Income', value: '₦245,000', type: 'income' },
    { label: 'Pending Bills', value: '₦32,400', type: 'bills' },
    { label: 'Savings Goal', value: '₦75,000', type: 'savings' }
  ];

  return res.json({
    fullName: user.fullName,
    accountStatus: user.accountStatus || 'Active',
    accountType: user.accountType || 'Savings',
    accountNumber: user.accountNumber,
    availableBalance: user.balance,
    todaySpend: 12450,
    branchName: user.branchName || 'Victoria Island Branch',
    cardLast4: user.cardLast4 || '0001',
    bankName: user.bankName || 'V PAY',
    summary
  });
});

app.get('/api/statement/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json({
    accountNumber: user.accountNumber,
    name: user.fullName,
    branchName: user.branchName || 'Victoria Island Branch',
    statement: (user.history || []).slice(0, 8).map((entry) => ({
      type: entry.type,
      title: entry.title,
      amount: entry.amount,
      isCredit: entry.isCredit,
      date: entry.date,
      ref: entry.ref
    }))
  });
});

function buildInsights(user) {
  const monthlyIncome = 245000 + (Number(user.balance || 0) > 100000 ? 18000 : 5000);
  const monthlySpend = Math.max(54000, Number(user.balance || 0) * 0.22);
  const savingsGoal = 75000;
  const activeCards = [
    { label: 'Primary account', type: 'V PAY Premium', last4: user.cardLast4 || '0001', expiry: '08/29', status: 'Active' },
    { label: 'Savings vault', type: 'Goal Card', last4: '8897', expiry: '12/28', status: 'Active' },
    { label: 'Travel card', type: 'USD Wallet', last4: '1132', expiry: '03/30', status: 'Active' }
  ];

  const categories = [
    { name: 'Food & Dining', value: 28000, percentage: 26 },
    { name: 'Transport', value: 19000, percentage: 18 },
    { name: 'Bills', value: 24000, percentage: 22 },
    { name: 'Shopping', value: 25000, percentage: 23 },
    { name: 'Savings', value: 16000, percentage: 11 }
  ];

  return {
    monthlyIncome,
    monthlySpend,
    savingsGoal,
    cashFlow: monthlyIncome - monthlySpend,
    budgetStatus: 'On track',
    nextPayout: '15 Oct 2026',
    creditUtilization: 34,
    categories,
    activeCards
  };
}

app.get('/api/insights/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json(buildInsights(user));
});

app.get('/api/cards/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json([
    {
      id: 'primary-card',
      name: user.fullName,
      type: 'V PAY Premium',
      number: user.cardNumber || `5399 4412 7810 ${user.cardLast4 || '0001'}`,
      last4: user.cardLast4 || '0001',
      expiry: user.cardExpiry || '08/29',
      cvc: user.cardCvc || '482',
      brand: 'V PAY',
      status: 'Active',
      spendingLimit: 250000
    },
    {
      id: 'goal-card',
      name: 'Savings Vault',
      type: 'Goal Card',
      last4: '8897',
      expiry: '12/28',
      brand: 'V PAY',
      status: 'Active',
      spendingLimit: 170000
    },
    {
      id: 'travel-card',
      name: 'Travel Wallet',
      type: 'USD Wallet',
      last4: '1132',
      expiry: '03/30',
      brand: 'V PAY',
      status: 'Active',
      spendingLimit: 500000
    }
  ]);
});

app.get('/api/goals/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const targetAmount = 250000;
  const savedAmount = Math.min(Number(user.balance || 0) * 0.25, targetAmount);

  return res.json([
    {
      id: 'travel-fund',
      title: 'Holiday Fund',
      target: targetAmount,
      saved: savedAmount,
      progress: Math.min((savedAmount / targetAmount) * 100, 100),
      dueDate: '15 Nov 2026',
      status: 'On Track'
    },
    {
      id: 'emergency-fund',
      title: 'Emergency Cushion',
      target: 150000,
      saved: 90000,
      progress: 60,
      dueDate: '30 Oct 2026',
      status: 'Healthy'
    }
  ]);
});

app.get('/api/loans/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json([
    {
      id: 'salary-advance',
      title: 'Salary Advance',
      amount: 250000,
      rate: '1.8% p.m.',
      tenor: '6 months',
      status: 'Pre-approved',
      eligible: true
    },
    {
      id: 'asset-loan',
      title: 'Asset Finance',
      amount: 800000,
      rate: '2.1% p.m.',
      tenor: '12 months',
      status: 'New offer',
      eligible: true
    },
    {
      id: 'business-growth',
      title: 'Business Boost',
      amount: 1500000,
      rate: '2.5% p.m.',
      tenor: '18 months',
      status: 'Reviewing',
      eligible: false
    }
  ]);
});

app.get('/api/fx-rates', (_req, res) => {
  return res.json({
    baseCurrency: 'NGN',
    rates: [
      { code: 'USD', name: 'US Dollar', buy: 1540, sell: 1565 },
      { code: 'GBP', name: 'Pound Sterling', buy: 1960, sell: 1990 },
      { code: 'EUR', name: 'Euro', buy: 1680, sell: 1715 },
      { code: 'KES', name: 'Kenyan Shilling', buy: 11.8, sell: 12.4 }
    ],
    updatedAt: new Date().toISOString()
  });
});

app.get('/api/investments/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json([
    { id: 'vpay-growth', name: 'V PAY Growth Fund', allocation: '48%', value: 420000, change: 6.4, risk: 'Moderate' },
    { id: 'money-market', name: 'Money Market', allocation: '32%', value: 280000, change: 2.8, risk: 'Low' },
    { id: 'international', name: 'Global ETF Basket', allocation: '20%', value: 180000, change: 8.1, risk: 'High' }
  ]);
});

app.get('/api/beneficiaries/:phone', (req, res) => {
  const user = findUserByPhone(req.params.phone);

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  return res.json([
    { id: 'b1', name: 'Mariam Bello', account: '7000000003', bank: 'V PAY', favorite: true },
    { id: 'b2', name: 'Emeka Okafor', account: '7000000004', bank: 'First Bank', favorite: false },
    { id: 'b3', name: 'Aisha Yusuf', account: '7000000005', bank: 'GTBank', favorite: false }
  ]);
});

app.post('/api/service-payment', (req, res) => {
  const { phone, amount, serviceName, target, txPin } = req.body || {};
  const user = findUserByPhone(phone);

  if (!user) {
    return res.status(404).json({ message: 'Account not found' });
  }

  if (String(user.txPin) !== String(txPin)) {
    return res.status(401).json({ message: 'Incorrect transaction PIN' });
  }

  const amountNumber = Number(amount);
  if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
    return res.status(400).json({ message: 'Invalid amount' });
  }

  if (user.balance < amountNumber) {
    return res.status(400).json({ message: 'Insufficient funds' });
  }

  const users = readUsers();
  const index = users.findIndex((entry) => entry.id === user.id);
  users[index].balance -= amountNumber;
  users[index].history.unshift({
    id: cryptoId(),
    type: serviceName || 'Service Payment',
    title: serviceName || 'Service Payment',
    amount: amountNumber,
    isCredit: false,
    senderName: user.fullName,
    receiverName: target || 'Merchant',
    date: new Date().toISOString(),
    ref: createTransactionRef('VIPY-SERVICE')
  });

  writeUsers(users);

  return res.json({
    message: 'Service payment successful',
    balance: users[index].balance,
    ref: users[index].history[0].ref
  });
});

function cryptoId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});

module.exports = app;
