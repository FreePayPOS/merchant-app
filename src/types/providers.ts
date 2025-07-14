/**
 * Transaction interface for blockchain operations
 */
export interface Transaction {
  hash: string;
  value: number;
  from: string;
  to: string;
  chainId?: number;
  chainName?: string;
  tokenSymbol?: string;
  tokenAddress?: string;
  decimals?: number;
}

/**
 * Base interface for all blockchain providers
 */
export interface BlockchainProvider {
  readonly name: string;
  readonly type: string;
  
  // Core blockchain operations
  getBalance(address: string, chainId: number): Promise<string>;
  getTransaction(hash: string, chainId: number): Promise<Transaction | null>;
  getTransactionReceipt(hash: string, chainId: number): Promise<any>;
  
  // WebSocket/Real-time operations
  subscribeToAddress(address: string, chainId: number, callback: (tx: Transaction) => void): Promise<string>;
  unsubscribe(subscriptionId: string): Promise<void>;
  
  // Health and status
  isHealthy(): Promise<boolean>;
  getRateLimit(): Promise<{ remaining: number; reset: number }>;
  
  // Provider-specific methods
  getSupportedChains(): number[];
  getExplorerUrl(chainId: number): string;
}

/**
 * Interface for price data providers
 */
export interface PriceProvider {
  readonly name: string;
  readonly type: string;
  
  // Price fetching
  getTokenPrice(symbol: string): Promise<number>;
  getTokenPrices(symbols: string[]): Promise<{[symbol: string]: number}>;
  getNativeTokenPrice(chainId: number): Promise<number>;
  
  // Health and status
  isHealthy(): Promise<boolean>;
  getRateLimit(): Promise<{ remaining: number; reset: number }>;
  
  // Provider-specific methods
  getSupportedTokens(): string[];
}

/**
 * Interface for transaction explorer providers
 */
export interface ExplorerProvider {
  readonly name: string;
  readonly type: string;
  
  // Explorer operations
  getTransactionUrl(txHash: string, chainId: number): string;
  getAddressUrl(address: string, chainId: number): string;
  getBlockUrl(blockNumber: number, chainId: number): string;
  
  // Health and status
  isHealthy(): Promise<boolean>;
  
  // Provider-specific methods
  getSupportedChains(): number[];
}

/**
 * Provider configuration interface
 */
export interface ProviderConfig {
  type: string;
  name: string;
  apiKey: string;
  baseUrl?: string;
  rateLimit?: {
    requests: number;
    window: number; // in seconds
  };
  priority?: number; // for fallback order (lower = higher priority)
  enabled?: boolean;
  chainIds?: number[]; // specific chains this provider supports
}

/**
 * Multi-provider configuration
 */
export interface MultiProviderConfig {
  blockchain: ProviderConfig[];
  price: ProviderConfig[];
  explorer: ProviderConfig[];
  fallbackEnabled: boolean;
  healthCheckInterval: number; // in seconds
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: string;
  type: string;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
  responseTime?: number;
  rateLimitRemaining?: number;
}

/**
 * Provider factory interface
 */
export interface ProviderFactory {
  createBlockchainProvider(config: ProviderConfig): BlockchainProvider;
  createPriceProvider(config: ProviderConfig): PriceProvider;
  createExplorerProvider(config: ProviderConfig): ExplorerProvider;
}

/**
 * Provider manager interface for handling multiple providers
 */
export interface ProviderManager {
  getBlockchainProvider(chainId: number): BlockchainProvider;
  getPriceProvider(): PriceProvider;
  getExplorerProvider(chainId: number): ExplorerProvider;
  
  // Health monitoring
  getProviderHealth(): ProviderHealth[];
  refreshProviderHealth(): Promise<void>;
  
  // Configuration
  updateProviderConfig(config: MultiProviderConfig): Promise<void>;
  getProviderConfig(): MultiProviderConfig;
}

/**
 * Supported provider types
 */
export const BLOCKCHAIN_PROVIDER_TYPES = {
  ALCHEMY: 'alchemy',
  INFURA: 'infura',
  QUICKNODE: 'quicknode',
  MORALIS: 'moralis',
  ANKR: 'ankr',
  GETBLOCK: 'getblock',
  AXOL: 'axol'
} as const;

export const PRICE_PROVIDER_TYPES = {
  COINGECKO: 'coingecko',
  COINMARKETCAP: 'coinmarketcap',
  BINANCE: 'binance',
  KRAKEN: 'kraken',
  ONECHINCH: '1inch',
  ALCHEMY: 'alchemy',
  AXOL: 'axol'
} as const;

export const EXPLORER_PROVIDER_TYPES = {
  ETHERSCAN: 'etherscan',
  BLOCKSCOUT: 'blockscout',
  ARBISCAN: 'arbiscan',
  POLYGONSCAN: 'polygonscan',
  BASESCAN: 'basescan',
  OPTIMISTIC_ETHERSCAN: 'optimistic-etherscan',
  AXOL: 'axol'
} as const;

export type BlockchainProviderType = typeof BLOCKCHAIN_PROVIDER_TYPES[keyof typeof BLOCKCHAIN_PROVIDER_TYPES];
export type PriceProviderType = typeof PRICE_PROVIDER_TYPES[keyof typeof PRICE_PROVIDER_TYPES];
export type ExplorerProviderType = typeof EXPLORER_PROVIDER_TYPES[keyof typeof EXPLORER_PROVIDER_TYPES]; 