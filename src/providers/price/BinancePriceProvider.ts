import { PriceProvider, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';
import axios, { AxiosInstance } from 'axios';

/**
 * Binance Price Provider
 * Uses Binance Public API for price data
 */
export class BinancePriceProvider implements PriceProvider {
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
    this.apiKey = config.apiKey || ''; // Binance public API doesn't require API key
    this.baseUrl = config.baseUrl || 'https://api.binance.com/api/v3';
    this.rateLimitWindow = config.rateLimit?.window || 60;
    this.rateLimitRequests = config.rateLimit?.requests || 1200; // Binance allows 1200 requests per minute

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0'
      }
    });

    this.httpClient.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      return config;
    });

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

  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const response = await this.httpClient.get('/ticker/price', {
        params: {
          symbol: `${symbol.toUpperCase()}USDT`
        }
      });

      return parseFloat(response.data.price) || 0;
    } catch (error) {
      // Try without USDT suffix for some tokens
      try {
        const response = await this.httpClient.get('/ticker/price', {
          params: {
            symbol: `${symbol.toUpperCase()}USD`
          }
        });
        return parseFloat(response.data.price) || 0;
      } catch (_secondError) {
        console.error(`Error fetching price for ${symbol}:`, error);
        return 0;
      }
    }
  }

  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      // Get all prices at once
      const response = await this.httpClient.get('/ticker/price');
      const allPrices = response.data;
      
      const result: {[symbol: string]: number} = {};
      
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        // Look for USDT pair first, then USD pair
        const usdtPair = allPrices.find((p: any) => p.symbol === `${upperSymbol}USDT`);
        const usdPair = allPrices.find((p: any) => p.symbol === `${upperSymbol}USD`);
        
        if (usdtPair) {
          result[symbol] = parseFloat(usdtPair.price) || 0;
        } else if (usdPair) {
          result[symbol] = parseFloat(usdPair.price) || 0;
        } else {
          result[symbol] = 0;
        }
      });

      return result;
    } catch (error) {
      console.error('Error fetching token prices:', error);
      return {};
    }
  }

  async getNativeTokenPrice(chainId: number): Promise<number> {
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    const tokenSymbol = this.getTokenSymbolForChain(chainId);
    return await this.getTokenPrice(tokenSymbol);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/ping');
      return response.status === 200;
    } catch (error) {
      console.error('Binance provider health check failed:', error);
      return false;
    }
  }

  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    if (timeSinceReset >= this.rateLimitWindow * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return {
      remaining: Math.max(0, this.rateLimitRequests - this.requestCount),
      reset: this.lastResetTime + (this.rateLimitWindow * 1000)
    };
  }

  getSupportedTokens(): string[] {
    return SUPPORTED_CHAINS.map(chain => this.getTokenSymbolForChain(chain.id));
  }

  private getTokenSymbolForChain(chainId: number): string {
    switch (chainId) {
      case 1: // Ethereum
      case 8453: // Base
      case 42161: // Arbitrum
      case 10: // Optimism
      case 393402133025423: // Starknet
        return 'ETH';
      case 137: // Polygon
        return 'MATIC';
      default:
        return 'ETH';
    }
  }

  private async checkRateLimit(): Promise<void> {
    const rateLimit = await this.getRateLimit();
    
    if (rateLimit.remaining <= 0) {
      const waitTime = rateLimit.reset - Date.now();
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
      }
    }
    
    this.requestCount++;
  }
} 