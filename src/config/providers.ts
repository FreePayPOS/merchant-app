import { MultiProviderConfig } from '../types/providers';
import { BLOCKCHAIN_PROVIDER_TYPES, PRICE_PROVIDER_TYPES, EXPLORER_PROVIDER_TYPES } from '../types/providers';

/**
 * Get provider configuration from environment variables
 */
export function getProviderConfig(): MultiProviderConfig {
  const config: MultiProviderConfig = {
    blockchain: [
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY,
        name: 'Alchemy (Default)',
        apiKey: process.env.ALCHEMY_API_KEY || '',
        priority: 1,
        enabled: true
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.AXOL,
        name: 'Axol (Supports Devs)',
        apiKey: process.env.AXOL_API_KEY || '',
        baseUrl: 'https://api.axol.io',
        priority: 2,
        enabled: !!process.env.AXOL_API_KEY
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.INFURA,
        name: 'Infura (Fallback)',
        apiKey: process.env.INFURA_API_KEY || '',
        priority: 3,
        enabled: !!process.env.INFURA_API_KEY
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE,
        name: 'QuickNode (Fallback)',
        apiKey: process.env.QUICKNODE_API_KEY || '',
        priority: 4,
        enabled: !!process.env.QUICKNODE_API_KEY
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.MORALIS,
        name: 'Moralis (Fallback)',
        apiKey: process.env.MORALIS_API_KEY || '',
        priority: 5,
        enabled: !!process.env.MORALIS_API_KEY
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.ANKR,
        name: 'Ankr (Fallback)',
        apiKey: process.env.ANKR_API_KEY || '',
        priority: 6,
        enabled: !!process.env.ANKR_API_KEY
      },
      {
        type: BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK,
        name: 'GetBlock (Fallback)',
        apiKey: process.env.GETBLOCK_API_KEY || '',
        priority: 7,
        enabled: !!process.env.GETBLOCK_API_KEY
      }
    ],
    price: [
      {
        type: PRICE_PROVIDER_TYPES.COINGECKO,
        name: 'CoinGecko (Default) - Free',
        apiKey: '', // CoinGecko free tier doesn't require API key
        priority: 1,
        enabled: true
      },
      {
        type: PRICE_PROVIDER_TYPES.AXOL,
        name: 'Axol (Supports Devs) - Paid',
        apiKey: process.env.AXOL_API_KEY || '',
        baseUrl: 'https://api.axol.io',
        priority: 2,
        enabled: !!process.env.AXOL_API_KEY
      },
      {
        type: PRICE_PROVIDER_TYPES.ALCHEMY,
        name: 'Alchemy (Paid)',
        apiKey: process.env.ALCHEMY_API_KEY || '',
        priority: 3,
        enabled: !!process.env.ALCHEMY_API_KEY
      },
      {
        type: PRICE_PROVIDER_TYPES.COINMARKETCAP,
        name: 'CoinMarketCap (Paid)',
        apiKey: process.env.COINMARKETCAP_API_KEY || '',
        priority: 4,
        enabled: !!process.env.COINMARKETCAP_API_KEY
      },
      {
        type: PRICE_PROVIDER_TYPES.BINANCE,
        name: 'Binance (Paid)',
        apiKey: process.env.BINANCE_API_KEY || '',
        priority: 5,
        enabled: !!process.env.BINANCE_API_KEY
      },
      {
        type: PRICE_PROVIDER_TYPES.KRAKEN,
        name: 'Kraken (Paid)',
        apiKey: process.env.KRAKEN_API_KEY || '',
        priority: 6,
        enabled: !!process.env.KRAKEN_API_KEY
      },
      {
        type: PRICE_PROVIDER_TYPES.ONECHINCH,
        name: '1inch (Paid)',
        apiKey: process.env.ONECHINCH_API_KEY || '',
        priority: 7,
        enabled: !!process.env.ONECHINCH_API_KEY
      }
    ],
    explorer: [
      {
        type: EXPLORER_PROVIDER_TYPES.ETHERSCAN,
        name: 'Etherscan (Free)',
        apiKey: process.env.ETHERSCAN_API_KEY || '',
        priority: 1,
        enabled: !!process.env.ETHERSCAN_API_KEY
      },
      {
        type: EXPLORER_PROVIDER_TYPES.AXOL,
        name: 'Axol (Supports Devs) - Paid',
        apiKey: process.env.AXOL_API_KEY || '',
        baseUrl: 'https://api.axol.io',
        priority: 2,
        enabled: !!process.env.AXOL_API_KEY
      },
      {
        type: EXPLORER_PROVIDER_TYPES.BLOCKSCOUT,
        name: 'Blockscout (Free)',
        apiKey: '',
        priority: 3,
        enabled: !!process.env.BLOCKSCOUT_ENABLED
      },
      {
        type: EXPLORER_PROVIDER_TYPES.ARBISCAN,
        name: 'Arbiscan (Paid)',
        apiKey: process.env.ARBISCAN_API_KEY || '',
        priority: 4,
        enabled: !!process.env.ARBISCAN_API_KEY
      },
      {
        type: EXPLORER_PROVIDER_TYPES.POLYGONSCAN,
        name: 'Polygonscan (Paid)',
        apiKey: process.env.POLYGONSCAN_API_KEY || '',
        priority: 5,
        enabled: !!process.env.POLYGONSCAN_API_KEY
      },
      {
        type: EXPLORER_PROVIDER_TYPES.BASESCAN,
        name: 'Basescan (Paid)',
        apiKey: process.env.BASESCAN_API_KEY || '',
        priority: 6,
        enabled: !!process.env.BASESCAN_API_KEY
      },
      {
        type: EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN,
        name: 'Optimistic Etherscan (Paid)',
        apiKey: process.env.OPTIMISTIC_ETHERSCAN_API_KEY || '',
        priority: 7,
        enabled: !!process.env.OPTIMISTIC_ETHERSCAN_API_KEY
      }
    ],
    fallbackEnabled: true,
    healthCheckInterval: 60 // Check health every 60 seconds
  };

  return config;
}

/**
 * Validate provider configuration
 */
export function validateProviderConfig(config: MultiProviderConfig): string[] {
  const errors: string[] = [];

  // Check if at least one blockchain provider is enabled
  const enabledBlockchainProviders = config.blockchain.filter(p => p.enabled);
  if (enabledBlockchainProviders.length === 0) {
    errors.push('At least one blockchain provider must be enabled');
  }

  // Check if at least one price provider is enabled
  const enabledPriceProviders = config.price.filter(p => p.enabled);
  if (enabledPriceProviders.length === 0) {
    errors.push('At least one price provider must be enabled');
  }

  // Check if at least one explorer provider is enabled
  const enabledExplorerProviders = config.explorer.filter(p => p.enabled);
  if (enabledExplorerProviders.length === 0) {
    errors.push('At least one explorer provider must be enabled');
  }

  // Validate API keys for enabled providers
  enabledBlockchainProviders.forEach(provider => {
    // All blockchain providers require API keys
    if (!provider.apiKey) {
      errors.push(`API key required for ${provider.name} (${provider.type})`);
    }
  });

  enabledPriceProviders.forEach(provider => {
    // Only CoinGecko doesn't require an API key
    if (!provider.apiKey && provider.type !== PRICE_PROVIDER_TYPES.COINGECKO) {
      errors.push(`API key required for ${provider.name} (${provider.type})`);
    }
  });

  enabledExplorerProviders.forEach(provider => {
    // Only Blockscout doesn't require an API key
    if (!provider.apiKey && provider.type !== EXPLORER_PROVIDER_TYPES.BLOCKSCOUT) {
      errors.push(`API key required for ${provider.name} (${provider.type})`);
    }
  });

  return errors;
} 