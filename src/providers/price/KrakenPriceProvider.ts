import { PriceProvider, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';
import axios, { AxiosInstance } from 'axios';

/**
 * Kraken Price Provider
 * Uses Kraken Public API for price data
 */
export class KrakenPriceProvider implements PriceProvider {
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
    this.apiKey = config.apiKey || ''; // Kraken public API doesn't require API key
    this.baseUrl = config.baseUrl || 'https://api.kraken.com/0/public';
    this.rateLimitWindow = config.rateLimit?.window || 60;
    this.rateLimitRequests = config.rateLimit?.requests || 15; // Kraken allows 15 requests per 10 seconds

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
      const krakenSymbol = this.getKrakenSymbol(symbol);
      const response = await this.httpClient.get('/Ticker', {
        params: {
          pair: krakenSymbol
        }
      });

      if (response.data.error && response.data.error.length > 0) {
        console.warn(`Kraken API error for ${symbol}:`, response.data.error);
        return 0;
      }

      const result = response.data.result;
      if (!result || !result[krakenSymbol]) {
        return 0;
      }

      // Kraken returns an array: [price, volume, time, bid, ask, open, high, low, vwap, trades, low, high, open]
      const price = result[krakenSymbol].c[0]; // Current price is the first element of 'c' array
      return parseFloat(price) || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      const krakenSymbols = symbols.map(s => this.getKrakenSymbol(s)).join(',');
      const response = await this.httpClient.get('/Ticker', {
        params: {
          pair: krakenSymbols
        }
      });

      if (response.data.error && response.data.error.length > 0) {
        console.warn('Kraken API error:', response.data.error);
        return {};
      }

      const result = response.data.result;
      const prices: {[symbol: string]: number} = {};
      
      symbols.forEach(symbol => {
        const krakenSymbol = this.getKrakenSymbol(symbol);
        if (result && result[krakenSymbol]) {
          const price = result[krakenSymbol].c[0];
          prices[symbol] = parseFloat(price) || 0;
        } else {
          prices[symbol] = 0;
        }
      });

      return prices;
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
      const response = await this.httpClient.get('/Time');
      return response.status === 200 && !response.data.error;
    } catch (error) {
      console.error('Kraken provider health check failed:', error);
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

  private getKrakenSymbol(symbol: string): string {
    // Kraken uses different symbol names
    const symbolMap: {[key: string]: string} = {
      'ETH': 'XETHZUSD',
      'BTC': 'XXBTZUSD',
      'MATIC': 'MATICUSD',
      'USDC': 'USDCUSD',
      'USDT': 'USDTZUSD'
    };
    
    return symbolMap[symbol.toUpperCase()] || `${symbol.toUpperCase()}USD`;
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