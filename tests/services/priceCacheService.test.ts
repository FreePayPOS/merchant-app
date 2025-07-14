import { PriceCacheService } from '../../src/services/priceCacheService';

jest.mock('alchemy-sdk', () => {
  return {
    Alchemy: jest.fn().mockImplementation(() => ({
      prices: {
        getTokenPriceBySymbol: jest.fn(),
      },
    })),
  };
});

jest.mock('../../src/config/index', () => ({
  ALCHEMY_API_KEY: 'test-key',
}));

describe('PriceCacheService', () => {
  let alchemyInstance: any;
  beforeEach(() => {
    jest.clearAllMocks();
    alchemyInstance = (PriceCacheService as any).alchemy;
    // Reset static fields
    (PriceCacheService as any).cachedEthPrice = 0;
    (PriceCacheService as any).lastFetchTime = 0;
    (PriceCacheService as any).refreshInterval = null;
  });

  describe('getCachedEthPrice', () => {
    it('should return the cached ETH price', () => {
      (PriceCacheService as any).cachedEthPrice = 123.45;
      expect(PriceCacheService.getCachedEthPrice()).toBe(123.45);
    });
  });

  describe('fetchAndCacheEthPrice', () => {
    it('should cache ETH price if valid', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({
        data: [
          {
            symbol: 'ETH',
            prices: [{ currency: 'usd', value: '100.5' }],
          },
        ],
      });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(100.5);
      expect((PriceCacheService as any).lastFetchTime).toBeGreaterThan(0);
    });
    it('should not cache if price is <= 0', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({
        data: [
          {
            symbol: 'ETH',
            prices: [{ currency: 'usd', value: '-1' }],
          },
        ],
      });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if price is NaN', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({
        data: [
          {
            symbol: 'ETH',
            prices: [{ currency: 'usd', value: 'not-a-number' }],
          },
        ],
      });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if no priceData', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue(undefined);
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if no data field', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({});
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if data is empty', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if no ETH symbol', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'BTC', prices: [{ currency: 'usd', value: '1' }] }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if error in ETH data', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'ETH', error: 'fail', prices: [{ currency: 'usd', value: '1' }] }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if no prices field', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'ETH' }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if prices array is empty', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'ETH', prices: [] }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if no USD price', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'ETH', prices: [{ currency: 'eur', value: '1' }] }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should not cache if USD price has no value', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockResolvedValue({ data: [{ symbol: 'ETH', prices: [{ currency: 'usd' }] }] });
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
    it('should handle errors gracefully', async () => {
      alchemyInstance.prices.getTokenPriceBySymbol.mockRejectedValue(new Error('fail'));
      await (PriceCacheService as any).fetchAndCacheEthPrice();
      expect((PriceCacheService as any).cachedEthPrice).toBe(0);
    });
  });

  describe('initialize', () => {
    it('should call fetchAndCacheEthPrice and start periodic refresh', async () => {
      const fetchSpy = jest.spyOn(PriceCacheService as any, 'fetchAndCacheEthPrice').mockResolvedValue(undefined);
      const intervalSpy = jest.spyOn(global, 'setInterval');
      await PriceCacheService.initialize();
      expect(fetchSpy).toHaveBeenCalled();
      expect(intervalSpy).toHaveBeenCalled();
      fetchSpy.mockRestore();
      intervalSpy.mockRestore();
      PriceCacheService.cleanup();
    });
  });

  describe('getLastFetchTime', () => {
    it('should return the last fetch time', () => {
      (PriceCacheService as any).lastFetchTime = 123456789;
      expect(PriceCacheService.getLastFetchTime()).toBe(123456789);
    });
  });

  describe('cleanup', () => {
    it('should clear the refresh interval', () => {
      (PriceCacheService as any).refreshInterval = setInterval(() => {}, 1000);
      PriceCacheService.cleanup();
      expect((PriceCacheService as any).refreshInterval).toBeNull();
    });
  });

  describe('stop', () => {
    it('should clear the refresh interval and log', () => {
      (PriceCacheService as any).refreshInterval = setInterval(() => {}, 1000);
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      PriceCacheService.stop();
      expect((PriceCacheService as any).refreshInterval).toBeNull();
      expect(logSpy).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });

  describe('forceRefresh', () => {
    it('should call fetchAndCacheEthPrice', async () => {
      const fetchSpy = jest.spyOn(PriceCacheService as any, 'fetchAndCacheEthPrice').mockResolvedValue(undefined);
      await PriceCacheService.forceRefresh();
      expect(fetchSpy).toHaveBeenCalled();
      fetchSpy.mockRestore();
    });
  });

  describe('getCacheStatus', () => {
    it('should return correct cache status and log', () => {
      (PriceCacheService as any).cachedEthPrice = 50;
      (PriceCacheService as any).lastFetchTime = Date.now() - 1000;
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const status = PriceCacheService.getCacheStatus();
      expect(status.price).toBe(50);
      expect(typeof status.lastFetch).toBe('object');
      expect(status.isStale).toBe(false);
      logSpy.mockRestore();
    });
    it('should mark cache as stale if last fetch is old', () => {
      (PriceCacheService as any).cachedEthPrice = 50;
      (PriceCacheService as any).lastFetchTime = Date.now() - 200000;
      const status = PriceCacheService.getCacheStatus();
      expect(status.isStale).toBe(true);
    });
  });
}); 