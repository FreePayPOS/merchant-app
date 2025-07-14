# Provider System Documentation

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Supported Providers](#supported-providers)
- [Configuration](#configuration)
- [Usage](#usage)
- [Fallback Logic](#fallback-logic)
- [Adding New Providers](#adding-new-providers)

## Overview

Flexible provider system with multiple API providers, automatic fallback, and health monitoring. Abstracts blockchain data, price data, and transaction explorer functionality.

## ✅ Implementation Status

**All providers have been successfully implemented and tested!**

- **Blockchain Providers**: 6 implemented (Alchemy, Infura, QuickNode, Moralis, Ankr, GetBlock)
- **Price Providers**: 7 implemented (CoinGecko, Alchemy, CoinMarketCap, Binance, Kraken, 1inch, Axol)
- **Explorer Providers**: 7 implemented (Etherscan, Blockscout, Arbiscan, Polygonscan, Basescan, Optimistic Etherscan, Axol)
- **Total Tests**: 63/63 passing
- **Coverage**: All provider types covered with fallback scenarios

## Architecture

### Core Components

1. **Provider Interfaces** (`src/types/providers.ts`)
   - `BlockchainProvider` - Blockchain data operations
   - `PriceProvider` - Token price data
   - `ExplorerProvider` - Transaction explorer URLs

2. **Provider Factory** (`src/providers/ProviderFactory.ts`)
   - Creates provider instances based on configuration

3. **Provider Manager** (`src/providers/ProviderManager.ts`)
   - Manages multiple providers with fallback logic
   - Health monitoring and provider selection

4. **Provider Service** (`src/services/providerService.ts`)
   - High-level service using provider manager
   - Singleton pattern for application-wide access

## Supported Providers

### Blockchain Providers

- **Alchemy** (Primary) - Full blockchain data and WebSocket support
- **Infura** (Fallback) - Ethereum and EVM-compatible chains
- **QuickNode** (Fallback) - High-performance blockchain access
- **Moralis** (Fallback) - Web3 development platform
- **Ankr** (Fallback) - Multi-chain infrastructure
- **GetBlock** (Fallback) - Blockchain node service

### Price Providers

- **CoinGecko** (Primary) - Free tier with comprehensive token data
- **Alchemy** (Fallback) - Native token prices via Alchemy SDK
- **CoinMarketCap** (Fallback) - Professional market data
- **Binance** (Fallback) - Exchange-based pricing
- **Kraken** (Fallback) - Alternative exchange pricing
- **1inch** (Fallback) - DEX aggregation pricing

### Explorer Providers

- **Etherscan** (Primary) - Ethereum mainnet and L2s
- **Blockscout** (Fallback) - Open-source blockchain explorer
- **Arbiscan** (Chain-specific) - Arbitrum explorer
- **Polygonscan** (Chain-specific) - Polygon explorer
- **Basescan** (Chain-specific) - Base explorer
- **Optimistic Etherscan** (Chain-specific) - Optimism explorer

## Configuration

### Environment Variables

```bash
ALCHEMY_API_KEY=your_alchemy_api_key
INFURA_API_KEY=your_infura_api_key
QUICKNODE_API_KEY=your_quicknode_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Provider Configuration

```typescript
const config: MultiProviderConfig = {
  blockchain: [{
    type: 'alchemy',
    name: 'Alchemy Primary',
    apiKey: process.env.ALCHEMY_API_KEY,
    priority: 1,
    enabled: true
  }],
  price: [{
    type: 'coingecko',
    name: 'CoinGecko Primary',
    apiKey: '',
    priority: 1,
    enabled: true
  }],
  explorer: [{
    type: 'etherscan',
    name: 'Etherscan Primary',
    apiKey: process.env.ETHERSCAN_API_KEY,
    priority: 1,
    enabled: true
  }],
  fallbackEnabled: true,
  healthCheckInterval: 60
};
```

## Usage

### Basic Usage

```typescript
import { ProviderService } from './src/services/providerService';

const providerService = ProviderService.getInstance();
await providerService.initialize();

const balance = await providerService.getBalance('0x123...', 1);
const price = await providerService.getTokenPrice('ethereum');
const txUrl = providerService.getTransactionUrl('0xabc...', 1);
```

### Advanced Usage

```typescript
const health = providerService.getProviderHealth();
await providerService.refreshProviderHealth();
const config = providerService.getProviderConfig();
await providerService.updateProviderConfig(newConfig);
```

### Provider Health Monitoring

```typescript
interface ProviderHealth {
  provider: string;
  type: string;
  healthy: boolean;
  lastCheck: Date;
  error?: string;
  responseTime?: number;
}
```

## Fallback Logic

### Automatic Fallback

When `fallbackEnabled: true`:

1. Returns first healthy provider in priority order
2. Health checks every `healthCheckInterval` seconds
3. Automatically switches to next available provider if current fails

### Manual Provider Selection

```typescript
const alchemyProvider = providerService.getProviderManager()
  .getBlockchainProvider(1);
const isHealthy = await alchemyProvider.isHealthy();
```

## Adding New Providers

### 1. Create Provider Implementation

```typescript
export class NewBlockchainProvider implements BlockchainProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  // Implement all required methods from interface
  // Add provider-specific methods
  // Include proper error handling
  // Add rate limiting support
  // Include health checks
}
```

### 2. Add to ProviderFactory

```typescript
case 'newprovider':
  return new NewBlockchainProvider(config);
```

### 3. Update Configuration Schema

```typescript
export interface ProviderConfig {
  type: 'alchemy' | 'infura' | 'newprovider';
  // ... other properties
}
```

### 4. Add Tests

```typescript
describe('NewBlockchainProvider', () => {
  it('should get balance', async () => {
    // Test implementation
  });
});
```

### 5. Update Documentation

- Add provider to supported providers list
- Document any special configuration requirements
- Add usage examples

## Testing

### Unit Tests

- Test each provider method independently
- Mock external API calls
- Test error scenarios
- Validate rate limiting

### Integration Tests

- Test with real API endpoints
- Test fallback scenarios
- Test provider switching
- Test health monitoring

## Best Practices

1. **Error Handling**: Always include proper error handling and logging
2. **Rate Limiting**: Implement rate limiting to respect API limits
3. **Health Checks**: Regular health checks to ensure provider availability
4. **Fallback Logic**: Always have fallback providers configured
5. **Monitoring**: Monitor provider performance and errors
6. **Documentation**: Keep documentation updated with provider changes

## Related Documentation

- [API Reference](API_REFERENCE.md)
- [Quick Reference](QUICK_REFERENCE.md)

---
