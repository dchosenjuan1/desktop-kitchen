/**
 * Shared test state — loaded from .test-state.json written by global-setup.
 * Every test file imports this to get tenant IDs, auth tokens, and entity IDs.
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = resolve(__dirname, '../.test-state.json');

export interface TestState {
  baseUrl: string;
  adminSecret: string;

  // Tenant alpha (primary test tenant)
  tenantAlpha: {
    id: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerToken: string;
    managerToken: string;
    managerEmployeeId: number;
    cashierToken: string;
    cashierEmployeeId: number;
    kitchenToken: string;
    kitchenEmployeeId: number;
    // Seeded entity IDs
    categoryIds: Record<string, number>;
    menuItemIds: Record<string, number>;
    modifierGroupIds: Record<string, number>;
    comboIds: Record<string, number>;
  };

  // Tenant beta (for isolation tests)
  tenantBeta: {
    id: string;
    ownerEmail: string;
    ownerPassword: string;
    ownerToken: string;
    managerToken: string;
    managerEmployeeId: number;
  };

  // Sales team
  sales: {
    managerToken: string;
    managerEmail: string;
    repToken: string;
    repEmail: string;
    repId: string;
    managerId: string;
  };

  // Server process PID
  serverPid: number;
}

let _state: TestState | null = null;

export function getTestState(): TestState {
  if (!_state) {
    const raw = readFileSync(STATE_PATH, 'utf-8');
    _state = JSON.parse(raw);
  }
  return _state!;
}

export const BASE_URL = () => getTestState().baseUrl;
export const ADMIN_SECRET = () => getTestState().adminSecret;
