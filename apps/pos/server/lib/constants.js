/**
 * Shared constants used across multiple route files.
 */

export const BCRYPT_ROUNDS = 12;

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-change-me';

export const JWT_EMPLOYEE_EXPIRY = '24h';

export const JWT_OWNER_EXPIRY = '7d';

export const MAX_PAGE_LIMIT = 200;

export const TRIAL_DURATION_DAYS = 14;
