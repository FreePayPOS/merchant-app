import { ProviderService } from '../../src/services/providerService';
import { MultiProviderConfig } from '../../src/types/providers';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES } from '../../src/types/providers';
import { validateProviderConfig } from '../../src/config/providers';

// Mock the ProviderManager
const mockBlockchainProvider = {
  name: 'MockAlchemy',
  type: BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY,
  getBalance: jest.fn(),
  getTransaction: jest.fn(),
  getTransactionReceipt: jest.fn(),
  subscribeToAddress: jest.fn(),
  unsubscribe: jest.fn(),
  isHealthy: jest.fn(),
  getRateLimit: jest.fn(),
  getSupportedChains: jest.fn(),
  getExplorerUrl: jest.fn(),
};

const mockPriceProvider = {
  name: 'MockCoinGecko',
  type: PRICE_PROVIDER_TYPES.COINGECKO,
  getTokenPrice: jest.fn(),
  getTokenPrices: jest.fn(),
  getNativeTokenPrice: jest.fn(),
  isHealthy: jest.fn(),
  getRateLimit: jest.fn(),
  getSupportedTokens: jest.fn(),
};

const mockExplorerProvider = {
  name: 'MockEtherscan',
  type: EXPLORER_PROVIDER_TYPES.ETHERSCAN,
  getTransactionUrl: jest.fn(),
  getAddressUrl: jest.fn(),
  getBlockUrl: jest.fn(),
  isHealthy: jest.fn(),
  getSupportedChains: jest.fn(),
};

const mockProviderManager = {
  getBlockchainProvider: jest.fn(),
  getPriceProvider: jest.fn(),
  getExplorerProvider: jest.fn(),
  getProviderHealth: jest.fn(),
  refreshProviderHealth: jest.fn(),
  updateProviderConfig: jest.fn(),
  getProviderConfig: jest.fn(),
  cleanup: jest.fn(),
};

jest.mock('../../src/providers/ProviderManager', () => ({
  ProviderManager: jest.fn().mockImplementation(() => mockProviderManager),
}));

jest.mock('../../src/config/providers', () => ({
  getProviderConfig: jest.fn(),
  validateProviderConfig: jest.fn(),
}));

// Mock environment variables
const originalEnv = process.env;

describe('ProviderService', () => {
  let providerService: ProviderService;

  beforeEach(() => {
    // Reset environment variables
    process.env = { ...originalEnv };
    
    // Set required environment variables for testing
    process.env.ALCHEMY_API_KEY = 'test-alchemy-key';
    process.env.INFURA_API_KEY = 'test-infura-key';
    process.env.AXOL_API_KEY = 'test-axol-key';
    process.env.ETHERSCAN_API_KEY = 'test-etherscan-key';
    
    // Clear singleton instance BEFORE any instantiation
    (ProviderService as any).instance = null;
    
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup default mock implementations
    mockBlockchainProvider.getSupportedChains.mockReturnValue([1, 137, 42161]);
    mockPriceProvider.getSupportedTokens.mockReturnValue(['ETH', 'USDC', 'USDT']);
    mockExplorerProvider.getSupportedChains.mockReturnValue([1, 137, 42161]);
    
    mockProviderManager.getBlockchainProvider.mockReturnValue(mockBlockchainProvider);
    mockProviderManager.getPriceProvider.mockReturnValue(mockPriceProvider);
    mockProviderManager.getExplorerProvider.mockReturnValue(mockExplorerProvider);
    mockProviderManager.getProviderHealth.mockReturnValue([]);
    mockProviderManager.getProviderConfig.mockReturnValue({
      blockchain: [],
      price: [],
      explorer: [],
      fallbackEnabled: true,
      healthCheckInterval: 30,
    });
    
    // Mock config validation to pass
    (validateProviderConfig as jest.Mock).mockReturnValue([]);
  });

  afterEach(() => {
    // Restore environment variables
    process.env = originalEnv;
    
    // Cleanup provider service
    if (providerService) {
      providerService.cleanup();
    }
    
    // Clear singleton instance
    (ProviderService as any).instance = null;
  });

  describe('Initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await expect(providerService.initialize(true)).resolves.not.toThrow();
      expect(providerService).toBeDefined();
    });

    it('should throw error when provider configuration is invalid', () => {
      (validateProviderConfig as jest.Mock).mockReturnValue(['Missing API key']);
      
      expect(() => ProviderService.getInstance(true)).toThrow('Provider configuration errors: Missing API key');
    });

    it('should be a singleton', () => {
      const instance1 = ProviderService.getInstance(true);
      const instance2 = ProviderService.getInstance(true);
      expect(instance1).toBe(instance2);
    });

    it('should handle initialization errors gracefully', async () => {
      providerService = ProviderService.getInstance(true);
      mockProviderManager.refreshProviderHealth.mockRejectedValue(new Error('Health check failed'));
      
      await expect(providerService.initialize(false)).rejects.toThrow('Health check failed');
    });
  });

  describe('Provider Configuration', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true);
      await providerService.initialize(true);
    });

    it('should return provider configuration', () => {
      const config = providerService.getProviderConfig();
      expect(config).toBeDefined();
      expect(mockProviderManager.getProviderConfig).toHaveBeenCalled();
    });

    it('should return provider health status', () => {
      const mockHealth = [
        { provider: 'Alchemy', type: 'blockchain', healthy: true, lastCheck: new Date() }
      ];
      mockProviderManager.getProviderHealth.mockReturnValue(mockHealth);
      
      const health = providerService.getProviderHealth();
      expect(health).toEqual(mockHealth);
      expect(mockProviderManager.getProviderHealth).toHaveBeenCalled();
    });

    it('should refresh provider health', async () => {
      // Reset the mock for this specific test
      mockProviderManager.refreshProviderHealth.mockResolvedValue(undefined);
      await providerService.refreshProviderHealth();
      expect(mockProviderManager.refreshProviderHealth).toHaveBeenCalled();
    });

    it('should update provider configuration', async () => {
      const newConfig: MultiProviderConfig = {
        blockchain: [],
        price: [],
        explorer: [],
        fallbackEnabled: true,
        healthCheckInterval: 60,
      };
      
      await providerService.updateProviderConfig(newConfig);
      expect(mockProviderManager.updateProviderConfig).toHaveBeenCalledWith(newConfig);
    });
  });

  describe('Blockchain Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true);
      await providerService.initialize(true);
    });

    it('should get balance for an address successfully', async () => {
      const mockBalance = '1000000000000000000';
      mockBlockchainProvider.getBalance.mockResolvedValue(mockBalance);
      
      const result = await providerService.getBalance('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1);
      
      expect(result).toBe(mockBalance);
      expect(mockProviderManager.getBlockchainProvider).toHaveBeenCalledWith(1);
      expect(mockBlockchainProvider.getBalance).toHaveBeenCalledWith('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1);
    });

    it('should handle balance fetch errors', async () => {
      mockBlockchainProvider.getBalance.mockRejectedValue(new Error('Provider error'));
      
      await expect(providerService.getBalance('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1))
        .rejects.toThrow('Provider error');
    });

    it('should get transaction details successfully', async () => {
      const mockTransaction = {
        hash: '0x123',
        value: 1000000,
        from: '0xabc',
        to: '0xdef',
        chainId: 1,
      };
      mockBlockchainProvider.getTransaction.mockResolvedValue(mockTransaction);
      
      const result = await providerService.getTransaction('0x123', 1);
      
      expect(result).toEqual(mockTransaction);
      expect(mockBlockchainProvider.getTransaction).toHaveBeenCalledWith('0x123', 1);
    });

    it('should handle transaction not found', async () => {
      mockBlockchainProvider.getTransaction.mockResolvedValue(null);
      
      const result = await providerService.getTransaction('0x123', 1);
      
      expect(result).toBeNull();
    });

    it('should get transaction receipt successfully', async () => {
      const mockReceipt = {
        hash: '0x123',
        blockNumber: 12345,
        status: 1,
      };
      mockBlockchainProvider.getTransactionReceipt.mockResolvedValue(mockReceipt);
      
      const result = await providerService.getTransactionReceipt('0x123', 1);
      
      expect(result).toEqual(mockReceipt);
      expect(mockBlockchainProvider.getTransactionReceipt).toHaveBeenCalledWith('0x123', 1);
    });

    it('should subscribe to address monitoring successfully', async () => {
      const mockSubscriptionId = 'sub_123';
      const callback = jest.fn();
      mockBlockchainProvider.subscribeToAddress.mockResolvedValue(mockSubscriptionId);
      
      const result = await providerService.subscribeToAddress('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1, callback);
      
      expect(result).toBe(mockSubscriptionId);
      expect(mockBlockchainProvider.subscribeToAddress).toHaveBeenCalledWith('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1, callback);
    });

    it('should handle subscription errors', async () => {
      const callback = jest.fn();
      mockBlockchainProvider.subscribeToAddress.mockRejectedValue(new Error('Subscription failed'));
      
      await expect(providerService.subscribeToAddress('0x742e31b1b2b3b4b5b6b7b8b9b0b1b2b3b4b5b6b7', 1, callback))
        .rejects.toThrow('Subscription failed');
    });

    it('should handle unsupported chain for blockchain operations', async () => {
      mockProviderManager.getBlockchainProvider.mockImplementation(() => {
        throw new Error('No blockchain provider available for chain 999');
      });
      
      await expect(providerService.getBalance('0x123', 999))
        .rejects.toThrow('No blockchain provider available for chain 999');
    });
  });

  describe('Price Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true);
      await providerService.initialize(true);
    });

    it('should get token price successfully', async () => {
      const mockPrice = 2500.50;
      mockPriceProvider.getTokenPrice.mockResolvedValue(mockPrice);
      
      const result = await providerService.getTokenPrice('ETH');
      
      expect(result).toBe(mockPrice);
      expect(mockProviderManager.getPriceProvider).toHaveBeenCalled();
      expect(mockPriceProvider.getTokenPrice).toHaveBeenCalledWith('ETH');
    });

    it('should handle token price fetch errors', async () => {
      mockPriceProvider.getTokenPrice.mockRejectedValue(new Error('Price fetch failed'));
      
      await expect(providerService.getTokenPrice('ETH'))
        .rejects.toThrow('Price fetch failed');
    });

    it('should get multiple token prices successfully', async () => {
      const mockPrices = { ETH: 2500.50, USDC: 1.00, USDT: 1.00 };
      mockPriceProvider.getTokenPrices.mockResolvedValue(mockPrices);
      
      const result = await providerService.getTokenPrices(['ETH', 'USDC', 'USDT']);
      
      expect(result).toEqual(mockPrices);
      expect(mockPriceProvider.getTokenPrices).toHaveBeenCalledWith(['ETH', 'USDC', 'USDT']);
    });

    it('should get native token price for a chain successfully', async () => {
      const mockPrice = 2500.50;
      mockPriceProvider.getNativeTokenPrice.mockResolvedValue(mockPrice);
      
      const result = await providerService.getNativeTokenPrice(1);
      
      expect(result).toBe(mockPrice);
      expect(mockPriceProvider.getNativeTokenPrice).toHaveBeenCalledWith(1);
    });

    it('should handle no price provider available', async () => {
      mockProviderManager.getPriceProvider.mockImplementation(() => {
        throw new Error('No price provider available');
      });
      
      await expect(providerService.getTokenPrice('ETH'))
        .rejects.toThrow('No price provider available');
    });
  });

  describe('Explorer Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true);
      await providerService.initialize(true);
    });

    it('should get transaction URL successfully', () => {
      const mockUrl = 'https://etherscan.io/tx/0x123';
      mockExplorerProvider.getTransactionUrl.mockReturnValue(mockUrl);
      
      const result = providerService.getTransactionUrl('0x123', 1);
      
      expect(result).toBe(mockUrl);
      expect(mockProviderManager.getExplorerProvider).toHaveBeenCalledWith(1);
      expect(mockExplorerProvider.getTransactionUrl).toHaveBeenCalledWith('0x123', 1);
    });

    it('should get address URL successfully', () => {
      const mockUrl = 'https://etherscan.io/address/0x456';
      mockExplorerProvider.getAddressUrl.mockReturnValue(mockUrl);
      
      const result = providerService.getAddressUrl('0x456', 1);
      
      expect(result).toBe(mockUrl);
      expect(mockExplorerProvider.getAddressUrl).toHaveBeenCalledWith('0x456', 1);
    });

    it('should get block URL successfully', () => {
      const mockUrl = 'https://etherscan.io/block/12345';
      mockExplorerProvider.getBlockUrl.mockReturnValue(mockUrl);
      
      const result = providerService.getBlockUrl(12345, 1);
      
      expect(result).toBe(mockUrl);
      expect(mockExplorerProvider.getBlockUrl).toHaveBeenCalledWith(12345, 1);
    });

    it('should support different chains for explorer operations', () => {
      const ethereumUrl = 'https://etherscan.io/tx/0x123';
      const baseUrl = 'https://basescan.org/tx/0x123';
      const polygonUrl = 'https://polygonscan.com/tx/0x123';
      
      mockExplorerProvider.getTransactionUrl
        .mockReturnValueOnce(ethereumUrl)
        .mockReturnValueOnce(baseUrl)
        .mockReturnValueOnce(polygonUrl);
      
      const result1 = providerService.getTransactionUrl('0x123', 1);
      const result2 = providerService.getTransactionUrl('0x123', 8453);
      const result3 = providerService.getTransactionUrl('0x123', 137);
      
      expect(result1).toBe(ethereumUrl);
      expect(result2).toBe(baseUrl);
      expect(result3).toBe(polygonUrl);
    });

    it('should handle unsupported chain for explorer operations', () => {
      mockProviderManager.getExplorerProvider.mockImplementation(() => {
        throw new Error('No explorer provider available for chain 999');
      });
      
      expect(() => providerService.getTransactionUrl('0x123', 999))
        .toThrow('No explorer provider available for chain 999');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true);
      await providerService.initialize(true);
    });

    it('should handle invalid transaction hash gracefully', () => {
      const mockUrl = 'https://etherscan.io/tx/invalid-hash';
      mockExplorerProvider.getTransactionUrl.mockReturnValue(mockUrl);
      
      expect(() => providerService.getTransactionUrl('invalid-hash', 1)).not.toThrow();
      expect(mockExplorerProvider.getTransactionUrl).toHaveBeenCalledWith('invalid-hash', 1);
    });

    it('should handle unsubscribe gracefully', async () => {
      await expect(providerService.unsubscribe('test-subscription')).resolves.not.toThrow();
    });

    it('should handle provider manager errors gracefully', async () => {
      mockProviderManager.getBlockchainProvider.mockImplementation(() => {
        throw new Error('Provider manager error');
      });
      
      await expect(providerService.getBalance('0x123', 1))
        .rejects.toThrow('Provider manager error');
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources properly', () => {
      providerService = ProviderService.getInstance(true);
      providerService.cleanup();
      
      expect(mockProviderManager.cleanup).toHaveBeenCalled();
    });
  });
});

describe('Provider Configuration Validation', () => {
  it('should validate valid configuration', () => {
    const validConfig: MultiProviderConfig = {
      blockchain: [
        {
          type: BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY,
          name: 'Alchemy',
          apiKey: 'test-key',
          enabled: true
        }
      ],
      price: [
        {
          type: PRICE_PROVIDER_TYPES.COINGECKO,
          name: 'CoinGecko',
          apiKey: 'test-key',
          enabled: true
        }
      ],
      explorer: [
        {
          type: EXPLORER_PROVIDER_TYPES.ETHERSCAN,
          name: 'Etherscan',
          apiKey: 'test-key',
          enabled: true
        }
      ],
      fallbackEnabled: true,
      healthCheckInterval: 30
    };

    (validateProviderConfig as jest.Mock).mockReturnValue([]);
    
    expect(validateProviderConfig(validConfig)).toEqual([]);
  });

  it('should detect invalid configuration', () => {
    const invalidConfig: MultiProviderConfig = {
      blockchain: [],
      price: [],
      explorer: [],
      fallbackEnabled: true,
      healthCheckInterval: 30
    };

    (validateProviderConfig as jest.Mock).mockReturnValue(['No blockchain providers configured']);
    
    expect(validateProviderConfig(invalidConfig)).toContain('No blockchain providers configured');
  });
}); 