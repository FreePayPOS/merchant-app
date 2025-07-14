import { getProviderConfig } from '../../src/config/providers';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES, ProviderConfig } from '../../src/types/providers';

describe('Provider Priorities Configuration', () => {
  let config: { blockchain: ProviderConfig[]; price: ProviderConfig[]; explorer: ProviderConfig[]; fallbackEnabled: boolean; healthCheckInterval: number };

  beforeEach(() => {
    // Mock environment variables for testing
    process.env.ALCHEMY_API_KEY = 'test-alchemy-key';
    process.env.AXOL_API_KEY = 'test-axol-key';
    process.env.INFURA_API_KEY = 'test-infura-key';
    process.env.QUICKNODE_API_KEY = 'test-quicknode-key';
    process.env.MORALIS_API_KEY = 'test-moralis-key';
    process.env.ANKR_API_KEY = 'test-ankr-key';
    process.env.GETBLOCK_API_KEY = 'test-getblock-key';
    process.env.COINMARKETCAP_API_KEY = 'test-coinmarketcap-key';
    process.env.BINANCE_API_KEY = 'test-binance-key';
    process.env.KRAKEN_API_KEY = 'test-kraken-key';
    process.env.ONECHINCH_API_KEY = 'test-1inch-key';
    process.env.ETHERSCAN_API_KEY = 'test-etherscan-key';
    process.env.BLOCKSCOUT_ENABLED = 'true';
    process.env.ARBISCAN_API_KEY = 'test-arbiscan-key';
    process.env.POLYGONSCAN_API_KEY = 'test-polygonscan-key';
    process.env.BASESCAN_API_KEY = 'test-basescan-key';
    process.env.OPTIMISTIC_ETHERSCAN_API_KEY = 'test-optimistic-key';

    config = getProviderConfig();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.ALCHEMY_API_KEY;
    delete process.env.AXOL_API_KEY;
    delete process.env.INFURA_API_KEY;
    delete process.env.QUICKNODE_API_KEY;
    delete process.env.MORALIS_API_KEY;
    delete process.env.ANKR_API_KEY;
    delete process.env.GETBLOCK_API_KEY;
    delete process.env.COINMARKETCAP_API_KEY;
    delete process.env.BINANCE_API_KEY;
    delete process.env.KRAKEN_API_KEY;
    delete process.env.ONECHINCH_API_KEY;
    delete process.env.ETHERSCAN_API_KEY;
    delete process.env.BLOCKSCOUT_ENABLED;
    delete process.env.ARBISCAN_API_KEY;
    delete process.env.POLYGONSCAN_API_KEY;
    delete process.env.BASESCAN_API_KEY;
    delete process.env.OPTIMISTIC_ETHERSCAN_API_KEY;
  });

  describe('Blockchain Provider Priorities', () => {
    it('should have Alchemy as primary (priority 1)', () => {
      const alchemyProvider = config.blockchain.find((p: ProviderConfig) => p.type === BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY);
      expect(alchemyProvider).toBeDefined();
      expect(alchemyProvider!.priority).toBe(1);
    });

    it('should have Axol as first fallback (priority 2)', () => {
      const axolProvider = config.blockchain.find((p: ProviderConfig) => p.type === BLOCKCHAIN_PROVIDER_TYPES.AXOL);
      expect(axolProvider).toBeDefined();
      expect(axolProvider!.priority).toBe(2);
    });

    it('should have Infura as second fallback (priority 3)', () => {
      const infuraProvider = config.blockchain.find((p: ProviderConfig) => p.type === BLOCKCHAIN_PROVIDER_TYPES.INFURA);
      expect(infuraProvider).toBeDefined();
      expect(infuraProvider!.priority).toBe(3);
    });

    it('should have all blockchain providers in correct priority order', () => {
      const priorities = config.blockchain.map((p: ProviderConfig) => p.priority);
      expect(priorities).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have all blockchain providers enabled when API keys are present', () => {
      const enabledProviders = config.blockchain.filter((p: ProviderConfig) => p.enabled);
      expect(enabledProviders.length).toBe(7);
    });
  });

  describe('Price Provider Priorities', () => {
    it('should have CoinGecko as primary (priority 1)', () => {
      const coingeckoProvider = config.price.find((p: ProviderConfig) => p.type === PRICE_PROVIDER_TYPES.COINGECKO);
      expect(coingeckoProvider).toBeDefined();
      expect(coingeckoProvider!.priority).toBe(1);
    });

    it('should have Axol as first fallback (priority 2)', () => {
      const axolProvider = config.price.find((p: ProviderConfig) => p.type === PRICE_PROVIDER_TYPES.AXOL);
      expect(axolProvider).toBeDefined();
      expect(axolProvider!.priority).toBe(2);
    });

    it('should have Alchemy as second fallback (priority 3)', () => {
      const alchemyProvider = config.price.find((p: ProviderConfig) => p.type === PRICE_PROVIDER_TYPES.ALCHEMY);
      expect(alchemyProvider).toBeDefined();
      expect(alchemyProvider!.priority).toBe(3);
    });

    it('should have all price providers in correct priority order', () => {
      const priorities = config.price.map((p: ProviderConfig) => p.priority);
      expect(priorities).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have all price providers enabled when API keys are present', () => {
      const enabledProviders = config.price.filter((p: ProviderConfig) => p.enabled);
      expect(enabledProviders.length).toBe(7);
    });
  });

  describe('Explorer Provider Priorities', () => {
    it('should have Etherscan as primary (priority 1)', () => {
      const etherscanProvider = config.explorer.find((p: ProviderConfig) => p.type === EXPLORER_PROVIDER_TYPES.ETHERSCAN);
      expect(etherscanProvider).toBeDefined();
      expect(etherscanProvider!.priority).toBe(1);
    });

    it('should have Axol as first fallback (priority 2)', () => {
      const axolProvider = config.explorer.find((p: ProviderConfig) => p.type === EXPLORER_PROVIDER_TYPES.AXOL);
      expect(axolProvider).toBeDefined();
      expect(axolProvider!.priority).toBe(2);
    });

    it('should have Blockscout as second fallback (priority 3)', () => {
      const blockscoutProvider = config.explorer.find((p: ProviderConfig) => p.type === EXPLORER_PROVIDER_TYPES.BLOCKSCOUT);
      expect(blockscoutProvider).toBeDefined();
      expect(blockscoutProvider!.priority).toBe(3);
    });

    it('should have all explorer providers in correct priority order', () => {
      const priorities = config.explorer.map((p: ProviderConfig) => p.priority);
      expect(priorities).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it('should have all explorer providers enabled when API keys are present', () => {
      const enabledProviders = config.explorer.filter((p: ProviderConfig) => p.enabled);
      expect(enabledProviders.length).toBe(7);
    });
  });

  describe('Provider Configuration Validation', () => {
    it('should have fallback enabled', () => {
      expect(config.fallbackEnabled).toBe(true);
    });

    it('should have health check interval set', () => {
      expect(config.healthCheckInterval).toBe(60);
    });

    it('should have at least one provider of each type enabled', () => {
      const enabledBlockchain = config.blockchain.filter((p: ProviderConfig) => p.enabled);
      const enabledPrice = config.price.filter((p: ProviderConfig) => p.enabled);
      const enabledExplorer = config.explorer.filter((p: ProviderConfig) => p.enabled);

      expect(enabledBlockchain.length).toBeGreaterThan(0);
      expect(enabledPrice.length).toBeGreaterThan(0);
      expect(enabledExplorer.length).toBeGreaterThan(0);
    });
  });

  describe('Axol Provider Configuration', () => {
    it('should have Axol configured consistently across all provider types', () => {
      const axolBlockchain = config.blockchain.find((p: ProviderConfig) => p.type === BLOCKCHAIN_PROVIDER_TYPES.AXOL);
      const axolPrice = config.price.find((p: ProviderConfig) => p.type === PRICE_PROVIDER_TYPES.AXOL);
      const axolExplorer = config.explorer.find((p: ProviderConfig) => p.type === EXPLORER_PROVIDER_TYPES.AXOL);

      // All Axol providers should have priority 2
      expect(axolBlockchain!.priority).toBe(2);
      expect(axolPrice!.priority).toBe(2);
      expect(axolExplorer!.priority).toBe(2);

      // All Axol providers should have the same base URL
      expect(axolBlockchain!.baseUrl).toBe('https://api.axol.io');
      expect(axolPrice!.baseUrl).toBe('https://api.axol.io');
      expect(axolExplorer!.baseUrl).toBe('https://api.axol.io');

      // All Axol providers should use the same API key
      expect(axolBlockchain!.apiKey).toBe('test-axol-key');
      expect(axolPrice!.apiKey).toBe('test-axol-key');
      expect(axolExplorer!.apiKey).toBe('test-axol-key');
    });
  });
}); 