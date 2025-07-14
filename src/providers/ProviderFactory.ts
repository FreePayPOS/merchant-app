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
import { QuickNodeBlockchainProvider } from './blockchain/QuickNodeBlockchainProvider';
import { MoralisBlockchainProvider } from './blockchain/MoralisBlockchainProvider';
import { AnkrBlockchainProvider } from './blockchain/AnkrBlockchainProvider';
import { GetBlockBlockchainProvider } from './blockchain/GetBlockBlockchainProvider';
import { CoinGeckoPriceProvider } from './price/CoinGeckoPriceProvider';
import { AlchemyPriceProvider } from './price/AlchemyPriceProvider';
import { AxolPriceProvider } from './price/AxolPriceProvider';
import { CoinMarketCapPriceProvider } from './price/CoinMarketCapPriceProvider';
import { BinancePriceProvider } from './price/BinancePriceProvider';
import { KrakenPriceProvider } from './price/KrakenPriceProvider';
import { OneInchPriceProvider } from './price/OneInchPriceProvider';
import { EtherscanExplorerProvider } from './explorer/EtherscanExplorerProvider';
import { AxolExplorerProvider } from './explorer/AxolExplorerProvider';
import { BlockscoutExplorerProvider } from './explorer/BlockscoutExplorerProvider';
import { ArbiscanExplorerProvider } from './explorer/ArbiscanExplorerProvider';
import { PolygonscanExplorerProvider } from './explorer/PolygonscanExplorerProvider';
import { BasescanExplorerProvider } from './explorer/BasescanExplorerProvider';
import { OptimisticEtherscanExplorerProvider } from './explorer/OptimisticEtherscanExplorerProvider';

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
        return new QuickNodeBlockchainProvider(config);
      
      case BLOCKCHAIN_PROVIDER_TYPES.MORALIS:
        return new MoralisBlockchainProvider(config);
      
      case BLOCKCHAIN_PROVIDER_TYPES.ANKR:
        return new AnkrBlockchainProvider(config);
      
      case BLOCKCHAIN_PROVIDER_TYPES.GETBLOCK:
        return new GetBlockBlockchainProvider(config);
      
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
        return new CoinMarketCapPriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.BINANCE:
        return new BinancePriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.KRAKEN:
        return new KrakenPriceProvider(config);
      
      case PRICE_PROVIDER_TYPES.ONECHINCH:
        return new OneInchPriceProvider(config);
      
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
        return new BlockscoutExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.ARBISCAN:
        return new ArbiscanExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.POLYGONSCAN:
        return new PolygonscanExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.BASESCAN:
        return new BasescanExplorerProvider(config);
      
      case EXPLORER_PROVIDER_TYPES.OPTIMISTIC_ETHERSCAN:
        return new OptimisticEtherscanExplorerProvider(config);
      
      default:
        throw new Error(`Unsupported explorer provider type: ${config.type}`);
    }
  }
} 