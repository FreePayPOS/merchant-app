import { PriceProvider, ProviderConfig } from '../../types/providers.js';
import axios, { AxiosInstance } from 'axios';

/**
 * Axol Price Provider
 * Uses api.axol.io for price data
 */
export class AxolPriceProvider implements PriceProvider {
  public readonly name: string;
  public readonly type: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private readonly rateLimitWindow: number;
  private readonly rateLimitRequests: number;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.axol.io';
    this.rateLimitWindow = config.rateLimit?.window || 60; // 60 seconds default
    this.rateLimitRequests = config.rateLimit?.requests || 100; // 100 requests per window default

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0'
      }
    });

    // Add request interceptor for rate limiting
    this.httpClient.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          console.warn(`Rate limit exceeded for ${this.name}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get token price by symbol
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const response = await this.httpClient.get(`/v1/price/${symbol.toUpperCase()}`);
      
      if (!response.data || !response.data.price) {
        throw new Error(`No price data available for ${symbol}`);
      }

      return parseFloat(response.data.price);
    } catch (error) {
      console.error(`Error getting token price from ${this.name}:`, error);
      throw new Error(`Failed to get token price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get multiple token prices
   */
  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      const response = await this.httpClient.post('/v1/prices/batch', {
        symbols: symbols.map(s => s.toUpperCase())
      });

      if (!response.data || !response.data.prices) {
        throw new Error('No price data available');
      }

      const result: {[symbol: string]: number} = {};
      for (const [symbol, price] of Object.entries(response.data.prices)) {
        result[symbol] = parseFloat(price as string);
      }

      return result;
    } catch (error) {
      console.error(`Error getting token prices from ${this.name}:`, error);
      throw new Error(`Failed to get token prices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get native token price for a specific chain
   */
  async getNativeTokenPrice(chainId: number): Promise<number> {
    try {
      const nativeTokens: { [key: number]: string } = {
        1: 'ETH',    // Ethereum
        137: 'MATIC', // Polygon
        10: 'ETH',   // Optimism
        42161: 'ETH', // Arbitrum
        8453: 'ETH',  // Base
        11155111: 'ETH' // Sepolia
      };

      const symbol = nativeTokens[chainId];
      if (!symbol) {
        throw new Error(`Unsupported chain ID: ${chainId}`);
      }

      return await this.getTokenPrice(symbol);
    } catch (error) {
      console.error(`Error getting native token price from ${this.name}:`, error);
      throw new Error(`Failed to get native token price: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/v1/health', { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error(`Health check failed for ${this.name}:`, error);
      return false;
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter if window has passed
    if (timeSinceReset >= this.rateLimitWindow * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    const remaining = Math.max(0, this.rateLimitRequests - this.requestCount);
    const reset = this.lastResetTime + (this.rateLimitWindow * 1000);

    return { remaining, reset };
  }

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return [
      'ETH', 'BTC', 'USDC', 'USDT', 'DAI', 'MATIC', 'LINK', 'UNI', 'AAVE', 'COMP',
      'CRV', 'SUSHI', 'YFI', 'BAL', 'REN', 'KNC', 'ZRX', 'BAT', 'REP', 'MKR'
    ];
  }

  /**
   * Check rate limit before making requests
   */
  private async checkRateLimit(): Promise<void> {
    const { remaining } = await this.getRateLimit();
    
    if (remaining <= 0) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requestCount++;
  }
} 