import { AxolBlockchainProvider } from '../../src/providers/blockchain/AxolBlockchainProvider';
import { InfuraBlockchainProvider } from '../../src/providers/blockchain/InfuraBlockchainProvider';
import { QuickNodeBlockchainProvider } from '../../src/providers/blockchain/QuickNodeBlockchainProvider';
import { MoralisBlockchainProvider } from '../../src/providers/blockchain/MoralisBlockchainProvider';
import { AnkrBlockchainProvider } from '../../src/providers/blockchain/AnkrBlockchainProvider';
import { GetBlockBlockchainProvider } from '../../src/providers/blockchain/GetBlockBlockchainProvider';
import { AxolPriceProvider } from '../../src/providers/price/AxolPriceProvider';
import { CoinMarketCapPriceProvider } from '../../src/providers/price/CoinMarketCapPriceProvider';
import { BinancePriceProvider } from '../../src/providers/price/BinancePriceProvider';
import { KrakenPriceProvider } from '../../src/providers/price/KrakenPriceProvider';
import { OneInchPriceProvider } from '../../src/providers/price/OneInchPriceProvider';
import { AxolExplorerProvider } from '../../src/providers/explorer/AxolExplorerProvider';
import { BlockscoutExplorerProvider } from '../../src/providers/explorer/BlockscoutExplorerProvider';
import { ArbiscanExplorerProvider } from '../../src/providers/explorer/ArbiscanExplorerProvider';
import { PolygonscanExplorerProvider } from '../../src/providers/explorer/PolygonscanExplorerProvider';
import { BasescanExplorerProvider } from '../../src/providers/explorer/BasescanExplorerProvider';
import { OptimisticEtherscanExplorerProvider } from '../../src/providers/explorer/OptimisticEtherscanExplorerProvider';
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

  describe('Blockscout Explorer Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: '' // No API key required
      };

      const provider = new BlockscoutExplorerProvider(config);
      expect(provider.name).toBe('Blockscout Test');
      expect(provider.type).toBe('blockscout');
    });

    it('should return transaction URL for Ethereum', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: ''
      };

      const provider = new BlockscoutExplorerProvider(config);
      const url = provider.getTransactionUrl('0x123', 1);
      expect(url).toBe('https://blockscout.com/eth/mainnet/tx/0x123');
    });

    it('should return address URL for Base', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: ''
      };

      const provider = new BlockscoutExplorerProvider(config);
      const url = provider.getAddressUrl('0x456', 8453);
      expect(url).toBe('https://blockscout.com/base/mainnet/address/0x456');
    });

    it('should return block URL for Polygon', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: ''
      };

      const provider = new BlockscoutExplorerProvider(config);
      const url = provider.getBlockUrl(12345, 137);
      expect(url).toBe('https://blockscout.com/polygon/mainnet/block/12345');
    });

    it('should return supported chains', () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: ''
      };

      const provider = new BlockscoutExplorerProvider(config);
      const chains = provider.getSupportedChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(8453); // Base
      expect(chains).toContain(137); // Polygon
    });

    it('should handle health check', async () => {
      const config = {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout Test',
        apiKey: ''
      };

      const provider = new BlockscoutExplorerProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('QuickNode Blockchain Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: 'test-key'
      };

      const provider = new QuickNodeBlockchainProvider(config);
      expect(provider.name).toBe('QuickNode Test');
      expect(provider.type).toBe('quicknode');
    });

    it('should throw error without API key', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: ''
      };

      expect(() => new QuickNodeBlockchainProvider(config)).toThrow('QuickNode API key is required');
    });

    it('should return supported chains', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: 'test-key'
      };

      const provider = new QuickNodeBlockchainProvider(config);
      const chains = provider.getSupportedChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(137); // Polygon
      expect(chains).toContain(8453); // Base
    });

    it('should return explorer URL', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: 'test-key'
      };

      const provider = new QuickNodeBlockchainProvider(config);
      const url = provider.getExplorerUrl(1);
      expect(url).toBe('https://etherscan.io');
    });

    it('should handle health check', async () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode Test',
        apiKey: 'test-key'
      };

      const provider = new QuickNodeBlockchainProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Moralis Blockchain Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: 'test-key'
      };

      const provider = new MoralisBlockchainProvider(config);
      expect(provider.name).toBe('Moralis Test');
      expect(provider.type).toBe('moralis');
    });

    it('should throw error without API key', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: ''
      };

      expect(() => new MoralisBlockchainProvider(config)).toThrow('Moralis API key is required');
    });

    it('should return supported chains', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: 'test-key'
      };

      const provider = new MoralisBlockchainProvider(config);
      const chains = provider.getSupportedChains();
      expect(chains).toContain(1); // Ethereum
      expect(chains).toContain(137); // Polygon
      expect(chains).toContain(8453); // Base
    });

    it('should return explorer URL', () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: 'test-key'
      };

      const provider = new MoralisBlockchainProvider(config);
      const url = provider.getExplorerUrl(1);
      expect(url).toBe('https://etherscan.io');
    });

    it('should handle health check', async () => {
      const config = {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis Test',
        apiKey: 'test-key'
      };

      const provider = new MoralisBlockchainProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('CoinMarketCap Price Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap Test',
        apiKey: 'test-key'
      };

      const provider = new CoinMarketCapPriceProvider(config);
      expect(provider.name).toBe('CoinMarketCap Test');
      expect(provider.type).toBe('coinmarketcap');
    });

    it('should throw error without API key', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap Test',
        apiKey: ''
      };

      expect(() => new CoinMarketCapPriceProvider(config)).toThrow('CoinMarketCap API key is required');
    });

    it('should return supported tokens', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap Test',
        apiKey: 'test-key'
      };

      const provider = new CoinMarketCapPriceProvider(config);
      const tokens = provider.getSupportedTokens();
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('MATIC');
    });

    it('should handle health check', async () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap Test',
        apiKey: 'test-key'
      };

      const provider = new CoinMarketCapPriceProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Binance Price Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.BINANCE,
        name: 'Binance Test',
        apiKey: '' // No API key required for public API
      };

      const provider = new BinancePriceProvider(config);
      expect(provider.name).toBe('Binance Test');
      expect(provider.type).toBe('binance');
    });

    it('should return supported tokens', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.BINANCE,
        name: 'Binance Test',
        apiKey: ''
      };

      const provider = new BinancePriceProvider(config);
      const tokens = provider.getSupportedTokens();
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('MATIC');
    });

    it('should handle health check', async () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.BINANCE,
        name: 'Binance Test',
        apiKey: ''
      };

      const provider = new BinancePriceProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Kraken Price Provider', () => {
    it('should initialize correctly', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.KRAKEN,
        name: 'Kraken Test',
        apiKey: '' // No API key required for public API
      };

      const provider = new KrakenPriceProvider(config);
      expect(provider.name).toBe('Kraken Test');
      expect(provider.type).toBe('kraken');
    });

    it('should return supported tokens', () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.KRAKEN,
        name: 'Kraken Test',
        apiKey: ''
      };

      const provider = new KrakenPriceProvider(config);
      const tokens = provider.getSupportedTokens();
      expect(tokens).toContain('ETH');
      expect(tokens).toContain('MATIC');
    });

    it('should handle health check', async () => {
      const config = {
        type: PRICE_PROVIDER_TYPES.KRAKEN,
        name: 'Kraken Test',
        apiKey: ''
      };

      const provider = new KrakenPriceProvider(config);
      const isHealthy = await provider.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });
  });

  describe('Chain-Specific Explorer Providers', () => {
    describe('Arbiscan Explorer Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
          name: 'Arbiscan Test',
          apiKey: ''
        };

        const provider = new ArbiscanExplorerProvider(config);
        expect(provider.name).toBe('Arbiscan Test');
        expect(provider.type).toBe('arbiscan');
      });

      it('should return transaction URL for Arbitrum', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
          name: 'Arbiscan Test',
          apiKey: ''
        };

        const provider = new ArbiscanExplorerProvider(config);
        const url = provider.getTransactionUrl('0x123', 42161);
        expect(url).toBe('https://arbiscan.io/tx/0x123');
      });

      it('should throw error for wrong chain', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
          name: 'Arbiscan Test',
          apiKey: ''
        };

        const provider = new ArbiscanExplorerProvider(config);
        expect(() => provider.getTransactionUrl('0x123', 1)).toThrow('Arbiscan only supports Arbitrum');
      });

      it('should return supported chains', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
          name: 'Arbiscan Test',
          apiKey: ''
        };

        const provider = new ArbiscanExplorerProvider(config);
        const chains = provider.getSupportedChains();
        expect(chains).toEqual([42161]);
      });
    });

    describe('Polygonscan Explorer Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.POLYGONSCAN,
          name: 'Polygonscan Test',
          apiKey: ''
        };

        const provider = new PolygonscanExplorerProvider(config);
        expect(provider.name).toBe('Polygonscan Test');
        expect(provider.type).toBe('polygonscan');
      });

      it('should return transaction URL for Polygon', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.POLYGONSCAN,
          name: 'Polygonscan Test',
          apiKey: ''
        };

        const provider = new PolygonscanExplorerProvider(config);
        const url = provider.getTransactionUrl('0x123', 137);
        expect(url).toBe('https://polygonscan.com/tx/0x123');
      });

      it('should throw error for wrong chain', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.POLYGONSCAN,
          name: 'Polygonscan Test',
          apiKey: ''
        };

        const provider = new PolygonscanExplorerProvider(config);
        expect(() => provider.getTransactionUrl('0x123', 1)).toThrow('Polygonscan only supports Polygon');
      });
    });

    describe('Basescan Explorer Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.BASESCAN,
          name: 'Basescan Test',
          apiKey: ''
        };

        const provider = new BasescanExplorerProvider(config);
        expect(provider.name).toBe('Basescan Test');
        expect(provider.type).toBe('basescan');
      });

      it('should return transaction URL for Base', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.BASESCAN,
          name: 'Basescan Test',
          apiKey: ''
        };

        const provider = new BasescanExplorerProvider(config);
        const url = provider.getTransactionUrl('0x123', 8453);
        expect(url).toBe('https://basescan.org/tx/0x123');
      });

      it('should throw error for wrong chain', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.BASESCAN,
          name: 'Basescan Test',
          apiKey: ''
        };

        const provider = new BasescanExplorerProvider(config);
        expect(() => provider.getTransactionUrl('0x123', 1)).toThrow('Basescan only supports Base');
      });
    });

    describe('Optimistic Etherscan Explorer Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN,
          name: 'Optimistic Etherscan Test',
          apiKey: ''
        };

        const provider = new OptimisticEtherscanExplorerProvider(config);
        expect(provider.name).toBe('Optimistic Etherscan Test');
        expect(provider.type).toBe('optimistic-etherscan');
      });

      it('should return transaction URL for Optimism', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN,
          name: 'Optimistic Etherscan Test',
          apiKey: ''
        };

        const provider = new OptimisticEtherscanExplorerProvider(config);
        const url = provider.getTransactionUrl('0x123', 10);
        expect(url).toBe('https://optimistic.etherscan.io/tx/0x123');
      });

      it('should throw error for wrong chain', () => {
        const config = {
          type: EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN,
          name: 'Optimistic Etherscan Test',
          apiKey: ''
        };

        const provider = new OptimisticEtherscanExplorerProvider(config);
        expect(() => provider.getTransactionUrl('0x123', 1)).toThrow('Optimistic Etherscan only supports Optimism');
      });
    });
  });

  describe('Phase 5: Advanced Providers', () => {
    describe('Ankr Blockchain Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
          name: 'Ankr Test',
          apiKey: 'test-key'
        };

        const provider = new AnkrBlockchainProvider(config);
        expect(provider.name).toBe('Ankr Test');
        expect(provider.type).toBe('ankr');
      });

      it('should throw error without API key', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
          name: 'Ankr Test',
          apiKey: ''
        };

        expect(() => new AnkrBlockchainProvider(config)).toThrow('Ankr API key is required');
      });

      it('should return supported chains', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
          name: 'Ankr Test',
          apiKey: 'test-key'
        };

        const provider = new AnkrBlockchainProvider(config);
        const chains = provider.getSupportedChains();
        expect(chains).toContain(1); // Ethereum
        expect(chains).toContain(137); // Polygon
        expect(chains).toContain(8453); // Base
      });

      it('should handle health check', async () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
          name: 'Ankr Test',
          apiKey: 'test-key'
        };

        const provider = new AnkrBlockchainProvider(config);
        const isHealthy = await provider.isHealthy();
        expect(typeof isHealthy).toBe('boolean');
      });
    });

    describe('GetBlock Blockchain Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
          name: 'GetBlock Test',
          apiKey: 'test-key'
        };

        const provider = new GetBlockBlockchainProvider(config);
        expect(provider.name).toBe('GetBlock Test');
        expect(provider.type).toBe('getblock');
      });

      it('should throw error without API key', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
          name: 'GetBlock Test',
          apiKey: ''
        };

        expect(() => new GetBlockBlockchainProvider(config)).toThrow('GetBlock API key is required');
      });

      it('should return supported chains', () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
          name: 'GetBlock Test',
          apiKey: 'test-key'
        };

        const provider = new GetBlockBlockchainProvider(config);
        const chains = provider.getSupportedChains();
        expect(chains).toContain(1); // Ethereum
        expect(chains).toContain(137); // Polygon
        expect(chains).toContain(8453); // Base
      });

      it('should handle health check', async () => {
        const config = {
          type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
          name: 'GetBlock Test',
          apiKey: 'test-key'
        };

        const provider = new GetBlockBlockchainProvider(config);
        const isHealthy = await provider.isHealthy();
        expect(typeof isHealthy).toBe('boolean');
      });
    });

    describe('1inch Price Provider', () => {
      it('should initialize correctly', () => {
        const config = {
          type: PRICE_PROVIDER_TYPES.ONECHINCH,
          name: '1inch Test',
          apiKey: '' // No API key required for public API
        };

        const provider = new OneInchPriceProvider(config);
        expect(provider.name).toBe('1inch Test');
        expect(provider.type).toBe('1inch');
      });

      it('should return supported tokens', () => {
        const config = {
          type: PRICE_PROVIDER_TYPES.ONECHINCH,
          name: '1inch Test',
          apiKey: ''
        };

        const provider = new OneInchPriceProvider(config);
        const tokens = provider.getSupportedTokens();
        expect(tokens).toContain('ETH');
        expect(tokens).toContain('MATIC');
      });

      it('should handle health check', async () => {
        const config = {
          type: PRICE_PROVIDER_TYPES.ONECHINCH,
          name: '1inch Test',
          apiKey: ''
        };

        const provider = new OneInchPriceProvider(config);
        const isHealthy = await provider.isHealthy();
        expect(typeof isHealthy).toBe('boolean');
      });
    });
  });
}); 