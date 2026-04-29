// Token configurations for supported stablecoins across different chains
export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}

export interface ChainTokens {
  [chainId: number]: TokenConfig[];
}

// Stablecoin configurations organized by chain ID
export const SUPPORTED_TOKENS: ChainTokens = {
  // Ethereum Mainnet
  1: [
    { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', symbol: 'USDC', decimals: 6 },
    { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', symbol: 'USDT', decimals: 6 },
    { address: '0x6b175474e89094c44da98b954eedeac495271d0f', symbol: 'DAI', decimals: 18 },
  ],
  // Arbitrum
  42161: [
    { address: '0xaf88d065e77c8cc2239327c5edb3a432268e5831', symbol: 'USDC', decimals: 6 },
    { address: '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9', symbol: 'USDT', decimals: 6 },
    { address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', symbol: 'DAI', decimals: 18 },
  ],
  // Optimism
  10: [
    { address: '0x0b2c639c533813f4aa9d7837caf62653d097ff85', symbol: 'USDC', decimals: 6 },
    { address: '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58', symbol: 'USDT', decimals: 6 },
    { address: '0xda10009cbd5d07dd0cecc66161fc93d7c9000da1', symbol: 'DAI', decimals: 18 },
  ],
  // Base
  8453: [
    { address: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913', symbol: 'USDC', decimals: 6 },
    { address: '0xfde4c96c8593536e31f229ea8f37b2ada2699bb2', symbol: 'USDT', decimals: 6 },
    { address: '0x50c5725949a6f0c72e6c4a641f24049a917db0cb', symbol: 'DAI', decimals: 18 },
  ],
  // Polygon
  137: [
    { address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', symbol: 'USDC', decimals: 6 },
    { address: '0xc2132d05d31c914a87c6611c10748aeb04b58e8f', symbol: 'USDT', decimals: 6 },
    { address: '0x8f3cf7ad23cd3cadbd9735aff958023239c6a063', symbol: 'DAI', decimals: 18 },
  ],
  // BNB Chain
  56: [
    { address: '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d', symbol: 'USDC', decimals: 18 }, // Note: BNB USDC uses 18 decimals
    { address: '0x55d398326f99059ff775485246999027b3197955', symbol: 'USDT', decimals: 18 }, // Note: BNB USDT uses 18 decimals
    { address: '0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3', symbol: 'DAI', decimals: 18 },
  ],
  // Avalanche
  43114: [
    { address: '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', symbol: 'USDC', decimals: 6 },
    { address: '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', symbol: 'USDT', decimals: 6 },
    { address: '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', symbol: 'DAI', decimals: 18 },
  ],
  // Gnosis
  100: [
    { address: '0xddafbb505ad214d7b80b1f830fccc89b60fb7a83', symbol: 'USDC', decimals: 6 },
    { address: '0x4ecaba5870353805a9f068101a40e0f32ed605c6', symbol: 'USDT', decimals: 6 },
    { address: '0xe91d153e0b41518a2ce8dd3d7944fa863463a97d', symbol: 'WXDAI', decimals: 18 }, // Wrapped xDAI as DAI equivalent
  ],
  // Celo
  42220: [
    { address: '0xceba9300f2b948710d2653dd7b07f33a8b32118c', symbol: 'USDC', decimals: 6 },
    { address: '0x88eec49252c8cbc039dcdb394c0c2ba2f1637ea0', symbol: 'USDT', decimals: 6 },
    { address: '0x90ca507a5d4458a4c6c6249d186b6dcb02a5bccd', symbol: 'DAI', decimals: 18 },
  ],
  // zkSync Era
  324: [
    { address: '0x3355df6d4c9c3035724fd0e3914de96a5a83aaf4', symbol: 'USDC', decimals: 6 },
    { address: '0x493257fd37edb34451f62edf8d2a0c418852ba4c', symbol: 'USDT', decimals: 6 },
    // DAI not widely available on zkSync Era yet
  ],
  // Add more chains as needed
};

// Create a flattened lookup map for quick token info access
export const TOKEN_LOOKUP = Object.entries(SUPPORTED_TOKENS).reduce((acc, [chainId, tokens]) => {
  tokens.forEach((token: TokenConfig) => {
    const key = `${chainId}-${token.address.toLowerCase()}`;
    acc[key] = token;
  });
  return acc;
}, {} as Record<string, TokenConfig>);

// Helper function to get token info
export function getTokenInfo(chainId: number, tokenAddress: string): TokenConfig | undefined {
  const key = `${chainId}-${tokenAddress.toLowerCase()}`;
  return TOKEN_LOOKUP[key];
}

// Helper function to get supported token addresses for a chain
export function getSupportedTokenAddresses(chainId: number): string[] {
  const tokens = SUPPORTED_TOKENS[chainId];
  return tokens ? tokens.map(t => t.address) : [];
}

// Helper function to check if a token is supported
export function isTokenSupported(chainId: number, tokenAddress: string): boolean {
  return !!getTokenInfo(chainId, tokenAddress);
}