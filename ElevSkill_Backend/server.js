import app from './src/app.js';
import { env } from './src/config/environment.js';
import { closePool } from './src/config/database.js';

const server = app.listen(env.port, () => {
  console.log(`ELEVSKILL Backend running on http://localhost:${env.port} (${env.nodeEnv})`);
});

async function shutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    await closePool();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
