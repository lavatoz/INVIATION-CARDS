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

const app: Application = express();

// Middlewares
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      // In development allow localhost origins
      if (
        origin === env.CLIENT_URL ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
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
