# NFC Payment Terminal

A multi-chain NFC payment terminal that processes cryptocurrency payments across 5 blockchain networks with real-time transaction monitoring and comprehensive history tracking.

## 🌐 Supported Networks

- **Ethereum**
- **Base**
- **Arbitrum**
- **Optimism**
- **Polygon**
- **Starknet**

### 🎯 **Smart Payment Priority**

Rather than negotiate a chain / token combo with the merchant, the payment terminal handles it automatically. First it figures out a chain the merchant supports that you also have funds on, then sends a transaction with ETH or an ERC-20 token with this priority:

```sh
L2 Stablecoin > L2 Other > L2 ETH > L1 Stablecoin > L1 Other > L1 ETH
```

## 🚀 Quick Start

### **Development**

```bash
# Install & setup
make setup

# Start development server
npm run dev

# Run tests
npm test

# Validate code
npm run validate
```

> **Note**: The `nfc-pcsc` dependency requires native compilation. For CI environments, use `npm ci --ignore-scripts` to skip native builds.

### **Production**

```bash
# Install dependencies
npm install

# Environment setup
echo "ALCHEMY_API_KEY=your_alchemy_api_key_here" > .env

# Build & start
npm start
```

### **Docker**

```bash
# Build & run with Docker
make docker-run

# Or manually
docker-compose up -d
```

### **Open Interface**

Navigate to `http://localhost:3000`

## 🏗️ Architecture

```bash
src/
├── server.ts                   # Express server & WebSocket handler
├── app.ts                     # Main application orchestrator
├── web/index.html             # Payment terminal UI
├── config/index.ts            # Multi-chain configuration
├── config/env.ts              # Environment validation
├── utils/logger.ts            # Structured logging
└── services/
    ├── nfcService.ts          # NFC reader & wallet scanning
    ├── alchemyService.ts      # Multi-chain balance & monitoring
    ├── paymentService.ts      # Payment selection & EIP-681 generation
    ├── ethereumService.ts     # Address validation utilities
    └── addressProcessor.ts    # Duplicate processing prevention
tests/
├── services/                  # Unit tests
├── api/                       # API tests
└── setup.ts                   # Test configuration
scripts/
└── rpi-deploy/               # Raspberry Pi deployment
```

## 💡 Usage

### **Processing Payments**

1. Enter amount using the keypad (cents-based: "150" = $1.50)
2. Tap "Charge" to initiate payment
3. Customer taps NFC device to send payment
4. Real-time monitoring confirms transaction
5. "Approved" message with block explorer link

### **Transaction History**

1. Tap the 📜 history button on the keypad
2. View all transactions or scan a wallet for specific history
3. Tap "📱 Scan Wallet for History" and have customer tap their device
4. Browse filtered transactions for that specific wallet

## 🔄 Payment Flow

1. **NFC Detection** → Customer taps device
2. **Multi-Chain Fetching** → Portfolio analysis across all 6 chains
3. **Smart Selection** → Optimal payment token based on priority system
4. **EIP-681 Generation** → Payment request with chain ID
5. **Real-Time Monitoring** → WebSocket/polling for transaction confirmation
6. **History Logging** → Transaction stored with full metadata

## 🛡️ Transaction Monitoring

- **WebSocket monitoring** for Ethereum, Base, Arbitrum, Optimism, Polygon
- **Polling-based monitoring** fallback
- **Automatic timeout** after 5 minutes
- **Block explorer integration** for transaction verification
- **Status tracking**: detected → confirmed → failed

## 🍓 Raspberry Pi Deployment

This NFC payment terminal can be deployed as a **plug-and-play kiosk** on Raspberry Pi hardware for production use.

### **Hardware Requirements**

- Raspberry Pi 4B (4GB+ RAM recommended)
- 7" Official Raspberry Pi Touchscreen
- **ACR1252U-M1 NFC Reader** (specifically supported)
- 32GB+ MicroSD card

### **Deployment Features**

- **One-command build** creates bootable SD card image
- **Pre-configured WiFi** and API credentials
- **Automatic startup** with fullscreen kiosk mode
- **Safety validation** prevents deployment with test addresses
- **macOS and Linux** build support

### **Quick Deploy**

```bash
# Navigate to deployment scripts
cd scripts/rpi-deploy

# Configure your deployment
cp build-config.env.template build-config.env
# Edit build-config.env with your WiFi, API key, and merchant address

# Build bootable image (macOS)
./build-pi-image-osx.sh

# Flash the generated nfc-terminal-<date>.img.gz file to SD card using Raspberry Pi Imager and boot!
```

## 🧪 Testing & Quality

- **40+ unit tests** covering core services
- **ESLint** with TypeScript rules
- **Type checking** with strict mode
- **Health checks** for monitoring
- **CI/CD** with GitHub Actions

## 📦 Available Commands

```bash
# Development
npm run dev              # Start dev server
npm run test             # Run tests
npm run test:coverage    # Test coverage
npm run lint             # Lint code
npm run validate         # Full validation

# Docker
make docker-build        # Build image
make docker-run          # Run container
make docker-stop         # Stop container

# Help
make help               # Show all commands
```

📖 **[Complete Deployment Guide](README-DEPLOYMENT.md)**
