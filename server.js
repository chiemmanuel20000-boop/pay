const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const path = require('node:path');

const app = express();
const PORT = process.env.PORT || 3001;
const DATA_FILE = path.join(__dirname, 'data', 'users.json');
app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use(express.static(__dirname));

function users() { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
function save(data) { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); }
function id(prefix = 'BBN') { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`; }
function find(identity) { const value = String(identity || '').replace(/\D/g, ''); return users().find(user => user.accountNumber === value || user.phone === value); }
function publicUser(user) { const { loginPin, paymentPin, pattern, ...safe } = user; return { ...safe, availableBalance: user.balance, bank: 'BBN Bank Nigeria' }; }
function requireUser(identity, res) { const user = find(identity); if (!user) { res.status(404).json({ message: 'Account not found' }); return null; } return user; }

app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', bank: 'BBN Bank Nigeria' }));

app.post('/api/register', (req, res) => {
  const { fullName, phone, email, loginPin, paymentPin } = req.body || {};
  if (!fullName || !phone || !/^\d{6}$/.test(String(loginPin)) || !/^\d{4}$/.test(String(paymentPin))) return res.status(400).json({ message: 'Complete all required account details' });
  const data = users();
  if (data.some(user => user.phone === String(phone).replace(/\D/g, ''))) return res.status(409).json({ message: 'Phone number already registered' });
  const accountNumber = String(7000000000 + data.length + 1);
  const user = { id: id('USER'), fullName, phone: String(phone).replace(/\D/g, ''), email: email || '', accountNumber, loginPin: String(loginPin), paymentPin: String(paymentPin), balance: 5000, accountType: 'Savings', loginMethod: 'pin', pattern: '', profileImage: '', theme: 'light', card: { number: `5399 4412 7810 ${String(1000 + data.length).padStart(4, '0')}`, expiry: '08/30', cvc: String(100 + data.length) }, history: [{ id: id('TX'), title: 'Welcome bonus', type: 'Welcome bonus', amount: 5000, isCredit: true, name: 'BBN Bank Nigeria', date: new Date().toISOString(), ref: id('BBN') }] };
  data.push(user); save(data); res.status(201).json({ user: publicUser(user) });
});

app.post('/api/login', (req, res) => {
  const { phone, credential, method = 'pin' } = req.body || {};
  const user = find(phone);
  if (!user) return res.status(404).json({ message: 'Account not found' });
  const valid = method === 'pattern' ? user.loginMethod === 'pattern' && user.pattern === credential : user.loginPin === String(credential);
  if (!valid) return res.status(401).json({ message: 'The sign-in details are incorrect' });
  res.json({ user: publicUser(user) });
});

app.get('/api/dashboard/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; res.json({ user: publicUser(user), summary: [{ label: 'Available balance', value: user.balance }, { label: 'Monthly income', value: 245000 }, { label: 'Savings goal', value: 75000 }, { label: 'Bills due', value: 32400 }] }); });
app.get('/api/transactions/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; res.json(user.history || []); });
app.get('/api/card/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; res.json({ ...user.card, holder: user.fullName, type: 'BBN Premium Debit', status: 'Active' }); });
app.get('/api/products/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; res.json({ goals: [{ title: 'Emergency cushion', target: 150000, saved: Math.min(user.balance * 0.25, 150000), due: '30 Nov 2026' }], investments: [{ name: 'BBN Growth Fund', value: 420000, change: 6.4 }, { name: 'Money Market', value: 280000, change: 2.8 }], beneficiaries: [{ name: 'Chinedu Eze', account: '7000000002', bank: 'BBN Bank Nigeria' }] }); });

app.patch('/api/profile/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; const data = users(); const index = data.findIndex(item => item.id === user.id); data[index] = { ...data[index], fullName: req.body.fullName || user.fullName, phone: String(req.body.phone || user.phone).replace(/\D/g, ''), email: req.body.email ?? user.email, profileImage: req.body.profileImage ?? user.profileImage }; save(data); res.json({ user: publicUser(data[index]) }); });
app.patch('/api/preferences/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; const data = users(); const index = data.findIndex(item => item.id === user.id); data[index].theme = req.body.theme === 'dark' ? 'dark' : 'light'; save(data); res.json({ user: publicUser(data[index]) }); });
app.patch('/api/security/:account', (req, res) => { const user = requireUser(req.params.account, res); if (!user) return; const { loginPin, paymentPin, loginMethod, pattern } = req.body || {}; if (loginPin && !/^\d{6}$/.test(String(loginPin))) return res.status(400).json({ message: 'Login PIN must be exactly 6 digits' }); if (paymentPin && !/^\d{4}$/.test(String(paymentPin))) return res.status(400).json({ message: 'Payment PIN must be exactly 4 digits' }); if (loginMethod === 'pattern' && String(pattern || '').split('-').length < 4) return res.status(400).json({ message: 'Draw at least 4 pattern points' }); const data = users(); const index = data.findIndex(item => item.id === user.id); if (loginPin) data[index].loginPin = String(loginPin); if (paymentPin) data[index].paymentPin = String(paymentPin); if (loginMethod) data[index].loginMethod = loginMethod; if (pattern) data[index].pattern = pattern; save(data); res.json({ user: publicUser(data[index]) }); });

app.post('/api/deposit', (req, res) => { const user = requireUser(req.body.accountNumber, res); if (!user) return; const amount = Number(req.body.amount); if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ message: 'Enter a valid amount' }); const data = users(); const index = data.findIndex(item => item.id === user.id); data[index].balance += amount; data[index].history.unshift({ id: id('TX'), title: 'Cash deposit', type: 'Deposit', amount, isCredit: true, name: 'BBN Bank Nigeria', date: new Date().toISOString(), ref: id('BBN') }); save(data); res.json({ balance: data[index].balance }); });
app.post('/api/transfer', (req, res) => { const sender = requireUser(req.body.accountNumber, res); if (!sender) return; if (sender.paymentPin !== String(req.body.paymentPin)) return res.status(401).json({ message: 'Incorrect payment PIN' }); const amount = Number(req.body.amount); const data = users(); const recipient = data.find(item => item.accountNumber === String(req.body.recipientAccount)); if (!recipient) return res.status(404).json({ message: 'Recipient account not found' }); if (!Number.isFinite(amount) || amount <= 0 || sender.balance < amount) return res.status(400).json({ message: 'Check the amount and available balance' }); const senderIndex = data.findIndex(item => item.id === sender.id); const reference = id('BBN-TX'); data[senderIndex].balance -= amount; data[senderIndex].history.unshift({ id: id('TX'), title: 'Bank transfer', type: 'Transfer', amount, isCredit: false, name: recipient.fullName, date: new Date().toISOString(), ref: reference }); const recipientIndex = data.findIndex(item => item.id === recipient.id); data[recipientIndex].balance += amount; data[recipientIndex].history.unshift({ id: id('TX'), title: 'Incoming transfer', type: 'Transfer', amount, isCredit: true, name: sender.fullName, date: new Date().toISOString(), ref: reference }); save(data); res.json({ balance: data[senderIndex].balance, transaction: { status: 'Successful', reference, recipient: recipient.fullName, amount } }); });
app.post('/api/service-payment', (req, res) => { const user = requireUser(req.body.accountNumber, res); if (!user) return; if (user.paymentPin !== String(req.body.paymentPin)) return res.status(401).json({ message: 'Incorrect payment PIN' }); const amount = Number(req.body.amount); if (!Number.isFinite(amount) || amount <= 0 || user.balance < amount) return res.status(400).json({ message: 'Check the amount and available balance' }); const data = users(); const index = data.findIndex(item => item.id === user.id); data[index].balance -= amount; data[index].history.unshift({ id: id('TX'), title: req.body.title || 'Bill payment', type: 'Payment', amount, isCredit: false, name: req.body.target || 'Service provider', date: new Date().toISOString(), ref: id('BBN-PAY') }); save(data); res.json({ balance: data[index].balance }); });

app.listen(PORT, () => console.log(`BBN Bank Nigeria running on http://localhost:${PORT}`));
module.exports = app;
