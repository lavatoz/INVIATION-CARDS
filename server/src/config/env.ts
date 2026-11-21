import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 5000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres@localhost:5432/wedding_invitation?schema=public',
  JWT_SECRET: process.env.JWT_SECRET || 'fallback-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',

  // YouPI PG V2 Configuration & Safeguards
  YOUPI_ENABLED: process.env.YOUPI_ENABLED === 'true',
  YOUPI_API_URL: (process.env.YOUPI_API_URL || 'http://localhost:6100').replace(/\/+$/, ''),
  YOUPI_CHECKOUT_URL: (process.env.YOUPI_CHECKOUT_URL || 'http://localhost:7000').replace(/\/+$/, ''),
  YOUPI_MERCHANT_ID: process.env.YOUPI_MERCHANT_ID || '',
  YOUPI_MERCHANT_KEY: process.env.YOUPI_MERCHANT_KEY || '',
  YOUPI_WEBHOOK_SECRET: process.env.YOUPI_WEBHOOK_SECRET || '',
  YOUPI_ACCOUNT_HOLDER_CONSENT: process.env.YOUPI_ACCOUNT_HOLDER_CONSENT === 'true',
  YOUPI_RECEIVING_ACCOUNT_HOLDER: process.env.YOUPI_RECEIVING_ACCOUNT_HOLDER || '',
};
