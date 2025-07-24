/**
 * Test utility functions for common testing scenarios
 */

import { jest } from '@jest/globals';

/**
 * Mock Alchemy SDK responses
 */
export const mockAlchemyResponses = {
  // Mock balance response
  balance: {
    result: '0x1000000000000000000', // 1 ETH in wei
    jsonrpc: '2.0',
    id: 1
  },

  // Mock token balances response
  tokenBalances: {
    result: {
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      tokenBalances: [
        {
          contractAddress: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C',
          tokenBalance: '0x100000000000000000',
          error: null
        }
      ]
    },
    jsonrpc: '2.0',
    id: 1
  },

  // Mock transaction monitoring response
  pendingTransaction: {
    result: {
      hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      value: '0x100000000000000000',
      input: '0x',
      blockNumber: null
    },
    jsonrpc: '2.0',
    id: 1
  }
};



/**
 * Create a mock HTTP response
 */
export const createMockHttpResponse = (data: any, status: number = 200) => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {},
});

/**
 * Create a mock HTTP error
 */
export const createMockHttpError = (message: string, status: number = 500) => ({
  message,
  status,
  response: {
    data: { error: message },
    status,
    statusText: 'Error',
  },
});

/**
 * Wait for a specified number of milliseconds
 */
export const wait = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock environment variables for testing
 */
export const mockEnvVars = {
  ALCHEMY_API_KEY: 'test-alchemy-key',
  RECIPIENT_ADDRESS: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
  NODE_ENV: 'test',
};

/**
 * Setup test environment
 */
export const setupTestEnv = () => {
  // Set environment variables
  Object.entries(mockEnvVars).forEach(([key, value]) => {
    process.env[key] = value;
  });

  // Mock console methods to reduce noise
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
};

/**
 * Cleanup test environment
 */
export const cleanupTestEnv = () => {
  // Restore console methods
  jest.restoreAllMocks();
  
  // Clear environment variables
  Object.keys(mockEnvVars).forEach(key => {
    delete process.env[key];
  });
}; 