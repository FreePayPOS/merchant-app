import { Alchemy, Network } from 'alchemy-sdk';
import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers';
import { SUPPORTED_CHAINS } from '../../config/index';

/**
 * Alchemy blockchain provider implementation
 */
export class AlchemyBlockchainProvider implements BlockchainProvider {
  public readonly name: string;
  public readonly type: string;
  private alchemyInstances: Map<number, Alchemy> = new Map();
  private activeSubscriptions: Map<string, any> = new Map();
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
    this.initialize();
  }

  /**
   * Initialize Alchemy instances for supported chains
   */
  private initialize(): void {
    if (!this.config.apiKey) {
      throw new Error('Alchemy API key is required');
    }

    SUPPORTED_CHAINS.forEach(chain => {
      const networkMapping = this.getAlchemyNetwork(chain.id);
      if (networkMapping) {
        const alchemy = new Alchemy({
          apiKey: this.config.apiKey,
          network: networkMapping,
        });
        this.alchemyInstances.set(chain.id, alchemy);
      }
    });
  }

  /**
   * Get balance for an address on a specific chain
   */
  async getBalance(address: string, chainId: number): Promise<string> {
    const alchemy = this.alchemyInstances.get(chainId);
    if (!alchemy) {
      throw new Error(`Chain ${chainId} not supported by this provider`);
    }

    const balance = await alchemy.core.getBalance(address);
    return balance.toString();
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string, chainId: number): Promise<Transaction | null> {
    const alchemy = this.alchemyInstances.get(chainId);
    if (!alchemy) {
      throw new Error(`Chain ${chainId} not supported by this provider`);
    }

    try {
      const tx = await alchemy.core.getTransaction(hash);
      if (!tx) return null;

      return {
        hash: tx.hash,
        value: parseInt(tx.value?.toString() || '0'),
        from: tx.from || '',
        to: tx.to || '',
        chainId,
        chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name
      };
    } catch (error) {
      console.error(`Error fetching transaction ${hash}:`, error);
      return null;
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string, chainId: number): Promise<any> {
    const alchemy = this.alchemyInstances.get(chainId);
    if (!alchemy) {
      throw new Error(`Chain ${chainId} not supported by this provider`);
    }

    return await alchemy.core.getTransactionReceipt(hash);
  }

  /**
   * Subscribe to address for real-time transaction monitoring
   */
  async subscribeToAddress(
    address: string, 
    chainId: number, 
    _callback: (tx: Transaction) => void
  ): Promise<string> {
    const alchemy = this.alchemyInstances.get(chainId);
    if (!alchemy) {
      throw new Error(`Chain ${chainId} not supported by this provider`);
    }

    // Special handling for Starknet which doesn't support WebSocket subscriptions
    if (chainId === 393402133025423) {
      throw new Error('Starknet does not support WebSocket subscriptions');
    }

    const subscriptionId = `${chainId}-${address}-${Date.now()}`;
    
    // For now, return a placeholder subscription ID
    // TODO: Implement proper WebSocket subscription when Alchemy SDK supports it
    console.warn('WebSocket subscriptions not yet implemented for Alchemy provider');
    
    // Store a placeholder subscription
    this.activeSubscriptions.set(subscriptionId, { removeAllListeners: () => {} });
    return subscriptionId;
  }

  /**
   * Unsubscribe from address monitoring
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription) {
      subscription.removeAllListeners();
      this.activeSubscriptions.delete(subscriptionId);
    }
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to get the latest block number from Ethereum mainnet
      const alchemy = this.alchemyInstances.get(1);
      if (!alchemy) return false;
      
      await alchemy.core.getBlockNumber();
      return true;
    } catch (error) {
      console.error('Alchemy provider health check failed:', error);
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
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return Array.from(this.alchemyInstances.keys());
  }

  /**
   * Get explorer URL for a chain
   */
  getExplorerUrl(chainId: number): string {
    const explorerMap: {[key: number]: string} = {
      1: 'https://etherscan.io',
      8453: 'https://basescan.org',
      42161: 'https://arbiscan.io',
      10: 'https://optimistic.etherscan.io',
      137: 'https://polygonscan.com',
      393402133025423: 'https://starkscan.co'
    };
    
    return explorerMap[chainId] || 'https://etherscan.io';
  }

  /**
   * Map chain IDs to Alchemy Network enums
   */
  private getAlchemyNetwork(chainId: number): Network | null {
    const networkMap: {[key: number]: Network} = {
      1: Network.ETH_MAINNET,
      8453: Network.BASE_MAINNET,
      42161: Network.ARB_MAINNET,
      10: Network.OPT_MAINNET,
      137: Network.MATIC_MAINNET
    };
    
    return networkMap[chainId] || null;
  }
} 