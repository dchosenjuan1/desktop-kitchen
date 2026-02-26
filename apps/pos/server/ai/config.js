import { all, get, run } from '../db/index.js';

const DEFAULT_CONFIG = {
  restaurant_name: 'Desktop Kitchen',
  currency: 'MXN',
  tax_rate: '0.16',
  rush_hours: '11-14,18-21',
  slow_hours: '15-17',
  max_suggestions_per_order: '2',
  suggestion_display_timeout: '15',
  upsell_enabled: '1',
  inventory_push_enabled: '1',
  combo_upgrade_enabled: '1',
  dynamic_pricing_enabled: '0',
  grok_api_enabled: '0',
  grok_max_calls_per_hour: '10',
  grok_model: 'grok-4-1-fast-reasoning',
  suggestion_cache_ttl_minutes: '5',
  inventory_push_threshold_multiplier: '1.5',
};

export async function getConfig(key) {
  const row = await get('SELECT value FROM ai_config WHERE key = $1', [key]);
  return row ? row.value : DEFAULT_CONFIG[key] || null;
}

export async function getConfigNumber(key) {
  const val = await getConfig(key);
  return val !== null ? parseFloat(val) : null;
}

export async function getConfigBool(key) {
  return (await getConfig(key)) === '1';
}

export async function getAllConfig() {
  const rows = await all('SELECT key, value, description, updated_at FROM ai_config ORDER BY key');
  const config = {};
  for (const row of rows) {
    config[row.key] = {
      value: row.value,
      description: row.description,
      updated_at: row.updated_at,
    };
  }
  // Fill in defaults for any missing keys
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    if (!config[key]) {
      config[key] = { value, description: null, updated_at: null };
    }
  }
  return config;
}

export async function setConfig(key, value, description) {
  await run(
    `INSERT INTO ai_config (key, value, description) VALUES ($1, $2, $3)
     ON CONFLICT (tenant_id, key) DO UPDATE
       SET value = EXCLUDED.value,
           description = COALESCE(EXCLUDED.description, ai_config.description),
           updated_at = NOW()`,
    [key, String(value), description || null]
  );
}

export async function setMultipleConfig(entries) {
  for (const { key, value, description } of entries) {
    await setConfig(key, value, description);
  }
}

export async function seedDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    await run(
      'INSERT INTO ai_config (key, value) VALUES ($1, $2) ON CONFLICT (tenant_id, key) DO NOTHING RETURNING key',
      [key, value]
    );
  }
}

export async function getRushHours() {
  const raw = (await getConfig('rush_hours')) || '11-14,18-21';
  return raw.split(',').map(range => {
    const [start, end] = range.split('-').map(Number);
    return { start, end };
  });
}

export async function getSlowHours() {
  const raw = (await getConfig('slow_hours')) || '15-17';
  return raw.split(',').map(range => {
    const [start, end] = range.split('-').map(Number);
    return { start, end };
  });
}

export async function isRushHour(hour) {
  return (await getRushHours()).some(r => hour >= r.start && hour < r.end);
}

export async function isSlowHour(hour) {
  return (await getSlowHours()).some(r => hour >= r.start && hour < r.end);
}
