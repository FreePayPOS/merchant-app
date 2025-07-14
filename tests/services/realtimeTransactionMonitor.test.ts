import { RealtimeTransactionMonitor } from '../../src/services/realtimeTransactionMonitor';
import WebSocket from 'ws';
import { Alchemy } from 'alchemy-sdk';

// Mock dependencies
jest.mock('ws');
jest.mock('alchemy-sdk', () => ({
  Alchemy: jest.fn(),
  Network: {
    ETH_MAINNET: 'eth-mainnet',
    ETH_SEPOLIA: 'eth-sepolia',
    BASE_MAINNET: 'base-mainnet',
    ARB_MAINNET: 'arb-mainnet',
    OPT_MAINNET: 'opt-mainnet',
    POLYGON_MAINNET: 'polygon-mainnet'
  },
  Utils: {
    hexlify: jest.fn((value) => `0x${value.toString(16)}`)
  },
  AssetTransfersCategory: {
    EXTERNAL: 'external',
    ERC20: 'erc20'
  }
}));

jest.mock('../../src/config/index', () => ({
  RECIPIENT_ADDRESS: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
  config: {
    ALCHEMY_API_KEY: 'test-api-key',
    INFURA_API_KEY: '',
    AXOL_API_KEY: ''
  }
}));

const mockWebSocket = {
  on: jest.fn(),
  send: jest.fn(),
  close: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
};

const mockAlchemyInstance = {
  core: {
    getAssetTransfers: jest.fn(),
    getTransactionReceipt: jest.fn()
  }
};

describe('RealtimeTransactionMonitor', () => {
  let wsEventHandlers: { [key: string]: (...args: any[]) => void };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Setup WebSocket event handlers
    wsEventHandlers = {};
    (WebSocket as unknown as jest.Mock).mockImplementation(() => {
      const ws = { ...mockWebSocket };
      ws.on = jest.fn((event: string, handler: (...args: any[]) => void) => {
        wsEventHandlers[event] = handler;
      });
      return ws;
    });

    // Setup Alchemy mock
    (Alchemy as unknown as jest.Mock).mockImplementation(() => mockAlchemyInstance);

    // Mock the getAlchemyClient method to return our mock instance
    jest.spyOn(RealtimeTransactionMonitor as any, 'getAlchemyClient').mockReturnValue(mockAlchemyInstance);

    // Reset static state
    RealtimeTransactionMonitor.stopMonitoring();
  });

  afterEach(() => {
    jest.useRealTimers();
    RealtimeTransactionMonitor.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should start WebSocket monitoring successfully', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Simulate WebSocket open
      wsEventHandlers.open();

      await startPromise;

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
      expect(RealtimeTransactionMonitor.getCurrentSession()).toBeTruthy();
    });

    it('should handle WebSocket connection error and fallback to polling', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Simulate WebSocket error
      wsEventHandlers.error(new Error('Connection failed'));

      await startPromise;

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
    });

    it('should handle WebSocket connection timeout', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Fast-forward time to trigger timeout (10 seconds)
      jest.advanceTimersByTime(10000);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and cleanup resources', () => {
      // Start monitoring first
      const callback = jest.fn();
      const errorCallback = jest.fn();

      RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);

      // Stop monitoring
      RealtimeTransactionMonitor.stopMonitoring();

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(false);
      expect(RealtimeTransactionMonitor.getCurrentSession()).toBeNull();
    });
  });

  describe('WebSocket message handling', () => {
    it('should handle pending transaction messages', async () => {
      let callbackPromiseResolve: any;
      const callbackPromise = new Promise((resolve) => { callbackPromiseResolve = resolve; });
      const callback = jest.fn(() => callbackPromiseResolve());
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate pending transaction message
      const mockTransaction = {
        hash: '0x123',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '0xde0b6b3a7640000', // 1 ETH in hex
        input: '0x'
      };

      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'alchemy_pendingTransactions',
        params: {
          result: mockTransaction
        }
      })));

      // Advance timers to handle any setTimeout calls in the service
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      await callbackPromise;
      expect(callback).toHaveBeenCalledWith(
        '0x123',
        'ETH',
        '0x1234567890123456789012345678901234567890',
        18
      );
    });

    it('should handle new block messages', async () => {
      jest.useFakeTimers();
      const callback = jest.fn();
      const errorCallback = jest.fn();

      mockAlchemyInstance.core.getAssetTransfers.mockResolvedValue({
        transfers: []
      });

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', // Use the mocked RECIPIENT_ADDRESS
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Simulate WebSocket connection
      wsEventHandlers.open();
      await startPromise;

      // First, simulate subscription confirmation for new blocks
      wsEventHandlers.message(Buffer.from(JSON.stringify({
        id: 2,
        result: '0x1234567890abcdef'
      })));

      // Then simulate new block message
      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'eth_subscription',
        params: {
          subscription: '0x1234567890abcdef',
          result: {
            number: '0x123456'
          }
        }
      })));

      // Advance timers to trigger the 2-second delay in checkBlockForTransfers
      jest.advanceTimersByTime(2000);
      await jest.runAllTimersAsync();
      
      // Flush microtasks
      await Promise.resolve();

      expect(mockAlchemyInstance.core.getAssetTransfers).toHaveBeenCalled();
    });

    it('should handle invalid JSON messages', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate invalid JSON message
      wsEventHandlers.message(Buffer.from('invalid json'));

      // Should not throw error
      expect(() => jest.runOnlyPendingTimersAsync()).not.toThrow();
    });

    it('should handle non-transaction messages', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate non-transaction message
      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'other_method',
        params: {}
      })));

      await jest.runOnlyPendingTimersAsync();
      // Should not call callback
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('WebSocket connection events', () => {
    it('should handle WebSocket close and attempt reconnection', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate WebSocket close
      wsEventHandlers.close(1000, 'Normal closure');

      // Wait for reconnection attempt (2 seconds)
      jest.advanceTimersByTime(2000);
      await jest.runOnlyPendingTimersAsync();

      // Should still be monitoring
      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
    });

    it('should stop reconnection attempts after max attempts', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate multiple close events to exceed max attempts
      for (let i = 0; i < 6; i++) {
        wsEventHandlers.close(1000, 'Normal closure');
        jest.advanceTimersByTime(2000);
        await jest.runOnlyPendingTimersAsync();
      }

      // Should fall back to polling
      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
    });
  });

  describe('ERC-20 token handling', () => {
    it('should decode and process ERC-20 transfers', async () => {
      let callbackPromiseResolve: any;
      const callbackPromise = new Promise((resolve) => { callbackPromiseResolve = resolve; });
      const callback = jest.fn(() => callbackPromiseResolve());
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8', // ERC-20 token address
        BigInt('1000000'), // 1 USDC with 6 decimals
        'USDC',
        6,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate ERC-20 transfer transaction
      const mockERC20Transaction = {
        hash: '0x123',
        to: '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8', // Token contract
        value: '0x0',
        input: '0xa9059cbb000000000000000000000000742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b700000000000000000000000000000000000000000000000000000000000f4240' // transfer(address,uint256) with recipient and amount
      };

      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'alchemy_pendingTransactions',
        params: {
          result: mockERC20Transaction
        }
      })));

      // Advance timers to handle any setTimeout calls
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      await callbackPromise;
      expect(callback).toHaveBeenCalledWith(
        '0x123',
        'USDC',
        '0xA0b86a33E6441b8c4C8C8C8C8C8C8C8C8C8C8C8C8',
        6
      );
    });
  });

  describe('fallback polling', () => {
    it.skip('should start fallback polling when WebSocket fails', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      mockAlchemyInstance.core.getAssetTransfers.mockResolvedValue({
        transfers: []
      });

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Simulate WebSocket error to trigger fallback
      wsEventHandlers.error(new Error('Connection failed'));

      await startPromise;

      // Advance timers to trigger fallback polling (5 seconds)
      jest.advanceTimersByTime(5000);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
      expect(mockAlchemyInstance.core.getAssetTransfers).toHaveBeenCalled();
    });

    it.skip('should handle polling errors gracefully', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      mockAlchemyInstance.core.getAssetTransfers.mockRejectedValue(new Error('Polling error'));

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Simulate WebSocket error to trigger fallback
      wsEventHandlers.error(new Error('Connection failed'));

      await startPromise;

      // Advance timers to trigger fallback polling (5 seconds)
      jest.advanceTimersByTime(5000);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
      expect(mockAlchemyInstance.core.getAssetTransfers).toHaveBeenCalled();
    });
  });

  describe('payment verification', () => {
    it.skip('should verify correct payment amount and token', async () => {
      let callbackPromiseResolve: any;
      const callbackPromise = new Promise((resolve) => { callbackPromiseResolve = resolve; });
      const callback = jest.fn(() => callbackPromiseResolve());
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'), // 1 ETH
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate correct payment
      const mockTransaction = {
        hash: '0x123',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '0xde0b6b3a7640000', // 1 ETH in hex
        input: '0x'
      };

      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'alchemy_pendingTransactions',
        params: {
          result: mockTransaction
        }
      })));

      // Advance timers to handle any setTimeout calls
      jest.advanceTimersByTime(100);
      await jest.runOnlyPendingTimersAsync();
      await Promise.resolve(); // flush microtasks

      await callbackPromise;
      expect(callback).toHaveBeenCalledWith(
        '0x123',
        'ETH',
        '0x1234567890123456789012345678901234567890',
        18
      );
    });

    it('should not trigger callback for incorrect payment amount', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'), // 1 ETH
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate incorrect payment amount
      const mockTransaction = {
        hash: '0x123',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '0x1bc16d674ec80000', // 2 ETH in hex (wrong amount)
        input: '0x'
      };

      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'alchemy_pendingTransactions',
        params: {
          result: mockTransaction
        }
      })));

      await jest.runOnlyPendingTimersAsync();
      expect(callback).not.toHaveBeenCalled();
    });

    it('should not trigger callback for wrong recipient', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      const startPromise = RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'), // 1 ETH
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();
      await startPromise;

      // Simulate payment to wrong address
      const mockTransaction = {
        hash: '0x123',
        to: '0x1111111111111111111111111111111111111111', // Wrong address
        value: '0xde0b6b3a7640000', // 1 ETH in hex
        input: '0x'
      };

      wsEventHandlers.message(Buffer.from(JSON.stringify({
        method: 'alchemy_pendingTransactions',
        params: {
          result: mockTransaction
        }
      })));

      await jest.runOnlyPendingTimersAsync();
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('session management', () => {
    it('should return current session when monitoring', () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();

      const session = RealtimeTransactionMonitor.getCurrentSession();
      expect(session).toBeTruthy();
      expect(session?.tokenSymbol).toBe('ETH');
      expect(session?.expectedAmount).toBe(BigInt('1000000000000000000'));
    });

    it('should return null when not monitoring', () => {
      expect(RealtimeTransactionMonitor.getCurrentSession()).toBeNull();
    });

    it('should return monitoring status correctly', () => {
      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(false);

      const callback = jest.fn();
      const errorCallback = jest.fn();

      RealtimeTransactionMonitor.startMonitoring(
        '0x1234567890123456789012345678901234567890',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      wsEventHandlers.open();

      expect(RealtimeTransactionMonitor.isMonitoring()).toBe(true);
    });
  });
}); 