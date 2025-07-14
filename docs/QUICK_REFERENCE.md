# Quick Reference Guide

## Common Commands

### Development

```bash
make setup
npm run dev
npm test
npm run test:coverage
npm run validate
npm run lint
npm run lint:fix
npm run type-check
```

### Production

```bash
npm run prestart
npm start
make docker-run
make docker-stop
```

### Deployment

```bash
cd scripts/rpi-deploy
./setup-build-environment.sh
cp build-config.env.template build-config.env
# Edit build-config.env
./build-pi-image.sh  # Linux
./build-pi-image-osx.sh  # macOS
```

## Configuration

### Environment Variables

```bash
ALCHEMY_API_KEY=your_alchemy_api_key_here
MERCHANT_ETH_ADDRESS=0x1234567890123456789012345678901234567890
INFURA_API_KEY=your_infura_api_key
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
  fallbackEnabled: true,
  healthCheckInterval: 60
};
```

## Project Structure

```bash
src/
├── server.ts                   # Express server & WebSocket handler
├── app.ts                     # Main application orchestrator
├── config/                    # Configuration management
│   ├── index.ts              # Multi-chain configuration
│   ├── env.ts                # Environment validation
│   └── providers.ts          # Provider configuration
├── providers/                 # Provider system
│   ├── ProviderFactory.ts    # Provider creation
│   ├── ProviderManager.ts    # Provider management
│   ├── blockchain/           # Blockchain providers
│   ├── price/               # Price providers
│   └── explorer/            # Explorer providers
├── services/                  # Core services
│   ├── nfcService.ts        # NFC reader & wallet scanning
│   ├── paymentService.ts    # Payment selection & EIP-681 generation
│   ├── providerService.ts   # Provider service
│   └── ethereumService.ts   # Address validation utilities
└── web/                      # Frontend interface
    └── index.html           # Payment terminal UI
```

## Troubleshooting

### Build Issues

```bash
# "MERCHANT_ETH_ADDRESS is still set to default value!"
# Edit build-config.env and set your actual Ethereum address

# "Docker not found"
# Install Docker Desktop from https://docker.com/products/docker-desktop

# "docker-credential-desktop: executable file not found"
cp ~/.docker/config.json ~/.docker/config.json.backup
# Edit ~/.docker/config.json and remove "credsStore": "desktop"
```

### NFC Reader Issues

```bash
lsusb | grep ACS
sudo systemctl status pcscd
pcsc_scan
```

### Test Issues

```bash
npm run test:coverage
npm test -- tests/services/paymentService.test.ts
npm run test:watch
```

## Health Checks

### Application Health

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "healthy",
  "service": "merchant-app",
  "timestamp": "2024-07-14T14:30:00.000Z",
  "memoryUsage": {
    "total": 350,
    "used": 315,
    "percentage": 90
  },
  "responseTime": 0
}
```

### Provider Health

```typescript
const providerService = ProviderService.getInstance();
const health = providerService.getProviderHealth();
console.log('Provider health:', health);
```

## Supported Networks

| Network | Chain ID | Status | Explorer |
|---------|----------|--------|----------|
| Ethereum | 1 | Active | Etherscan |
| Base | 8453 | Active | Basescan |
| Arbitrum | 42161 | Active | Arbiscan |
| Optimism | 10 | Active | Optimistic Etherscan |
| Polygon | 137 | Active | Polygonscan |
| Starknet | 0x534e5f474f45524c49 | Active | StarkScan |

## Payment Priority

1. **L2 Stablecoin** (USDC, USDT on L2s)
2. **L2 Other** (Other tokens on L2s)
3. **L2 ETH** (ETH on L2s)
4. **L1 Stablecoin** (USDC, USDT on Ethereum)
5. **L1 Other** (Other tokens on Ethereum)
6. **L1 ETH** (ETH on Ethereum)

## Related Documentation

- [Main Documentation](README.md)
- [Provider System](PROVIDER_SYSTEM.md)
- [Deployment Guide](README-DEPLOYMENT.md)

---
