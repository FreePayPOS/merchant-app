import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';
import axios, { AxiosInstance } from 'axios';

/**
 * Axol Explorer Provider
 * Uses api.axol.io for explorer URLs
 */
export class AxolExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.axol.io';

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0'
      }
    });
  }

  /**
   * Get transaction URL for a specific chain
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    return `https://explore.axol.io/tx/${txHash}?chain=${chainId}`;
  }

  /**
   * Get address URL for a specific chain
   */
  getAddressUrl(address: string, chainId: number): string {
    return `https://explore.axol.io/address/${address}?chain=${chainId}`;
  }

  /**
   * Get block URL for a specific chain
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    return `https://explore.axol.io/block/${blockNumber}?chain=${chainId}`;
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
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return [1, 137, 10, 42161, 8453, 11155111]; // Ethereum, Polygon, Optimism, Arbitrum, Base, Sepolia
  }
} 