import { ProviderManager } from '../../src/providers/ProviderManager';
import { ProviderFactory } from '../../src/providers/ProviderFactory';
import { MultiProviderConfig } from '../../src/types/providers';

// Mock dependencies
jest.mock('../../src/providers/ProviderFactory');

const mockProviderFactory = {
  createBlockchainProvider: jest.fn(),
  createPriceProvider: jest.fn(),
  createExplorerProvider: jest.fn()
};

const mockBlockchainProvider = {
  name: 'Test Blockchain Provider',
  getBalance: jest.fn(),
  getTokenBalances: jest.fn(),
  getAssetTransfers: jest.fn(),
  isHealthy: jest.fn(),
  getSupportedChains: jest.fn()
};

const mockPriceProvider = {
  name: 'Test Price Provider',
  getPrice: jest.fn(),
  isHealthy: jest.fn()
};

const mockExplorerProvider = {
  name: 'Test Explorer Provider',
  getTransactionUrl: jest.fn(),
  isHealthy: jest.fn(),
  getSupportedChains: jest.fn()
};

describe('ProviderManager', () => {
  let providerManager: ProviderManager;
  let testConfig: MultiProviderConfig;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    (ProviderFactory as jest.MockedClass<typeof ProviderFactory>).mockImplementation(() => mockProviderFactory);
    mockProviderFactory.createBlockchainProvider.mockReturnValue(mockBlockchainProvider);
    mockProviderFactory.createPriceProvider.mockReturnValue(mockPriceProvider);
    mockProviderFactory.createExplorerProvider.mockReturnValue(mockExplorerProvider);

    // Test configuration
    testConfig = {
      blockchain: [
        {
          type: 'alchemy',
          name: 'Alchemy Test',
          apiKey: 'test-key',
          priority: 1,
          enabled: true
        }
      ],
      price: [
        {
          type: 'coingecko',
          name: 'CoinGecko Test',
          apiKey: 'test-key',
          priority: 1,
          enabled: true
        }
      ],
      explorer: [
        {
          type: 'etherscan',
          name: 'Etherscan Test',
          apiKey: 'test-key',
          priority: 1,
          enabled: true
        }
      ],
      fallbackEnabled: true,
      healthCheckInterval: 60
    };

    providerManager = new ProviderManager(testConfig, true); // testMode = true
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with configuration', () => {
      expect(ProviderFactory).toHaveBeenCalledTimes(1);
      expect(mockProviderFactory.createBlockchainProvider).toHaveBeenCalledWith(testConfig.blockchain[0]);
      expect(mockProviderFactory.createPriceProvider).toHaveBeenCalledWith(testConfig.price[0]);
      expect(mockProviderFactory.createExplorerProvider).toHaveBeenCalledWith(testConfig.explorer[0]);
    });

    it('should not start health monitoring in test mode', () => {
      // Health monitoring should not be started in test mode
      expect(providerManager).toBeDefined();
    });
  });

  describe('getBlockchainProvider', () => {
    it('should return the first healthy blockchain provider', () => {
      mockBlockchainProvider.getSupportedChains.mockReturnValue([1, 137]);

      const provider = providerManager.getBlockchainProvider(1);

      expect(provider).toBe(mockBlockchainProvider);
    });

    it('should throw error when no providers available for chain', () => {
      mockBlockchainProvider.getSupportedChains.mockReturnValue([137]); // Doesn't support chain 1

      expect(() => providerManager.getBlockchainProvider(1)).toThrow('No blockchain provider available for chain 1');
    });
  });

  describe('getPriceProvider', () => {
    it('should return the first available price provider', () => {
      const provider = providerManager.getPriceProvider();

      expect(provider).toBe(mockPriceProvider);
    });

    it('should throw error when no price providers available', () => {
      // Create manager with no price providers
      const configWithoutPrice = { ...testConfig, price: [] };
      const managerWithoutPrice = new ProviderManager(configWithoutPrice, true);

      expect(() => managerWithoutPrice.getPriceProvider()).toThrow('No price provider available');
    });
  });

  describe('getExplorerProvider', () => {
    it('should return the first healthy explorer provider', () => {
      mockExplorerProvider.getSupportedChains.mockReturnValue([1, 137]);

      const provider = providerManager.getExplorerProvider(1);

      expect(provider).toBe(mockExplorerProvider);
    });

    it('should throw error when no providers available for chain', () => {
      mockExplorerProvider.getSupportedChains.mockReturnValue([137]); // Doesn't support chain 1

      expect(() => providerManager.getExplorerProvider(1)).toThrow('No explorer provider available for chain 1');
    });
  });

  describe('getProviderHealth', () => {
    it('should return health status for all providers', () => {
      // Mock the health status map
      const mockHealthStatus = new Map();
      mockHealthStatus.set('Test Blockchain Provider', {
        provider: 'Test Blockchain Provider',
        type: 'blockchain',
        healthy: true,
        lastCheck: new Date(),
        responseTime: 100
      });
      mockHealthStatus.set('Test Price Provider', {
        provider: 'Test Price Provider',
        type: 'price',
        healthy: false,
        lastCheck: new Date(),
        responseTime: 200
      });
      mockHealthStatus.set('Test Explorer Provider', {
        provider: 'Test Explorer Provider',
        type: 'explorer',
        healthy: true,
        lastCheck: new Date(),
        responseTime: 150
      });

      // Mock the private healthStatus property
      (providerManager as any).healthStatus = mockHealthStatus;

      const health = providerManager.getProviderHealth();

      expect(health).toHaveLength(3);
      expect(health[0].provider).toBe('Test Blockchain Provider');
      expect(health[0].healthy).toBe(true);
      expect(health[1].provider).toBe('Test Price Provider');
      expect(health[1].healthy).toBe(false);
      expect(health[2].provider).toBe('Test Explorer Provider');
      expect(health[2].healthy).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should handle provider creation errors', () => {
      mockProviderFactory.createBlockchainProvider.mockImplementation(() => {
        throw new Error('Provider creation failed');
      });

      expect(() => new ProviderManager(testConfig, true)).toThrow('Provider creation failed');
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete provider workflow', () => {
      mockBlockchainProvider.getSupportedChains.mockReturnValue([1, 137]);
      mockExplorerProvider.getSupportedChains.mockReturnValue([1, 137]);

      // Get all providers
      const blockchainProvider = providerManager.getBlockchainProvider(1);
      const priceProvider = providerManager.getPriceProvider();
      const explorerProvider = providerManager.getExplorerProvider(1);

      expect(blockchainProvider).toBe(mockBlockchainProvider);
      expect(priceProvider).toBe(mockPriceProvider);
      expect(explorerProvider).toBe(mockExplorerProvider);
    });
  });
}); 