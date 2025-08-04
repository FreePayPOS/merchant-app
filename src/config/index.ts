import dotenv from 'dotenv';

dotenv.config();

export const AID = 'F046524545504159'; // F0 + FREEPAY in HEX format

// Validate required environment variables
if (!process.env.MERCHANT_ADDRESS) {
  throw new Error('MERCHANT_ADDRESS environment variable is required. Please set it in your .env file.');
}

if (!process.env.ALCHEMY_API_KEY) {
  throw new Error('ALCHEMY_API_KEY environment variable is required. Please set it in your .env file.');
}

if (!process.env.LAYERSWAP_API_KEY) {
  throw new Error('LAYERSWAP_API_KEY environment variable is required. Please set it in your .env file.');
}

// Recipient address for payments - loaded from environment variable
export const MERCHANT_ADDRESS = process.env.MERCHANT_ADDRESS;

// Processing configuration
export const COOLDOWN_DURATION = 30000; // 30 seconds cooldown after processing
// export const TARGET_USD = 10; // $10 target payment - This will now be dynamic

// API configuration
export const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;
export const LAYERSWAP_API_KEY = process.env.LAYERSWAP_API_KEY;

// Parse merchant chains from environment variable
// If not set, merchant accepts all chains
export const MERCHANT_CHAINS = process.env.MERCHANT_CHAINS
  ? process.env.MERCHANT_CHAINS
      .split(',')
      .map(chain => chain.trim().toLowerCase())
  : null; // null means accept all chains

// Re-export chain configurations
export { 
  ChainConfig, 
  SUPPORTED_CHAINS, 
  CHAIN_CONFIG_BY_ID,
  CHAIN_CONFIG_BY_NAME,
  getChainById,
  getChainByName,
  getBlockExplorerUrl,
  getAlchemyNetwork,
  getWebSocketUrl
} from './chains.js';

// Legacy single-chain config (deprecated - use SUPPORTED_CHAINS)
export const ALCHEMY_BASE_URL = `https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

// Alchemy Prices API base URL
export const ALCHEMY_PRICES_API_BASE_URL = 'https://api.g.alchemy.com/prices/v1';

export const config = {
    ALCHEMY_API_KEY: process.env.ALCHEMY_API_KEY!,
    MERCHANT_ADDRESS: MERCHANT_ADDRESS,
    // ... other existing config values ...
}; 