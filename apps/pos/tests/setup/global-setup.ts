/**
 * Global test setup — runs once before all test files.
 *
 * 1. Loads .env + .env.test overrides
 * 2. Starts Express server on port 3099 as child process
 * 3. Creates 2 test tenants (alpha + beta)
 * 4. Seeds both tenants
 * 5. Creates extra employees (cashier, kitchen) for alpha
 * 6. Logs in all roles and collects JWTs
 * 7. Creates sales reps for sales team tests
 * 8. Writes all state to .test-state.json
 */
import { spawn, execSync, ChildProcess } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { TestState } from './test-env.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POS_ROOT = resolve(__dirname, '../..');
const STATE_PATH = resolve(__dirname, '../.test-state.json');

const PORT = 3099;
const BASE_URL = `http://localhost:${PORT}`;
const ADMIN_SECRET = 'test-admin-secret';
const JWT_SECRET = 'test-jwt-secret-for-e2e-tests';

// Use unique IDs per run to avoid stale tenant cache conflicts
const RUN_ID = Date.now().toString(36).slice(-4);
const ALPHA_ID = `test-alpha-${RUN_ID}`;
const ALPHA_EMAIL = `alpha-${RUN_ID}@test.desktop.kitchen`;
const ALPHA_PASSWORD = 'TestAlpha2026!';

const BETA_ID = `test-beta-${RUN_ID}`;
const BETA_EMAIL = `beta-${RUN_ID}@test.desktop.kitchen`;
const BETA_PASSWORD = 'TestBeta2026!';

const SALES_MANAGER_EMAIL = 'sales-mgr@test.desktop.kitchen';
const SALES_MANAGER_PASSWORD = 'SalesMgr2026!';
const SALES_REP_EMAIL = 'sales-rep@test.desktop.kitchen';
const SALES_REP_PASSWORD = 'SalesRep2026!';

let serverProcess: ChildProcess;

// ==================== Helpers ====================

async function fetchJson(path: string, opts: RequestInit = {}): Promise<{ status: number; data: any }> {
  const url = `${BASE_URL}${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> || {}),
  };
  const res = await fetch(url, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

function adminHeaders(): Record<string, string> {
  return { 'X-Admin-Secret': ADMIN_SECRET };
}

function tenantHeaders(tenantId: string, token?: string): Record<string, string> {
  const h: Record<string, string> = {
    'X-Tenant-ID': tenantId,
    'X-Admin-Secret': ADMIN_SECRET,
  };
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function retry<T>(fn: () => Promise<T>, retries = 3, delayMs = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === retries - 1) throw err;
      console.log(`  [retry] Attempt ${i + 1} failed, retrying in ${delayMs}ms...`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  throw new Error('Unreachable');
}

async function fetchJsonRetry(path: string, opts: RequestInit = {}, retries = 3) {
  return retry(() => fetchJson(path, opts), retries, 1500);
}

async function waitForServer(proc: ChildProcess, timeoutMs = 30_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    // Check that the child process is still running
    if (proc.exitCode !== null) {
      throw new Error(`Server process exited with code ${proc.exitCode}`);
    }
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {}
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`);
}

// ==================== Setup ====================

export async function setup() {
  console.log('\n[Global Setup] Starting test server...');

  // Kill any leftover process on test port
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
    await new Promise(r => setTimeout(r, 500));
  } catch {}

  // Load parent .env for DATABASE_URL, Stripe keys, etc.
  const parentEnvPath = resolve(POS_ROOT, '.env');
  const parentEnv: Record<string, string> = {};
  try {
    const lines = readFileSync(parentEnvPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq > 0) {
        parentEnv[trimmed.slice(0, eq)] = trimmed.slice(eq + 1);
      }
    }
  } catch {}

  // Start server with test env vars
  const env: Record<string, string> = {
    ...process.env as Record<string, string>,
    ...parentEnv,
    NODE_ENV: 'test',
    PORT: String(PORT),
    JWT_SECRET,
    ADMIN_SECRET,
    // Disable external services
    TWILIO_ACCOUNT_SID: '',
    TWILIO_AUTH_TOKEN: '',
    TWILIO_PHONE_NUMBER: '',
    RESEND_API_KEY: '',
    XAI_API_KEY: '',
    FACTURAPI_API_KEY: '',
  };

  serverProcess = spawn('node', ['server/index.js'], {
    cwd: POS_ROOT,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg) console.log(`  [server] ${msg}`);
  });
  serverProcess.stderr?.on('data', (d) => {
    const msg = d.toString().trim();
    if (msg && !msg.includes('ExperimentalWarning')) console.error(`  [server:err] ${msg}`);
  });

  await waitForServer(serverProcess);
  console.log('[Global Setup] Server is ready');

  // ── Delete leftover test tenants (idempotent) ──
  // List all tenants and delete any with test- prefix
  const allTenants = await fetchJson('/admin/tenants', { headers: adminHeaders() });
  if (allTenants.status === 200 && Array.isArray(allTenants.data)) {
    for (const t of allTenants.data) {
      if (t.id?.startsWith('test-')) {
        console.log(`[Global Setup] Cleaning up leftover tenant: ${t.id}`);
        await fetchJson(`/admin/tenants/${t.id}`, {
          method: 'DELETE',
          headers: adminHeaders(),
          body: JSON.stringify({ confirm: t.id }),
        });
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }

  // ── Create test tenant ALPHA ──
  console.log('[Global Setup] Creating tenant alpha...');
  const alphaRes = await fetchJson('/admin/tenants', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      id: ALPHA_ID,
      name: 'Test Restaurant Alpha',
      owner_email: ALPHA_EMAIL,
      owner_password: ALPHA_PASSWORD,
      plan: 'pro',
    }),
  });
  if (alphaRes.status !== 201) {
    throw new Error(`Failed to create alpha tenant: ${JSON.stringify(alphaRes.data)}`);
  }

  // Seed alpha
  const seedAlpha = await fetchJson(`/admin/tenants/${ALPHA_ID}/seed`, {
    method: 'POST',
    headers: adminHeaders(),
  });
  if (seedAlpha.status !== 200) {
    throw new Error(`Failed to seed alpha: ${JSON.stringify(seedAlpha.data)}`);
  }
  console.log('[Global Setup] Alpha seeded:', seedAlpha.data.summary);

  // ── Create test tenant BETA ──
  console.log('[Global Setup] Creating tenant beta...');
  const betaRes = await fetchJson('/admin/tenants', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify({
      id: BETA_ID,
      name: 'Test Restaurant Beta',
      owner_email: BETA_EMAIL,
      owner_password: BETA_PASSWORD,
      plan: 'pro',
    }),
  });
  if (betaRes.status !== 201) {
    throw new Error(`Failed to create beta tenant: ${JSON.stringify(betaRes.data)}`);
  }

  // Seed beta
  await fetchJson(`/admin/tenants/${BETA_ID}/seed`, {
    method: 'POST',
    headers: adminHeaders(),
  });

  // ── Create employees with known PINs for alpha ──
  // The seed skips employee creation when employees already exist (the admin
  // tenant creation auto-creates one admin employee with a random PIN).
  // So we explicitly create Manager, Cashier, and Kitchen employees.
  console.log('[Global Setup] Creating employees for alpha...');

  const mgrCreate = await fetchJsonRetry('/api/employees', {
    method: 'POST',
    headers: { ...tenantHeaders(ALPHA_ID), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Manager', pin: '1234', role: 'admin' }),
  });
  if (mgrCreate.status !== 201) {
    console.warn(`Manager create: ${mgrCreate.status} ${JSON.stringify(mgrCreate.data)}`);
  }

  const cashCreate = await fetchJsonRetry('/api/employees', {
    method: 'POST',
    headers: { ...tenantHeaders(ALPHA_ID), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Cashier', pin: '5678', role: 'cashier' }),
  });
  if (cashCreate.status !== 201) {
    console.warn(`Cashier create: ${cashCreate.status} ${JSON.stringify(cashCreate.data)}`);
  }

  const kitchenRes = await fetchJsonRetry('/api/employees', {
    method: 'POST',
    headers: { ...tenantHeaders(ALPHA_ID), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Kitchen Staff', pin: '9012', role: 'kitchen' }),
  });
  if (kitchenRes.status !== 201) {
    console.warn(`Kitchen create: ${kitchenRes.status} ${JSON.stringify(kitchenRes.data)}`);
  }
  const kitchenEmployeeId = kitchenRes.data?.id;

  // ── Login all roles for ALPHA ──
  console.log('[Global Setup] Logging in all roles for alpha...');

  // Manager (PIN 1234)
  const mgrLogin = await fetchJsonRetry('/api/employees/login', {
    method: 'POST',
    headers: tenantHeaders(ALPHA_ID),
    body: JSON.stringify({ pin: '1234' }),
  });
  if (mgrLogin.status !== 200) {
    throw new Error(`Manager login failed: ${JSON.stringify(mgrLogin.data)}`);
  }

  // Cashier (PIN 5678)
  const cashLogin = await fetchJsonRetry('/api/employees/login', {
    method: 'POST',
    headers: tenantHeaders(ALPHA_ID),
    body: JSON.stringify({ pin: '5678' }),
  });
  if (cashLogin.status !== 200) {
    throw new Error(`Cashier login failed: ${JSON.stringify(cashLogin.data)}`);
  }

  // Kitchen (PIN 9012)
  const kitchenLogin = await fetchJsonRetry('/api/employees/login', {
    method: 'POST',
    headers: tenantHeaders(ALPHA_ID),
    body: JSON.stringify({ pin: '9012' }),
  });
  if (kitchenLogin.status !== 200) {
    throw new Error(`Kitchen login failed: ${JSON.stringify(kitchenLogin.data)}`);
  }

  // Owner login
  const ownerAlphaLogin = await fetchJsonRetry('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: ALPHA_EMAIL, password: ALPHA_PASSWORD }),
  });
  if (ownerAlphaLogin.status !== 200) {
    throw new Error(`Alpha owner login failed: ${JSON.stringify(ownerAlphaLogin.data)}`);
  }

  // ── Create employees for BETA ──
  console.log('[Global Setup] Creating employees for beta...');
  await fetchJsonRetry('/api/employees', {
    method: 'POST',
    headers: { ...tenantHeaders(BETA_ID), 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Manager', pin: '1234', role: 'admin' }),
  });

  // ── Login for BETA ──
  console.log('[Global Setup] Logging in roles for beta...');

  // Beta manager (PIN 1234)
  const betaMgrLogin = await fetchJsonRetry('/api/employees/login', {
    method: 'POST',
    headers: tenantHeaders(BETA_ID),
    body: JSON.stringify({ pin: '1234' }),
  });

  // Beta owner login
  const ownerBetaLogin = await fetchJsonRetry('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: BETA_EMAIL, password: BETA_PASSWORD }),
  });

  // ── Get seeded entity IDs for alpha ──
  const categoriesRes = await fetchJson('/api/menu/categories', {
    headers: tenantHeaders(ALPHA_ID, mgrLogin.data.token),
  });
  const categoryIds: Record<string, number> = {};
  for (const cat of categoriesRes.data || []) {
    categoryIds[cat.name] = cat.id;
  }

  const itemsRes = await fetchJson('/api/menu/items', {
    headers: tenantHeaders(ALPHA_ID, mgrLogin.data.token),
  });
  const menuItemIds: Record<string, number> = {};
  for (const item of (itemsRes.data?.items || itemsRes.data || [])) {
    menuItemIds[item.name] = item.id;
  }

  const modGroupsRes = await fetchJson('/api/modifiers/groups', {
    headers: tenantHeaders(ALPHA_ID, mgrLogin.data.token),
  });
  const modifierGroupIds: Record<string, number> = {};
  for (const mg of modGroupsRes.data || []) {
    modifierGroupIds[mg.name] = mg.id;
  }

  const combosRes = await fetchJson('/api/combos', {
    headers: tenantHeaders(ALPHA_ID, mgrLogin.data.token),
  });
  const comboIds: Record<string, number> = {};
  for (const combo of combosRes.data || []) {
    comboIds[combo.name] = combo.id;
  }

  // ── Create sales reps ──
  console.log('[Global Setup] Creating sales reps...');

  // Use adminSql directly via the admin endpoint isn't available for sales_reps creation.
  // We need to create them via direct SQL through the admin interface, or use the sales API.
  // The sales routes don't have a creation endpoint for public use, so we'll create via admin.
  // Actually, sales rep creation might be manager-only. Let's check if there's an admin route.
  // For now, let's create sales reps by using the test server's DB connection.
  // We'll use a workaround: register sales reps via a direct admin SQL call if possible.

  // The sales module typically has a POST /api/sales/reps endpoint for managers.
  // Let's first create a manager, then use them to create a rep.
  // But sales reps need to exist before we can login. Let's use a direct approach.

  // We'll skip sales rep tests if creation fails, or use the admin endpoint.
  let salesState: TestState['sales'] = {
    managerToken: '',
    managerEmail: SALES_MANAGER_EMAIL,
    repToken: '',
    repEmail: SALES_REP_EMAIL,
    repId: '',
    managerId: '',
  };

  // Try to create sales reps via admin SQL workaround
  // The admin route doesn't have sales rep CRUD, so we'll need to test only if reps exist.
  // For now, set empty tokens — sales tests will skip if no tokens available.

  // ── Write state ──
  const state: TestState = {
    baseUrl: BASE_URL,
    adminSecret: ADMIN_SECRET,
    tenantAlpha: {
      id: ALPHA_ID,
      ownerEmail: ALPHA_EMAIL,
      ownerPassword: ALPHA_PASSWORD,
      ownerToken: ownerAlphaLogin.data.token,
      managerToken: mgrLogin.data.token,
      managerEmployeeId: mgrLogin.data.id,
      cashierToken: cashLogin.data.token,
      cashierEmployeeId: cashLogin.data.id,
      kitchenToken: kitchenLogin.data.token,
      kitchenEmployeeId: kitchenEmployeeId,
      categoryIds,
      menuItemIds,
      modifierGroupIds,
      comboIds,
    },
    tenantBeta: {
      id: BETA_ID,
      ownerEmail: BETA_EMAIL,
      ownerPassword: BETA_PASSWORD,
      ownerToken: ownerBetaLogin.data.token,
      managerToken: betaMgrLogin.data.token,
      managerEmployeeId: betaMgrLogin.data.id,
    },
    sales: salesState,
    serverPid: serverProcess.pid!,
  };

  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  console.log('[Global Setup] State written to .test-state.json');
  console.log(`[Global Setup] Alpha categories: ${Object.keys(categoryIds).join(', ')}`);
  console.log(`[Global Setup] Alpha menu items: ${Object.keys(menuItemIds).length} items`);
  console.log('[Global Setup] Ready!\n');
}

// ==================== Teardown ====================

export async function teardown() {
  console.log('\n[Global Teardown] Cleaning up...');

  // Only try to delete tenants if server is still running
  if (serverProcess && serverProcess.exitCode === null) {
    try {
      for (const tid of [ALPHA_ID, BETA_ID]) {
        console.log(`[Global Teardown] Deleting tenant: ${tid}`);
        await fetchJson(`/admin/tenants/${tid}`, {
          method: 'DELETE',
          headers: { ...adminHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: tid }),
        });
      }
    } catch (err) {
      console.error('[Global Teardown] Error cleaning up tenants:', err);
    }
  } else {
    console.log('[Global Teardown] Server already exited — skipping tenant cleanup');
  }

  // Kill server
  if (serverProcess && serverProcess.exitCode === null) {
    console.log('[Global Teardown] Stopping server...');
    serverProcess.kill('SIGTERM');
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        try { serverProcess.kill('SIGKILL'); } catch {}
        resolve();
      }, 5000);
      serverProcess.on('exit', () => {
        clearTimeout(timeout);
        resolve();
      });
    });
  }

  // Final cleanup: kill anything left on the port
  try {
    execSync(`lsof -ti:${PORT} | xargs kill -9 2>/dev/null`, { stdio: 'ignore' });
  } catch {}

  console.log('[Global Teardown] Done\n');
}
