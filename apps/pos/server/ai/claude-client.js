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
async function isAvailable() {
  if (!(await getConfigBool('grok_api_enabled'))) {
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
async function checkRateLimit() {
  const now = Date.now();
  if (now > hourResetTime) {
    callsThisHour = 0;
    hourResetTime = now + 3600000;
  }

  const maxCalls = (await getConfigNumber('grok_max_calls_per_hour')) || 10;
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
  if (!(await isAvailable())) {
    return { success: false, error: 'Grok API not available', fallback: true };
  }

  if (!(await checkRateLimit())) {
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

  const model = (await getConfig('grok_model')) || 'grok-4-1-fast-reasoning';

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
 * Parse unstructured menu text into structured JSON for bulk import
 */
export async function parseMenuText(text, { currency = 'MXN' } = {}) {
  const systemPrompt = `You are a menu parsing AI for a restaurant POS system.
Convert the provided text into a structured JSON menu. The text may be:
- A pasted menu (from PDF, photo, website)
- A description of a restaurant ("We're a taqueria that sells...")
- A list of items with or without prices
- A mix of Spanish and English

Return ONLY valid JSON (no markdown, no explanation) matching this exact shape:
{
  "categories": [{ "name": "Category Name", "sort_order": 1 }],
  "items": [{ "name": "Item Name", "category": "Category Name", "price": 45.00, "description": "Short description", "prep_time_minutes": 8 }],
  "inventory": [{ "name": "Ingredient", "unit": "kg", "quantity": 0, "low_stock_threshold": 5, "category": "Produce", "cost_price": 25.00 }],
  "recipes": [{ "item_name": "Item Name", "ingredient_name": "Ingredient", "quantity_used": 0.15 }],
  "modifier_groups": [{ "name": "Group Name", "selection_type": "single", "required": false, "min_selections": 0, "max_selections": 1, "modifiers": [{ "name": "Option", "price_adjustment": 0 }], "assign_to_categories": ["Category Name"] }]
}

Rules:
- Prices are in ${currency}. If no prices given, estimate realistic Mexican restaurant prices.
- Category names should be in the same language as the input.
- Generate 2-4 sensible categories from the items.
- For each item, infer likely ingredients and create inventory + recipe entries.
- Suggest 1-3 modifier groups if appropriate (e.g., size, protein choice, extras).
- prep_time_minutes should be realistic (5-20 min range).
- cost_price for ingredients should be ~30-40% of item sell price (realistic food cost).
- inventory units: use kg, lt, pz (piezas), or unit.
- Do NOT wrap the JSON in markdown code fences.`;

  const result = await sendMessage(text, {
    systemPrompt,
    maxTokens: 4096,
    useCache: false,
  });

  if (!result.success) return { success: false, error: result.error, fallback: true };

  try {
    const jsonMatch = result.content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return { success: false, error: 'AI did not return valid JSON' };
    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.categories?.length && !parsed.items?.length) {
      return { success: false, error: 'AI could not identify any menu items from the text' };
    }
    return { success: true, data: parsed };
  } catch (e) {
    return { success: false, error: 'Failed to parse AI response' };
  }
}

/**
 * Ask the AI assistant a question with gathered context data
 */
export async function askAssistantQuestion(question, context) {
  const systemPrompt = `You are a restaurant business consultant with access to this restaurant's actual operational data. Give specific, actionable advice based on the numbers. Keep responses under 400 words. Format with markdown (headers, bullets, bold). Be direct and practical. Currency is MXN.`;

  const prompt = `Restaurant data:\n${JSON.stringify(context)}\n\nQuestion: ${question}`;

  return sendMessage(prompt, { systemPrompt, maxTokens: 2048, useCache: true });
}

/**
 * Get current stats
 */
export async function getGrokStats() {
  return {
    enabled: await getConfigBool('grok_api_enabled'),
    apiKeySet: !!process.env.XAI_API_KEY,
    callsThisHour,
    maxCallsPerHour: (await getConfigNumber('grok_max_calls_per_hour')) || 10,
    cacheSize: promptCache.size,
    model: (await getConfig('grok_model')) || 'grok-4-1-fast-reasoning',
  };
}
