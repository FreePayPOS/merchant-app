import { BlockchainProvider, Transaction, ProviderConfig } from '../../types/providers.js';
import { SUPPORTED_CHAINS } from '../../config/index.js';
import axios, { AxiosInstance } from 'axios';

/**
 * GetBlock Blockchain Provider
 * Uses GetBlock API for blockchain operations
 */
export class GetBlockBlockchainProvider implements BlockchainProvider {
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
    this.baseUrl = config.baseUrl || 'https://eth.getblock.io';
    this.rateLimitWindow = config.rateLimit?.window || 60;
    this.rateLimitRequests = config.rateLimit?.requests || 100;

    if (!this.apiKey) {
      throw new Error('GetBlock API key is required');
    }

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'MerchantApp/1.0'
      }
    });

    this.httpClient.interceptors.request.use(async (config) => {
      await this.checkRateLimit();
      return config;
    });

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
      }, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

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
      }, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      if (response.data.error) {
        if (response.data.error.code === -32602) {
          return null; // Transaction not found
        }
        throw new Error(response.data.error.message);
      }

      const tx = response.data.result;
      if (!tx) return null;

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
      }, {
        headers: {
          'x-api-key': this.apiKey
        }
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
   */
  async subscribeToAddress(address: string, chainId: number, callback: (tx: Transaction) => void): Promise<string> {
    const subscriptionId = `getblock_${chainId}_${address}_${Date.now()}`;
    
    const pollInterval = setInterval(async () => {
      try {
        const endpoint = this.getEndpointUrl(chainId);
        
        const blockResponse = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        }, {
          headers: {
            'x-api-key': this.apiKey
          }
        });

        if (blockResponse.data.error) {
          throw new Error(blockResponse.data.error.message);
        }

        const latestBlock = parseInt(blockResponse.data.result, 16);
        
        const blockResponse2 = await axios.post(endpoint, {
          jsonrpc: '2.0',
          method: 'eth_getBlockByNumber',
          params: [`0x${latestBlock.toString(16)}`, true],
          id: 1
        }, {
          headers: {
            'x-api-key': this.apiKey
          }
        });

        if (blockResponse2.data.error) {
          throw new Error(blockResponse2.data.error.message);
        }

        const block = blockResponse2.data.result;
        if (block && block.transactions) {
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
        console.error(`Error in GetBlock subscription polling:`, error);
      }
    }, 25000); // Poll every 25 seconds

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
      const endpoint = this.getEndpointUrl(1);
      
      const response = await axios.post(endpoint, {
        jsonrpc: '2.0',
        method: 'eth_blockNumber',
        params: [],
        id: 1
      }, {
        headers: {
          'x-api-key': this.apiKey
        }
      });

      return !response.data.error;
    } catch (error) {
      console.error('GetBlock provider health check failed:', error);
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
   * Get GetBlock endpoint URL for a specific chain
   */
  private getEndpointUrl(chainId: number): string {
    const networkMap: {[key: number]: string} = {
      1: 'https://eth.getblock.io',
      8453: 'https://base.getblock.io',
      42161: 'https://arbitrum.getblock.io',
      10: 'https://optimism.getblock.io',
      137: 'https://polygon.getblock.io',
      11155111: 'https://eth-sepolia.getblock.io'
    };
    
    const endpoint = networkMap[chainId];
    if (!endpoint) {
      throw new Error(`Chain ${chainId} not supported by GetBlock`);
    }
    
    return endpoint;
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