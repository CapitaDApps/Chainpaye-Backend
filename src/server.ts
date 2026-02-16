import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports
dotenv.config();

import app from "./app";
import connectDB from "./config/database";
import config from "./config";
import { startEnhancedVerificationCron, stopEnhancedVerificationCron } from "./services/verify-pending-transactions";

const startServer = async (): Promise<void> => {
  try {
    // Connect to MongoDB - don't start server without database
    console.log('🔄 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ Database connection established');
    
    // Start the server only after successful database connection
    const server = app.listen(config.port, () => {
      console.log(`🚀 Server running on http://localhost:${config.port}`);
      console.log(`🌍 Environment: ${config.nodeEnv}`);
      console.log(`📊 Health check: http://localhost:${config.port}/api/v1/health`);
      
      // Start enhanced background verification services
      console.log('🔄 Starting Enhanced Background Verification System v2.0.0...');
      startEnhancedVerificationCron();
      console.log('✅ Enhanced background services started');
    });
    
    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n📡 Received ${signal}. Starting graceful shutdown...`);
      
      // Stop background services first
      console.log('🛑 Stopping enhanced background services...');
      stopEnhancedVerificationCron();
      console.log('✅ Enhanced background services stopped');
      
      server.close((err) => {
        if (err) {
          console.error('❌ Error during server shutdown:', err);
          process.exit(1);
        }
        
        console.log('✅ Server closed successfully');
        process.exit(0);
      });
    };
    
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
