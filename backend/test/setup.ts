import { configureTestDatabase } from './support/test-database.js';

configureTestDatabase();

process.env.DEMO_IP_HMAC_SECRET =
  'test-demo-hmac-secret-with-at-least-32-characters';
