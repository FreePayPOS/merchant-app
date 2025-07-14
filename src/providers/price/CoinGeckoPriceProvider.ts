import { PriceProvider, ProviderConfig } from '../../types/providers.js';
import { SUPPORTED_CHAINS } from '../../config/index.js';

/**
 * CoinGecko price provider implementation
 */
export class CoinGeckoPriceProvider implements PriceProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private baseUrl = 'https://api.coingecko.com/api/v3';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get price for a single token
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${symbol.toLowerCase()}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      return data[symbol.toLowerCase()]?.usd || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      const ids = symbols.map(s => s.toLowerCase()).join(',');
      const response = await fetch(
        `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=usd`
      );
      
      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const result: {[symbol: string]: number} = {};
      
      symbols.forEach(symbol => {
        result[symbol] = data[symbol.toLowerCase()]?.usd || 0;
      });

      return result;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }

  /**
   * Get native token price for a specific chain
   */
  async getNativeTokenPrice(chainId: number): Promise<number> {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    return await this.getTokenPrice(chain.coingeckoId);
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/ping`);
      return response.ok;
    } catch (error) {
      console.error('CoinGecko health check failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    // CoinGecko free tier has 10-50 calls per minute
    // This is a placeholder implementation
    return {
      remaining: 50,
      reset: Date.now() + 60000 // Reset in 1 minute
    };
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return SUPPORTED_CHAINS.map(chain => chain.coingeckoId);
  }
} 