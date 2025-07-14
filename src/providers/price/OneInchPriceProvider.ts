import { PriceProvider, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';
import axios, { AxiosInstance } from 'axios';

/**
 * 1inch Price Provider
 * Uses 1inch DEX Aggregator API for price data
 */
export class OneInchPriceProvider implements PriceProvider {
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
    this.apiKey = config.apiKey || ''; // 1inch public API doesn't require API key
    this.baseUrl = config.baseUrl || 'https://api.1inch.dev';
    this.rateLimitWindow = config.rateLimit?.window || 60;
    this.rateLimitRequests = config.rateLimit?.requests || 100;

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
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

  /**
   * Get price for a single token using 1inch quote API
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      // 1inch requires token addresses, so we'll use a fallback approach
      // For now, we'll use USDC as the quote token and get the price
      const tokenAddress = this.getTokenAddress(symbol);
      const usdcAddress = '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C'; // USDC on Ethereum
      
      const response = await this.httpClient.get(`/swap/v5.2/1/quote`, {
        params: {
          src: tokenAddress,
          dst: usdcAddress,
          amount: '1000000000000000000', // 1 token in wei
          includeTokensInfo: false,
          includeGas: false
        }
      });

      if (response.data && response.data.toTokenAmount) {
        // Convert from USDC decimals (6) to USD
        return parseFloat(response.data.toTokenAmount) / Math.pow(10, 6);
      }

      return 0;
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
      const result: {[symbol: string]: number} = {};
      
      // 1inch doesn't support batch requests, so we'll fetch individually
      for (const symbol of symbols) {
        result[symbol] = await this.getTokenPrice(symbol);
      }

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

    const tokenSymbol = this.getTokenSymbolForChain(chainId);
    return await this.getTokenPrice(tokenSymbol);
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to get a simple quote to test connectivity
      const response = await this.httpClient.get('/swap/v5.2/1/tokens');
      return response.status === 200;
    } catch (error) {
      console.error('1inch provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit information
   */
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

  /**
   * Get supported tokens
   */
  getSupportedTokens(): string[] {
    return SUPPORTED_CHAINS.map(chain => this.getTokenSymbolForChain(chain.id));
  }

  /**
   * Map chain ID to appropriate token symbol for pricing
   */
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

  /**
   * Get token address for a symbol (simplified mapping)
   */
  private getTokenAddress(symbol: string): string {
    const addressMap: {[key: string]: string} = {
      'ETH': '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe',
      'WETH': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      'USDC': '0xA0b86a33E6441b8C4C8C8C8C8C8C8C8C8C8C8C8C',
      'USDT': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      'MATIC': '0x7D1AfA7B718fb893dB30A3aBc0Cfc608aCfeFEAA',
      'WBTC': '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
    };
    
    return addressMap[symbol.toUpperCase()] || '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeEe';
  }

  /**
   * Check rate limit before making requests
   */
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