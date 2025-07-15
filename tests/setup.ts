// Test setup file
// Use require for compatibility with Jest's CJS/ESM hybrid mode
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@testing-library/jest-dom');

// Mock console methods to reduce noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  console.log = originalConsole.log;
  console.warn = originalConsole.warn;
  console.error = originalConsole.error;
});

// Mock axios to prevent real HTTP requests
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    get: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
    post: jest.fn().mockResolvedValue({ data: { result: '0x1234' } }),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  get: jest.fn().mockResolvedValue({ data: { status: 'ok' } }),
  post: jest.fn().mockResolvedValue({ data: { result: '0x1234' } })
}));

// Mock Alchemy SDK
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn().mockImplementation(() => ({
    core: {
      getBlockNumber: jest.fn().mockResolvedValue('0x1234'),
      getBalance: jest.fn().mockResolvedValue('0x1000000000000000000'),
      getTransactionCount: jest.fn().mockResolvedValue('0x5')
    },
    nft: {
      getNftsForOwner: jest.fn().mockResolvedValue({ ownedNfts: [] })
    }
  })),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    ETH_SEPOLIA: 'eth-sepolia',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
    OPT_MAINNET: 'opt-mainnet',
    POLYGON_MAINNET: 'polygon-mainnet',
    POLYGON_MUMBAI: 'polygon-mumbai',
    ETH_EPHEMERY: 'eth-ephemery',
    BASE_EPHEMERY: 'base-ephemery',
    ARB_EPHEMERY: 'arb-ephemery',
    OPT_EPHEMERY: 'opt-ephemery',
    POLYGON_EPHEMERY: 'polygon-ephemery'
  }
}));

// Mock WebSocket
const MockWebSocket = jest.fn().mockImplementation(() => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1
}));

// Add static properties
Object.defineProperty(MockWebSocket, 'CONNECTING', { value: 0, writable: false });
Object.defineProperty(MockWebSocket, 'OPEN', { value: 1, writable: false });
Object.defineProperty(MockWebSocket, 'CLOSING', { value: 2, writable: false });
Object.defineProperty(MockWebSocket, 'CLOSED', { value: 3, writable: false });

(global as any).WebSocket = MockWebSocket;

// Mock timers to prevent real intervals
jest.useFakeTimers();

// Global test timeout
jest.setTimeout(10000);

// Cleanup after each test
afterEach(async () => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  
  // Clean up AlchemyService resources to prevent timer leaks
  try {
    const { AlchemyService } = await import('../src/services/alchemyService');
    if (AlchemyService && typeof AlchemyService.forceCleanup === 'function') {
      AlchemyService.forceCleanup();
    }
  } catch (_error) {
    // Ignore errors if AlchemyService is not available
  }
}); 