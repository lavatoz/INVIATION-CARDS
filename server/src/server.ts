import { execSync } from 'child_process';
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

  // Verify database connection and schema tables at startup
  try {
    await prisma.$connect();
    console.log('[Backend] Successfully connected to PostgreSQL database');

    // Verify if database tables exist; if not, push schema automatically
    try {
      await prisma.$queryRaw`SELECT 1 FROM "users" LIMIT 1`;
      console.log('[Backend] Database tables verified.');
    } catch (tableCheckError: any) {
      console.warn('[Backend] Database tables not found or outdated. Pushing Prisma schema to database...');
      try {
        execSync('npx prisma db push --accept-data-loss', {
          stdio: 'inherit',
          env: process.env,
        });
        console.log('[Backend] Prisma db push completed successfully.');
      } catch (pushErr) {
        console.error('[Backend] Prisma db push execution failed:', pushErr);
      }
    }
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
