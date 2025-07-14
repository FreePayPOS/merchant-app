import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';

/**
 * Polygonscan Explorer Provider
 * Chain-specific explorer for Polygon
 */
export class PolygonscanExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private readonly baseUrl = 'https://polygonscan.com';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for Polygon
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    if (chainId !== 137) {
      throw new Error(`Polygonscan only supports Polygon (chain ID 137), got ${chainId}`);
    }
    return `${this.baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for Polygon
   */
  getAddressUrl(address: string, chainId: number): string {
    if (chainId !== 137) {
      throw new Error(`Polygonscan only supports Polygon (chain ID 137), got ${chainId}`);
    }
    return `${this.baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for Polygon
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    if (chainId !== 137) {
      throw new Error(`Polygonscan only supports Polygon (chain ID 137), got ${chainId}`);
    }
    return `${this.baseUrl}/block/${blockNumber}`;
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(this.baseUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Polygonscan provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains (only Polygon)
   */
  getSupportedChains(): number[] {
    return [137]; // Polygon Mainnet
  }
} 