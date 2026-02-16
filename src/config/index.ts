import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface Config {
  // Server configuration
  port: number;
  nodeEnv: string;
  
  // Database configuration
  mongoUri: string;
  
  // Toronet API configuration
  toronetApiUrl: string;
  toronetAdminAddress: string;
  toronetAdminPassword: string;
  
  // Security configuration
  encryptionKeyV1: string;
  encryptionKeyV2: string;
  
  // Application configuration
  requestTimeout: number;
  maxRetries: number;
  retryDelayMs: number;
  cronIntervalMs: number;
}

const config: Config = {
  // Server configuration
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database configuration
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/payment-link-system',
  
  // Toronet API configuration
  toronetApiUrl: process.env.TORONET_API_URL || 'https://api.toronet.com',
  toronetAdminAddress: process.env.TORONET_ADMIN_ADDRESS || '',
  toronetAdminPassword: process.env.TORONET_ADMIN_PASSWORD || '',
  
  // Security configuration
  encryptionKeyV1: process.env.ENCRYPTION_KEY_V1 || 'default-key-change-in-production',
  encryptionKeyV2: process.env.ENCRYPTION_KEY_V2 || 'v2-default-key-change-in-production',
  
  // Application configuration
  requestTimeout: parseInt(process.env.REQUEST_TIMEOUT_MS || '30000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelayMs: parseInt(process.env.RETRY_DELAY_MS || '1000', 10),
  cronIntervalMs: parseInt(process.env.CRON_INTERVAL_MS || '300000', 10), // 5 minutes
};

// Validation
const requiredEnvVars = [
  'MONGODB_URI',
  'TORONET_API_URL',
  'TORONET_ADMIN_ADDRESS',
  'TORONET_ADMIN_PASSWORD'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && process.env.NODE_ENV !== 'test') {
  console.error('Missing required environment variables:', missingEnvVars);
  process.exit(1);
}

export default config;