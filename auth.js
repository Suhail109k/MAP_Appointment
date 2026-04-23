const crypto = require('crypto');
const express = require('express');
const User = require('../models/User');

const router = express.Router();

const ADMIN_EMAIL = '2k23ece109@kiot.ac.in';
const ADMIN_PASSWORD = 'Suhail_Map';
const SESSION_COOKIE = 'hospital_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'hospital-booking-session-secret';

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function signPayload(encodedPayload) {
  return crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(encodedPayload)
    .digest('base64url');
}

function createSessionToken(payload) {
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function readSessionToken(token) {
  if (!token || !token.includes('.')) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  const expectedSignature = signPayload(encodedPayload);

  if (signature !== expectedSignature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch (_error) {
    return null;
  }
}

function parseCookies(cookieHeader = '') {
  return cookieHeader
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((cookies, part) => {
      const separatorIndex = part.indexOf('=');
      if (separatorIndex === -1) {
        return cookies;
      }

      const key = part.slice(0, separatorIndex);
      const value = decodeURIComponent(part.slice(separatorIndex + 1));
      cookies[key] = value;
      return cookies;
    }, {});
}

function setSessionCookie(res, payload) {
  const token = createSessionToken(payload);
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`
  );
}

function clearSessionCookie(res) {
  res.setHeader(
    'Set-Cookie',
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue = '') {
  const [salt, originalHash] = storedValue.split(':');
  if (!salt || !originalHash) {
    return false;
  }

  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function sessionMiddleware(req, _res, next) {
  const cookies = parseCookies(req.headers.cookie);
  const session = readSessionToken(cookies[SESSION_COOKIE]);
  req.user = session || null;
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Please sign in to continue' });
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access only' });
  }

  next();
}

function requireUser(req, res, next) {
  if (!req.user || req.user.role !== 'user') {
    return res.status(403).json({ message: 'User access only' });
  }

  next();
}

async function registerUser(req, res) {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const phone = String(req.body.phone || '').trim();

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters long' });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser || email === ADMIN_EMAIL) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const user = await User.create({
      name,
      email,
      phone,
      passwordHash: hashPassword(password)
    });

    const session = { role: 'user', email: user.email, name: user.name, phone: user.phone };
    setSessionCookie(res, session);
    return res.status(201).json({
      role: session.role,
      email: session.email,
      name: session.name,
      redirectTo: '/book.html'
    });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}

async function loginUser(req, res) {
  const role = req.body.role;
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!role || !email || !password) {
    return res.status(400).json({ message: 'Role, email, and password are required' });
  }

  if (role === 'admin') {
    if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Invalid admin credentials' });
    }

    const session = { role: 'admin', email: ADMIN_EMAIL, name: 'Admin' };
    setSessionCookie(res, session);
    return res.json({ role: session.role, email: session.email, redirectTo: '/admin.html' });
  }

  if (role === 'user') {
    try {
      const user = await User.findOne({ email });
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const session = { role: 'user', email: user.email, name: user.name, phone: user.phone };
      setSessionCookie(res, session);
      return res.json({
        role: session.role,
        email: session.email,
        name: session.name,
        redirectTo: '/book.html'
      });
    } catch (error) {
      return res.status(500).json({ message: error.message });
    }
  }

  return res.status(400).json({ message: 'Invalid role selected' });
}

router.post('/', (req, res) => {
  const looksLikeRegistration = Boolean(req.body?.name) && !req.body?.role;
  return looksLikeRegistration ? registerUser(req, res) : loginUser(req, res);
});

router.post('/register', registerUser);
router.post('/login', loginUser);

router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ message: 'Logged out successfully' });
});

router.get('/session', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: 'No active session' });
  }

  res.json(req.user);
});

module.exports = {
  router,
  sessionMiddleware,
  requireAuth,
  requireAdmin,
  requireUser
};
