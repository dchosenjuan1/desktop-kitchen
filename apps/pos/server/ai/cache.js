import { all, get, run } from '../db/index.js';

/**
 * Write a suggestion to the cache with TTL
 */
export async function writeSuggestion({ type, context, data, priority = 50, ttlMinutes = 5 }) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const suggestionData = typeof data === 'string' ? data : JSON.stringify(data);
  const triggerContext = typeof context === 'string' ? context : (context ? JSON.stringify(context) : null);

  await run(`
    INSERT INTO ai_suggestion_cache (suggestion_type, trigger_context, suggestion_data, priority, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [type, triggerContext, suggestionData, priority, expiresAt]);
}

/**
 * Read cached suggestions by type, optionally filtered by context
 */
export async function readSuggestions(type, context = null) {
  let query = `
    SELECT id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, created_at
    FROM ai_suggestion_cache
    WHERE suggestion_type = $1
      AND expires_at > NOW()
  `;
  const params = [type];

  if (context) {
    query += ` AND trigger_context = $2`;
    params.push(typeof context === 'string' ? context : JSON.stringify(context));
  }

  query += ` ORDER BY priority DESC`;

  const rows = await all(query, params);
  return rows.map(row => ({
    ...row,
    suggestion_data: tryParseJSON(row.suggestion_data),
    trigger_context: tryParseJSON(row.trigger_context),
  }));
}

/**
 * Read all non-expired suggestions
 */
export async function readAllSuggestions() {
  const rows = await all(`
    SELECT id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, created_at
    FROM ai_suggestion_cache
    WHERE expires_at > NOW()
    ORDER BY priority DESC
  `);

  return rows.map(row => ({
    ...row,
    suggestion_data: tryParseJSON(row.suggestion_data),
    trigger_context: tryParseJSON(row.trigger_context),
  }));
}

/**
 * Clear all suggestions of a given type
 */
export async function clearSuggestions(type) {
  await run('DELETE FROM ai_suggestion_cache WHERE suggestion_type = $1', [type]);
}

/**
 * Clear all expired cache entries
 */
export async function cleanExpiredCache() {
  await run(`DELETE FROM ai_suggestion_cache WHERE expires_at <= NOW()`);
}

/**
 * Refresh suggestions: clear old ones and write new batch
 */
export async function refreshSuggestions(type, suggestions, ttlMinutes = 5) {
  await clearSuggestions(type);
  for (const suggestion of suggestions) {
    await writeSuggestion({
      type,
      context: suggestion.context || null,
      data: suggestion.data,
      priority: suggestion.priority || 50,
      ttlMinutes,
    });
  }
}

function tryParseJSON(str) {
  if (!str) return str;
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}
