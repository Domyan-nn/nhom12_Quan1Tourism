import { createApiGet } from './client.js';
import { createPublicApi } from './publicApi.js';

// Vite replaces these values at startup/build time. Restart after changes.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1';
if (import.meta.env.DEV) console.info(`[Saigon Stories] Data source: ${USE_MOCK ? 'mock' : `API ${baseUrl}`}`);
const apiGet = createApiGet({ baseUrl });
export const { listCategories, listPois, getPoi } = createPublicApi({ apiGet, useMock: USE_MOCK });
