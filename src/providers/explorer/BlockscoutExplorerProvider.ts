import { ExplorerProvider, ProviderConfig } from '../../types/providers.js';
import { SUPPORTED_CHAINS } from '../../config/index.js';

/**
 * Blockscout Explorer Provider
 * Open-source blockchain explorer that doesn't require API keys
 */
export class BlockscoutExplorerProvider implements ExplorerProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  /**
   * Get transaction URL for a specific chain
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    const baseUrl = this.getExplorerBaseUrl(chainId);
    return `${baseUrl}/tx/${txHash}`;
  }

  /**
   * Get address URL for a specific chain
   */
  getAddressUrl(address: string, chainId: number): string {
    const baseUrl = this.getExplorerBaseUrl(chainId);
    return `${baseUrl}/address/${address}`;
  }

  /**
   * Get block URL for a specific chain
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    const baseUrl = this.getExplorerBaseUrl(chainId);
    return `${baseUrl}/block/${blockNumber}`;
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to access a public Blockscout instance
      const testUrl = 'https://blockscout.com/eth/mainnet';
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(testUrl, { 
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      console.error('Blockscout provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return SUPPORTED_CHAINS.map(chain => chain.id);
  }

  /**
   * Get explorer base URL for a specific chain
   */
  private getExplorerBaseUrl(chainId: number): string {
    const explorerMap: {[key: number]: string} = {
      1: 'https://blockscout.com/eth/mainnet',
      8453: 'https://blockscout.com/base/mainnet',
      42161: 'https://blockscout.com/arbitrum/mainnet',
      10: 'https://blockscout.com/optimism/mainnet',
      137: 'https://blockscout.com/polygon/mainnet',
      393402133025423: 'https://starkscan.co' // Starknet uses Starkscan
    };
    
    return explorerMap[chainId] || 'https://blockscout.com/eth/mainnet';
  }
} 