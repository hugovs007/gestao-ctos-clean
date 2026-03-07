import app from '../src/app';
import { initializeDb } from '../src/db';

// Initialize DB on serverless function startup
initializeDb().catch(console.error);

export default app;