import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers.js';
import { SUPPORTED_CHAINS } from '../../config/index.js';
import axios, { AxiosInstance } from 'axios';

/**
 * Moralis Blockchain Provider
 * Uses Moralis Web3 API for blockchain operations
 */
export class MoralisBlockchainProvider implements BlockchainProvider {
  public readonly name: string;
  public readonly type: string;
  
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly httpClient: AxiosInstance;
  private readonly rateLimitWindow: number;
  private readonly rateLimitRequests: number;
  private requestCount: number = 0;
  private lastResetTime: number = Date.now();
  private activeSubscriptions: Map<string, any> = new Map();

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl || 'https://deep-index.moralis.io/api/v2';
    this.rateLimitWindow = config.rateLimit?.window || 60; // 60 seconds default
    this.rateLimitRequests = config.rateLimit?.requests || 100; // 100 requests per window default

    if (!this.apiKey) {
      throw new Error('Moralis API key is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'X-API-Key': this.apiKey,
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
      const chain = this.getMoralisChain(chainId);
      const response = await this.httpClient.get(`/${address}/balance`, {
        params: { chain }
      });

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
      const chain = this.getMoralisChain(chainId);
      const response = await this.httpClient.get(`/transaction/${hash}`, {
        params: { chain }
      });

      const tx = response.data;
      if (!tx) return null;

      return {
        hash: tx.hash,
        value: parseFloat(tx.value) || 0,
        from: tx.from_address,
        to: tx.to_address,
        chainId: chainId,
        chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name
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
      const chain = this.getMoralisChain(chainId);
      const response = await this.httpClient.get(`/transaction/${hash}/receipt`, {
        params: { chain }
      });

      return response.data;
    } catch (error) {
      console.error(`Error getting transaction receipt from ${this.name}:`, error);
      throw new Error(`Failed to get transaction receipt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to address for real-time transactions
   * Note: Moralis provides WebSocket streams for real-time updates
   */
  async subscribeToAddress(address: string, chainId: number, callback: (tx: Transaction) => void): Promise<string> {
    // For now, implement polling-based subscription
    // In a real implementation, you'd use Moralis WebSocket streams
    const subscriptionId = `moralis_${chainId}_${address}_${Date.now()}`;
    
    // Start polling for new transactions
    const pollInterval = setInterval(async () => {
      try {
        const chain = this.getMoralisChain(chainId);
        const response = await this.httpClient.get(`/${address}`, {
          params: { 
            chain,
            limit: 1,
            order: 'desc'
          }
        });

        if (response.data && response.data.length > 0) {
          const tx = response.data[0];
          callback({
            hash: tx.hash,
            value: parseFloat(tx.value) || 0,
            from: tx.from_address,
            to: tx.to_address,
            chainId: chainId,
            chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name
          });
        }
      } catch (error) {
        console.error(`Error in Moralis subscription polling:`, error);
      }
    }, 30000); // Poll every 30 seconds

    // Store the interval for cleanup
    this.activeSubscriptions.set(subscriptionId, { interval: pollInterval });
    return subscriptionId;
  }

  /**
   * Unsubscribe from address monitoring
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.activeSubscriptions.get(subscriptionId);
    if (subscription && subscription.interval) {
      clearInterval(subscription.interval);
      this.activeSubscriptions.delete(subscriptionId);
    }
  }

  /**
   * Check if the provider is healthy
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Try to get a simple API call to test connectivity
      const response = await this.httpClient.get('/web3/version', {
        params: { chain: 'eth' }
      });
      return response.status === 200;
    } catch (error) {
      console.error('Moralis provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get rate limit information
   */
  async getRateLimit(): Promise<{ remaining: number; reset: number }> {
    const now = Date.now();
    const timeSinceReset = now - this.lastResetTime;
    
    if (timeSinceReset >= this.rateLimitWindow * 1000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }

    return {
      remaining: Math.max(0, this.rateLimitRequests - this.requestCount),
      reset: this.lastResetTime + (this.rateLimitWindow * 1000)
    };
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): number[] {
    return SUPPORTED_CHAINS.map(chain => chain.id);
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
   * Map chain ID to Moralis chain identifier
   */
  private getMoralisChain(chainId: number): string {
    const chainMap: {[key: number]: string} = {
      1: 'eth',
      8453: 'base',
      42161: 'arbitrum',
      10: 'optimism',
      137: 'polygon',
      11155111: 'sepolia'
    };
    
    const chain = chainMap[chainId];
    if (!chain) {
      throw new Error(`Chain ${chainId} not supported by Moralis`);
    }
    
    return chain;
  }

  /**
   * Check rate limit before making requests
   */
  private async checkRateLimit(): Promise<void> {
    const rateLimit = await this.getRateLimit();
    
    if (rateLimit.remaining <= 0) {
      const waitTime = rateLimit.reset - Date.now();
      if (waitTime > 0) {
        throw new Error(`Rate limit exceeded. Please wait ${Math.ceil(waitTime / 1000)} seconds.`);
      }
    }
    
    this.requestCount++;
  }
} 