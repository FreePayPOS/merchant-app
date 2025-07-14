import { ProviderFactory } from '../../src/providers/ProviderFactory';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES } from '../../src/types/providers';

// Mock all provider implementations
jest.mock('../../src/providers/blockchain/AlchemyBlockchainProvider');
jest.mock('../../src/providers/blockchain/InfuraBlockchainProvider');
jest.mock('../../src/providers/blockchain/AxolBlockchainProvider');
jest.mock('../../src/providers/blockchain/QuickNodeBlockchainProvider');
jest.mock('../../src/providers/blockchain/MoralisBlockchainProvider');
jest.mock('../../src/providers/blockchain/AnkrBlockchainProvider');
jest.mock('../../src/providers/blockchain/GetBlockBlockchainProvider');

jest.mock('../../src/providers/price/CoinGeckoPriceProvider');
jest.mock('../../src/providers/price/AlchemyPriceProvider');
jest.mock('../../src/providers/price/AxolPriceProvider');
jest.mock('../../src/providers/price/CoinMarketCapPriceProvider');
jest.mock('../../src/providers/price/BinancePriceProvider');
jest.mock('../../src/providers/price/KrakenPriceProvider');
jest.mock('../../src/providers/price/OneInchPriceProvider');

jest.mock('../../src/providers/explorer/EtherscanExplorerProvider');
jest.mock('../../src/providers/explorer/AxolExplorerProvider');
jest.mock('../../src/providers/explorer/BlockscoutExplorerProvider');
jest.mock('../../src/providers/explorer/ArbiscanExplorerProvider');
jest.mock('../../src/providers/explorer/PolygonscanExplorerProvider');
jest.mock('../../src/providers/explorer/BasescanExplorerProvider');
jest.mock('../../src/providers/explorer/OptimisticEtherscanExplorerProvider');

describe('ProviderFactory', () => {
  let factory: ProviderFactory;

  beforeEach(() => {
    jest.clearAllMocks();
    factory = new ProviderFactory();
  });

  describe('createBlockchainProvider', () => {
    it('should create AlchemyBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY,
        name: 'Alchemy Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create InfuraBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.INFURA,
        name: 'Infura Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create AxolBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.AXOL,
        name: 'Axol Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create QuickNodeBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create MoralisBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create AnkrBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
        name: 'Ankr Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create GetBlockBlockchainProvider', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
        name: 'GetBlock Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createBlockchainProvider(config);
      expect(provider).toBeDefined();
    });

    it('should throw error for unsupported blockchain provider type', () => {
      const config = {
        type: 'UNSUPPORTED_TYPE' as any,
        name: 'Unsupported Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      expect(() => factory.createBlockchainProvider(config)).toThrow('Unsupported blockchain provider type: UNSUPPORTED_TYPE');
    });
  });

  describe('createPriceProvider', () => {
    it('should create CoinGeckoPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINGECKO,
        name: 'CoinGecko Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create AlchemyPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.ALCHEMY,
        name: 'Alchemy Price Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create AxolPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.AXOL,
        name: 'Axol Price Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create CoinMarketCapPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create BinancePriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.BINANCE,
        name: 'Binance Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create KrakenPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.KRAKEN,
        name: 'Kraken Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create OneInchPriceProvider', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.ONECHINCH,
        name: '1inch Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createPriceProvider(config);
      expect(provider).toBeDefined();
    });

    it('should throw error for unsupported price provider type', () => {
      const config = {
        type: 'UNSUPPORTED_PRICE_TYPE' as any,
        name: 'Unsupported Price Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      expect(() => factory.createPriceProvider(config)).toThrow('Unsupported price provider type: UNSUPPORTED_PRICE_TYPE');
    });
  });

  describe('createExplorerProvider', () => {
    it('should create EtherscanExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.ETHERSCAN,
        name: 'Etherscan Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create AxolExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol Explorer Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create BlockscoutExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create ArbiscanExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
        name: 'Arbiscan Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create PolygonscanExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.POLYGONSCAN,
        name: 'Polygonscan Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create BasescanExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BASESCAN,
        name: 'Basescan Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should create OptimisticEtherscanExplorerProvider', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN,
        name: 'Optimistic Etherscan Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      const provider = factory.createExplorerProvider(config);
      expect(provider).toBeDefined();
    });

    it('should throw error for unsupported explorer provider type', () => {
      const config = {
        type: 'UNSUPPORTED_EXPLORER_TYPE' as any,
        name: 'Unsupported Explorer Test',
        apiKey: 'test-key',
        priority: 1,
        enabled: true
      };

      expect(() => factory.createExplorerProvider(config)).toThrow('Unsupported explorer provider type: UNSUPPORTED_EXPLORER_TYPE');
    });
  });

  describe('integration scenarios', () => {
    it('should create multiple providers of different types', () => {
      const blockchainConfig = {
        type: BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY,
        name: 'Alchemy Blockchain',
        apiKey: 'blockchain-key',
        priority: 1,
        enabled: true
      };

      const priceConfig = {
        type: PRICE_PROVIDER_TYPES.COINGECKO,
        name: 'CoinGecko Price',
        apiKey: 'price-key',
        priority: 1,
        enabled: true
      };

      const explorerConfig = {
        type: EXPLORER_PROVIDER_TYPES.ETHERSCAN,
        name: 'Etherscan Explorer',
        apiKey: 'explorer-key',
        priority: 1,
        enabled: true
      };

      const blockchainProvider = factory.createBlockchainProvider(blockchainConfig);
      const priceProvider = factory.createPriceProvider(priceConfig);
      const explorerProvider = factory.createExplorerProvider(explorerConfig);

      expect(blockchainProvider).toBeDefined();
      expect(priceProvider).toBeDefined();
      expect(explorerProvider).toBeDefined();
    });
  });
}); 