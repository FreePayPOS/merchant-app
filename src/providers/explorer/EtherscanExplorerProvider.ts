import { ExplorerProvider, ProviderConfig } from '../../types/providers';

/**
 * Etherscan explorer provider implementation
 */
export class EtherscanExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;
  private explorerUrls: {[chainId: number]: string} = {
    1: 'https://etherscan.io',
    8453: 'https://basescan.org',
    42161: 'https://arbiscan.io',
    10: 'https://optimistic.etherscan.io',
    137: 'https://polygonscan.com',
    393402133025423: 'https://starkscan.co'
  };

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for a specific chain
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    const baseUrl = this.explorerUrls[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} not supported by this explorer provider`);
    }
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for a specific chain
   */
  getAddressUrl(address: string, chainId: number): string {
    const baseUrl = this.explorerUrls[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} not supported by this explorer provider`);
    }
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for a specific chain
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    const baseUrl = this.explorerUrls[chainId];
    if (!baseUrl) {
      throw new Error(`Chain ${chainId} not supported by this explorer provider`);
    }
    return `${baseUrl}/block/${blockNumber}`;
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to access the main Etherscan site
      const response = await fetch('https://etherscan.io');
      return response.ok;
    } catch (error) {
      console.error('Etherscan health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return Object.keys(this.explorerUrls).map(Number);
  }
} 