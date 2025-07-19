/**
 * Test setup file for Jest
 * Configures global mocks and test environment
 */

import { jest } from '@jest/globals';

// Global test timeout
jest.setTimeout(10000);

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.ALCHEMY_API_KEY = 'test-alchemy-key';
process.env.RECIPIENT_ADDRESS = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';

// Suppress console output during tests unless explicitly needed
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  // Only show console output for tests that explicitly need it
  if (process.env.DEBUG_TESTS !== 'true') {
    console.log = jest.fn();
    console.error = jest.fn();
    console.warn = jest.fn();
  }
});

afterAll(() => {
  // Restore console functions
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
global.testUtils = {
  // Mock response helpers
  createMockResponse: (data: any, status: number = 200) => ({
    data,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: {},
    config: {},
  }),

  // Mock error helpers
  createMockError: (message: string, status: number = 500) => ({
    message,
    status,
    response: {
      data: { error: message },
      status,
      statusText: 'Error',
    },
  }),

  // Wait helper for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
};

// Type declarations for global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    createMockResponse: (data: any, status?: number) => any;
    createMockError: (message: string, status?: number) => any;
    wait: (ms: number) => Promise<void>;
  };
} 