import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';

/**
 * Basescan Explorer Provider
 * Chain-specific explorer for Base
 */
export class BasescanExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private readonly baseUrl = 'https://basescan.org';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for Base
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    if (chainId !== 8453) {
      throw new Error(`Basescan only supports Base (chain ID 8453), got ${chainId}`);
    }
    return `${this.baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for Base
   */
  getAddressUrl(address: string, chainId: number): string {
    if (chainId !== 8453) {
      throw new Error(`Basescan only supports Base (chain ID 8453), got ${chainId}`);
    }
    return `${this.baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for Base
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    if (chainId !== 8453) {
      throw new Error(`Basescan only supports Base (chain ID 8453), got ${chainId}`);
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
      console.error('Basescan provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains (only Base)
   */
  getSupportedChains(): number[] {
    return [8453]; // Base Mainnet
  }
} 