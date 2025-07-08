process.env.ALCHEMY_API_KEY = 'test_key';

import request from 'supertest';
import express from 'express';
import healthRouter from '../../src/routes/health';

const app = express();
app.use('/api', healthRouter);

describe('Health API', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('dependencies');
      expect(response.body).toHaveProperty('memory');
      
      expect(typeof response.body.status).toBe('string');
      expect(['healthy', 'unhealthy']).toContain(response.body.status);
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory.used).toBe('number');
      expect(typeof response.body.memory.total).toBe('number');
      expect(typeof response.body.memory.percentage).toBe('number');
    });

    it('should include response time header', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.headers).toHaveProperty('x-response-time');
      expect(response.headers['x-response-time']).toMatch(/^\d+ms$/);
    });

    it('should have valid timestamp format', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const timestamp = new Date(response.body.timestamp);
      expect(timestamp.getTime()).not.toBeNaN();
    });

    it('should have valid memory usage data', async () => {
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      const { memory } = response.body;
      
      expect(memory.used).toBeGreaterThanOrEqual(0);
      expect(memory.total).toBeGreaterThan(0);
      expect(memory.percentage).toBeGreaterThanOrEqual(0);
      expect(memory.percentage).toBeLessThanOrEqual(100);
      expect(memory.used).toBeLessThanOrEqual(memory.total);
    });
  });
}); 