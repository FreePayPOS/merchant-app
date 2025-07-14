import { 
  BlockchainProvider, 
  PriceProvider, 
  ExplorerProvider, 
  ProviderConfig,
  ProviderFactory as IProviderFactory,
  BLOCKCHAIN_PROVIDER_TYPES,
  PRICE_PROVIDER_TYPES,
  EXPLORER_PROVIDER_TYPES
} from '../types/providers';
import { AlchemyBlockchainProvider } from './blockchain/AlchemyBlockchainProvider';
import { InfuraBlockchainProvider } from './blockchain/InfuraBlockchainProvider';
import { AxolBlockchainProvider } from './blockchain/AxolBlockchainProvider';
import { CoinGeckoPriceProvider } from './price/CoinGeckoPriceProvider';
import { AlchemyPriceProvider } from './price/AlchemyPriceProvider';
import { AxolPriceProvider } from './price/AxolPriceProvider';
import { EtherscanExplorerProvider } from './explorer/EtherscanExplorerProvider';
import { AxolExplorerProvider } from './explorer/AxolExplorerProvider';

/**
 * Factory for creating provider instances
 */
export class ProviderFactory implements IProviderFactory {
  
  /**
   * Create a blockchain provider based on configuration
   */
  createBlockchainProvider(config: ProviderConfig): BlockchainProvider {
    switch (config.type) {
      case BLOCKCHAIN_PROVIDER_TYPES.ALCHEMY:
        return new AlchemyBlockchainProvider(config);
      
      // TODO: Implement other providers
      case BLOCKCHAIN_PROVIDER_TYPES.INFURA:
        return new InfuraBlockchainProvider(config);
      
      case BLOCKCHAIN_PROVIDER_TYPES.AXOL:
        return new AxolBlockchainProvider(config);
      
      case BLOCKCHAIN_PROVIDER_TYPES.QUICKNODE:
        throw new Error('QuickNode provider not yet implemented');
      
      case BLOCKCHAIN_PROVIDER_TYPES.MORALIS:
        throw new Error('Moralis provider not yet implemented');
      
      case BLOCKCHAIN_PROVIDER_TYPES.ANKR:
        throw new Error('Ankr provider not yet implemented');
      
      case BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK:
        throw new Error('GetBlock provider not yet implemented');
      
      default:
        throw new Error(`Unsupported blockchain provider type: ${config.type}`);
    }
  }

  /**
   * Create a price provider based on configuration
   */
  createPriceProvider(config: ProviderConfig): PriceProvider {
    switch (config.type) {
      case PRICE_PROVIDER_TYPES.COINGECKO:
        return new CoinGeckoPriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.ALCHEMY:
        return new AlchemyPriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.AXOL:
        return new AxolPriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.COINMARKETCAP:
        throw new Error('CoinMarketCap provider not yet implemented');
      
      case PRICE_PROVIDER_TYPES.BINANCE:
        throw new Error('Binance provider not yet implemented');
      
      case PRICE_PROVIDER_TYPES.KRAKEN:
        throw new Error('Kraken provider not yet implemented');
      
      case PRICE_PROVIDER_TYPES.ONECHINCH:
        throw new Error('1inch provider not yet implemented');
      
      default:
        throw new Error(`Unsupported price provider type: ${config.type}`);
    }
  }

  /**
   * Create an explorer provider based on configuration
   */
  createExplorerProvider(config: ProviderConfig): ExplorerProvider {
    switch (config.type) {
      case EXPLORER_PROVIDER_TYPES.ETHERSCAN:
        return new EtherscanExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.AXOL:
        return new AxolExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.BLOCKSCOUT:
        throw new Error('Blockscout provider not yet implemented');
      
      case EXPLORER_PROVIDER_TYPES.ARBISCAN:
        throw new Error('Arbiscan provider not yet implemented');
      
      case EXPLORER_PROVIDER_TYPES.POLYGONSCAN:
        throw new Error('Polygonscan provider not yet implemented');
      
      case EXPLORER_PROVIDER_TYPES.BASESCAN:
        throw new Error('Basescan provider not yet implemented');
      
      case EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN:
        throw new Error('Optimistic Etherscan provider not yet implemented');
      
      default:
        throw new Error(`Unsupported explorer provider type: ${config.type}`);
    }
  }
} 