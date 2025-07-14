import { PriceService } from '../../src/services/priceService';
import { PriceCacheService } from '../../src/services/priceCacheService';

jest.mock('alchemy-sdk', () => {
  return {
    Alchemy: jest.fn().mockImplementation(() => ({
      prices: {
        getTokenPriceByAddress: jest.fn(),
        getTokenPriceBySymbol: jest.fn(),
      },
    })),
    Network: {
      ETH_MAINNET: 'eth-mainnet',
      BASE_MAINNET: 'base-mainnet',
      ARB_MAINNET: 'arb-mainnet',
      OPT_MAINNET: 'opt-mainnet',
      MATIC_MAINNET: 'matic-mainnet',
    },
  };
});

jest.mock('../../src/services/priceCacheService', () => ({
  PriceCacheService: {
    getCachedEthPrice: jest.fn(() => 0),
  },
}));

jest.mock('../../src/config/index', () => ({
  ALCHEMY_API_KEY: 'test-key',
  SUPPORTED_CHAINS: [
    { name: 'ethereum', id: 1, nativeToken: { symbol: 'ETH' } },
    { name: 'polygon', id: 137, nativeToken: { symbol: 'MATIC' } },
    { name: 'arbitrum', id: 42161, nativeToken: { symbol: 'ARB' } },
    { name: 'optimism', id: 10, nativeToken: { symbol: 'OP' } },
    { name: 'base', id: 8453, nativeToken: { symbol: 'BASE' } },
  ],
}));

describe('PriceService', () => {
  let alchemyInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the singleton instance
    alchemyInstance = (PriceService as any).alchemy;
  });

  describe('getAlchemyNetwork', () => {
    it('should return correct network enum for supported chains', () => {
      expect((PriceService as any).getAlchemyNetwork('ethereum')).toBe('eth-mainnet');
      expect((PriceService as any).getAlchemyNetwork('polygon')).toBe('matic-mainnet');
      expect((PriceService as any).getAlchemyNetwork('arbitrum')).toBe('arb-mainnet');
      expect((PriceService as any).getAlchemyNetwork('optimism')).toBe('opt-mainnet');
      expect((PriceService as any).getAlchemyNetwork('base')).toBe('base-mainnet');
    });
    it('should return null for unsupported chains', () => {
      expect((PriceService as any).getAlchemyNetwork('unknown')).toBeNull();
    });
  });

  describe('getTokenPricesForChain', () => {
    it('should return empty object for empty tokenAddresses', async () => {
      const result = await PriceService.getTokenPricesForChain([], 'ethereum');
      expect(result).toEqual({});
    });
    it('should return empty object for unsupported chain', async () => {
      const result = await PriceService.getTokenPricesForChain(['0x123'], 'unknown');
      expect(result).toEqual({});
    });
    it('should return empty object for unknown network', async () => {
      const result = await PriceService.getTokenPricesForChain(['0x123'], 'unsupported');
      expect(result).toEqual({});
    });
    it('should return prices for valid tokens', async () => {
      alchemyInstance.prices.getTokenPriceByAddress.mockResolvedValue({
        data: [
          {
            address: '0x123',
            prices: [{ currency: 'usd', value: '2.5' }],
          },
        ],
      });
      const result = await PriceService.getTokenPricesForChain(['0x123'], 'ethereum');
      expect(result).toEqual({ '0x123': 2.5 });
    });
    it('should skip tokens with errors or missing prices', async () => {
      alchemyInstance.prices.getTokenPriceByAddress.mockResolvedValue({
        data: [
          { address: '0x123', error: 'err', prices: [] },
          { address: '0x456', prices: [] },
        ],
      });
      const result = await PriceService.getTokenPricesForChain(['0x123', '0x456'], 'ethereum');
      expect(result).toEqual({});
    });
    it('should handle errors gracefully', async () => {
      alchemyInstance.prices.getTokenPriceByAddress.mockRejectedValue(new Error('fail'));
      const result = await PriceService.getTokenPricesForChain(['0x123'], 'ethereum');
      expect(result).toEqual({});
    });
  });

  describe('getMultiChainTokenPrices', () => {
    it('should fetch prices for multiple chains', async () => {
      jest.spyOn(PriceService, 'getTokenPricesForChain').mockImplementation(async (addresses, chain) => {
        return addresses.reduce((acc, addr) => {
          acc[addr] = chain.length;
          return acc;
        }, {} as any);
      });
      const result = await PriceService.getMultiChainTokenPrices({
        ethereum: ['0x1', '0x2'],
        polygon: ['0x3'],
      });
      expect(result).toEqual({
        ethereum: { '0x1': 8, '0x2': 8 },
        polygon: { '0x3': 7 },
      });
    });
  });

  describe('getTokenPrices', () => {
    it('should call getTokenPricesForChain with ethereum', async () => {
      const spy = jest.spyOn(PriceService, 'getTokenPricesForChain').mockResolvedValue({ '0x1': 1 });
      const result = await PriceService.getTokenPrices(['0x1']);
      expect(spy).toHaveBeenCalledWith(['0x1'], 'ethereum');
      expect(result).toEqual({ '0x1': 1 });
    });
  });

  describe('getEthPrice', () => {
    it('should return cached price if available', async () => {
      const cacheSpy = jest.spyOn(PriceCacheService, 'getCachedEthPrice').mockReturnValue(42);
      const result = await PriceService.getEthPrice();
      expect(result).toBe(42);
      cacheSpy.mockRestore();
    });
    it('should fetch ETH price from Alchemy if not cached', async () => {
      const cacheSpy = jest.spyOn(PriceCacheService, 'getCachedEthPrice').mockReturnValue(0);
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({
        data: [
          {
            symbol: 'ETH',
            prices: [{ currency: 'usd', value: '123.45' }],
          },
        ],
      });
      const result = await PriceService.getEthPrice();
      expect(result).toBe(123.45);
      cacheSpy.mockRestore();
    });
    it('should return cached price if Alchemy returns no data', async () => {
      const cacheSpy = jest.spyOn(PriceCacheService, 'getCachedEthPrice').mockReturnValue(99);
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [] });
      const result = await PriceService.getEthPrice();
      expect(result).toBe(99);
      cacheSpy.mockRestore();
    });
    it('should handle errors gracefully and return cached price', async () => {
      const cacheSpy = jest.spyOn(PriceCacheService, 'getCachedEthPrice').mockReturnValue(77);
      alchemyInstance.prices.getTokenPriceBySymbol.mockRejectedValue(new Error('fail'));
      const result = await PriceService.getEthPrice();
      expect(result).toBe(77);
      cacheSpy.mockRestore();
    });
  });

  describe('getNativeTokenPrices', () => {
    it('should fetch native token prices for supported chains', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({
        data: [
          { symbol: 'ETH', prices: [{ currency: 'usd', value: '100' }] },
          { symbol: 'MATIC', prices: [{ currency: 'usd', value: '2' }] },
        ],
      });
      const result = await PriceService.getNativeTokenPrices(['1', '137']);
      expect(result).toEqual({ '1': 100, '137': 2 });
    });
    it('should return 0 for chains with no price data', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [] });
      const result = await PriceService.getNativeTokenPrices(['1', '137']);
      expect(result).toEqual({ '1': 0, '137': 0 });
    });
    it('should handle errors gracefully', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockRejectedValue(new Error('fail'));
      const result = await PriceService.getNativeTokenPrices(['1', '137']);
      expect(result).toEqual({});
    });
  });
}); 