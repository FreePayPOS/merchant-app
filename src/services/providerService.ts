import { ProviderManager } from '../providers/ProviderManager';
import { Transaction } from '../types/providers';
import { getProviderConfig, validateProviderConfig } from '../config/providers';

/**
 * Service that uses the provider manager to handle all blockchain operations
 */
export class ProviderService {
  private static instance: ProviderService;
  private providerManager: ProviderManager;
  private isInitialized = false;

  private constructor(testMode: boolean = false) {
    const config = getProviderConfig();
    const errors = validateProviderConfig(config);
    
    if (errors.length > 0) {
      throw new Error(`Provider configuration errors: ${errors.join(', ')}`);
    }

    this.providerManager = new ProviderManager(config, testMode);
  }

  /**
   * Get singleton instance
   */
  static getInstance(testMode: boolean = false): ProviderService {
    if (!ProviderService.instance) {
      ProviderService.instance = new ProviderService(testMode);
    }
    return ProviderService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(skipHealthCheck = false): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Perform initial health check unless skipped
      if (!skipHealthCheck) {
        await this.providerManager.refreshProviderHealth();
      }
      this.isInitialized = true;
      console.log('✅ ProviderService initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize ProviderService:', error);
      throw error;
    }
  }

  /**
   * Get balance for an address on a specific chain
   */
  async getBalance(address: string, chainId: number): Promise<string> {
    const provider = this.providerManager.getBlockchainProvider(chainId);
    return await provider.getBalance(address, chainId);
  }

  /**
   * Get transaction details
   */
  async getTransaction(hash: string, chainId: number): Promise<Transaction | null> {
    const provider = this.providerManager.getBlockchainProvider(chainId);
    return await provider.getTransaction(hash, chainId);
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string, chainId: number): Promise<any> {
    const provider = this.providerManager.getBlockchainProvider(chainId);
    return await provider.getTransactionReceipt(hash, chainId);
  }

  /**
   * Subscribe to address for real-time transaction monitoring
   */
  async subscribeToAddress(
    address: string, 
    chainId: number, 
    callback: (tx: Transaction) => void
  ): Promise<string> {
    const provider = this.providerManager.getBlockchainProvider(chainId);
    return await provider.subscribeToAddress(address, chainId, callback);
  }

  /**
   * Unsubscribe from address monitoring
   */
  async unsubscribe(_subscriptionId: string): Promise<void> {
    // Note: This would need to be implemented to track which provider
    // created the subscription. For now, we'll need to store this mapping.
    console.warn('Unsubscribe not yet implemented in ProviderService');
  }

  /**
   * Get token price
   */
  async getTokenPrice(symbol: string): Promise<number> {
    const provider = this.providerManager.getPriceProvider();
    return await provider.getTokenPrice(symbol);
  }

  /**
   * Get multiple token prices
   */
  async getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}> {
    const provider = this.providerManager.getPriceProvider();
    return await provider.getTokenPrices(symbols);
  }

  /**
   * Get native token price for a chain
   */
  async getNativeTokenPrice(chainId: number): Promise<number> {
    const provider = this.providerManager.getPriceProvider();
    return await provider.getNativeTokenPrice(chainId);
  }

  /**
   * Get transaction explorer URL
   */
  getTransactionUrl(txHash: string, chainId: number): string {
    const provider = this.providerManager.getExplorerProvider(chainId);
    return provider.getTransactionUrl(txHash, chainId);
  }

  /**
   * Get address explorer URL
   */
  getAddressUrl(address: string, chainId: number): string {
    const provider = this.providerManager.getExplorerProvider(chainId);
    return provider.getAddressUrl(address, chainId);
  }

  /**
   * Get block explorer URL
   */
  getBlockUrl(blockNumber: number, chainId: number): string {
    const provider = this.providerManager.getExplorerProvider(chainId);
    return provider.getBlockUrl(blockNumber, chainId);
  }

  /**
   * Get provider health status
   */
  getProviderHealth() {
    return this.providerManager.getProviderHealth();
  }

  /**
   * Refresh provider health
   */
  async refreshProviderHealth(): Promise<void> {
    await this.providerManager.refreshProviderHealth();
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(config: any): Promise<void> {
    await this.providerManager.updateProviderConfig(config);
  }

  /**
   * Get current provider configuration
   */
  getProviderConfig() {
    return this.providerManager.getProviderConfig();
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.providerManager.cleanup();
  }
} 