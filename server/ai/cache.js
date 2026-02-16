import { all, get, run } from '../db.js';

/**
 * Write a suggestion to the cache with TTL
 */
export function writeSuggestion({ type, context, data, priority = 50, ttlMinutes = 5 }) {
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000).toISOString();
  const suggestionData = typeof data === 'string' ? data : JSON.stringify(data);
  const triggerContext = typeof context === 'string' ? context : (context ? JSON.stringify(context) : null);

  run(`
    INSERT INTO ai_suggestion_cache (suggestion_type, trigger_context, suggestion_data, priority, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `, [type, triggerContext, suggestionData, priority, expiresAt]);
}

/**
 * Read cached suggestions by type, optionally filtered by context
 */
export function readSuggestions(type, context = null) {
  let query = `
    SELECT id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, created_at
    FROM ai_suggestion_cache
    WHERE suggestion_type = ?
      AND expires_at > datetime('now','localtime')
  `;
  const params = [type];

  if (context) {
    query += ` AND trigger_context = ?`;
    params.push(typeof context === 'string' ? context : JSON.stringify(context));
  }

  query += ` ORDER BY priority DESC`;

  const rows = all(query, params);
  return rows.map(row => ({
    ...row,
    suggestion_data: tryParseJSON(row.suggestion_data),
    trigger_context: tryParseJSON(row.trigger_context),
  }));
}

/**
 * Read all non-expired suggestions
 */
export function readAllSuggestions() {
  const rows = all(`
    SELECT id, suggestion_type, trigger_context, suggestion_data, priority, expires_at, created_at
    FROM ai_suggestion_cache
    WHERE expires_at > datetime('now','localtime')
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
export function clearSuggestions(type) {
  run('DELETE FROM ai_suggestion_cache WHERE suggestion_type = ?', [type]);
}

/**
 * Clear all expired cache entries
 */
export function cleanExpiredCache() {
  run(`DELETE FROM ai_suggestion_cache WHERE expires_at <= datetime('now','localtime')`);
}

/**
 * Refresh suggestions: clear old ones and write new batch
 */
export function refreshSuggestions(type, suggestions, ttlMinutes = 5) {
  clearSuggestions(type);
  for (const suggestion of suggestions) {
    writeSuggestion({
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
