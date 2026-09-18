import { loadRuntimeConfig } from '../infrastructure/config/env.js';

const config = loadRuntimeConfig();

console.log(`Loaded runtime configuration for ${config.DATABASE_PATH}`);
