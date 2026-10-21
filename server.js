const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DEFAULT_PORT = Number(process.env.PORT || 3080);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expectedHash) {
  const { hash } = hashPassword(password, salt);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
}

function getInitialDb() {
  const adminCreds = hashPassword('Admin@Deriv2026!');
  const analystCreds = hashPassword('IctTrader#2026!');
  const traderCreds = hashPassword('TraderPro$2026!');

  return {
    users: [
      {
        id: 'usr_admin_01',
        name: 'Will Admin (Superusuario)',
        email: 'admin@synthetics.pro',
        role: 'super_admin',
        authProvider: 'local',
        salt: adminCreds.salt,
        passwordHash: adminCreds.hash,
        twoFactorEnabled: true,
        twoFactorSecret: '246810',
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
        lastLogin: new Date().toISOString(),
        subscribedSymbols: ['R_75', '1HZ75V', 'BOOM1000', 'CRASH1000', 'JD75', 'R_100']
      },
      {
        id: 'usr_analyst_02',
        name: 'Elena ICT Strategist',
        email: 'elena.ict@synthetics.pro',
        role: 'strategist',
        authProvider: 'google',
        salt: analystCreds.salt,
        passwordHash: analystCreds.hash,
        twoFactorEnabled: true,
        twoFactorSecret: '135790',
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        lastLogin: new Date(Date.now() - 3600000 * 2).toISOString(),
        subscribedSymbols: ['R_75', '1HZ100V', 'JD50', 'BOOM500']
      },
      {
        id: 'usr_trader_03',
        name: 'Carlos Trader VIP',
        email: 'carlos@tradinglatam.com',
        role: 'trader_vip',
        authProvider: 'local',
        salt: traderCreds.salt,
        passwordHash: traderCreds.hash,
        twoFactorEnabled: false,
        twoFactorSecret: null,
        status: 'active',
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastLogin: new Date(Date.now() - 3600000 * 5).toISOString(),
        subscribedSymbols: ['BOOM1000', 'CRASH1000', 'R_100']
      }
    ],
    auditLogs: [
      {
        id: 'aud_1',
        timestamp: new Date().toISOString(),
        event: 'SYSTEM_BOOT',
        user: 'system',
        severity: 'info',
        details: 'Motor de Índices Sintéticos Deriv + RBAC Security inicializado con PBKDF2-SHA512'
      }
    ]
  };
}

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const initial = getInitialDb();
      fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
      return initial;
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (err) {
    return getInitialDb();
  }
}

function writeDb(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN'
  });
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // API Endpoints
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { ok: true, timestamp: new Date().toISOString() });
  }

  if (url.pathname === '/api/auth/register' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { name, email, password, role = 'trader_vip', twoFactorEnabled = false } = body;
      if (!name || !email || !password || password.length < 10) {
        return sendJson(res, 400, { error: 'Datos inválidos o contraseña menor a 10 caracteres.' });
      }
      const db = readDb();
      if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        return sendJson(res, 409, { error: 'El correo electrónico ya está registrado.' });
      }
      const { salt, hash } = hashPassword(password);
      const newUser = {
        id: 'usr_' + crypto.randomBytes(4).toString('hex'),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        authProvider: 'local',
        salt,
        passwordHash: hash,
        twoFactorEnabled: Boolean(twoFactorEnabled),
        twoFactorSecret: twoFactorEnabled ? String(Math.floor(100000 + Math.random() * 900000)) : null,
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        subscribedSymbols: ['R_75', '1HZ75V', 'BOOM1000', 'CRASH1000', 'JD75']
      };
      db.users.push(newUser);
      db.auditLogs.unshift({
        id: 'aud_' + Date.now(),
        timestamp: new Date().toISOString(),
        event: 'USER_REGISTERED',
        user: newUser.email,
        severity: 'success',
        details: `Registro con PBKDF2-SHA512 (100k iter) + Rol: ${newUser.role}`
      });
      writeDb(db);
      const { salt: _s, passwordHash: _h, ...safeUser } = newUser;
      return sendJson(res, 201, { user: safeUser });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const { email, password } = body;
      const db = readDb();
      const user = db.users.find((u) => u.email.toLowerCase() === String(email || '').toLowerCase());
      if (!user || !verifyPassword(String(password || ''), user.salt, user.passwordHash)) {
        db.auditLogs.unshift({
          id: 'aud_' + Date.now(),
          timestamp: new Date().toISOString(),
          event: 'LOGIN_FAILED',
          user: email || 'unknown',
          severity: 'warning',
          details: 'Credenciales inválidas detectadas por el motor de seguridad'
        });
        writeDb(db);
        return sendJson(res, 401, { error: 'Correo o contraseña incorrectos.' });
      }
      if (user.status !== 'active') {
        return sendJson(res, 403, { error: 'La cuenta se encuentra suspendida por el administrador.' });
      }
      user.lastLogin = new Date().toISOString();
      db.auditLogs.unshift({
        id: 'aud_' + Date.now(),
        timestamp: new Date().toISOString(),
        event: 'LOGIN_SUCCESS',
        user: user.email,
        severity: 'info',
        details: 'Inicio de sesión verificado con hash PBKDF2'
      });
      writeDb(db);
      const { salt: _s, passwordHash: _h, ...safeUser } = user;
      return sendJson(res, 200, { user: safeUser });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Static files
  let filePath = path.join(PUBLIC_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Internal Server Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

function startServer(port) {
  server.once('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      startServer(port + 1);
    } else {
      throw err;
    }
  });
  server.listen(port, () => {
    console.log(`🚀 Deriv Synthetic Signals & ICT Trading MicroApp running at http://localhost:${port}`);
  });
}

startServer(DEFAULT_PORT);

