import { AlchemyService } from '../../src/services/alchemyService';
import { Alchemy } from 'alchemy-sdk';
import { config } from '../../src/config/index';

jest.mock('alchemy-sdk', () => {
  return {
    Alchemy: jest.fn().mockImplementation(() => ({
      core: {
        getBalance: jest.fn(),
        getTokenBalances: jest.fn(),
        getAssetTransfers: jest.fn(),
      },
      ws: {
        on: jest.fn(),
        once: jest.fn(),
      },
    })),
    Network: {
      ETH_MAINNET: 'eth-mainnet',
      BASE_MAINNET: 'base-mainnet',
      ARB_MAINNET: 'arb-mainnet',
      OPT_MAINNET: 'opt-mainnet',
      MATIC_MAINNET: 'matic-mainnet',
    },
    AlchemySubscription: {
      PENDING_TRANSACTIONS: 'pending-transactions',
    },
    AssetTransfersCategory: {
      EXTERNAL: 'external',
      ERC20: 'erc20',
    },
  };
});

jest.mock('../../src/config/index', () => ({
  SUPPORTED_CHAINS: [
    { id: 1, name: 'ethereum', displayName: 'Ethereum', nativeToken: { symbol: 'ETH', decimals: 18 } },
    { id: 137, name: 'polygon', displayName: 'Polygon', nativeToken: { symbol: 'MATIC', decimals: 18 } },
    { id: 42161, name: 'arbitrum', displayName: 'Arbitrum', nativeToken: { symbol: 'ARB', decimals: 18 } },
    { id: 10, name: 'optimism', displayName: 'Optimism', nativeToken: { symbol: 'OP', decimals: 18 } },
    { id: 8453, name: 'base', displayName: 'Base', nativeToken: { symbol: 'BASE', decimals: 18 } },
    { id: 393402133025423, name: 'starknet', displayName: 'Starknet', nativeToken: { symbol: 'STRK', decimals: 18 } },
  ],
  config: {
    ALCHEMY_API_KEY: 'test-key',
  },
}));

// Mock the config import
const mockConfig = {
  ALCHEMY_API_KEY: 'test-key',
};

jest.doMock('../../src/config/index', () => ({
  ...jest.requireActual('../../src/config/index'),
  config: mockConfig,
}));

jest.mock('../../src/services/priceService', () => ({
  PriceService: {
    getTokenPricesForChain: jest.fn(),
  },
}));

describe('AlchemyService', () => {
  let alchemyInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock the config.ALCHEMY_API_KEY
    (config as any).ALCHEMY_API_KEY = 'test-key';
    alchemyInstance = {
      core: {
        getBalance: jest.fn(),
        getTokenBalances: jest.fn(),
        getAssetTransfers: jest.fn(),
      },
      ws: {
        on: jest.fn(),
        once: jest.fn(),
      },
    };
    (Alchemy as jest.Mock).mockImplementation(() => alchemyInstance);
    // Reset static fields
    (AlchemyService as any).alchemyInstances = new Map();
    (AlchemyService as any).isInitialized = false;
    (AlchemyService as any).activeSubscriptions = new Map();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('isEthereumAddress', () => {
    it('should validate correct Ethereum addresses', () => {
      expect(AlchemyService.isEthereumAddress('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7')).toBe(true);
      expect(AlchemyService.isEthereumAddress('0x0000000000000000000000000000000000000000')).toBe(true);
    });

    it('should reject invalid addresses', () => {
      expect(AlchemyService.isEthereumAddress('0x123')).toBe(false);
      expect(AlchemyService.isEthereumAddress('invalid')).toBe(false);
      expect(AlchemyService.isEthereumAddress('')).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should initialize Alchemy instances for supported chains', () => {
      AlchemyService.initialize();
      expect((AlchemyService as any).isInitialized).toBe(true);
      expect((AlchemyService as any).alchemyInstances.size).toBe(5);
    });

    it('should not reinitialize if already initialized', () => {
      AlchemyService.initialize();
      const firstSize = (AlchemyService as any).alchemyInstances.size;
      AlchemyService.initialize();
      expect((AlchemyService as any).alchemyInstances.size).toBe(firstSize);
    });

    it('should throw error if API key is not set', () => {
      ((config as any).ALCHEMY_API_KEY = undefined);
      expect(() => AlchemyService.initialize()).toThrow('ALCHEMY_API_KEY is not set');
    });
  });

  describe('fetchMultiChainBalances', () => {
    beforeEach(() => {
      AlchemyService.initialize();
    });

    it('should fetch balances across all chains', async () => {
      alchemyInstance.core.getBalance.mockResolvedValue('1000000000000000000');
      alchemyInstance.core.getTokenBalances.mockResolvedValue({
        tokenBalances: [],
      });
      const result = await AlchemyService.fetchMultiChainBalances('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result.address).toBe('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result.chains.length).toBe(6);
    });

    it('should handle errors gracefully', async () => {
      alchemyInstance.core.getBalance.mockRejectedValue(new Error('fail'));
      const result = await AlchemyService.fetchMultiChainBalances('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(result.chains.length).toBe(6);
      expect(result.totalValueUSD).toBe(0);
    });
  });

  describe('fetchBalances', () => {
    beforeEach(() => {
      AlchemyService.initialize();
    });

    it('should fetch balances for a single address', async () => {
      alchemyInstance.core.getBalance.mockResolvedValue('1000000000000000000');
      alchemyInstance.core.getTokenBalances.mockResolvedValue({
        tokenBalances: [],
      });
      const result = await AlchemyService.fetchBalances('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7');
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('monitorTransactions', () => {
    beforeEach(() => {
      AlchemyService.initialize();
    });

    it('should start monitoring transactions', async () => {
      const callback = jest.fn();
      const stopMonitoring = await AlchemyService.monitorTransactions(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        callback
      );
      expect(typeof stopMonitoring).toBe('function');
      stopMonitoring();
    });

    it('should handle unsupported chains', async () => {
      const callback = jest.fn();
      await expect(AlchemyService.monitorTransactions(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        callback,
        999 // Unsupported chain
      )).rejects.toThrow('Chain ID 999 is not supported');
    });
  });

  describe('monitorMultiChainTransactions', () => {
    beforeEach(() => {
      AlchemyService.initialize();
    });

    it('should start multi-chain monitoring', async () => {
      const callback = jest.fn();
      const stopMonitoring = await AlchemyService.monitorMultiChainTransactions(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        callback
      );
      expect(typeof stopMonitoring).toBe('function');
      stopMonitoring();
    });

    it('should handle specific chain IDs', async () => {
      const callback = jest.fn();
      const stopMonitoring = await AlchemyService.monitorMultiChainTransactions(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        callback,
        [1, 137]
      );
      expect(typeof stopMonitoring).toBe('function');
      stopMonitoring();
    });
  });

  describe('getActiveSubscriptions', () => {
    it('should return active subscription keys', () => {
      const result = AlchemyService.getActiveSubscriptions();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all subscriptions', () => {
      AlchemyService.cleanup();
      expect((AlchemyService as any).activeSubscriptions.size).toBe(0);
    });
  });

  describe('startMonitoring', () => {
    beforeEach(() => {
      AlchemyService.initialize();
    });

    it('should have startMonitoring method', () => {
      expect(typeof AlchemyService.startMonitoring).toBe('function');
    });

    it('should throw error for unsupported chains in startMonitoring', async () => {
      await expect(AlchemyService.startMonitoring(
        '0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7',
        1000000,
        999,
        'UnsupportedChain'
      )).rejects.toThrow('Chain UnsupportedChain (ID: 999) is not supported');
    });
  });

  describe('getAlchemyNetwork', () => {
    it('should return correct network for supported chains', () => {
      expect((AlchemyService as any).getAlchemyNetwork(1)).toBe('eth-mainnet');
      expect((AlchemyService as any).getAlchemyNetwork(137)).toBe('matic-mainnet');
      expect((AlchemyService as any).getAlchemyNetwork(42161)).toBe('arb-mainnet');
      expect((AlchemyService as any).getAlchemyNetwork(10)).toBe('opt-mainnet');
      expect((AlchemyService as any).getAlchemyNetwork(8453)).toBe('base-mainnet');
    });

    it('should return null for unsupported chains', () => {
      expect((AlchemyService as any).getAlchemyNetwork(999)).toBeNull();
    });
  });

  describe('getBlockExplorerUrl', () => {
    it('should return correct explorer URLs', () => {
      expect((AlchemyService as any).getBlockExplorerUrl(1, '0x123')).toContain('etherscan.io');
      expect((AlchemyService as any).getBlockExplorerUrl(137, '0x123')).toContain('polygonscan.com');
      expect((AlchemyService as any).getBlockExplorerUrl(42161, '0x123')).toContain('arbiscan.io');
      expect((AlchemyService as any).getBlockExplorerUrl(10, '0x123')).toContain('optimistic.etherscan.io');
      expect((AlchemyService as any).getBlockExplorerUrl(8453, '0x123')).toContain('basescan.org');
      expect((AlchemyService as any).getBlockExplorerUrl(393402133025423, '0x123')).toContain('starkscan.co');
    });

    it('should return default URL for unknown chains', () => {
      expect((AlchemyService as any).getBlockExplorerUrl(999, '0x123')).toContain('etherscan.io');
    });
  });

  describe('getChainConfig', () => {
    it('should return chain config for supported chains', () => {
      const chainConfig = (AlchemyService as any).getChainConfig(1);
      expect(chainConfig?.name).toBe('ethereum');
    });

    it('should return null for unsupported chains', () => {
      const chainConfig = (AlchemyService as any).getChainConfig(999);
      expect(chainConfig).toBeNull();
    });
  });
}); 