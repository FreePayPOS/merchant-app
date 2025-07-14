import { PriceProvider, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';
import axios, { AxiosInstance } from 'axios';

/**
 * CoinMarketCap Price Provider
 * Uses CoinMarketCap Pro API for price data
 */
export class CoinMarketCapPriceProvider implements PriceProvider {
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
    this.baseUrl = config.baseUrl || 'https://pro-api.coinmarketcap.com/v1';
    this.rateLimitWindow = config.rateLimit?.window || 60;
    this.rateLimitRequests = config.rateLimit?.requests || 30;

    if (!this.apiKey) {
      throw new Error('CoinMarketCap API key is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'X-CMC_PRO_API_KEY': this.apiKey,
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
      const response = await this.httpClient.get('/cryptocurrency/quotes/latest', {
        params: {
          symbol: symbol.toUpperCase(),
          convert: 'USD'
        }
      });

      const data = response.data.data;
      if (!data || !data[symbol.toUpperCase()]) {
        return 0;
      }

      const tokenData = data[symbol.toUpperCase()];
      return tokenData.quote.USD.price || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      const response = await this.httpClient.get('/cryptocurrency/quotes/latest', {
        params: {
          symbol: symbols.map(s => s.toUpperCase()).join(','),
          convert: 'USD'
        }
      });

      const data = response.data.data;
      const result: {[symbol: string]: number} = {};
      
      symbols.forEach(symbol => {
        const upperSymbol = symbol.toUpperCase();
        if (data && data[upperSymbol]) {
          result[symbol] = data[upperSymbol].quote.USD.price || 0;
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
      await this.getTokenPrice('BTC');
      return true;
    } catch (error) {
      console.error('CoinMarketCap provider health check failed:', error);
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