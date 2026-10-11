import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../config/db.js';
import { nowLocalIsoString } from '../utils/dateTime.js';
import { requireAuth } from '../middleware/auth.js';
import { AUTH_COOKIE, cookieOptions, createToken, toSafeUser } from '../config/auth.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const SALT_ROUNDS = 10;

const insertUser = db.prepare(
  'INSERT INTO users (email, passwordHash, createdAt) VALUES (?, ?, ?)'
);
const selectByEmail = db.prepare('SELECT * FROM users WHERE email = ?');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.status = 400;
  }
}

class AuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthError';
    this.status = 401;
  }
}

function readCredentials(body) {
  const email = String(body.email || '')
    .trim()
    .toLowerCase();
  const password = String(body.password || '');

  if (!email) throw new ValidationError('email is required');
  if (!EMAIL_REGEX.test(email)) throw new ValidationError('email is not a valid email address');

  if (!password) throw new ValidationError('password is required');
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new ValidationError(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }

  return { email, password };
}

/** Creates the signed token and puts it in the HTTP-only cookie. */
function startSession(res, user) {
  res.cookie(AUTH_COOKIE, createToken(user), cookieOptions());
}

// POST /api/auth/register
router.post('/register', (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body || {});

    if (selectByEmail.get(email)) {
      const error = new Error('An account with that email already exists');
      error.status = 409;
      throw error;
    }

    // Only the hash is stored. The plain password is never written anywhere.
    const passwordHash = bcrypt.hashSync(password, SALT_ROUNDS);

    const result = insertUser.run(email, passwordHash, nowLocalIsoString());
    const user = { id: Number(result.lastInsertRowid), email };

    startSession(res, user);

    res.status(201).json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', (req, res, next) => {
  try {
    const { email, password } = readCredentials(req.body || {});

    const user = selectByEmail.get(email);

    // The same message for "no such email" and "wrong password" so the
    // response cannot be used to find out which addresses are registered.
    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      throw new AuthError('Email or password is incorrect');
    }

    startSession(res, user);

    res.json({ user: toSafeUser(user) });
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: toSafeUser(req.user) });
});

export default router;
