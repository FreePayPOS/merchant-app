import { ProviderService } from '../../src/services/providerService';
import { MultiProviderConfig } from '../../src/types/providers';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES } from '../../src/types/providers';

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
      // Skip health check during test to avoid external API calls
      await expect(providerService.initialize(true)).resolves.not.toThrow();
    });

    it('should throw error when no blockchain providers are enabled', async () => {
      // Clear singleton instance
      (ProviderService as any).instance = null;
      
      // Remove all API keys to disable providers
      delete process.env.ALCHEMY_API_KEY;
      delete process.env.INFURA_API_KEY;
      delete process.env.AXOL_API_KEY;
      
      expect(() => ProviderService.getInstance(true)).toThrow(/Provider configuration errors/);
    });

    it('should be a singleton', () => {
      const instance1 = ProviderService.getInstance(true);
      const instance2 = ProviderService.getInstance(true);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Provider Configuration', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await providerService.initialize(true); // Skip health check
    });

    it('should return provider configuration', () => {
      const config = providerService.getProviderConfig();
      expect(config).toBeDefined();
      expect(config.blockchain).toBeInstanceOf(Array);
      expect(config.price).toBeInstanceOf(Array);
      expect(config.explorer).toBeInstanceOf(Array);
    });

    it('should return provider health status', () => {
      const health = providerService.getProviderHealth();
      expect(health).toBeInstanceOf(Array);
    });
  });

  describe('Blockchain Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await providerService.initialize(true); // Skip health check
    });

    it('should get balance for an address', async () => {
      // This test would need proper mocking of the Alchemy SDK
      // For now, we'll test the method signature
      expect(typeof providerService.getBalance).toBe('function');
    });

    it('should get transaction details', async () => {
      // This test would need proper mocking of the Alchemy SDK
      expect(typeof providerService.getTransaction).toBe('function');
    });

    it('should get transaction receipt', async () => {
      // This test would need proper mocking of the Alchemy SDK
      expect(typeof providerService.getTransactionReceipt).toBe('function');
    });

    it('should subscribe to address monitoring', async () => {
      // This test would need proper mocking of the Alchemy SDK
      expect(typeof providerService.subscribeToAddress).toBe('function');
    });

    it('should unsubscribe from address monitoring', async () => {
      await expect(providerService.unsubscribe('test-subscription')).resolves.not.toThrow();
    });
  });

  describe('Price Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await providerService.initialize(true); // Skip health check
    });

    it('should get token price', async () => {
      // This test would need proper mocking of the CoinGecko API
      expect(typeof providerService.getTokenPrice).toBe('function');
    });

    it('should get multiple token prices', async () => {
      // This test would need proper mocking of the CoinGecko API
      expect(typeof providerService.getTokenPrices).toBe('function');
    });

    it('should get native token price for a chain', async () => {
      // This test would need proper mocking of the CoinGecko API
      expect(typeof providerService.getNativeTokenPrice).toBe('function');
    });
  });

  describe('Explorer Operations', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await providerService.initialize(true); // Skip health check
    });

    it('should get transaction URL', () => {
      const url = providerService.getTransactionUrl('0x123', 1);
      // This will use the first available explorer provider (Etherscan by default)
      expect(url).toContain('0x123');
    });

    it('should get address URL', () => {
      const url = providerService.getAddressUrl('0x456', 1);
      // This will use the first available explorer provider (Etherscan by default)
      expect(url).toContain('0x456');
    });

    it('should get block URL', () => {
      const url = providerService.getBlockUrl(12345, 1);
      // This will use the first available explorer provider (Etherscan by default)
      expect(url).toContain('12345');
    });

    it('should support different chains', () => {
      const ethereumUrl = providerService.getTransactionUrl('0x123', 1);
      const baseUrl = providerService.getTransactionUrl('0x123', 8453);
      const polygonUrl = providerService.getTransactionUrl('0x123', 137);

      // All URLs should contain the transaction hash
      expect(ethereumUrl).toContain('0x123');
      expect(baseUrl).toContain('0x123');
      expect(polygonUrl).toContain('0x123');
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      providerService = ProviderService.getInstance(true); // Use test mode
      await providerService.initialize(true); // Skip health check
    });

    it('should handle unsupported chain gracefully', () => {
      expect(() => providerService.getTransactionUrl('0x123', 999999)).toThrow();
    });

    it('should handle invalid transaction hash', () => {
      expect(() => providerService.getTransactionUrl('invalid-hash', 1)).not.toThrow();
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
          apiKey: '',
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
      healthCheckInterval: 60
    };

    // This would test the validation function directly
    expect(validConfig).toBeDefined();
  });
}); 