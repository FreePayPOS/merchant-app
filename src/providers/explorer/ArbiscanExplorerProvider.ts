import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';

/**
 * Arbiscan Explorer Provider
 * Chain-specific explorer for Arbitrum
 */
export class ArbiscanExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private readonly baseUrl = 'https://arbiscan.io';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for Arbitrum
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    if (chainId !== 42161) {
      throw new Error(`Arbiscan only supports Arbitrum (chain ID 42161), got ${chainId}`);
    }
    return `${this.baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for Arbitrum
   */
  getAddressUrl(address: string, chainId: number): string {
    if (chainId !== 42161) {
      throw new Error(`Arbiscan only supports Arbitrum (chain ID 42161), got ${chainId}`);
    }
    return `${this.baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for Arbitrum
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    if (chainId !== 42161) {
      throw new Error(`Arbiscan only supports Arbitrum (chain ID 42161), got ${chainId}`);
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
      console.error('Arbiscan provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains (only Arbitrum)
   */
  getSupportedChains(): number[] {
    return [42161]; // Arbitrum One
  }
} 