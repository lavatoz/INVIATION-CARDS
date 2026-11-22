import app from './app';
import { env } from './config/env';
import prisma from './config/db';

const HOST = env.HOST || '0.0.0.0';

const server = app.listen(env.PORT, HOST, async () => {
  console.log(`[Backend] Wedding Invitation Server listening on ${HOST}:${env.PORT}`);
  console.log(`[Backend] Environment: ${env.NODE_ENV}`);
  console.log(`[Backend] Local: http://localhost:${env.PORT}`);
  console.log(`[Backend] Network: http://${HOST === '0.0.0.0' ? '0.0.0.0' : HOST}:${env.PORT}`);
  console.log(`[Backend] Health check available at: http://localhost:${env.PORT}/api/health`);

  // Verify database connection at startup
  try {
    await prisma.$connect();
    console.log('[Backend] Successfully connected to PostgreSQL database: wedding_invitation');
  } catch (error) {
    console.error('[Backend] Initial database connection check failed:', error);
  }
});

const gracefulShutdown = async () => {
  console.log('\n[Backend] Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('[Backend] Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
