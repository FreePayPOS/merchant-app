import { 
  BlockchainProvider, 
  PriceProvider, 
  ExplorerProvider, 
  MultiProviderConfig,
  ProviderHealth,
  ProviderManager as IProviderManager
} from '../types/providers';
import { ProviderFactory } from './ProviderFactory';

/**
 * Manager for handling multiple providers with fallback logic
 */
export class ProviderManager implements IProviderManager {
  private factory: ProviderFactory;
  private config: MultiProviderConfig;
  private blockchainProviders: BlockchainProvider[] = [];
  private priceProviders: PriceProvider[] = [];
  private explorerProviders: ExplorerProvider[] = [];
  private healthStatus: Map<string, ProviderHealth> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor(config: MultiProviderConfig, testMode: boolean = false) {
    this.factory = new ProviderFactory();
    this.config = config;
    this.initializeProviders();
    
    // Don't start health monitoring in test mode
    if (!testMode) {
      this.startHealthMonitoring();
    }
  }

  /**
   * Initialize all providers from configuration
   */
  private initializeProviders(): void {
    // Initialize blockchain providers
    this.blockchainProviders = this.config.blockchain
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
      .map(config => this.factory.createBlockchainProvider(config));

    // Initialize price providers
    this.priceProviders = this.config.price
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
      .map(config => this.factory.createPriceProvider(config));

    // Initialize explorer providers
    this.explorerProviders = this.config.explorer
      .filter(p => p.enabled !== false)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999))
      .map(config => this.factory.createExplorerProvider(config));
  }

  /**
   * Get the best available blockchain provider for a chain
   */
  getBlockchainProvider(chainId: number): BlockchainProvider {
    // Find providers that support this chain
    const availableProviders = this.blockchainProviders.filter(provider => {
      const supportedChains = provider.getSupportedChains();
      return supportedChains.includes(chainId);
    });

    if (availableProviders.length === 0) {
      throw new Error(`No blockchain provider available for chain ${chainId}`);
    }

    // Return the first healthy provider, or the first available if fallback is disabled
    if (this.config.fallbackEnabled) {
      for (const provider of availableProviders) {
        const health = this.healthStatus.get(provider.name);
        if (!health || health.healthy) {
          return provider;
        }
      }
    }

    return availableProviders[0];
  }

  /**
   * Get the best available price provider
   */
  getPriceProvider(): PriceProvider {
    if (this.priceProviders.length === 0) {
      throw new Error('No price provider available');
    }

    // Return the first healthy provider, or the first available if fallback is disabled
    if (this.config.fallbackEnabled) {
      for (const provider of this.priceProviders) {
        const health = this.healthStatus.get(provider.name);
        if (!health || health.healthy) {
          return provider;
        }
      }
    }

    return this.priceProviders[0];
  }

  /**
   * Get the best available explorer provider for a chain
   */
  getExplorerProvider(chainId: number): ExplorerProvider {
    // Find providers that support this chain
    const availableProviders = this.explorerProviders.filter(provider => {
      const supportedChains = provider.getSupportedChains();
      return supportedChains.includes(chainId);
    });

    if (availableProviders.length === 0) {
      throw new Error(`No explorer provider available for chain ${chainId}`);
    }

    // Return the first healthy provider, or the first available if fallback is disabled
    if (this.config.fallbackEnabled) {
      for (const provider of availableProviders) {
        const health = this.healthStatus.get(provider.name);
        if (!health || health.healthy) {
          return provider;
        }
      }
    }

    return availableProviders[0];
  }

  /**
   * Get health status of all providers
   */
  getProviderHealth(): ProviderHealth[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Refresh health status of all providers
   */
  async refreshProviderHealth(): Promise<void> {
    const healthChecks = [];

    // Check blockchain providers
    for (const provider of this.blockchainProviders) {
      healthChecks.push(this.checkProviderHealth(provider, 'blockchain'));
    }

    // Check price providers
    for (const provider of this.priceProviders) {
      healthChecks.push(this.checkProviderHealth(provider, 'price'));
    }

    // Check explorer providers
    for (const provider of this.explorerProviders) {
      healthChecks.push(this.checkProviderHealth(provider, 'explorer'));
    }

    await Promise.all(healthChecks);
  }

  /**
   * Check health of a single provider
   */
  private async checkProviderHealth(provider: BlockchainProvider | PriceProvider | ExplorerProvider, type: string): Promise<void> {
    const startTime = Date.now();
    let healthy = false;
    let error: string | undefined;

    try {
      healthy = await provider.isHealthy();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }

    const responseTime = Date.now() - startTime;

    this.healthStatus.set(provider.name, {
      provider: provider.name,
      type,
      healthy,
      lastCheck: new Date(),
      error,
      responseTime
    });
  }

  /**
   * Start periodic health monitoring
   */
  private startHealthMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(
      () => this.refreshProviderHealth(),
      this.config.healthCheckInterval * 1000
    );
  }

  /**
   * Update provider configuration
   */
  async updateProviderConfig(config: MultiProviderConfig): Promise<void> {
    this.config = config;
    
    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Reinitialize providers
    this.initializeProviders();
    
    // Restart health monitoring
    this.startHealthMonitoring();
    
    // Perform initial health check
    await this.refreshProviderHealth();
  }

  /**
   * Get current provider configuration
   */
  getProviderConfig(): MultiProviderConfig {
    return this.config;
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
} 