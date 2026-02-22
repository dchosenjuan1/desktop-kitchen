import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { getMasterDb, createTenant, getTenantByEmail, openTenantDb } from '../tenants.js';
import { applySchema } from '../db/index.js';
import { sendPinEmail } from '../helpers/email.js';

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';
const JWT_EXPIRES_IN = '7d';
const BCRYPT_ROUNDS = 12;

// Rate limiting: 5 registration attempts per IP per 15 minutes
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});

// Rate limiting: 10 login attempts per IP per 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * POST /api/auth/register — create a new tenant account
 *
 * Body: { email, password, restaurant_name, subdomain? }
 * Returns: { token, tenant }
 */
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email, password, restaurant_name, subdomain, primaryColor, logoUrl } = req.body;

    if (!email || !password || !restaurant_name) {
      return res.status(400).json({ error: 'Required: email, password, restaurant_name' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check email uniqueness
    const existing = getTenantByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    // Generate a URL-safe slug from restaurant name
    const slug = (subdomain || restaurant_name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40);

    // Ensure slug uniqueness
    const db = getMasterDb();
    const existingSlug = db.prepare('SELECT id FROM tenants WHERE id = ? OR subdomain = ?').get(slug, slug);
    if (existingSlug) {
      return res.status(409).json({ error: `Subdomain '${slug}' is already taken` });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Build branding JSON if custom color or logo provided
    const branding = {};
    if (primaryColor) branding.primaryColor = primaryColor;
    if (logoUrl) branding.logoUrl = logoUrl;
    const branding_json = Object.keys(branding).length > 0 ? JSON.stringify(branding) : null;

    // Create tenant
    const tenant = createTenant({
      id: slug,
      name: restaurant_name,
      subdomain: slug,
      owner_email: email,
      owner_password_hash: passwordHash,
      plan: 'trial',
      branding_json,
    });

    // Generate random 4-digit PIN for the admin employee
    const pin = String(Math.floor(1000 + Math.random() * 9000));

    // Create a default admin employee in the tenant DB (use email as name)
    const tenantDb = openTenantDb(slug);
    tenantDb.prepare('INSERT INTO employees (name, pin, role, active) VALUES (?, ?, ?, 1)')
      .run(email, pin, 'admin');

    // Fire-and-forget email with PIN
    sendPinEmail(email, pin, restaurant_name).catch(() => {});

    // Sign JWT
    const token = signToken({
      tenantId: tenant.id,
      email: tenant.owner_email,
      role: 'owner',
    });

    res.status(201).json({
      token,
      pin,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login — owner login (separate from employee PIN login)
 *
 * Body: { email, password }
 * Returns: { token, tenant }
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Required: email, password' });
    }

    const tenant = getTenantByEmail(email);
    if (!tenant) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (!tenant.active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    const passwordMatch = await bcrypt.compare(password, tenant.owner_password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = signToken({
      tenantId: tenant.id,
      email: tenant.owner_email,
      role: 'owner',
    });

    res.json({
      token,
      tenant: {
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        branding: tenant.branding_json ? JSON.parse(tenant.branding_json) : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/refresh — refresh JWT (requires valid token)
 */
router.post('/refresh', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token required' });
    }

    const decoded = jwt.verify(authHeader.slice(7), JWT_SECRET);

    const newToken = signToken({
      tenantId: decoded.tenantId,
      email: decoded.email,
      role: decoded.role,
    });

    res.json({ token: newToken });
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;
