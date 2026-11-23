import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { env } from './config/env';
import healthRoutes from './routes/healthRoutes';
import authRoutes from './routes/authRoutes';
import ownerRoutes from './routes/ownerRoutes';
import publicRoutes from './routes/publicRoutes';
import guestRoutes from './routes/guestRoutes';
import sponsorRoutes from './routes/sponsorRoutes';
import giftRoutes from './routes/giftRoutes';
import { serveLocalMedia } from './controllers/publicController';

// Helper to identify allowed origins (localhost, private LAN IPs, Vercel deployments, or configured CLIENT_URL)
const isAllowedOrigin = (origin: string): boolean => {
  if (!origin) return true;

  const cleanOrigin = origin.replace(/\/+$/, '');

  // 1. Check against CLIENT_URL (supports comma-separated list like "http://localhost:5173,https://my-app.vercel.app")
  if (env.CLIENT_URL) {
    const allowedList = env.CLIENT_URL.split(',').map((u) => u.trim().replace(/\/+$/, ''));
    if (allowedList.includes(cleanOrigin)) {
      return true;
    }
  }

  // 2. Allow all Vercel deployments (*.vercel.app)
  if (/^https:\/\/[a-zA-Z0-9-]+(\.[a-zA-Z0-9-]+)*\.vercel\.app$/.test(cleanOrigin)) {
    return true;
  }

  // 3. Allow localhost and loopback on any port (for local frontend development)
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
    return true;
  }

  // 4. Allow private LAN IPv4 addresses (192.168.x.x, 10.x.x.x, 172.16-31.x.x) on any port
  if (
    /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(
      cleanOrigin
    )
  ) {
    return true;
  }

  return false;
};

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile native apps, curl, Postman, server-to-server)
      if (!origin) return callback(null, true);

      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }

      // If origin is not recognized, reject cleanly
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    credentials: true,
  })
);

// Route-specific JSON body parser:
// Allow up to 10MB specifically for sponsor logo uploads (5MB binary file expands to ~6.85MB in base64 + JSON wrapper)
// Keep strict 100kb limit for all other routes to protect against DoS attacks
app.use((req: Request, res: Response, next: NextFunction) => {
  const isUploadRoute =
    req.path?.includes('/sponsors/upload-logo') ||
    (req.originalUrl && req.originalUrl.includes('/sponsors/upload-logo'));

  if (isUploadRoute) {
    express.json({
      limit: '10mb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })(req, res, next);
  } else {
    express.json({
      limit: '100kb',
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    })(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/owner', ownerRoutes);
app.use('/api/owner', guestRoutes);
app.use('/api/owner', sponsorRoutes);
app.use('/api/owner', giftRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/media/:fileName', serveLocalMedia);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Wedding Invitation API',
    phase: 'Phase 1 - Foundation',
    status: 'online',
    designSystem: {
      aesthetic: 'Swiss Editorial',
      palette: {
        forestGreen: '#183D32',
        sandBeige: '#E8DDC8',
        warmIvory: '#F8F5ED',
        charcoal: '#292C27',
      },
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

export default app;
