import { Network } from 'alchemy-sdk';
import dotenv from 'dotenv';
dotenv.config();  

// Multi-chain Alchemy configuration
export interface ChainConfig {
  id: number;
  name: string;
  displayName: string;
  alchemyNetwork: string;
  alchemyUrl: string;
  wsUrl: string;
  network: Network | null;
  blockExplorer: string;
  nativeToken: {
    symbol: string;
    name: string;
    decimals: number;
  };
  coingeckoId: string;
  supportsWebSocket: boolean;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    alchemyNetwork: 'eth-mainnet',
    alchemyUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.ETH_MAINNET,
    blockExplorer: 'https://eth.blockscout.com/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: true
  },
  {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    alchemyNetwork: 'base-mainnet',
    alchemyUrl: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.BASE_MAINNET,
    blockExplorer: 'https://base.blockscout.com/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: true
  },
  {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    alchemyNetwork: 'arb-mainnet',
    alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.ARB_MAINNET,
    blockExplorer: 'https://arbitrum.blockscout.com/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: true
  },
  {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    alchemyNetwork: 'opt-mainnet',
    alchemyUrl: `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.OPT_MAINNET,
    blockExplorer: 'https://optimism.blockscout.com/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: true
  },
  {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    alchemyNetwork: 'polygon-mainnet',
    alchemyUrl: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.MATIC_MAINNET,
    blockExplorer: 'https://polygon.blockscout.com/tx/',
    nativeToken: {
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18
    },
    coingeckoId: 'matic-network',
    supportsWebSocket: true
  },
  {
    id: 393402133025423,
    name: 'starknet',
    displayName: 'Starknet',
    alchemyNetwork: 'starknet-mainnet',
    alchemyUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_6/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: '',  // Starknet doesn't support WebSocket
    network: null,  // Starknet uses different API patterns
    blockExplorer: 'https://starkscan.co/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: false
  },
  {
    id: 56,
    name: 'bnb',
    displayName: 'BNB Chain',
    alchemyNetwork: 'bnb-mainnet',
    alchemyUrl: `https://bnb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://bnb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.BNB_MAINNET,
    blockExplorer: 'https://bscscan.com/tx/',
    nativeToken: {
      symbol: 'BNB',
      name: 'BNB',
      decimals: 18
    },
    coingeckoId: 'binancecoin',
    supportsWebSocket: true
  },
  {
    id: 43114,
    name: 'avalanche',
    displayName: 'Avalanche',
    alchemyNetwork: 'avax-mainnet',
    alchemyUrl: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.AVAX_MAINNET,
    blockExplorer: 'https://snowtrace.io/tx/',
    nativeToken: {
      symbol: 'AVAX',
      name: 'Avalanche',
      decimals: 18
    },
    coingeckoId: 'avalanche-2',
    supportsWebSocket: true
  },
  {
    id: 100,
    name: 'gnosis',
    displayName: 'Gnosis',
    alchemyNetwork: 'gnosis-mainnet',
    alchemyUrl: `https://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://gnosis-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.GNOSIS_MAINNET,
    blockExplorer: 'https://gnosisscan.io/tx/',
    nativeToken: {
      symbol: 'xDAI',
      name: 'xDai',
      decimals: 18
    },
    coingeckoId: 'xdai',
    supportsWebSocket: true
  },
  {
    id: 42220,
    name: 'celo',
    displayName: 'Celo',
    alchemyNetwork: 'celo-mainnet',
    alchemyUrl: `https://celo-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://celo-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.CELO_MAINNET,
    blockExplorer: 'https://celoscan.io/tx/',
    nativeToken: {
      symbol: 'CELO',
      name: 'Celo',
      decimals: 18
    },
    coingeckoId: 'celo',
    supportsWebSocket: true
  },
  {
    id: 324,
    name: 'zksync',
    displayName: 'zkSync Era',
    alchemyNetwork: 'zksync-mainnet',
    alchemyUrl: `https://zksync-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    wsUrl: `wss://zksync-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    network: Network.ZKSYNC_MAINNET,
    blockExplorer: 'https://explorer.zksync.io/tx/',
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum',
    supportsWebSocket: true
  }
];

// Create lookup maps for quick access
export const CHAIN_CONFIG_BY_ID = new Map<number, ChainConfig>(
  SUPPORTED_CHAINS.map(chain => [chain.id, chain])
);

export const CHAIN_CONFIG_BY_NAME = new Map<string, ChainConfig>(
  SUPPORTED_CHAINS.map(chain => [chain.name, chain])
);

// Helper functions to get chain configuration
export function getChainById(chainId: number): ChainConfig | undefined {
  return CHAIN_CONFIG_BY_ID.get(chainId);
}

export function getChainByName(chainName: string): ChainConfig | undefined {
  return CHAIN_CONFIG_BY_NAME.get(chainName);
}

export function getBlockExplorerUrl(chainId: number, txHash: string): string {
  const chain = getChainById(chainId);
  return chain ? `${chain.blockExplorer}${txHash}` : `https://eth.blockscout.com/tx/${txHash}`;
}

export function getAlchemyNetwork(chainId: number): Network | null {
  const chain = getChainById(chainId);
  return chain?.network || null;
}

export function getWebSocketUrl(chainId: number): string | null {
  const chain = getChainById(chainId);
  if (!chain || !chain.supportsWebSocket) return null;
  return chain.wsUrl;
}