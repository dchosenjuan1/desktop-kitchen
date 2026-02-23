import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { requireOwner } from '../middleware/ownerAuth.js';
import { requireAuth } from '../middleware/auth.js';
import { updateTenant, getTenant } from '../tenants.js';
import { getPlanLimits } from '../planLimits.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '../../data/uploads');

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer config: 2MB limit, images only
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const tenantId = req.tenant?.id || 'default';
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo-${tenantId}-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const router = Router();

/**
 * GET /api/branding — public branding for current tenant
 * Returns primaryColor, logoUrl, restaurantName, tagline for CSS theming.
 * Works with tenant middleware — no auth required.
 */
router.get('/', (req, res) => {
  const tenant = req.tenant;

  // No tenant resolved — check branding.json for default mode
  if (!tenant) {
    const brandingPath = path.join(__dirname, '../../data/branding.json');
    let saved = {};
    try { saved = JSON.parse(fs.readFileSync(brandingPath, 'utf8')); } catch {}

    return res.json({
      primaryColor: saved.primaryColor || '#0d9488',
      logoUrl: saved.logoUrl || null,
      restaurantName: saved.restaurantName || 'My Restaurant',
      tagline: saved.tagline || '',
    });
  }

  const branding = tenant.branding || {};
  const plan = tenant.plan || 'trial';
  res.json({
    primaryColor: branding.primaryColor || '#0d9488',
    logoUrl: branding.logoUrl || null,
    restaurantName: tenant.name || 'Restaurant',
    tagline: branding.tagline || '',
    plan,
    limits: getPlanLimits(plan),
    ownerEmail: tenant.owner_email || null,
  });
});

/**
 * PUT /api/branding — update branding (owner-only)
 * Body: { primaryColor, logoUrl }
 */
router.put('/', requireOwner, async (req, res) => {
  try {
    const { primaryColor, logoUrl } = req.body;
    const tenantId = req.owner.tenantId;

    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const existing = tenant.branding_json ? JSON.parse(tenant.branding_json) : {};
    const updated = {
      ...existing,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(logoUrl !== undefined && { logoUrl }),
    };

    await updateTenant(tenantId, { branding_json: JSON.stringify(updated) });

    res.json({
      primaryColor: updated.primaryColor || '#0d9488',
      logoUrl: updated.logoUrl || null,
      restaurantName: tenant.name,
      tagline: updated.tagline || '',
    });
  } catch (error) {
    console.error('Branding update error:', error);
    res.status(500).json({ error: 'Failed to update branding' });
  }
});

/**
 * PUT /api/branding/settings — update branding via employee auth
 * Body: { primaryColor, restaurantName, tagline }
 */
router.put('/settings', requireAuth('manage_branding'), async (req, res) => {
  try {
    const { primaryColor, restaurantName, tagline } = req.body;
    const tenantId = req.tenant?.id;

    // For non-tenant (default DB) — update a local branding file
    if (!tenantId) {
      // Store in a simple JSON file for default/single-tenant mode
      const brandingPath = path.join(__dirname, '../../data/branding.json');
      let existing = {};
      try { existing = JSON.parse(fs.readFileSync(brandingPath, 'utf8')); } catch {}

      const updated = {
        ...existing,
        ...(primaryColor !== undefined && { primaryColor }),
        ...(restaurantName !== undefined && { restaurantName }),
        ...(tagline !== undefined && { tagline }),
      };

      fs.writeFileSync(brandingPath, JSON.stringify(updated, null, 2));

      return res.json({
        primaryColor: updated.primaryColor || '#0d9488',
        logoUrl: updated.logoUrl || null,
        restaurantName: updated.restaurantName || 'My Restaurant',
        tagline: updated.tagline || '',
      });
    }

    // Plan check — trial tenants can preview but not save
    const plan = req.tenant?.plan || 'trial';
    if (!getPlanLimits(plan).branding.canRename) {
      return res.status(403).json({ error: 'Branding customization requires a paid plan', upgrade: true });
    }

    const tenant = await getTenant(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const existing = tenant.branding_json ? JSON.parse(tenant.branding_json) : {};
    const updated = {
      ...existing,
      ...(primaryColor !== undefined && { primaryColor }),
      ...(tagline !== undefined && { tagline }),
    };

    const tenantUpdates = { branding_json: JSON.stringify(updated) };
    if (restaurantName !== undefined) {
      tenantUpdates.name = restaurantName;
    }

    await updateTenant(tenantId, tenantUpdates);

    res.json({
      primaryColor: updated.primaryColor || '#0d9488',
      logoUrl: updated.logoUrl || null,
      restaurantName: restaurantName || tenant.name,
      tagline: updated.tagline || '',
    });
  } catch (error) {
    console.error('Branding settings update error:', error);
    res.status(500).json({ error: 'Failed to update branding settings' });
  }
});

/**
 * POST /api/branding/logo — upload logo via employee auth
 * Accepts multipart form with 'logo' file field
 */
router.post('/logo', requireAuth('manage_branding'), (req, res) => {
  upload.single('logo')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Max 2MB.' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
      const logoUrl = `/uploads/${req.file.filename}`;
      const tenantId = req.tenant?.id;

      if (!tenantId) {
        // Default/single-tenant mode — use branding.json
        const brandingPath = path.join(__dirname, '../../data/branding.json');
        let existing = {};
        try { existing = JSON.parse(fs.readFileSync(brandingPath, 'utf8')); } catch {}

        // Delete previous uploaded logo
        if (existing.logoUrl && existing.logoUrl.startsWith('/uploads/')) {
          const oldPath = path.join(uploadsDir, path.basename(existing.logoUrl));
          try { fs.unlinkSync(oldPath); } catch {}
        }

        existing.logoUrl = logoUrl;
        fs.writeFileSync(brandingPath, JSON.stringify(existing, null, 2));

        return res.json({
          logoUrl,
          primaryColor: existing.primaryColor || '#0d9488',
          restaurantName: existing.restaurantName || 'My Restaurant',
          tagline: existing.tagline || '',
        });
      }

      const tenant = await getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: 'Tenant not found' });
      }

      const existing = tenant.branding_json ? JSON.parse(tenant.branding_json) : {};

      // Delete previous uploaded logo
      if (existing.logoUrl && existing.logoUrl.startsWith('/uploads/')) {
        const oldPath = path.join(uploadsDir, path.basename(existing.logoUrl));
        try { fs.unlinkSync(oldPath); } catch {}
      }

      existing.logoUrl = logoUrl;
      await updateTenant(tenantId, { branding_json: JSON.stringify(existing) });

      res.json({
        logoUrl,
        primaryColor: existing.primaryColor || '#0d9488',
        restaurantName: tenant.name,
        tagline: existing.tagline || '',
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });
});

export default router;
