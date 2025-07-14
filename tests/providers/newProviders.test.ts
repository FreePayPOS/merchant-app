import { AxolBlockchainProvider } from '../../src/providers/blockchain/AxolBlockchainProvider';
import { InfuraBlockchainProvider } from '../../src/providers/blockchain/InfuraBlockchainProvider';
import { AxolPriceProvider } from '../../src/providers/price/AxolPriceProvider';
import { AxolExplorerProvider } from '../../src/providers/explorer/AxolExplorerProvider';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES } from '../../src/types/providers';

// Mock environment variables
const originalEnv = process.env;

describe('New Providers', () => {

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.AXOL_API_KEY = 'test-axol-key';
    process.env.INFURA_API_KEY = 'test-infura-key';
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Axol Blockchain Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.AXOL,
        name: 'Axol Test',
        apiKey: 'test-key',
        baseUrl: 'https://api.axol.io'
      };

      const provider = new AxolBlockchainProvider(config);
      expect(provider.name).toBe('Axol Test');
      expect(provider.type).toBe('axol');
    });

    it('should return supported chains', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.AXOL,
        name: 'Axol Test',
        apiKey: 'test-key'
      };

      const provider = new AxolBlockchainProvider(config);
      const chains = provider.getSupportedChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(137); // Polygon
    });

    it('should return explorer URL', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.AXOL,
        name: 'Axol Test',
        apiKey: 'test-key'
      };

      const provider = new AxolBlockchainProvider(config);
      const url = provider.getExplorerUrl(1);
      expect(url).toBe('https://etherscan.io');
    });
  });

  describe('Infura Blockchain Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.INFURA,
        name: 'Infura Test',
        apiKey: 'test-key'
      };

      const provider = new InfuraBlockchainProvider(config);
      expect(provider.name).toBe('Infura Test');
      expect(provider.type).toBe('infura');
    });

    it('should return supported chains', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.INFURA,
        name: 'Infura Test',
        apiKey: 'test-key'
      };

      const provider = new InfuraBlockchainProvider(config);
      const chains = provider.getSupportedChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(137); // Polygon
    });

    it('should return explorer URL', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.INFURA,
        name: 'Infura Test',
        apiKey: 'test-key'
      };

      const provider = new InfuraBlockchainProvider(config);
      const url = provider.getExplorerUrl(1);
      expect(url).toBe('https://etherscan.io');
    });
  });

  describe('Axol Price Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.AXOL,
        name: 'Axol Prices Test',
        apiKey: 'test-key',
        baseUrl: 'https://api.axol.io'
      };

      const provider = new AxolPriceProvider(config);
      expect(provider.name).toBe('Axol Prices Test');
      expect(provider.type).toBe('axol');
    });

    it('should return supported tokens', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.AXOL,
        name: 'Axol Prices Test',
        apiKey: 'test-key'
      };

      const provider = new AxolPriceProvider(config);
      const tokens = provider.getSupportedTokens();
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('BTC');
      expect(tokens).toContain('USDC');
    });
  });

  describe('Axol Explorer Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key',
        baseUrl: 'https://api.axol.io'
      };

      const provider = new AxolExplorerProvider(config);
      expect(provider.name).toBe('Axol Explorer Test');
      expect(provider.type).toBe('axol');
    });

    it('should return transaction URL', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key'
      };

      const provider = new AxolExplorerProvider(config);
      const url = provider.getTransactionUrl('0x123', 1);
      expect(url).toContain('explore.axol.io');
      expect(url).toContain('0x123');
      expect(url).toContain('chain=1');
    });

    it('should return address URL', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key'
      };

      const provider = new AxolExplorerProvider(config);
      const url = provider.getAddressUrl('0x456', 1);
      expect(url).toContain('explore.axol.io');
      expect(url).toContain('0x456');
      expect(url).toContain('chain=1');
    });

    it('should return block URL', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key'
      };

      const provider = new AxolExplorerProvider(config);
      const url = provider.getBlockUrl(12345, 1);
      expect(url).toContain('explore.axol.io');
      expect(url).toContain('12345');
      expect(url).toContain('chain=1');
    });

    it('should support different chains', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key'
      };

      const provider = new AxolExplorerProvider(config);
      const ethereumUrl = provider.getTransactionUrl('0x123', 1);
      const baseUrl = provider.getTransactionUrl('0x123', 8453);
      const polygonUrl = provider.getTransactionUrl('0x123', 137);

      expect(ethereumUrl).toContain('explore.axol.io');
      expect(ethereumUrl).toContain('chain=1');
      expect(baseUrl).toContain('explore.axol.io');
      expect(baseUrl).toContain('chain=8453');
      expect(polygonUrl).toContain('explore.axol.io');
      expect(polygonUrl).toContain('chain=137');
    });
  });
}); 