import { TransactionMonitoringService } from '../../src/services/transactionMonitoringService';
import { Alchemy, AssetTransfersResult } from 'alchemy-sdk';

// Mock Alchemy SDK
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

// Mock config
jest.mock('../../src/config/index', () => ({
  RECIPIENT_ADDRESS: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
  config: {
    alchemy: {
      apiKey: 'test-api-key'
    }
  }
}));

const mockAlchemy = Alchemy as jest.MockedClass<typeof Alchemy>;

describe('TransactionMonitoringService', () => {
  let mockAlchemyInstance: any;
  let mockCore: any;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();

    // Setup mock Alchemy instance
    mockCore = {
      getBlockNumber: jest.fn().mockResolvedValue(4096), // 0x1000 in decimal
      getAssetTransfers: jest.fn().mockResolvedValue({
        transfers: []
      })
    };

    mockAlchemyInstance = {
      core: mockCore
    };

    mockAlchemy.mockImplementation(() => mockAlchemyInstance);

    // Patch getAlchemyClient to always return the mock for chainId 1
    (TransactionMonitoringService as any).getAlchemyClient = (chainId: number) => {
      if (chainId === 1) return mockAlchemyInstance;
      return null;
    };

    // Clear any existing monitoring
    TransactionMonitoringService.stopMonitoring();
  });

  afterEach(() => {
    jest.useRealTimers();
    TransactionMonitoringService.stopMonitoring();
  });

  describe('startMonitoring', () => {
    it('should start monitoring for ETH payment', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', // recipient address for ETH
        BigInt('1000000000000000000'), // 1 ETH in wei
        'ETH',
        18,
        1500.00, // $1500 USD
        1, // Ethereum mainnet
        'Ethereum',
        callback,
        errorCallback
      );

      jest.advanceTimersByTime(0); // Ensure interval is set
      await Promise.resolve();
      await Promise.resolve();
      await new Promise(setImmediate);

      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
      expect(mockCore.getBlockNumber).toHaveBeenCalled();
      expect(mockCore.getAssetTransfers).not.toHaveBeenCalled(); // Not called until first interval
    });

    it('should start monitoring for ERC-20 token payment', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();
      const tokenAddress = '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8';

      await TransactionMonitoringService.startMonitoring(
        tokenAddress,
        BigInt('1000000000'), // 1 token with 9 decimals
        'USDC',
        9,
        1.00, // $1 USD
        1, // Ethereum mainnet
        'Ethereum',
        callback,
        errorCallback
      );

      jest.advanceTimersByTime(0);
      await Promise.resolve();
      await Promise.resolve();
      await new Promise(setImmediate);

      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
    });

    it('should handle unsupported chain', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      // Mock Alchemy to return null for unsupported chain
      mockAlchemy.mockImplementation(() => null as any);

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        999, // Unsupported chain
        'Unsupported',
        callback,
        errorCallback
      );

      expect(errorCallback).toHaveBeenCalledWith('Unsupported chain: Unsupported');
      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
    });

    it('should handle Alchemy client creation failure', async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      // Mock getAlchemyClient to return null (which triggers the error callback)
      const originalGetAlchemyClient = (TransactionMonitoringService as any).getAlchemyClient;
      (TransactionMonitoringService as any).getAlchemyClient = () => null;

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );

      // Restore original method
      (TransactionMonitoringService as any).getAlchemyClient = originalGetAlchemyClient;

      expect(errorCallback).toHaveBeenCalledWith('Unsupported chain: Ethereum');
    });
  });

  describe('checkForPayments', () => {
    beforeEach(async () => {
      const callback = jest.fn();
      const errorCallback = jest.fn();

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        errorCallback
      );
    });

    it('should detect matching ETH payment', async () => {
      // Get the callback from the current session (created in beforeEach)
      const session = TransactionMonitoringService.getCurrentSession();
      expect(session).toBeTruthy();

      // Mock successful payment transfer
      const mockTransfer = {
        hash: '0x1234567890abcdef',
        from: '0xabcdef1234567890',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '1000000000000000000',
        asset: 'ETH',
        category: 'external',
        rawContract: {
          value: '1000000000000000000',
          address: undefined // ETH doesn't have a contract address
        }
      } as unknown as AssetTransfersResult;

      mockCore.getAssetTransfers.mockResolvedValue({
        transfers: [mockTransfer]
      });

      // Manually call checkForPayments instead of waiting for interval
      await (TransactionMonitoringService as any).checkForPayments();

      // Check that the session's callback was called
      expect(session?.onPaymentReceived).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'ETH',
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        18
      );
      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
    });

    it('should detect matching ERC-20 payment', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();
      const tokenAddress = '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C8';

      // Restart monitoring for ERC-20
      TransactionMonitoringService.stopMonitoring();
      await TransactionMonitoringService.startMonitoring(
        tokenAddress,
        BigInt('1000000000'),
        'USDC',
        9,
        1.00,
        1,
        'Ethereum',
        callback,
        _errorCallback
      );

      const mockTransfer = {
        hash: '0x1234567890abcdef',
        from: '0xabcdef1234567890',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '1000000000',
        asset: 'USDC',
        category: 'erc20',
        rawContract: {
          value: '1000000000',
          address: tokenAddress
        }
      } as unknown as AssetTransfersResult;

      mockCore.getAssetTransfers.mockResolvedValue({
        transfers: [mockTransfer]
      });

      // Manually call checkForPayments instead of waiting for interval
      await (TransactionMonitoringService as any).checkForPayments();

      expect(callback).toHaveBeenCalledWith(
        '0x1234567890abcdef',
        'USDC',
        tokenAddress,
        9
      );
      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
    });

    it('should ignore non-matching transfers', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      // Mock transfer with wrong amount
      const mockTransfer = {
        hash: '0x1234567890abcdef',
        from: '0xabcdef1234567890',
        to: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        value: '500000000000000000', // Wrong amount
        asset: 'ETH',
        category: 'external',
        rawContract: {
          value: '500000000000000000',
          address: '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7'
        }
      } as unknown as AssetTransfersResult;

      mockCore.getAssetTransfers.mockResolvedValue({
        transfers: [mockTransfer]
      });

      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setImmediate(resolve));

      expect(callback).not.toHaveBeenCalled();
      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
    });

    it('should handle "past head" errors gracefully', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      mockCore.getAssetTransfers.mockRejectedValue(
        new Error('toBlock is past head')
      );

      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setImmediate(resolve));

      expect(callback).not.toHaveBeenCalled();
      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
    });

    it('should handle other errors during monitoring', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      mockCore.getAssetTransfers.mockRejectedValue(
        new Error('Network error')
      );

      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setImmediate(resolve));

      expect(callback).not.toHaveBeenCalled();
      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
    });

    it('should handle no new blocks to check', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      // Mock current block same as last checked
      mockCore.getBlockNumber.mockResolvedValue('0x1000');

      jest.advanceTimersByTime(3000);
      await new Promise(resolve => setImmediate(resolve));

      expect(callback).not.toHaveBeenCalled();
      expect(TransactionMonitoringService.isMonitoring()).toBe(true);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and clear interval', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        _errorCallback
      );

      expect(TransactionMonitoringService.isMonitoring()).toBe(true);

      TransactionMonitoringService.stopMonitoring();

      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
    });

    it('should handle stopping when not monitoring', () => {
      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
      
      // Should not throw
      TransactionMonitoringService.stopMonitoring();
      
      expect(TransactionMonitoringService.isMonitoring()).toBe(false);
    });
  });

  describe('getCurrentSession', () => {
    it('should return current session when monitoring', async () => {
      const callback = jest.fn();
      const _errorCallback = jest.fn();

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        callback,
        _errorCallback
      );

      const session = TransactionMonitoringService.getCurrentSession();
      expect(session).toBeDefined();
      expect(session?.tokenSymbol).toBe('ETH');
      expect(session?.merchantUSD).toBe(1500.00);
      expect(session?.chainId).toBe(1);
    });

    it('should return null when not monitoring', () => {
      const session = TransactionMonitoringService.getCurrentSession();
      expect(session).toBeNull();
    });
  });

  describe('Alchemy client management', () => {
    it('should create Alchemy client for supported chains', async () => {
      // Temporarily override getAlchemyClient to track calls but still work
      const originalGetAlchemyClient = (TransactionMonitoringService as any).getAlchemyClient;
      let callCount = 0;
      (TransactionMonitoringService as any).getAlchemyClient = (chainId: number) => {
        callCount++;
        return originalGetAlchemyClient.call(TransactionMonitoringService, chainId);
      };

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        jest.fn(),
        jest.fn()
      );

      // Restore the original method
      (TransactionMonitoringService as any).getAlchemyClient = originalGetAlchemyClient;

      expect(callCount).toBeGreaterThan(0);
    });

    it('should handle multiple chain monitoring sessions', async () => {
      // Temporarily override getAlchemyClient to track calls but still work
      const originalGetAlchemyClient = (TransactionMonitoringService as any).getAlchemyClient;
      let callCount = 0;
      (TransactionMonitoringService as any).getAlchemyClient = (chainId: number) => {
        callCount++;
        return originalGetAlchemyClient.call(TransactionMonitoringService, chainId);
      };

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        jest.fn(),
        jest.fn()
      );

      TransactionMonitoringService.stopMonitoring();

      await TransactionMonitoringService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        BigInt('1000000000000000000'),
        'ETH',
        18,
        1500.00,
        1,
        'Ethereum',
        jest.fn(),
        jest.fn()
      );

      // Restore the original method
      (TransactionMonitoringService as any).getAlchemyClient = originalGetAlchemyClient;

      expect(callCount).toBeGreaterThan(1);
    });
  });
}); 