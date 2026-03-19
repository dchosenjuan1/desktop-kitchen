/**
 * External service health probes with caching (30s TTL, 5s timeout each).
 */

import dns from 'node:dns/promises';
import { adminSql } from '../db/index.js';
import { getAIStatus } from '../ai/index.js';

const CACHE_TTL = 30_000;  // 30 seconds
const PROBE_TIMEOUT = 5_000; // 5 seconds

let cache = null;
let cacheTime = 0;

async function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

async function checkPostgres() {
  const start = Date.now();
  try {
    await withTimeout(adminSql`SELECT 1`, PROBE_TIMEOUT);
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'down', latency_ms: Date.now() - start, message: err.message };
  }
}

async function checkStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return { status: 'unconfigured', latency_ms: 0 };
  }
  const start = Date.now();
  try {
    const res = await withTimeout(
      fetch('https://api.stripe.com/v1/balance', {
        headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}` },
      }),
      PROBE_TIMEOUT,
    );
    return {
      status: res.ok ? 'ok' : 'degraded',
      latency_ms: Date.now() - start,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { status: 'down', latency_ms: Date.now() - start, message: err.message };
  }
}

async function checkTwilio() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    return { status: 'unconfigured', latency_ms: 0 };
  }
  const start = Date.now();
  try {
    const res = await withTimeout(
      fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      }),
      PROBE_TIMEOUT,
    );
    return {
      status: res.ok ? 'ok' : 'degraded',
      latency_ms: Date.now() - start,
      message: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return { status: 'down', latency_ms: Date.now() - start, message: err.message };
  }
}

async function checkDNS(domain) {
  const start = Date.now();
  try {
    await withTimeout(dns.resolve(domain), PROBE_TIMEOUT);
    return { status: 'ok', latency_ms: Date.now() - start };
  } catch (err) {
    return { status: 'down', latency_ms: Date.now() - start, message: err.message };
  }
}

function checkGrok() {
  try {
    const aiStatus = getAIStatus();
    if (!process.env.XAI_API_KEY) {
      return { status: 'unconfigured', latency_ms: 0 };
    }
    return {
      status: aiStatus.initialized ? 'ok' : 'degraded',
      latency_ms: 0,
      message: aiStatus.initialized ? undefined : 'AI not initialized',
    };
  } catch {
    return { status: 'unconfigured', latency_ms: 0 };
  }
}

/**
 * Run all service checks (cached for 30s).
 */
export async function runServiceChecks() {
  const now = Date.now();
  if (cache && now - cacheTime < CACHE_TTL) return cache;

  const [postgres, stripe, twilio, dnsPOS, dnsWildcard] = await Promise.all([
    checkPostgres(),
    checkStripe(),
    checkTwilio(),
    checkDNS('pos.desktop.kitchen'),
    checkDNS('desktop.kitchen'),
  ]);

  const grok = checkGrok();

  cache = { postgres, stripe, twilio, grok, dns: { 'pos.desktop.kitchen': dnsPOS, 'desktop.kitchen': dnsWildcard } };
  cacheTime = now;
  return cache;
}
