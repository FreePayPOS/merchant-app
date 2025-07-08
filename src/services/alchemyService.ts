import { SUPPORTED_CHAINS, ChainConfig } from '../config/index.js';
import { TokenWithPrice, AlchemyTokenBalance, AlchemyTokenMetadata, MultiChainPortfolio, ChainBalances } from '../types/index.js';
import { PriceService } from './priceService.js';
import { Alchemy, Network, TransactionReceipt, TransactionResponse, AlchemySubscription, AlchemyMinedTransactionsAddress, AssetTransfersCategory } from 'alchemy-sdk';
import { config } from '../config/index.js';

interface Transaction {
    hash: string;
    value: number;
    from: string;
    to: string;
}

interface MonitoringSubscription {
  alchemy: Alchemy;
  subscription: any;
  chainConfig: ChainConfig;
}

/**
 * Service for interacting with Alchemy API to fetch wallet balances across multiple chains
 * and monitor transactions in real-time using WebSocket subscriptions
 */
export class AlchemyService {
  private static alchemyInstances: Map<number, Alchemy> = new Map();
  private static isInitialized = false;
  private static activeSubscriptions: Map<string, MonitoringSubscription> = new Map();

  /**
   * Initialize Alchemy instances for all supported chains
   */
  static initialize() {
    if (this.isInitialized) return;

    if (!config.ALCHEMY_API_KEY) {
      throw new Error('ALCHEMY_API_KEY is not set in environment variables');
    }

    try {
      // Initialize Alchemy instances for all supported chains
      SUPPORTED_CHAINS.forEach(chain => {
        const networkMapping = this.getAlchemyNetwork(chain.id);
        if (networkMapping) {
          const alchemy = new Alchemy({
            apiKey: config.ALCHEMY_API_KEY,
            network: networkMapping,
          });
          this.alchemyInstances.set(chain.id, alchemy);
          console.log(`✅ Alchemy instance initialized for ${chain.displayName}`);
        } else {
          console.warn(`⚠️ No Alchemy network mapping found for ${chain.displayName} (Chain ID: ${chain.id})`);
        }
      });

      this.isInitialized = true;
      console.log(`✅ AlchemyService initialized with ${this.alchemyInstances.size} chains`);
    } catch (error) {
      console.error('❌ Failed to initialize AlchemyService:', error);
      throw error;
    }
  }

  /**
   * Generate block explorer URL for a transaction hash on the given chain
   */
  private static getBlockExplorerUrl(chainId: number, txHash: string): string {
    const explorerMap: {[key: number]: string} = {
      1: 'https://eth.blockscout.com/tx/',                 // Ethereum
      8453: 'https://base.blockscout.com/tx/',             // Base  
      42161: 'https://arbitrum.blockscout.com/tx/',        // Arbitrum
      10: 'https://optimism.blockscout.com/tx/',           // Optimism
      137: 'https://polygon.blockscout.com/tx/',           // Polygon
      393402133025423: 'https://starkscan.co/tx/'          // Starknet
    };
    
    const baseUrl = explorerMap[chainId];
    return baseUrl ? `${baseUrl}${txHash}` : `https://eth.blockscout.com/tx/${txHash}`;
  }

  /**
   * Map chain IDs to Alchemy Network enums
   */
  private static getAlchemyNetwork(chainId: number): Network | null {
    const networkMap: {[key: number]: Network} = {
      1: Network.ETH_MAINNET,        // Ethereum
      8453: Network.BASE_MAINNET,    // Base
      42161: Network.ARB_MAINNET,    // Arbitrum
      10: Network.OPT_MAINNET,       // Optimism
      137: Network.MATIC_MAINNET     // Polygon
      // Note: Starknet (393402133025423) uses different API patterns and doesn't support WebSocket subscriptions
    };
    
    return networkMap[chainId] || null;
  }

  /**
   * Get chain configuration by chain ID
   */
  private static getChainConfig(chainId: number): ChainConfig | null {
    return SUPPORTED_CHAINS.find(chain => chain.id === chainId) || null;
  }

  static isEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Fetch all balances across all supported chains in parallel
   */
  static async fetchMultiChainBalances(address: string): Promise<MultiChainPortfolio> {
    const startTime = Date.now();
    console.log(`⏱️ [PROFILE] Starting fetchMultiChainBalances for ${address}`);
    
    if (!this.isInitialized) this.initialize();

    try {
      console.log(`\n🔄 Fetching balances for ${address} across ${SUPPORTED_CHAINS.length} chains...`);

      // Fetch balances for all chains in parallel
      const chainBalancePromises = SUPPORTED_CHAINS.map(chain => 
        this.fetchChainBalances(address, chain)
      );

      const chainBalances = await Promise.all(chainBalancePromises);
      const fetchTime = Date.now() - startTime;
      console.log(`⏱️ [PROFILE] Chain balance fetching completed in ${fetchTime}ms`);

      // Aggregate results
      const portfolio: MultiChainPortfolio = {
        address,
        chains: chainBalances,
        totalValueUSD: chainBalances.reduce((sum, chain) => sum + chain.totalValueUSD, 0),
        allTokens: chainBalances.flatMap(chain => chain.tokens)
      };

      // Display summary
      this.displayPortfolioSummary(portfolio);

      const totalTime = Date.now() - startTime;
      console.log(`⏱️ [PROFILE] fetchMultiChainBalances completed in ${totalTime}ms`);

      return portfolio;

    } catch (error) {
      console.error('Error fetching multi-chain balances:', error);
      return {
        address,
        chains: [],
        totalValueUSD: 0,
        allTokens: []
      };
    }
  }

  /**
   * Fetch balances for a single chain
   */
  private static async fetchChainBalances(address: string, chain: ChainConfig): Promise<ChainBalances> {
    const startTime = Date.now();
    
    try {
      console.log(`⛓️  Fetching ${chain.displayName} balances...`);

      // Fetch native token and ERC-20 token balances in parallel
      const [nativeBalance, tokenBalances] = await Promise.all([
        this.fetchNativeBalance(address, chain),
        this.fetchTokenBalances(address, chain)
      ]);

      const tokens: TokenWithPrice[] = [];

      // Add native token if has balance
      if (nativeBalance && nativeBalance.balance > 0) {
        tokens.push(nativeBalance);
      }

      // Add ERC-20 tokens
      tokens.push(...tokenBalances);

      const totalValueUSD = tokens.reduce((sum, token) => sum + token.valueUSD, 0);

      const duration = Date.now() - startTime;
      console.log(`✅ ${chain.displayName}: ${tokens.length} tokens, $${totalValueUSD.toFixed(2)} (${duration}ms)`);

      return {
        chainId: chain.id,
        chainName: chain.name,
        chainDisplayName: chain.displayName,
        tokens,
        totalValueUSD
      };

    } catch (error) {
      console.error(`Error fetching ${chain.displayName} balances:`, error);
      return {
        chainId: chain.id,
        chainName: chain.name,
        chainDisplayName: chain.displayName,
        tokens: [],
        totalValueUSD: 0
      };
    }
  }

  /**
   * Fetch native token balance for a chain
   */
  private static async fetchNativeBalance(address: string, chain: ChainConfig): Promise<TokenWithPrice | null> {
    try {
      const response = await fetch(chain.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getBalance',
          params: [address, 'latest']
        })
      });

      if (!response.ok) return null;

      const data = await response.json() as any;
      if (!data.result) return null;

      const balance = parseInt(data.result, 16) / Math.pow(10, chain.nativeToken.decimals);
      if (balance <= 0) return null;

      // Get native token price
      const ethPrice = await PriceService.getEthPrice();
      const valueUSD = balance * ethPrice;

      return {
        address: '0x0000000000000000000000000000000000000000',
        symbol: chain.nativeToken.symbol,
        name: `${chain.nativeToken.name} (${chain.displayName})`,
        balance,
        decimals: chain.nativeToken.decimals,
        priceUSD: ethPrice,
        valueUSD,
        chainId: chain.id,
        chainName: chain.name,
        chainDisplayName: chain.displayName,
        isNativeToken: true
      };

    } catch (error) {
      console.error(`Error fetching ${chain.displayName} native balance:`, error);
      return null;
    }
  }

  /**
   * Fetch ERC-20 token balances for a chain
   */
  private static async fetchTokenBalances(address: string, chain: ChainConfig): Promise<TokenWithPrice[]> {
    try {
      const response = await fetch(chain.alchemyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'alchemy_getTokenBalances',
          params: [address]
        })
      });

      if (!response.ok) {
        console.log(`❌ Token balance fetch failed for ${chain.displayName}: ${response.status}`);
        return [];
      }

      const data = await response.json() as any;
      
      if (!data.result?.tokenBalances) {
        return [];
      }

      const nonZeroBalances = data.result.tokenBalances.filter((token: AlchemyTokenBalance) => {
        return token.tokenBalance && token.tokenBalance !== '0x0';
      });

      if (nonZeroBalances.length === 0) {
        return [];
      }

      console.log(`✅ Found ${nonZeroBalances.length} tokens on ${chain.displayName}`);
      return await this.processTokenBalances(nonZeroBalances, chain);

    } catch (error) {
      console.error(`❌ Error fetching ${chain.displayName} token balances:`, error);
      return [];
    }
  }

  /**
   * Process token balances with metadata and prices
   */
  private static async processTokenBalances(nonZeroBalances: AlchemyTokenBalance[], chain: ChainConfig): Promise<TokenWithPrice[]> {
    try {
      const tokenAddresses = nonZeroBalances.map((token) => token.contractAddress);
      
      // Fetch prices first
      const tokenPrices = await PriceService.getTokenPricesForChain(tokenAddresses, chain.name);
      
      // Fetch metadata for each token individually (alchemy_getTokenMetadata doesn't support batching)
      const metadataPromises = tokenAddresses.map(async (address, index) => {
        try {
          const response = await fetch(chain.alchemyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: index + 10,
              method: 'alchemy_getTokenMetadata',
              params: [address]
            })
          });
          
          if (response.ok) {
            const data = await response.json();
            return { address: address.toLowerCase(), metadata: data.result };
          } else {
            return { address: address.toLowerCase(), metadata: null };
          }
        } catch (error) {
          return { address: address.toLowerCase(), metadata: null };
        }
      });
      
      const metadataResults = await Promise.all(metadataPromises);
      
      // Create metadata lookup map
      const metadataMap: {[address: string]: any} = {};
      metadataResults.forEach(result => {
        metadataMap[result.address] = result.metadata;
      });
      
      const tokensWithPrices: TokenWithPrice[] = [];
      
      nonZeroBalances.forEach((token, index) => {
        try {
          const balance = parseInt(token.tokenBalance, 16);
          const contractAddress = token.contractAddress.toLowerCase();
          
          // Get metadata with fallback values
          const metadata = metadataMap[contractAddress];
          let decimals: number;
          let symbol: string;
          let name: string;

          if (metadata) {
            decimals = metadata.decimals || 18;
            symbol = metadata.symbol || 'UNKNOWN';
            name = metadata.name || 'Unknown Token';
          } else {
            // Fallback values when metadata is unavailable
            decimals = this.getFallbackDecimals(contractAddress, chain.id);
            symbol = this.getFallbackSymbol(contractAddress, chain.id);
            name = this.getFallbackName(contractAddress, chain.id);
          }
          
          const formattedBalance = balance / Math.pow(10, decimals);
          const priceUSD = tokenPrices[contractAddress] || 0;
          const valueUSD = formattedBalance * priceUSD;
          
          if (formattedBalance > 0) {
            const tokenWithPrice = {
              address: token.contractAddress,
              symbol,
              name: `${name} (${chain.displayName})`,
              balance: formattedBalance,
              decimals,
              priceUSD,
              valueUSD,
              chainId: chain.id,
              chainName: chain.name,
              chainDisplayName: chain.displayName,
              isNativeToken: false
            };
            
            tokensWithPrices.push(tokenWithPrice);
          }
        } catch (e) {
          console.log(`❌ Error processing token ${token.contractAddress} on ${chain.displayName}`);
        }
      });

      return tokensWithPrices;

    } catch (error) {
      console.error(`❌ Error processing ${chain.displayName} token balances:`, error);
      return [];
    }
  }

  /**
   * Get fallback decimals for known tokens when metadata service fails
   */
  private static getFallbackDecimals(contractAddress: string, chainId: number): number {
    const knownTokens: {[key: string]: {[address: string]: number}} = {
      '8453': { // Base
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 6, // USDC
        '0x4200000000000000000000000000000000000006': 18, // WETH
        '0xca72827a3d211cfd8f6b00ac98824872b72cab49': 6,  // cbETH
      },
      '42161': { // Arbitrum
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 6, // USDC
        '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 18, // WETH
      },
      '137': { // Polygon
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 18, // WMATIC
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 18, // WETH
      }
    };
    
    return knownTokens[chainId.toString()]?.[contractAddress] || 18;
  }

  /**
   * Get fallback symbol for known tokens when metadata service fails
   */
  private static getFallbackSymbol(contractAddress: string, chainId: number): string {
    const knownTokens: {[key: string]: {[address: string]: string}} = {
      '8453': { // Base
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USDC',
        '0x4200000000000000000000000000000000000006': 'WETH',
        '0xca72827a3d211cfd8f6b00ac98824872b72cab49': 'cbETH',
      },
      '42161': { // Arbitrum
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USDC',
        '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'WETH',
      },
      '137': { // Polygon
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'WMATIC',
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'WETH',
      }
    };
    
    return knownTokens[chainId.toString()]?.[contractAddress] || `TOKEN_${contractAddress.slice(0, 6)}`;
  }

  /**
   * Get fallback name for known tokens when metadata service fails
   */
  private static getFallbackName(contractAddress: string, chainId: number): string {
    const knownTokens: {[key: string]: {[address: string]: string}} = {
      '8453': { // Base
        '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913': 'USD Coin',
        '0x4200000000000000000000000000000000000006': 'Wrapped Ether',
        '0xca72827a3d211cfd8f6b00ac98824872b72cab49': 'Coinbase Wrapped Staked ETH',
      },
      '42161': { // Arbitrum
        '0xaf88d065e77c8cc2239327c5edb3a432268e5831': 'USD Coin',
        '0x82af49447d8a07e3bd95bd0d56f35241523fbab1': 'Wrapped Ether',
      },
      '137': { // Polygon
        '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270': 'Wrapped Matic',
        '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619': 'Wrapped Ether',
      }
    };
    
    return knownTokens[chainId.toString()]?.[contractAddress] || `Unknown Token`;
  }

  /**
   * Display portfolio summary
   */
  private static displayPortfolioSummary(portfolio: MultiChainPortfolio): void {
    console.log('\n=== 🌐 MULTI-CHAIN PORTFOLIO ===');
    console.log(`💼 Total Value: $${portfolio.totalValueUSD.toFixed(2)}\n`);

    portfolio.chains.forEach(chain => {
      if (chain.tokens.length > 0) {
        console.log(`⛓️  ${chain.chainDisplayName} ($${chain.totalValueUSD.toFixed(2)}):`);
        
        chain.tokens.forEach(token => {
          if (token.priceUSD > 0) {
            console.log(`  ${token.symbol}: ${token.balance.toFixed(4)} ($${token.valueUSD.toFixed(2)})`);
          } else {
            console.log(`  ${token.symbol}: ${token.balance.toFixed(4)} (Price unknown)`);
          }
        });
        console.log('');
      }
    });

    // Show tokens sorted by value
    const topTokens = portfolio.allTokens
      .filter(token => token.priceUSD > 0)
      .sort((a, b) => b.valueUSD - a.valueUSD)
      .slice(0, 10);

    if (topTokens.length > 0) {
      console.log('🏆 Top Holdings:');
      topTokens.forEach((token, index) => {
        console.log(`  ${index + 1}. ${token.symbol} (${token.chainDisplayName}): $${token.valueUSD.toFixed(2)}`);
      });
      console.log('');
    }
  }

  /**
   * Legacy single-chain method for backward compatibility
   */
  static async fetchBalances(address: string): Promise<TokenWithPrice[]> {
    const portfolio = await this.fetchMultiChainBalances(address);
    return portfolio.allTokens;
  }

  /**
   * Monitor transactions to a specific address for both ETH and ERC-20 token transfers using Alchemy's Asset Transfer API
   */
  static async monitorTransactions(
    merchantAddress: string,
    callback: (tx: Transaction & { tokenSymbol?: string, tokenAddress?: string, decimals?: number }) => void,
    chainId: number = 1,
    minimumValueWei: number = 0
  ): Promise<() => void> {
    if (!this.isInitialized) this.initialize();

    const chainConfig = this.getChainConfig(chainId);
    if (!chainConfig) {
      throw new Error(`Chain ID ${chainId} is not supported`);
    }

    const alchemy = this.alchemyInstances.get(chainId);
    if (!alchemy) {
      throw new Error(`Alchemy instance not found for chain ID ${chainId}`);
    }

    console.log(`🔍 Starting asset transfer monitoring for address: ${merchantAddress}`);
    console.log(`⛓️ Monitoring ${chainConfig.displayName} for incoming transfers`);

    let isMonitoring = true;
    let lastCheckedBlock = 0;

    // Get the latest block number to start monitoring from
    try {
      const latestBlock = await alchemy.core.getBlockNumber();
      lastCheckedBlock = latestBlock;
      console.log(`📦 Starting monitoring from block ${latestBlock}`);
    } catch (error) {
      console.error(`Error getting latest block:`, error);
    }

    // Polling function to check for new transfers
    const pollForTransfers = async () => {
      if (!isMonitoring) return;

      try {
        const currentBlock = await alchemy.core.getBlockNumber();
        
        // Use a conservative approach - stay 2 blocks behind to avoid "past head" errors
        const safeToBlock = Math.max(currentBlock - 1, lastCheckedBlock);
        
        if (safeToBlock > lastCheckedBlock) {
          // Get asset transfers to the merchant address since the last checked block
          const transfers = await alchemy.core.getAssetTransfers({
            toAddress: merchantAddress,
            fromBlock: `0x${lastCheckedBlock.toString(16)}`,
            toBlock: `0x${safeToBlock.toString(16)}`,
            category: [AssetTransfersCategory.ERC20, AssetTransfersCategory.EXTERNAL], // Monitor both ERC-20 tokens and ETH
            withMetadata: true,
            excludeZeroValue: true
          });

          for (const transfer of transfers.transfers) {
            try {
              console.log(`📡 Transfer detected on ${chainConfig.displayName}:`, {
                hash: transfer.hash,
                from: transfer.from,
                to: transfer.to,
                value: transfer.value,
                asset: transfer.asset,
                category: transfer.category,
                blockNum: transfer.blockNum
              });

              // Skip if no hash
              if (!transfer.hash) {
                continue;
              }

              // Determine token details
              let tokenSymbol = transfer.asset || chainConfig.nativeToken.symbol;
              let tokenAddress = transfer.rawContract?.address || '0x0000000000000000000000000000000000000000';
              let decimals = typeof transfer.rawContract?.decimal === 'string' 
                ? parseInt(transfer.rawContract.decimal) 
                : (transfer.rawContract?.decimal || 18);
              
              // For ETH transfers, use chain's native token info
              if (transfer.category === AssetTransfersCategory.EXTERNAL) {
                tokenSymbol = chainConfig.nativeToken.symbol;
                tokenAddress = '0x0000000000000000000000000000000000000000';
                decimals = chainConfig.nativeToken.decimals;
              }

              // Parse the transfer value
              const transferValue = parseFloat(transfer.value?.toString() || '0');
              
              if (transferValue > 0) {
                console.log(`✅ ${tokenSymbol} transfer confirmed on ${chainConfig.displayName}: ${transferValue} ${tokenSymbol}`);

                // Convert to wei/smallest unit for consistency with existing code
                const valueInSmallestUnits = Math.floor(transferValue * Math.pow(10, decimals));

                callback({
                  hash: transfer.hash,
                  value: valueInSmallestUnits,
                  from: transfer.from || '',
                  to: transfer.to || merchantAddress,
                  tokenSymbol: tokenSymbol,
                  tokenAddress: tokenAddress,
                  decimals: decimals
                });
              }
            } catch (transferError) {
              console.error(`Error processing transfer:`, transferError);
            }
          }

          lastCheckedBlock = safeToBlock;
        }
      } catch (error) {
        // Handle specific "past head" errors more gracefully
        if (error instanceof Error && error.message.includes('toBlock is past head')) {
          // This is a timing issue - just wait for the next poll cycle
          console.log(`⏳ Blockchain sync delay on ${chainConfig.displayName}, retrying next cycle...`);
        } else {
          console.error(`Error polling for transfers on ${chainConfig.displayName}:`, error);
        }
      }

      // Continue polling if still monitoring
      if (isMonitoring) {
        setTimeout(pollForTransfers, 3000); // Poll every 3 seconds
      }
    };

    // Start polling
    pollForTransfers();

    console.log(`✅ Asset transfer monitoring started for ${chainConfig.displayName}`);
    console.log('🎯 Ready to detect ETH and ERC-20 token transfers...');
    
    // Return unsubscribe function
    return () => {
      console.log(`🔌 Stopping asset transfer monitoring on ${chainConfig.displayName}`);
      isMonitoring = false;
    };
  }

  /**
   * Monitor transactions across multiple chains simultaneously
   */
  static async monitorMultiChainTransactions(
    address: string,
    callback: (tx: Transaction & { chainId: number, chainName: string }) => void,
    chainIds: number[] = SUPPORTED_CHAINS.map(c => c.id),
    minimumValueWei: number = 0
  ): Promise<() => void> {
    console.log(`🌐 Starting multi-chain monitoring for address: ${address}`);
    console.log(`⛓️ Monitoring chains: ${chainIds.map(id => {
      const chain = this.getChainConfig(id);
      return chain ? `${chain.displayName} (${id})` : `Unknown (${id})`;
    }).join(', ')}`);

    const unsubscribeFunctions: (() => void)[] = [];

    // Set up monitoring for each chain
    for (const chainId of chainIds) {
      try {
        const chainConfig = this.getChainConfig(chainId);
        if (!chainConfig) {
          console.warn(`⚠️ Skipping unsupported chain ID: ${chainId}`);
          continue;
        }

        const unsubscribe = await this.monitorTransactions(
          address,
          (tx) => {
            // Enhanced callback with chain information
            callback({
              ...tx,
              chainId,
              chainName: chainConfig.displayName
            });
          },
          chainId,
          minimumValueWei
        );

        unsubscribeFunctions.push(unsubscribe);
      } catch (error) {
        console.error(`Failed to set up monitoring for chain ${chainId}:`, error);
      }
    }

    console.log(`✅ Multi-chain monitoring active on ${unsubscribeFunctions.length} chains`);

    // Return function to unsubscribe from all chains
    return () => {
      console.log('🔌 Unsubscribing from all multi-chain monitoring');
      unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
    };
  }

  /**
   * Get all active subscriptions
   */
  static getActiveSubscriptions(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  /**
   * Cleanup all active subscriptions
   */
  static cleanup(): void {
    console.log(`🧹 Cleaning up ${this.activeSubscriptions.size} active subscriptions`);
    this.activeSubscriptions.forEach((subscription, key) => {
      if (subscription.subscription.eth) {
        subscription.subscription.eth.removeAllListeners();
      }
      if (subscription.subscription.token) {
        subscription.subscription.token.removeAllListeners();
      }
    });
    this.activeSubscriptions.clear();
  }

  /**
   * Special polling-based monitoring for Starknet since WebSockets aren't supported
   */
  private static async startStarknetPolling(
    merchantAddress: string,
    minimumValue: number,
    chainConfig: ChainConfig,
    onTransaction?: (transaction: Transaction) => void
  ): Promise<Transaction> {
    return new Promise<Transaction>((resolve, reject) => {
      console.log(`🔄 Starting Starknet polling for address: ${merchantAddress}`);
      
      const pollingInterval = setInterval(async () => {
        try {
          // Use direct HTTP API call to Starknet
          const response = await fetch(chainConfig.alchemyUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jsonrpc: '2.0',
              id: 1,
              method: 'starknet_getBlockWithTxs',
              params: ['latest']
            })
          });

          const data = await response.json();
          
          if (data.result && data.result.transactions) {
            // Check transactions for payments to our address
            for (const tx of data.result.transactions) {
              if (tx.to === merchantAddress && tx.value) {
                const valueInWei = parseInt(tx.value, 16);
                
                if (valueInWei >= minimumValue) {
                  const txHash = tx.transaction_hash || tx.hash;
                  const explorerUrl = AlchemyService.getBlockExplorerUrl(chainConfig.id, txHash);
                  
                  console.log(`✅ Starknet payment found! Value: ${valueInWei} wei`);
                  console.log(`🔗 View on block explorer: ${explorerUrl}`);
                  
                  const transaction: Transaction = {
                    hash: txHash,
                    value: valueInWei,
                    from: tx.from || tx.sender_address,
                    to: tx.to || tx.contract_address
                  };

                  clearInterval(pollingInterval);
                  if (onTransaction) {
                    onTransaction(transaction);
                  }
                  resolve(transaction);
                  return;
                }
              }
            }
          }
        } catch (error) {
          console.error('Error polling Starknet:', error);
        }
      }, 5000); // Poll every 5 seconds

      // Timeout after 5 minutes
      setTimeout(() => {
        clearInterval(pollingInterval);
        reject(new Error('Starknet polling timeout'));
      }, 300000);
    });
  }

  /**
   * Start monitoring transactions to a specific address on the given chain
   * Returns a promise that resolves when a matching transaction is found
   */
  static async startMonitoring(
    merchantAddress: string,
    minimumValue: number,
    chainId: number,
    chainName: string,
    onTransaction?: (transaction: Transaction) => void
  ): Promise<Transaction> {
    try {
      // Find the chain config
      const chainConfig = SUPPORTED_CHAINS.find(chain => chain.id === chainId);
      if (!chainConfig) {
        throw new Error(`Chain ${chainName} (ID: ${chainId}) is not supported`);
      }

      // Special handling for Starknet which doesn't support WebSocket subscriptions
      if (chainId === 393402133025423) { // Starknet chain ID
        console.log(`⚠️  Starknet monitoring will use polling instead of WebSockets (WebSocket subscriptions not available for Starknet)`);
        return AlchemyService.startStarknetPolling(merchantAddress, minimumValue, chainConfig, onTransaction);
      }

      const network = AlchemyService.getAlchemyNetwork(chainId);
      if (!network) {
        throw new Error(`Network mapping not found for chain ${chainName} (ID: ${chainId})`);
      }

      console.log(`🔗 Starting WebSocket monitoring on ${chainName} (Chain ID: ${chainId})`);
      console.log(`📡 Monitoring address: ${merchantAddress}`);
      console.log(`💰 Minimum value: ${minimumValue} wei`);

      // Create Alchemy instance for this chain
      const settings = {
        apiKey: config.ALCHEMY_API_KEY,
        network: network,
      };
      const alchemy = new Alchemy(settings);

      return new Promise<Transaction>((resolve, reject) => {
        try {
          // Subscribe to mined transactions for the specific address
          const subscription = alchemy.ws.on({
            method: AlchemySubscription.MINED_TRANSACTIONS,
            addresses: [{ to: merchantAddress }]
          }, (tx: any) => {
            try {
              const explorerUrl = AlchemyService.getBlockExplorerUrl(chainId, tx.hash);
              
              console.log(`🔍 Transaction detected on ${chainName}:`, {
                hash: tx.hash,
                from: tx.from,
                to: tx.to,
                value: tx.value,
                valueInWei: typeof tx.value === 'string' ? parseInt(tx.value, 16) : tx.value,
                minimumRequired: minimumValue
              });
              console.log(`🔗 View transaction: ${explorerUrl}`);

              const valueInWei = typeof tx.value === 'string' ? parseInt(tx.value, 16) : Number(tx.value);
              
              if (valueInWei >= minimumValue) {
                console.log(`✅ Payment received on ${chainName}! Value: ${valueInWei} wei (${valueInWei / 1e18} ${chainConfig.nativeToken.symbol})`);
                console.log(`🔗 View on block explorer: ${explorerUrl}`);
                
                const transaction: Transaction = {
                  hash: tx.hash,
                  value: valueInWei,
                  from: tx.from,
                  to: tx.to
                };

                // Store the subscription for cleanup
                const monitoringSubscription: MonitoringSubscription = {
                  alchemy,
                  subscription,
                  chainConfig
                };
                AlchemyService.activeSubscriptions.set(chainId.toString(), monitoringSubscription);

                if (onTransaction) {
                  onTransaction(transaction);
                }
                resolve(transaction);
              } else {
                console.log(`❌ Transaction value too small on ${chainName}: ${valueInWei} wei < ${minimumValue} wei required`);
              }
            } catch (error) {
              console.error(`Error processing transaction on ${chainName}:`, error);
              reject(error);
            }
          });

          // Store the subscription for cleanup
          const monitoringSubscription: MonitoringSubscription = {
            alchemy,
            subscription,
            chainConfig
          };
          AlchemyService.activeSubscriptions.set(chainId.toString(), monitoringSubscription);

          console.log(`🚀 WebSocket subscription active for ${chainName} monitoring`);

        } catch (error) {
          console.error(`Failed to set up WebSocket subscription for ${chainName}:`, error);
          reject(error);
        }
      });

    } catch (error) {
      console.error(`Error starting monitoring on ${chainName}:`, error);
      throw error;
    }
  }
} 