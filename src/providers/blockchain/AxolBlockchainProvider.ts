import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers';
import axios, { AxiosInstance } from 'axios';

/**
 * Axol Blockchain Provider
 * Uses api.axol.io for blockchain operations
 */
export class AxolBlockchainProvider implements BlockchainProvider {
  public readonly name: string;
  public readonly type: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private readonly rateLimitWindow: number;
  private readonly rateLimitRequests: number;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://api.axol.io';
    this.rateLimitWindow = config.rateLimit?.window || 60; // 60 seconds default
    this.rateLimitRequests = config.rateLimit?.requests || 100; // 100 requests per window default

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0'
      }
    });

    // Add request interceptor for rate limiting
    this.httpClient.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      return config;
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          console.warn(`Rate limit exceeded for ${this.name}`);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get balance for an address on a specific chain
   */
  async getBalance(address: string, chainId: number): Promise<string> {
    try {
      const response = await this.httpClient.get(`/v1/balance/${chainId}/${address}`);
      return response.data.balance || '0';
    } catch (error) {
      console.error(`Error getting balance from ${this.name}:`, error);
      throw new Error(`Failed to get balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransaction(hash: string, chainId: number): Promise<Transaction | null> {
    try {
      const response = await this.httpClient.get(`/v1/transaction/${chainId}/${hash}`);
      const tx = response.data;
      
      if (!tx) return null;

      return {
        hash: tx.hash,
        value: parseFloat(tx.value || '0'),
        from: tx.from,
        to: tx.to,
        chainId: chainId,
        tokenSymbol: tx.tokenSymbol,
        tokenAddress: tx.tokenAddress,
        decimals: tx.decimals
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null; // Transaction not found
      }
      console.error(`Error getting transaction from ${this.name}:`, error);
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string, chainId: number): Promise<any> {
    try {
      const response = await this.httpClient.get(`/v1/transaction/${chainId}/${hash}/receipt`);
      return response.data;
    } catch (error) {
      console.error(`Error getting transaction receipt from ${this.name}:`, error);
      throw new Error(`Failed to get transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to address for real-time transactions
   * Note: This would need WebSocket implementation for real-time updates
   */
  async subscribeToAddress(address: string, chainId: number, callback: (tx: Transaction) => void): Promise<string> {
    // For now, implement polling-based subscription
    const subscriptionId = `axol_${chainId}_${address}_${Date.now()}`;
    
    // Start polling for new transactions
    const pollInterval = setInterval(async () => {
      try {
        // This is a simplified implementation - in practice, you'd want to track last seen transaction
        const response = await this.httpClient.get(`/v1/transactions/${chainId}/${address}?limit=1`);
        const transactions = response.data.transactions || [];
        
        if (transactions.length > 0) {
          const tx = transactions[0];
          callback({
            hash: tx.hash,
            value: parseFloat(tx.value || '0'),
            from: tx.from,
            to: tx.to,
            chainId: chainId,
            tokenSymbol: tx.tokenSymbol,
            tokenAddress: tx.tokenAddress,
            decimals: tx.decimals
          });
        }
      } catch (error) {
        console.error(`Error polling transactions from ${this.name}:`, error);
      }
    }, 5000); // Poll every 5 seconds

    // Store the interval for cleanup
    (this as any)._subscriptions = (this as any)._subscriptions || new Map();
    (this as any)._subscriptions.set(subscriptionId, pollInterval);

    return subscriptionId;
  }

  /**
   * Unsubscribe from address monitoring
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscriptions = (this as any)._subscriptions || new Map();
    const interval = subscriptions.get(subscriptionId);
    
    if (interval) {
      clearInterval(interval);
      subscriptions.delete(subscriptionId);
    }
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
   * Get current rate limit status
   */
  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    // Reset counter if window has passed
    if (timeSinceReset >= this.rateLimitWindow * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    const remaining = Math.max(0, this.rateLimitRequests - this.requestCount);
    const reset = this.lastResetTime + (this.rateLimitWindow * 1000);

    return { remaining, reset };
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return [1, 137, 10, 42161, 8453, 11155111]; // Ethereum, Polygon, Optimism, Arbitrum, Base, Sepolia
  }

  /**
   * Get explorer URL for a chain
   */
  getExplorerUrl(chainId: number): string {
    const explorerUrls: { [key: number]: string } = {
      1: 'https://etherscan.io',
      137: 'https://polygonscan.com',
      10: 'https://optimistic.etherscan.io',
      42161: 'https://arbiscan.io',
      8453: 'https://basescan.org',
      11155111: 'https://sepolia.etherscan.io'
    };
    
    return explorerUrls[chainId] || 'https://etherscan.io';
  }

  /**
   * Check rate limit before making requests
   */
  private async checkRateLimit(): Promise<void> {
    const { remaining } = await this.getRateLimit();
    
    if (remaining <= 0) {
      throw new Error('Rate limit exceeded');
    }
    
    this.requestCount++;
  }
} 