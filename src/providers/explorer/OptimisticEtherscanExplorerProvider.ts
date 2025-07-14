import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';

/**
 * Optimistic Etherscan Explorer Provider
 * Chain-specific explorer for Optimism
 */
export class OptimisticEtherscanExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private readonly baseUrl = 'https://optimistic.etherscan.io';

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for Optimism
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    if (chainId !== 10) {
      throw new Error(`Optimistic Etherscan only supports Optimism (chain ID 10), got ${chainId}`);
    }
    return `${this.baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for Optimism
   */
  getAddressUrl(address: string, chainId: number): string {
    if (chainId !== 10) {
      throw new Error(`Optimistic Etherscan only supports Optimism (chain ID 10), got ${chainId}`);
    }
    return `${this.baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for Optimism
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    if (chainId !== 10) {
      throw new Error(`Optimistic Etherscan only supports Optimism (chain ID 10), got ${chainId}`);
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
      console.error('Optimistic Etherscan provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains (only Optimism)
   */
  getSupportedChains(): number[] {
    return [10]; // Optimism Mainnet
  }
} 