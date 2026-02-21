import { getConfig, getConfigNumber, getConfigBool } from './config.js';

const XAI_BASE_URL = 'https://api.x.ai/v1/chat/completions';

// Rate limiting
let callsThisHour = 0;
let hourResetTime = Date.now() + 3600000;

// Prompt deduplication cache
const promptCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

/**
 * Check if Grok API is available
 */
function isAvailable() {
  if (!getConfigBool('grok_api_enabled')) {
    return false;
  }

  if (!process.env.XAI_API_KEY) {
    console.warn('[Grok] XAI_API_KEY not set');
    return false;
  }

  return true;
}

/**
 * Check rate limit
 */
function checkRateLimit() {
  const now = Date.now();
  if (now > hourResetTime) {
    callsThisHour = 0;
    hourResetTime = now + 3600000;
  }

  const maxCalls = getConfigNumber('grok_max_calls_per_hour') || 10;
  if (callsThisHour >= maxCalls) {
    return false;
  }

  return true;
}

/**
 * Generate a hash for prompt deduplication
 */
function hashPrompt(prompt) {
  let hash = 0;
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

/**
 * Send a message to Grok with caching, rate limiting, and retry
 */
export async function sendMessage(prompt, { systemPrompt, maxTokens = 1024, useCache = true } = {}) {
  if (!isAvailable()) {
    return { success: false, error: 'Grok API not available', fallback: true };
  }

  if (!checkRateLimit()) {
    return { success: false, error: 'Rate limit exceeded', fallback: true };
  }

  // Check prompt cache
  if (useCache) {
    const cacheKey = hashPrompt(prompt + (systemPrompt || ''));
    const cached = promptCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { success: true, content: cached.content, cached: true };
    }
  }

  const model = getConfig('grok_model') || 'grok-3-mini';

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  // Retry logic (max 2 attempts)
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(XAI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: maxTokens,
          messages,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorBody}`);
      }

      const data = await response.json();
      callsThisHour++;

      const content = data.choices?.[0]?.message?.content || '';

      // Cache the result
      if (useCache) {
        const cacheKey = hashPrompt(prompt + (systemPrompt || ''));
        promptCache.set(cacheKey, { content, timestamp: Date.now() });

        // Clean old cache entries
        if (promptCache.size > 100) {
          const now = Date.now();
          for (const [key, val] of promptCache) {
            if (now - val.timestamp > CACHE_TTL) promptCache.delete(key);
          }
        }
      }

      return { success: true, content, cached: false };
    } catch (error) {
      if (attempt === 0) {
        console.warn(`[Grok] Attempt 1 failed, retrying:`, error.message);
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
      console.error(`[Grok] Both attempts failed:`, error.message);
      return { success: false, error: error.message, fallback: true };
    }
  }
}

/**
 * Analyze upsell patterns and generate natural-language messages
 */
export async function analyzeUpsellPatterns(itemPairsData) {
  const systemPrompt = `You are an AI assistant for a Mexican fast-food restaurant POS system.
Analyze item purchase patterns and generate short, compelling upsell messages in English.
Keep messages under 60 characters. Be casual and appetizing.
Return JSON array of objects with: item_name, upsell_message, confidence (0-1).`;

  const prompt = `Based on these frequently paired items, generate upsell messages:\n${JSON.stringify(itemPairsData)}`;

  const result = await sendMessage(prompt, { systemPrompt, maxTokens: 512 });
  if (!result.success) return null;

  try {
    const jsonMatch = result.content.match(/\[[\s\S]*\]/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Analyze inventory trends and spot anomalies
 */
export async function analyzeInventoryTrends(velocityData) {
  const systemPrompt = `You are an inventory analyst for a Mexican restaurant.
Analyze consumption trends and identify anomalies.
Return JSON object with: anomalies (array), insights (array of strings), recommendations (array).`;

  const prompt = `Analyze these inventory consumption patterns for anomalies:\n${JSON.stringify(velocityData)}`;

  const result = await sendMessage(prompt, { systemPrompt, maxTokens: 512 });
  if (!result.success) return null;

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Generate daily inventory forecast with Grok enhancement
 */
export async function enhanceForecast(forecastData) {
  const systemPrompt = `You are a supply chain analyst for a Mexican restaurant.
Review the forecast data and provide actionable recommendations.
Return JSON object with: summary (string), urgent_actions (array), weekly_plan (object with day keys).`;

  const prompt = `Review this inventory forecast and provide recommendations:\n${JSON.stringify(forecastData)}`;

  const result = await sendMessage(prompt, { systemPrompt, maxTokens: 1024 });
  if (!result.success) return null;

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
  } catch {
    return null;
  }
}

/**
 * Get current stats
 */
export function getGrokStats() {
  return {
    enabled: getConfigBool('grok_api_enabled'),
    apiKeySet: !!process.env.XAI_API_KEY,
    callsThisHour,
    maxCallsPerHour: getConfigNumber('grok_max_calls_per_hour') || 10,
    cacheSize: promptCache.size,
    model: getConfig('grok_model') || 'grok-3-mini',
  };
}
