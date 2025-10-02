/**
 * Main server entry point
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import apiRoutes from './api/routes.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Middleware
app.use(helmet()); // Security headers
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' })); // CORS
app.use(compression()); // Response compression
app.use(express.json({ limit: '10mb' })); // JSON body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' })); // URL-encoded body parser

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Mount API routes
app.use(API_PREFIX, apiRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Hey-INY API',
    version: '1.0.0',
    description: 'User identity and device fingerprinting system',
    endpoints: {
      health: `${API_PREFIX}/health`,
      identify: `${API_PREFIX}/identify`,
      deviceHistory: `${API_PREFIX}/users/:userId/device-history`,
      userStatistics: `${API_PREFIX}/users/:userId/statistics`,
      compareDevices: `${API_PREFIX}/devices/compare`,
    },
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist',
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
  });
});

// Start server
app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('🚀 Hey-INY Server Started');
  console.log('='.repeat(60));
  console.log(`📍 Server URL: http://${HOST}:${PORT}`);
  console.log(`🔗 API Prefix: ${API_PREFIX}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔒 CORS Origin: ${process.env.CORS_ORIGIN || '*'}`);
  console.log('='.repeat(60));
  console.log('\nAvailable endpoints:');
  console.log(`  GET  / - API information`);
  console.log(`  GET  ${API_PREFIX}/health - Health check`);
  console.log(`  POST ${API_PREFIX}/identify - User identification`);
  console.log(`  GET  ${API_PREFIX}/users/:userId/device-history - Device history`);
  console.log(`  GET  ${API_PREFIX}/users/:userId/statistics - User statistics`);
  console.log(`  POST ${API_PREFIX}/devices/compare - Compare devices`);
  console.log('='.repeat(60));
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  const { closePool } = await import('./utils/database.js');
  await closePool();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  const { closePool } = await import('./utils/database.js');
  await closePool();
  process.exit(0);
});

export default app;
