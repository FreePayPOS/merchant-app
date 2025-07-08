# NFC Payment Terminal - Raspberry Pi Deployment Guide

This guide explains how to create a bootable Raspberry Pi image with your NFC payment terminal pre-installed and configured.

## 🚀 Quick Start

### Prerequisites

- macOS or Linux (for build environment)
- Docker Desktop (for macOS builds)
- 32GB+ MicroSD card
- Raspberry Pi 4B (4GB+ RAM recommended)
- 7" Official Raspberry Pi Touchscreen
- ACR1252U - USB NFC Reader III (P/N: ACR1252U-M1)

### 1. Navigate to Deployment Scripts

```bash
# Change to the deployment directory
cd scripts/rpi-deploy
```

### 2. Initial Setup

```bash
# Setup build environment
./setup-build-environment.sh
```

### 3. Configure Your Deployment

```bash
# Copy template and edit with your settings
cp build-config.env.template build-config.env
```

Edit `build-config.env` with your actual values:

```bash
# WiFi Configuration
WIFI_SSID="YourWiFiNetwork"
WIFI_PASSWORD="YourWiFiPassword"

# Blockchain Configuration  
ALCHEMY_API_KEY="your_alchemy_api_key_here"
MERCHANT_ETH_ADDRESS="0x1234567890123456789012345678901234567890"  # YOUR ACTUAL ADDRESS

# SSH Access Configuration (optional - defaults shown)
SSH_USERNAME="freepay"              # Default: freepay
SSH_PASSWORD="freepay"              # Default: freepay  
SSH_ENABLE_PASSWORD_AUTH="true"     # Enable SSH password authentication

# Supported Networks
BLOCKCHAIN_NETWORKS="ethereum,base,arbitrum,optimism,polygon"
```

⚠️ **CRITICAL**: Replace `MERCHANT_ETH_ADDRESS` with your actual Ethereum wallet address. The build will **fail** if you leave the default `0x000...` value.

### 4. Build the Image

#### For macOS:

```bash
# Uses Docker for full automation (takes 30-60 minutes, may have issues)
./build-pi-image-osx.sh
```

#### For Linux:

```bash
# Direct build (fastest, full automation)
./build-pi-image.sh
```

> **Note**: macOS doesn't natively support ext2/ext4 filesystems. The simple approach creates everything needed and provides clear manual steps for SD card completion.

### 5. Flash and Deploy

```bash
# Flash the created image to SD card using Raspberry Pi Imager
# File will be named: nfc-terminal-YYYYMMDD.img.gz
```

### Requirements for macOS Build

1. **Docker Desktop** - Install from <https://docker.com/products/docker-desktop>
2. **Sufficient disk space** - ~10GB for base images and build artifacts
3. **Time** - Docker build takes longer but is more reliable

## 📡 ACR1252U-M1 NFC Reader Support

This deployment is specifically configured for the **ACR1252U-M1 NFC reader**, which is automatically detected and configured during the build process.

### What's Included

- **ACS PCSC drivers** for ACR1252U-M1 compatibility
- **Automatic device detection** when plugged via USB
- **Contact/Contactless support** for various card types
- **LED indicator support** for transaction feedback

### Supported Card Types

- **ISO 14443 Type A/B** (most payment cards)
- **MIFARE Classic/Ultralight**
- **FeliCa** cards
- **NFC Forum Type 1-4** tags

### Hardware Setup

1. Connect ACR1252U-M1 via USB to Raspberry Pi
2. The device will be automatically detected on boot
3. Green LED indicates ready status
4. Blue LED flashes during card reads

### Troubleshooting ACR1252U-M1

```bash
# Check if reader is detected
lsusb | grep ACS

# Check PCSC daemon status
sudo systemctl status pcscd

# List connected readers
pcsc_scan
```

## 📁 Generated Files

After running the build process from `scripts/rpi-deploy/`, you'll have:

```bash
scripts/rpi-deploy/
├── setup-build-environment.sh     # Environment setup
├── build-app-production.sh        # Application builder  
├── build-pi-image.sh              # Direct build script (Linux)
├── build-pi-image-docker.sh       # Docker build script (macOS)
├── build-config.env.template      # Configuration template
├── build-config.env               # Your actual config (create this)
├── nfc-terminal-YYYYMMDD.img.gz   # Final bootable image
└── build/                         # Build artifacts
    ├── app-bundle/                # Compiled application
    ├── images/                    # Base Raspberry Pi OS
    ├── Dockerfile                 # Docker build environment
    └── logs/                      # Build logs
```

## 🖥️ First Boot Experience

When you power on the Pi with the flashed SD card:

1. **Boot Process** (60-90 seconds)
   - Raspberry Pi OS starts
   - WiFi connects automatically
   - Services start in sequence

2. **Display Initialization**
   - 7" screen activates
   - Auto-login as `pi` user
   - X11 starts automatically

3. **Application Launch**
   - NFC terminal application starts
   - Chromium opens in kiosk mode
   - Fullscreen payment interface appears

4. **Ready for Use**
   - NFC reader active and ready
   - Connected to all blockchain networks
   - Payments directed to your merchant address

## 🔍 Troubleshooting

### Build Issues

##### "MERCHANT_ETH_ADDRESS is still set to default value!"

- Edit `build-config.env` and set your actual Ethereum address
- Address must be 42 characters starting with `0x`

##### "Docker not found"

- Install Docker Desktop from <https://docker.com/products/docker-desktop>
- Start Docker Desktop before running build

##### "docker-credential-desktop: executable file not found"

- Temporarily fix Docker credentials:

```bash
cp ~/.docker/config.json ~/.docker/config.json.backup
# Edit ~/.docker/config.json and remove the "credsStore": "desktop" line
# OR use the simple build approach: ./build-pi-image-simple.sh
```

##### "Cannot download base image"

- Check internet connection
- Verify disk space (need ~8GB free)

### Runtime Issues

##### WiFi not connecting:

- Verify SSID and password in your config
- Check WiFi country code (default: US)
- SSH into Pi and check `sudo wpa_cli status`

##### Application not starting:

- Check logs: `sudo journalctl -u nfc-terminal.service`
- Verify Alchemy API key is correct
- Ensure NFC reader is connected
- Check health endpoint: `curl http://localhost:3000/health`

##### Display issues:

- Verify 7" screen connection
- Check `sudo dmesg | grep -i display`
- May need to adjust `config.txt` for different screens

### Debug Access

SSH is enabled with custom user:

```bash
ssh freepay@<pi-ip-address>
# Default password: freepay
```

The system also retains the default pi user:

```bash
ssh pi@<pi-ip-address>
# Default password: raspberry
```

View service status:

```bash
sudo systemctl status nfc-terminal.service
sudo systemctl status wifi-connect.service
sudo journalctl -u nfc-terminal.service -f

# Check application health
curl http://localhost:3000/health
```

## 🔒 Security Notes

- **Change default password** after first boot
- **WiFi credentials** are stored in plain text (acceptable for kiosk)
- **API keys** are embedded in image (secure for single deployment)
- **SSH enabled** for debugging (disable if not needed)

## 📞 Support

If you encounter issues:

1. Use Docker build script for macOS compatibility
2. Check this troubleshooting guide
3. Review build logs in `build/logs/`
4. Test with a fresh SD card
5. Verify all hardware connections
6. Check application health endpoint for diagnostics

## 🧪 Testing & Quality

The deployed application includes:

- **40+ unit tests** covering core services
- **Health monitoring** with structured logging
- **Environment validation** with Zod schemas
- **TypeScript strict mode** for type safety

---

**Total build time**: 30-60 minutes (longer on macOS with Docker)  
**Deployment time**: 5 minutes to flash + 2 minutes first boot  
**Result**: Fully functional NFC payment terminal ready for customers
