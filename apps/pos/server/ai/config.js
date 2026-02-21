import { all, get, run } from '../db/index.js';

const DEFAULT_CONFIG = {
  restaurant_name: 'Juanberto\'s California Burritos',
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
  grok_model: 'grok-3-mini',
  suggestion_cache_ttl_minutes: '5',
  inventory_push_threshold_multiplier: '1.5',
};

export function getConfig(key) {
  const row = get('SELECT value FROM ai_config WHERE key = ?', [key]);
  return row ? row.value : DEFAULT_CONFIG[key] || null;
}

export function getConfigNumber(key) {
  const val = getConfig(key);
  return val !== null ? parseFloat(val) : null;
}

export function getConfigBool(key) {
  return getConfig(key) === '1';
}

export function getAllConfig() {
  const rows = all('SELECT key, value, description, updated_at FROM ai_config ORDER BY key');
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

export function setConfig(key, value, description) {
  const existing = get('SELECT key FROM ai_config WHERE key = ?', [key]);
  if (existing) {
    run(
      `UPDATE ai_config SET value = ?, description = COALESCE(?, description), updated_at = datetime('now','localtime') WHERE key = ?`,
      [String(value), description || null, key]
    );
  } else {
    run(
      `INSERT INTO ai_config (key, value, description) VALUES (?, ?, ?)`,
      [key, String(value), description || null]
    );
  }
}

export function setMultipleConfig(entries) {
  for (const { key, value, description } of entries) {
    setConfig(key, value, description);
  }
}

export function seedDefaults() {
  for (const [key, value] of Object.entries(DEFAULT_CONFIG)) {
    const existing = get('SELECT key FROM ai_config WHERE key = ?', [key]);
    if (!existing) {
      run('INSERT INTO ai_config (key, value) VALUES (?, ?)', [key, value]);
    }
  }
}

export function getRushHours() {
  const raw = getConfig('rush_hours') || '11-14,18-21';
  return raw.split(',').map(range => {
    const [start, end] = range.split('-').map(Number);
    return { start, end };
  });
}

export function getSlowHours() {
  const raw = getConfig('slow_hours') || '15-17';
  return raw.split(',').map(range => {
    const [start, end] = range.split('-').map(Number);
    return { start, end };
  });
}

export function isRushHour(hour) {
  return getRushHours().some(r => hour >= r.start && hour < r.end);
}

export function isSlowHour(hour) {
  return getSlowHours().some(r => hour >= r.start && hour < r.end);
}
