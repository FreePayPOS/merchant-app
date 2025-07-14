# Provider System Documentation

## Overview

The merchant app now includes a flexible provider system that allows for multiple API providers with automatic fallback and health monitoring. This system abstracts blockchain data, price data, and transaction explorer functionality behind a unified interface.

## Architecture

### Core Components

1. **Provider Interfaces** (`src/types/providers.ts`)
   - `BlockchainProvider` - For blockchain data operations
   - `PriceProvider` - For token price data
   - `ExplorerProvider` - For transaction explorer URLs

2. **Provider Factory** (`src/providers/ProviderFactory.ts`)
   - Creates provider instances based on configuration
   - Supports multiple provider types

3. **Provider Manager** (`src/providers/ProviderManager.ts`)
   - Manages multiple providers with fallback logic
   - Health monitoring and provider selection

4. **Provider Service** (`src/services/providerService.ts`)
   - High-level service that uses the provider manager
   - Singleton pattern for application-wide access

## Supported Providers

### Blockchain Providers

- **Alchemy** (Primary) - Full blockchain data and WebSocket support
- **Infura** (Fallback) - Ethereum and EVM-compatible chains
- **QuickNode** (Fallback) - High-performance blockchain access
- **Moralis** (Planned) - Web3 development platform
- **Ankr** (Planned) - Multi-chain infrastructure
- **GetBlock** (Planned) - Blockchain node service

### Price Providers

- **CoinGecko** (Primary) - Free tier with comprehensive token data
- **Alchemy** (Fallback) - Native token prices via Alchemy SDK
- **CoinMarketCap** (Planned) - Professional market data
- **Binance** (Planned) - Exchange-based pricing
- **Kraken** (Planned) - Alternative exchange pricing
- **1inch** (Planned) - DEX aggregation pricing

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
# Required (at least 1 key)
# Optional (more for fallback providers-- TODO: quorum api-providers ability)
ALCHEMY_API_KEY=your_alchemy_api_key
INFURA_API_KEY=your_infura_api_key
QUICKNODE_API_KEY=your_quicknode_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Provider Configuration

The system automatically configures providers based on available API keys:

```typescript
const config: MultiProviderConfig = {
  blockchain: [
    {
      type: 'alchemy',
      name: 'Alchemy Primary',
      apiKey: process.env.ALCHEMY_API_KEY,
      priority: 1,
      enabled: true
    },
    {
      type: 'infura',
      name: 'Infura Fallback',
      apiKey: process.env.INFURA_API_KEY,
      priority: 2,
      enabled: !!process.env.INFURA_API_KEY
    }
  ],
  price: [
    {
      type: 'coingecko',
      name: 'CoinGecko Primary',
      apiKey: '', // No API key required for free tier
      priority: 1,
      enabled: true
    }
  ],
  explorer: [
    {
      type: 'etherscan',
      name: 'Etherscan Primary',
      apiKey: process.env.ETHERSCAN_API_KEY,
      priority: 1,
      enabled: true
    }
  ],
  fallbackEnabled: true,
  healthCheckInterval: 60 // seconds
};
```

## Usage

### Basic Usage

```typescript
import { ProviderService } from './src/services/providerService';

// Get singleton instance
const providerService = ProviderService.getInstance();

// Initialize (call once at app startup)
await providerService.initialize();

// Use the service
const balance = await providerService.getBalance('0x123...', 1); // Ethereum
const price = await providerService.getTokenPrice('ethereum');
const txUrl = providerService.getTransactionUrl('0xabc...', 1);
```

### Advanced Usage

```typescript
// Get provider health status
const health = providerService.getProviderHealth();
console.log('Provider health:', health);

// Refresh health status
await providerService.refreshProviderHealth();

// Get current configuration
const config = providerService.getProviderConfig();
console.log('Current config:', config);

// Update configuration (runtime)
await providerService.updateProviderConfig(newConfig);
```

### Provider Health Monitoring

The system automatically monitors provider health:

```typescript
// Health status includes:
interface ProviderHealth {
  provider: string;        // Provider name
  type: string;           // 'blockchain', 'price', or 'explorer'
  healthy: boolean;       // Current health status
  lastCheck: Date;        // Last health check timestamp
  error?: string;         // Error message if unhealthy
  responseTime?: number;  // Response time in milliseconds
}
```

## Fallback Logic

### Automatic Fallback

When `fallbackEnabled: true`:

1. **Provider Selection**: Returns the first healthy provider in priority order
2. **Health Checks**: Performed every `healthCheckInterval` seconds
3. **Failover**: Automatically switches to next available provider if current fails

### Manual Provider Selection

```typescript
// Get specific provider by type
const alchemyProvider = providerService.getProviderManager()
  .getBlockchainProvider(1); // Chain ID 1 (Ethereum)

// Check provider health
const isHealthy = await alchemyProvider.isHealthy();
```

## Adding New Providers

### 1. Create Provider Implementation

```typescript
// src/providers/blockchain/NewBlockchainProvider.ts
import { BlockchainProvider, ProviderConfig } from '../../types/providers';

export class NewBlockchainProvider implements BlockchainProvider {
  public readonly name: string;
  public readonly type: string;
  private config: ProviderConfig;

  constructor(config: ProviderConfig) {
    this.name = config.name;
    this.type = config.type;
    this.config = config;
  }

  // Implement all required methods...
  async getBalance(address: string, chainId: number): Promise<string> {
    // Implementation
  }

  // ... other methods
}
```

### 2. Add to Factory

```typescript
// src/providers/ProviderFactory.ts
import { NewBlockchainProvider } from './blockchain/NewBlockchainProvider';

// Add to BLOCKCHAIN_PROVIDER_TYPES
export const BLOCKCHAIN_PROVIDER_TYPES = {
  // ... existing types
  NEW_PROVIDER: 'new-provider'
} as const;

// Add to factory method
createBlockchainProvider(config: ProviderConfig): BlockchainProvider {
  switch (config.type) {
    // ... existing cases
    case BLOCKCHAIN_PROVIDER_TYPES.NEW_PROVIDER:
      return new NewBlockchainProvider(config);
    default:
      throw new Error(`Unsupported blockchain provider type: ${config.type}`);
  }
}
```

### 3. Update Configuration

```typescript
// src/config/providers.ts
const config: MultiProviderConfig = {
  blockchain: [
    // ... existing providers
    {
      type: 'new-provider',
      name: 'New Provider',
      apiKey: process.env.NEW_PROVIDER_API_KEY,
      priority: 4,
      enabled: !!process.env.NEW_PROVIDER_API_KEY
    }
  ],
  // ... rest of config
};
```

## Testing

### Running Tests

```bash
# Run provider tests
npm test -- tests/providers/

# Run with coverage
npm run test:coverage
```

### Test Structure

- **Unit Tests**: Test individual provider implementations
- **Integration Tests**: Test provider manager and service
- **Mock Tests**: Test with mocked API responses

## Migration from Legacy System

### Current Services to Update

1. **AlchemyService** → Use `ProviderService.getBalance()`
2. **PriceService** → Use `ProviderService.getTokenPrice()`
3. **Hardcoded explorer URLs** → Use `ProviderService.getTransactionUrl()`

### Migration Steps

1. **Phase 1**: Deploy new provider system alongside existing services
2. **Phase 2**: Gradually migrate services to use `ProviderService`
3. **Phase 3**: Remove legacy services after full migration

### Example Migration

```typescript
// Before (legacy)
import { AlchemyService } from './services/alchemyService';
const balance = await AlchemyService.getBalance(address, chainId);

// After (new provider system)
import { ProviderService } from './services/providerService';
const providerService = ProviderService.getInstance();
const balance = await providerService.getBalance(address, chainId);
```

## Performance Considerations

### Caching

- Provider health status is cached and refreshed periodically
- Consider implementing response caching for frequently accessed data

### Rate Limiting

- Each provider has its own rate limits
- System automatically handles rate limit information
- Consider implementing request queuing for high-traffic scenarios

### Connection Pooling

- WebSocket connections are managed per provider
- Automatic cleanup on service shutdown

## Monitoring and Logging

### Health Monitoring

```typescript
// Monitor provider health
setInterval(async () => {
  const health = providerService.getProviderHealth();
  const unhealthyProviders = health.filter(h => !h.healthy);
  
  if (unhealthyProviders.length > 0) {
    console.warn('Unhealthy providers:', unhealthyProviders);
  }
}, 30000); // Check every 30 seconds
```

### Metrics

Consider adding metrics for:

- Provider response times
- Success/failure rates
- Fallback frequency
- API usage per provider

## Troubleshooting

### Common Issues

1. **Provider Not Available**
   - Check API key configuration
   - Verify provider health status
   - Ensure provider supports requested chain

2. **Fallback Not Working**
   - Verify `fallbackEnabled: true`
   - Check provider priorities
   - Ensure multiple providers are configured

3. **Health Check Failures**
   - Check network connectivity
   - Verify API endpoints
   - Review rate limits

### Debug Mode

```typescript
// Enable debug logging
const providerService = ProviderService.getInstance();
await providerService.initialize();

// Check provider status
console.log('Provider health:', providerService.getProviderHealth());
console.log('Provider config:', providerService.getProviderConfig());
```

## Future Enhancements

### Planned Features

1. **Load Balancing**: Distribute requests across multiple providers
2. **Geographic Routing**: Route to nearest provider
3. **Cost Optimization**: Route to cheapest provider
4. **Custom Providers**: Allow users to add their own providers
5. **Provider Analytics**: Detailed usage and performance metrics

### API Enhancements

1. **Batch Operations**: Process multiple requests efficiently
2. **Streaming**: Real-time data streams
3. **Webhooks**: Notify on provider status changes
4. **Configuration API**: Runtime configuration updates
