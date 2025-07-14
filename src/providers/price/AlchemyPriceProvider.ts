import { Alchemy, Network } from 'alchemy-sdk';
import { PriceProvider, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';

/**
 * Alchemy price provider implementation using Alchemy SDK
 */
export class AlchemyPriceProvider implements PriceProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private alchemy: Alchemy;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
    
    if (!this.config.apiKey) {
      throw new Error('Alchemy API key is required for Alchemy Price Provider');
    }
    
    // Initialize Alchemy SDK for Ethereum mainnet (prices are global)
    this.alchemy = new Alchemy({
      apiKey: this.config.apiKey,
      network: Network.ETH_MAINNET
    });
  }

  /**
   * Get price for a single token using Alchemy Prices API
   */
  async getTokenPrice(symbol: string): Promise<number> {
    try {
      const priceData = await this.alchemy.prices.getTokenPriceBySymbol([symbol]);
      
      if (!priceData || !Array.isArray(priceData) || priceData.length === 0) {
        console.warn(`No price data found for ${symbol}`);
        return 0;
      }
      
      // The API returns an array, get the first result
      const result = priceData[0];
      return result?.price || 0;
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return 0;
    }
  }

  /**
   * Get prices for multiple tokens using Alchemy Prices API
   */
  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    try {
      const priceData = await this.alchemy.prices.getTokenPriceBySymbol(symbols);
      
      if (!priceData || !Array.isArray(priceData)) {
        console.warn('No price data received from Alchemy');
        return {};
      }
      
      // Convert the array response to the expected format
      const result: {[symbol: string]: number} = {};
      priceData.forEach(item => {
        if (item && item.symbol && item.price !== undefined) {
          result[item.symbol] = item.price;
        }
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

    // Map chain to appropriate token symbol for pricing
    const tokenSymbol = this.getTokenSymbolForChain(chainId);
    return await this.getTokenPrice(tokenSymbol);
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to get a simple price to test connectivity
      await this.getTokenPrice('ETH');
      return true;
    } catch (error) {
      console.error('Alchemy price provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    // Alchemy doesn't provide rate limit headers in their API
    // This is a placeholder implementation
    return {
      remaining: 1000, // Assume generous limits
      reset: Date.now() + 60000 // Reset in 1 minute
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
    const chain = SUPPORTED_CHAINS.find(c => c.id === chainId);
    if (!chain) {
      return 'ETH'; // Default to ETH
    }

    // Most L2s use ETH as their native token
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
} 