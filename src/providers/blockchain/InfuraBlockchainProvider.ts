import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers';
import axios, { AxiosInstance } from 'axios';

/**
 * Infura Blockchain Provider
 * Uses Infura API for blockchain operations
 */
export class InfuraBlockchainProvider implements BlockchainProvider {
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
    this.baseUrl = config.baseUrl || 'https://mainnet.infura.io';
    this.rateLimitWindow = config.rateLimit?.window || 60; // 60 seconds default
    this.rateLimitRequests = config.rateLimit?.requests || 100; // 100 requests per window default

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
      const network = this.getNetworkName(chainId);
      const url = `https://${network}.infura.io/v3/${this.apiKey}`;
      
      const response = await axios.post(url, {
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
      const network = this.getNetworkName(chainId);
      const url = `https://${network}.infura.io/v3/${this.apiKey}`;
      
      const response = await axios.post(url, {
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
        chainId: chainId
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
      const network = this.getNetworkName(chainId);
      const url = `https://${network}.infura.io/v3/${this.apiKey}`;
      
      const response = await axios.post(url, {
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
    const subscriptionId = `infura_${chainId}_${address}_${Date.now()}`;
    
    // Start polling for new transactions
    const pollInterval = setInterval(async () => {
      try {
        // Get latest block number first
        const network = this.getNetworkName(chainId);
        const url = `https://${network}.infura.io/v3/${this.apiKey}`;
        
        const blockResponse = await axios.post(url, {
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
        const blockResponse2 = await axios.post(url, {
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
                chainId: chainId
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error polling transactions from ${this.name}:`, error);
      }
    }, 10000); // Poll every 10 seconds

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
      const url = `https://mainnet.infura.io/v3/${this.apiKey}`;
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }, { timeout: 5000 });

      return !response.data.error;
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
   * Get network name for Infura URL
   */
  private getNetworkName(chainId: number): string {
    const networks: { [key: number]: string } = {
      1: 'mainnet',
      137: 'polygon-mainnet',
      10: 'optimism-mainnet',
      42161: 'arbitrum-mainnet',
      8453: 'base-mainnet',
      11155111: 'sepolia'
    };
    
    return networks[chainId] || 'mainnet';
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