import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers.js';
import { SUPPORTED_CHAINS } from '../../config/index.js';
import axios, { AxiosInstance } from 'axios';

/**
 * QuickNode Blockchain Provider
 * Uses QuickNode JSON-RPC API for blockchain operations
 */
export class QuickNodeBlockchainProvider implements BlockchainProvider {
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
    this.baseUrl = config.baseUrl || 'https://mainnet.quicknode.com';
    this.rateLimitWindow = config.rateLimit?.window || 60; // 60 seconds default
    this.rateLimitRequests = config.rateLimit?.requests || 100; // 100 requests per window default

    if (!this.apiKey) {
      throw new Error('QuickNode API key is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
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
      const endpoint = this.getEndpointUrl(chainId);
      
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
        id: 1
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      // Convert hex balance to decimal string
      const hexBalance = response.data.result;
      const balance = parseInt(hexBalance, 16).toString();
      return balance;
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
      const endpoint = this.getEndpointUrl(chainId);
      
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [hash],
        id: 1
      });

      if (response.data.error) {
        if (response.data.error.code === -32602) {
          return null; // Transaction not found
        }
        throw new Error(response.data.error.message);
      }

      const tx = response.data.result;
      if (!tx) return null;

      // Convert hex values to decimal
      const value = parseInt(tx.value, 16);

      return {
        hash: tx.hash,
        value: value / Math.pow(10, 18), // Convert from wei to ETH
        from: tx.from,
        to: tx.to,
        chainId: chainId,
        chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name
      };
    } catch (error) {
      console.error(`Error getting transaction from ${this.name}:`, error);
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(hash: string, chainId: number): Promise<any> {
    try {
      const endpoint = this.getEndpointUrl(chainId);
      
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'eth_getTransactionReceipt',
        params: [hash],
        id: 1
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data.result;
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
    const subscriptionId = `quicknode_${chainId}_${address}_${Date.now()}`;
    
    // Start polling for new transactions
    const pollInterval = setInterval(async () => {
      try {
        // Get latest block number first
        const endpoint = this.getEndpointUrl(chainId);
        
        const blockResponse = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        });

        if (blockResponse.data.error) {
          throw new Error(blockResponse.data.error.message);
        }

        const latestBlock = parseInt(blockResponse.data.result, 16);
        
        // Get block details
        const blockResponse2 = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [`0x${latestBlock.toString(16)}`, true],
          id: 1
        });

        if (blockResponse2.data.error) {
          throw new Error(blockResponse2.data.error.message);
        }

        const block = blockResponse2.data.result;
        if (block && block.transactions) {
          // Check if any transaction involves our address
          for (const tx of block.transactions) {
            if (tx.from?.toLowerCase() === address.toLowerCase() || 
                tx.to?.toLowerCase() === address.toLowerCase()) {
              const value = parseInt(tx.value, 16) / Math.pow(10, 18);
              callback({
                hash: tx.hash,
                value: value,
                from: tx.from,
                to: tx.to,
                chainId: chainId,
                chainName: SUPPORTED_CHAINS.find(c => c.id === chainId)?.name
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error in QuickNode subscription polling:`, error);
      }
    }, 15000); // Poll every 15 seconds

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
      // Try to get the latest block number from Ethereum mainnet
      const endpoint = this.getEndpointUrl(1);
      
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      });

      return !response.data.error;
    } catch (error) {
      console.error('QuickNode provider health check failed:', error);
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
   * Get QuickNode endpoint URL for a specific chain
   */
  private getEndpointUrl(chainId: number): string {
    // QuickNode uses different endpoints for different chains
    // This is a simplified implementation - in practice, you'd have separate endpoints
    const networkMap: {[key: number]: string} = {
      1: 'ethereum-mainnet',
      8453: 'base-mainnet',
      42161: 'arbitrum-mainnet',
      10: 'optimism-mainnet',
      137: 'polygon-mainnet',
      11155111: 'ethereum-sepolia'
    };
    
    const network = networkMap[chainId];
    if (!network) {
      throw new Error(`Chain ${chainId} not supported by QuickNode`);
    }
    
    return `https://${network}.quiknode.pro/${this.apiKey}/`;
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