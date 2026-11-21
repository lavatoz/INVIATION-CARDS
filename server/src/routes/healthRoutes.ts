import { Router, Request, Response } from 'express';
import prisma from '../config/db';

const router = Router();

router.get('/health', async (_req: Request, res: Response): Promise<void> => {
  let dbStatus = 'disconnected';
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = 'connected';
  } catch (err: any) {
    dbStatus = 'error: ' + (err?.message || 'unknown error');
  }

  const isHealthy = dbStatus === 'connected';

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    service: 'wedding-invitation-backend',
    database: {
      status: dbStatus,
      latencyMs: dbLatencyMs,
    },
    version: '1.0.0',
    phase: 'Phase 1 - Foundation',
  });
});

export default router;
