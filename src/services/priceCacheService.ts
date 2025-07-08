import { Alchemy } from 'alchemy-sdk';
import { ALCHEMY_API_KEY } from '../config/index';

/**
 * Service for caching ETH price and refreshing it periodically using Alchemy SDK
 */
export class PriceCacheService {
  private static cachedEthPrice: number = 0;
  private static lastFetchTime: number = 0;
  private static refreshInterval: NodeJS.Timeout | null = null;
  private static readonly REFRESH_INTERVAL_MS = 60000; // 1 minute
  private static alchemy = new Alchemy({ apiKey: ALCHEMY_API_KEY });

  /**
   * Initialize the price cache service
   */
  static async initialize(): Promise<void> {
    
    // Fetch initial ETH price
    await this.fetchAndCacheEthPrice();
    
    // Set up periodic refresh
    this.startPeriodicRefresh();
    
  }

  /**
   * Start periodic price refresh
   */
  private static startPeriodicRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.refreshInterval = setInterval(async () => {
      await this.fetchAndCacheEthPrice();
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Get cached ETH price
   */
  static getCachedEthPrice(): number {
    return this.cachedEthPrice;
  }

  /**
   * Fetch ETH price and update cache
   */
  private static async fetchAndCacheEthPrice(): Promise<void> {
    try {
      const priceData = await this.alchemy.prices.getTokenPriceBySymbol(['ETH']);
      
      if (!priceData) {
        console.error('❌ DEBUG: No priceData received from Alchemy SDK for cache');
        return;
      }
      
      if (!priceData.data) {
        console.error('❌ DEBUG: No data field in ETH cache priceData:', priceData);
        return;
      }
      
      if (priceData.data.length === 0) {
        console.error('❌ DEBUG: Empty data array in ETH cache priceData');
        return;
      }
      
      const ethData = priceData.data.find((d: any) => d.symbol === 'ETH');
      if (!ethData) {
        console.error('❌ DEBUG: No ETH symbol found in cache response. Available symbols:', priceData.data.map((d: any) => d.symbol));
        return;
      }
      
      if (ethData.error) {
        console.error('❌ DEBUG: ETH cache data has error:', ethData.error);
        return;
      }
      
      if (!ethData.prices) {
        console.error('❌ DEBUG: ETH cache data has no prices field:', ethData);
        return;
      }
      
      if (ethData.prices.length === 0) {
        console.error('❌ DEBUG: ETH cache data has empty prices array');
        return;
      }
      
      const usdPrice = ethData.prices.find((p: any) => p.currency === 'usd');
      if (!usdPrice) {
         console.error('❌ DEBUG: No USD price found in ETH cache data. Available currencies:', ethData.prices.map((p: any) => p.currency));
         return;
      }
      
      if (!usdPrice.value) {
        console.error('❌ DEBUG: USD price has no value in cache data:', usdPrice);
        return;
      }
      
      const ethPrice = parseFloat(usdPrice.value);
      if (isNaN(ethPrice)) {
        console.error(`❌ DEBUG: Cannot parse ETH cache price value '${usdPrice.value}'`);
        return;
      }
      
      if (ethPrice > 0) {
        this.cachedEthPrice = ethPrice;
        this.lastFetchTime = Date.now();
        
      } else {
        console.error('❌ DEBUG: Invalid ETH price received from Alchemy SDK (price <= 0):', ethPrice);
      }
    } catch (error) {
      console.error('❌ DEBUG: Exception in fetchAndCacheEthPrice:', error);
      if (error instanceof Error) {
        console.error(`❌ DEBUG: Error message:`, error.message);
        console.error(`❌ DEBUG: Error stack:`, error.stack);
      }
    }
  }

  /**
   * Get last fetch time
   */
  static getLastFetchTime(): number {
    return this.lastFetchTime;
  }

  /**
   * Clean up resources
   */
  static cleanup(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Stop periodic refresh (for cleanup)
   */
  static stop(): void {
    console.log(`🛑 DEBUG: Stopping price cache service...`);
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
      console.log('🛑 Price cache service stopped');
    } 
  }

  /**
   * Force refresh ETH price
   */
  static async forceRefresh(): Promise<void> {
    await this.fetchAndCacheEthPrice();
  }

  /**
   * Get cache status
   */
  static getCacheStatus(): {price: number, lastFetch: Date, isStale: boolean} {
    const now = Date.now();
    const ageMs = now - this.lastFetchTime;
    const isStale = ageMs > (this.REFRESH_INTERVAL_MS * 2); // Consider stale if > 2 minutes old
    
    const status = {
      price: this.cachedEthPrice,
      lastFetch: new Date(this.lastFetchTime),
      isStale
    };
    
    console.log(`🔍 DEBUG: Cache status:`, {
      price: `$${status.price.toFixed(2)}`,
      lastFetch: status.lastFetch.toISOString(),
      ageMs: ageMs,
      ageSec: (ageMs / 1000).toFixed(1),
      isStale: status.isStale,
      staleThreshold: `${(this.REFRESH_INTERVAL_MS * 2) / 1000}s`
    });
    
    return status;
  }
}