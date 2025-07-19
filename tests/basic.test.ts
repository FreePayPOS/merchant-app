/**
 * Basic test to verify testing infrastructure is working
 */

import { jest } from '@jest/globals';

describe('Testing Infrastructure', () => {
  it('should have Jest working', () => {
    expect(true).toBe(true);
  });

  it('should have test utilities available', () => {
    expect(global.testUtils).toBeDefined();
    expect(typeof global.testUtils.createMockResponse).toBe('function');
    expect(typeof global.testUtils.createMockError).toBe('function');
    expect(typeof global.testUtils.wait).toBe('function');
  });

  it('should have environment variables set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.ALCHEMY_API_KEY).toBe('test-alchemy-key');
    expect(process.env.RECIPIENT_ADDRESS).toBe('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6');
  });

  it('should be able to use test utilities', async () => {
    const mockResponse = global.testUtils.createMockResponse({ data: 'test' });
    expect(mockResponse.data).toEqual({ data: 'test' });
    expect(mockResponse.status).toBe(200);

    const mockError = global.testUtils.createMockError('test error');
    expect(mockError.message).toBe('test error');
    expect(mockError.status).toBe(500);

    const startTime = Date.now();
    await global.testUtils.wait(10);
    const endTime = Date.now();
    expect(endTime - startTime).toBeGreaterThanOrEqual(10);
  });
}); 