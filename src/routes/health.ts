import { Router, Request, Response } from 'express';
import { AlchemyService } from '../services/alchemyService';
import { env } from '../config/env';
import logger from '../utils/logger';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  dependencies: {
    alchemy: 'healthy' | 'unhealthy';
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

router.get('/health', async (req: Request, res: Response) => {
  const startTime = Date.now();
  
  try {
    // Check Alchemy API connectivity
    let alchemyStatus: 'healthy' | 'unhealthy' = 'unhealthy';
    try {
      // Simple test to check if Alchemy API is accessible
      const testAddress = '0x0000000000000000000000000000000000000000';
      const isValid = AlchemyService.isEthereumAddress(testAddress);
      alchemyStatus = isValid ? 'healthy' : 'unhealthy';
    } catch (error) {
      logger.error('Alchemy API health check failed:', error);
      alchemyStatus = 'unhealthy';
    }

    // Calculate memory usage
    const memUsage = process.memoryUsage();
    const memoryInfo = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    };

    const healthStatus: HealthStatus = {
      status: alchemyStatus === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      dependencies: {
        alchemy: alchemyStatus
      },
      memory: memoryInfo
    };

    const statusCode = healthStatus.status === 'healthy' ? 200 : 503;
    
    // Add response time header
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', `${responseTime}ms`);
    
    res.status(statusCode).json(healthStatus);
    
    logger.info('Health check completed', {
      status: healthStatus.status,
      responseTime,
      memoryUsage: memoryInfo
    });
    
  } catch (error) {
    logger.error('Health check failed:', error);
    
    const errorStatus: HealthStatus = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      environment: env.NODE_ENV,
      dependencies: {
        alchemy: 'unhealthy'
      },
      memory: {
        used: 0,
        total: 0,
        percentage: 0
      }
    };
    
    res.status(503).json(errorStatus);
  }
});

export default router; 