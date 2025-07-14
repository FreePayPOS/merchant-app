import dotenv from 'dotenv';
dotenv.config();

export const AID = 'F043525950544F'; // must match the AID in your Android app

// Recipient address for payments (replace with your actual receiving address)
export const RECIPIENT_ADDRESS = '0xaD66946538E4B03B1910DadE713feBb8B59Cff60';

// Processing configuration
export const COOLDOWN_DURATION = 30000; // 30 seconds cooldown after processing
// export const TARGET_USD = 10; // $10 target payment - This will now be dynamic

// API configuration
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY || 'YOUR_API_KEY';
export const INFURA_API_KEY = process.env.INFURA_API_KEY || '';
export const AXOL_API_KEY = process.env.AXOL_API_KEY || '';

// Multi-chain Alchemy configuration
export interface ChainConfig {
  id: number;
  name: string;
  displayName: string;
  alchemyNetwork: string;
  alchemyUrl: string;
  nativeToken: {
    symbol: string;
    name: string;
    decimals: number;
  };
  coingeckoId: string;
}

export const SUPPORTED_CHAINS: ChainConfig[] = [
  {
    id: 1,
    name: 'ethereum',
    displayName: 'Ethereum',
    alchemyNetwork: 'eth-mainnet',
    alchemyUrl: `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum'
  },
  {
    id: 8453,
    name: 'base',
    displayName: 'Base',
    alchemyNetwork: 'base-mainnet',
    alchemyUrl: `https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum'
  },
  {
    id: 42161,
    name: 'arbitrum',
    displayName: 'Arbitrum One',
    alchemyNetwork: 'arb-mainnet',
    alchemyUrl: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum'
  },
  {
    id: 10,
    name: 'optimism',
    displayName: 'Optimism',
    alchemyNetwork: 'opt-mainnet',
    alchemyUrl: `https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum'
  },
  {
    id: 137,
    name: 'polygon',
    displayName: 'Polygon',
    alchemyNetwork: 'polygon-mainnet',
    alchemyUrl: `https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'MATIC',
      name: 'Polygon',
      decimals: 18
    },
    coingeckoId: 'matic-network'
  },
  {
    id: 393402133025423,
    name: 'starknet',
    displayName: 'Starknet',
    alchemyNetwork: 'starknet-mainnet',
    alchemyUrl: `https://starknet-mainnet.g.alchemy.com/starknet/version/rpc/v0_6/${ALCHEMY_API_KEY}`,
    nativeToken: {
      symbol: 'ETH',
      name: 'Ethereum',
      decimals: 18
    },
    coingeckoId: 'ethereum'
  }
];

// Legacy single-chain config (deprecated - use SUPPORTED_CHAINS)
export const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Alchemy Prices API base URL
export const ALCHEMY_PRICES_API_BASE_URL = 'https://api.g.alchemy.com/prices/v1';

export const config = {
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY || '',
    INFURA_API_KEY: process.env.INFURA_API_KEY || '',
    AXOL_API_KEY: process.env.AXOL_API_KEY || '',
    // ... other existing config values ...
}; 