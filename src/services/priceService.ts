import { Alchemy, Network } from 'alchemy-sdk';
import { ALCHEMY_API_KEY, SUPPORTED_CHAINS } from '../config/index.js';
import { PriceCacheService } from './priceCacheService.js';

/**
 * Service for fetching token prices from Alchemy Prices API using Alchemy SDK
 */
export class PriceService {
  private static alchemy = new Alchemy({ apiKey: ALCHEMY_API_KEY });

  /**
   * Map chain names to Alchemy Network enum values
   */
  private static getAlchemyNetwork(chainName: string): Network | null {
    const networkMap: {[key: string]: Network} = {
      'ethereum': Network.ETH_MAINNET,
      'base': Network.BASE_MAINNET,
      'arbitrum': Network.ARB_MAINNET,
      'optimism': Network.OPT_MAINNET,
      'polygon': Network.MATIC_MAINNET
    };
    
    return networkMap[chainName] || null;
  }

  /**
   * Get token prices from Alchemy for a specific chain using contract addresses
   */
  static async getTokenPricesForChain(tokenAddresses: string[], chainName: string): Promise<{[address: string]: number}> {
    const startTime = Date.now();
    
    try {
      if (tokenAddresses.length === 0) {
        return {};
      }
      
      console.log(`⏱️ [PROFILE] Starting price fetch for ${tokenAddresses.length} tokens on ${chainName}`);
      
      const chain = SUPPORTED_CHAINS.find(c => c.name === chainName);
      if (!chain) {
        console.log(`❌ No supported chain configuration for: ${chainName}`);
        return {};
      }
      
      const alchemyNetwork = this.getAlchemyNetwork(chainName);
      if (!alchemyNetwork) {
        console.log(`❌ No Alchemy network mapping for chain: ${chainName}`);
        return {};
      }
      
      // Prepare addresses with network info for Alchemy SDK
      const addressesWithNetwork = tokenAddresses.map(address => ({
        network: alchemyNetwork,
        address: address.toLowerCase()
      }));
      
      const priceData = await this.alchemy.prices.getTokenPriceByAddress(addressesWithNetwork);
      
      const prices: {[address: string]: number} = {};
      
      if (!priceData?.data) {
        return {};
      }
      
      for (let i = 0; i < priceData.data.length; i++) {
        const tokenData = priceData.data[i];
        
        if (tokenData.error || !tokenData.prices || tokenData.prices.length === 0) {
          continue;
        }
        
        const usdPrice = tokenData.prices.find((p: any) => p.currency === 'usd');
        if (!usdPrice?.value) {
          continue;
        }
        
        const priceValue = parseFloat(usdPrice.value);
        if (!isNaN(priceValue)) {
          prices[tokenData.address.toLowerCase()] = priceValue;
        }
      }
      
      const duration = Date.now() - startTime;
      console.log(`⏱️ [PROFILE] Price fetch for ${chainName} completed in ${duration}ms (${Object.keys(prices).length}/${tokenAddresses.length} prices found)`);
      
      return prices;
    } catch (error) {
      console.log(`❌ Error fetching prices for ${chainName}:`, error);
      return {};
    }
  }

  /**
   * Get token prices for multiple chains in parallel using Alchemy SDK
   */
  static async getMultiChainTokenPrices(chainTokens: {[chainName: string]: string[]}): Promise<{[chainName: string]: {[address: string]: number}}> {
    const startTime = Date.now();
    console.log(`⏱️ [PROFILE] Starting getMultiChainTokenPrices for chains:`, Object.keys(chainTokens));
    
    const pricePromises = Object.entries(chainTokens).map(async ([chainName, addresses]) => {
      console.log(`🔍 DEBUG: Processing chain ${chainName} with ${addresses.length} addresses`);
      const prices = await this.getTokenPricesForChain(addresses, chainName);
      return [chainName, prices] as [string, {[address: string]: number}];
    });

    const results = await Promise.all(pricePromises);
    
    const chainPrices: {[chainName: string]: {[address: string]: number}} = {};
    for (const [chainName, prices] of results) {
      chainPrices[chainName] = prices;
      console.log(`🔍 DEBUG: Chain ${chainName} final result: ${Object.keys(prices).length} prices`);
    }
    
    const duration = Date.now() - startTime;
    console.log(`⏱️ [PROFILE] Multi-chain price fetch completed in ${duration}ms`);
    return chainPrices;
  }

  /**
   * Get token prices from Alchemy (legacy single-chain method)
   */
  static async getTokenPrices(tokenAddresses: string[]): Promise<{[address: string]: number}> {
    console.log(`🔍 DEBUG: Legacy getTokenPrices called with ${tokenAddresses.length} addresses`);
    return this.getTokenPricesForChain(tokenAddresses, 'ethereum');
  }

  /**
   * Get ETH price using Alchemy SDK by symbol
   */
  static async getEthPrice(): Promise<number> {
    try {
      // Try to get from cache first
      const cachedPrice = PriceCacheService.getCachedEthPrice();
      
      if (cachedPrice > 0) {
        return cachedPrice;
      }

      // Fetch from Alchemy SDK by symbol
      const priceData = await this.alchemy.prices.getTokenPriceBySymbol(['ETH']);
      
      if (!priceData?.data || priceData.data.length === 0) {
        return cachedPrice;
      }
      
      const ethData = priceData.data.find((d: any) => d.symbol === 'ETH');
      if (!ethData || ethData.error || !ethData.prices || ethData.prices.length === 0) {
        return cachedPrice;
      }
      
      const usdPrice = ethData.prices.find((p: any) => p.currency === 'usd');
      if (!usdPrice?.value) {
        return cachedPrice;
      }
      
      const price = parseFloat(usdPrice.value);
      if (isNaN(price)) {
        return cachedPrice;
      }
      
      console.log(`✅ ETH price fetched: $${price.toFixed(2)}`);
      return price;
    } catch (error) {
      console.log('❌ Error fetching ETH price:', error);
      const cachedPrice = PriceCacheService.getCachedEthPrice();
      return cachedPrice;
    }
  }

  /**
   * Get native token prices for multiple chains in parallel using Alchemy SDK
   */
  static async getNativeTokenPrices(chainIds: string[]): Promise<{[chainId: string]: number}> {
    try {
      console.log(`🔍 DEBUG: Starting getNativeTokenPrices for chain IDs:`, chainIds);
      
      // Get unique native token symbols from supported chains
      const chainIdToSymbol: {[chainId: string]: string} = {};
      const uniqueSymbols = new Set<string>();
      
      for (const chainId of chainIds) {
        const chain = SUPPORTED_CHAINS.find(c => c.id.toString() === chainId);
        if (chain) {
          chainIdToSymbol[chainId] = chain.nativeToken.symbol;
          uniqueSymbols.add(chain.nativeToken.symbol);
          console.log(`🔍 DEBUG: Chain ID ${chainId} -> Symbol ${chain.nativeToken.symbol}`);
        } else {
          console.log(`❌ DEBUG: No chain found for ID ${chainId}`);
        }
      }
      
      if (uniqueSymbols.size === 0) {
        console.log('❌ DEBUG: No supported chains found for provided chain IDs');
        return {};
      }
      
      const symbolArray = Array.from(uniqueSymbols);
      console.log(`📡 DEBUG: Fetching native token prices for symbols: ${symbolArray.join(', ')}`);
      console.log(`🔍 DEBUG: API Key configured:`, ALCHEMY_API_KEY ? `Yes (${ALCHEMY_API_KEY.substring(0, 8)}...)` : 'No');
      
      // Fetch prices for all unique symbols using Alchemy SDK
      const priceData = await this.alchemy.prices.getTokenPriceBySymbol(symbolArray);
      
      console.log(`📦 DEBUG: Raw native token price response:`, JSON.stringify(priceData, null, 2));
      
      // Build symbol to price mapping
      const symbolPrices: {[symbol: string]: number} = {};
      
      if (!priceData) {
        console.log(`❌ DEBUG: No priceData received for native tokens`);
        return {};
      }
      
      if (!priceData.data) {
        console.log(`❌ DEBUG: No data field in native token priceData:`, priceData);
        return {};
      }
      
      console.log(`🔍 DEBUG: Processing ${priceData.data.length} native token responses...`);
      
      for (const tokenData of priceData.data) {
        console.log(`🔍 DEBUG: Processing native token:`, JSON.stringify(tokenData, null, 2));
        
        if (tokenData.error) {
          console.log(`❌ DEBUG: Native token ${tokenData.symbol} has error:`, tokenData.error);
          continue;
        }
        
        if (!tokenData.prices || tokenData.prices.length === 0) {
          console.log(`❌ DEBUG: Native token ${tokenData.symbol} has no prices`);
          continue;
        }
        
                 const usdPrice = tokenData.prices.find((p: any) => p.currency === 'usd');
         if (!usdPrice || !usdPrice.value) {
           console.log(`❌ DEBUG: No USD price for native token ${tokenData.symbol}`);
           continue;
         }
        
        const priceValue = parseFloat(usdPrice.value);
        if (isNaN(priceValue)) {
          console.log(`❌ DEBUG: Cannot parse price for native token ${tokenData.symbol}: ${usdPrice.value}`);
          continue;
        }
        
        console.log(`✅ DEBUG: Native token ${tokenData.symbol} price: $${priceValue}`);
        symbolPrices[tokenData.symbol] = priceValue;
      }
      
      console.log(`🔍 DEBUG: Symbol prices:`, symbolPrices);
      
      // Map back to chain IDs
      const prices: {[chainId: string]: number} = {};
      for (const chainId of chainIds) {
        const symbol = chainIdToSymbol[chainId];
        if (symbol && symbolPrices[symbol] !== undefined) {
          prices[chainId] = symbolPrices[symbol];
          console.log(`✅ DEBUG: Chain ID ${chainId} (${symbol}): $${symbolPrices[symbol]}`);
        } else {
          prices[chainId] = 0;
          console.log(`❌ DEBUG: No price found for chain ID ${chainId} (symbol: ${symbol})`);
        }
      }
      
      console.log(`✅ DEBUG: Final native token prices:`, prices);
      return prices;
    } catch (error) {
      console.log('❌ DEBUG: Exception in getNativeTokenPrices:', error);
      if (error instanceof Error) {
        console.log(`❌ DEBUG: Error message:`, error.message);
        console.log(`❌ DEBUG: Error stack:`, error.stack);
      }
      return {};
    }
  }
} 