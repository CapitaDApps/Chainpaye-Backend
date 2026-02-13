import express, { Application } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { requestLogger } from "./middleware/requestLogger";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { generalRateLimit, burstProtectionRateLimit } from "./middleware/rateLimiter";
import routes from "./routes";

// Load environment variables
dotenv.config();

const app: Application = express();

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*', // Allow all origins in development, specify in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Correlation-Id','admin',        // Add this
    'adminpwd' , 'X-Requested-With'],
  exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset','admin',        // Add this
    'adminpwd' ],
  credentials: true,
  maxAge: 86400 // 24 hours
};

// Apply CORS before other middleware
app.use(cors(corsOptions));

// Apply burst protection first (most restrictive)
app.use(burstProtectionRateLimit);

// Apply general rate limiting
app.use(generalRateLimit);

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging and correlation ID
app.use(requestLogger);

// API routes
app.use('/api/v1', routes);

// 404 handler for unmatched routes
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
