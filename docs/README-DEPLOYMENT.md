# NFC Payment Terminal - Raspberry Pi Deployment Guide

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [ACR1252U-M1 NFC Reader Support](#acr1252u-m1-nfc-reader-support)
- [Generated Files](#generated-files)
- [First Boot Experience](#first-boot-experience)
- [Troubleshooting](#troubleshooting)

## Overview

Create a bootable Raspberry Pi image with NFC payment terminal pre-installed and configured.

## Quick Start

### Prerequisites

- macOS or Linux (for build environment)
- Docker Desktop (for macOS builds)
- 32GB+ MicroSD card
- Raspberry Pi 4B (4GB+ RAM recommended)
- 7" Official Raspberry Pi Touchscreen
- ACR1252U - USB NFC Reader III (P/N: ACR1252U-M1)

### 1. Navigate to Deployment Scripts

```bash
cd scripts/rpi-deploy
```

### 2. Initial Setup

```bash
./setup-build-environment.sh
```

### 3. Configure Your Deployment

```bash
cp build-config.env.template build-config.env
```

Edit `build-config.env`:

```bash
WIFI_SSID="YourWiFiNetwork"
WIFI_PASSWORD="YourWiFiPassword"
ALCHEMY_API_KEY="your_alchemy_api_key_here"
MERCHANT_ETH_ADDRESS="0x1234567890123456789012345678901234567890"
SSH_USERNAME="freepay"
SSH_PASSWORD="freepay"
SSH_ENABLE_PASSWORD_AUTH="true"
BLOCKCHAIN_NETWORKS="ethereum,base,arbitrum,optimism,polygon"
```

⚠️ **CRITICAL**: Replace `MERCHANT_ETH_ADDRESS` with your actual Ethereum wallet address.

> **Provider Flexibility**: You can use any supported provider (Alchemy, Infura, Axol, CoinGecko, Etherscan) by setting the appropriate API key. The system automatically handles fallbacks if your primary provider is unavailable.

### 4. Build the Image

#### For macOS

```bash
./build-pi-image-osx.sh
```

#### For Linux

```bash
./build-pi-image.sh
```

### 5. Flash and Deploy

Flash the created `nfc-terminal-YYYYMMDD.img.gz` file to SD card using Raspberry Pi Imager.

## ACR1252U-M1 NFC Reader Support

Configured for **ACR1252U-M1 NFC reader** with automatic detection.

### What's Included

- ACS PCSC drivers for ACR1252U-M1 compatibility
- Automatic device detection when plugged via USB
- Contact/Contactless support for various card types
- LED indicator support for transaction feedback

### Supported Card Types

- ISO 14443 Type A/B (most payment cards)
- MIFARE Classic/Ultralight
- FeliCa cards
- NFC Forum Type 1-4 tags

### Hardware Setup

1. Connect ACR1252U-M1 via USB to Raspberry Pi
2. Device automatically detected on boot
3. Green LED indicates ready status
4. Blue LED flashes during card reads

### Troubleshooting ACR1252U-M1

```bash
lsusb | grep ACS
sudo systemctl status pcscd
pcsc_scan
```

## Generated Files

After build process:

```bash
scripts/rpi-deploy/
├── setup-build-environment.sh     # Environment setup
├── build-app-production.sh        # Application builder  
├── build-pi-image.sh              # Direct build script (Linux)
├── build-pi-image-docker.sh       # Docker build script (macOS)
├── build-config.env.template      # Configuration template
├── build-config.env               # Your actual config
├── nfc-terminal-YYYYMMDD.img.gz   # Final bootable image
└── build/                         # Build artifacts
    ├── app-bundle/                # Compiled application
    ├── images/                    # Base Raspberry Pi OS
    ├── Dockerfile                 # Docker build environment
    └── logs/                      # Build logs
```

## First Boot Experience

When you power on the Pi:

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

## Troubleshooting

### Build Issues

##### "MERCHANT_ETH_ADDRESS is still set to default value!"

- Edit `build-config.env` and set your actual Ethereum address
- Address must be 42 characters starting with `0x`

##### "Docker not found"

- Install Docker Desktop from <https://docker.com/products/docker-desktop>

##### "docker-credential-desktop: executable file not found"

```bash
cp ~/.docker/config.json ~/.docker/config.json.backup
# Edit ~/.docker/config.json and remove "credsStore": "desktop"
```

##### "Cannot download base image"

- Check internet connection
- Verify disk space (need ~8GB free)

### Runtime Issues

##### NFC Reader Not Detected

```bash
lsusb | grep ACS
sudo systemctl status pcscd
pcsc_scan
```

##### WiFi Connection Issues

- Check WiFi credentials in `build-config.env`
- Verify network is 2.4GHz (some Pi models don't support 5GHz)

##### Application Not Starting

```bash
sudo systemctl status nfc-terminal
journalctl -u nfc-terminal -f
```

##### Display Issues

- Ensure 7" touchscreen is properly connected
- Check HDMI settings in `/boot/config.txt`

### Performance Issues

##### Slow Boot Time

- Use Class 10 or higher SD card
- Ensure adequate power supply (5V/3A recommended)

##### Application Lag

- Check available memory: `free -h`
- Monitor CPU usage: `htop`
- Consider reducing background services

### Network Issues

##### API Connection Failures

- Verify `ALCHEMY_API_KEY` is correct
- Check internet connectivity: `ping 8.8.8.8`
- Test API endpoint: `curl https://eth-mainnet.alchemyapi.io/v2/your-key`

##### Blockchain Network Issues

- Verify supported networks in `BLOCKCHAIN_NETWORKS`
- Check individual network connectivity
- Monitor provider health status

## Advanced Configuration

### Custom Network Configuration

Edit `/etc/wpa_supplicant/wpa_supplicant.conf` for advanced WiFi settings.

### SSH Access

Default credentials:

- Username: `freepay`
- Password: `freepay`
- SSH enabled on port 22

### System Updates

```bash
sudo apt update
sudo apt upgrade
```

### Log Management

```bash
# View application logs
journalctl -u nfc-terminal -f

# View system logs
dmesg | tail

# Clear logs if needed
sudo journalctl --vacuum-time=7d
```

## Security Considerations

### API Key Security

- Store API keys securely
- Use environment variables
- Rotate keys regularly
- Monitor API usage

### Network Security

- Change default SSH password
- Use firewall rules
- Enable fail2ban
- Regular security updates

### Physical Security

- Secure physical access to device
- Use tamper-evident seals
- Monitor for unauthorized access
- Regular security audits

## Maintenance

### Regular Tasks

- Monitor disk space: `df -h`
- Check system updates: `sudo apt update`
- Review application logs
- Test NFC reader functionality
- Verify blockchain connectivity

### Backup Strategy

- Regular SD card backups
- Configuration file backups
- Transaction log backups
- Recovery image creation

## Support

For additional support:

1. Check this troubleshooting guide
2. Review application logs
3. Test with known good hardware
4. Contact support with detailed error information

---
