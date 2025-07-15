#!/bin/bash
set -e

echo "🏗️  Building NFC Payment Terminal for Production Deployment..."

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ../../dist/
rm -rf build/app-bundle/

# Create production bundle directory
mkdir -p build/app-bundle

# Install dependencies and build TypeScript (from root)
echo "📦 Installing dependencies..."
cd ../../
npm ci --production=false --silent >/dev/null 2>&1

echo "🔨 Building TypeScript..."
npm run build --silent >/dev/null 2>&1

# Return to deployment directory
cd scripts/rpi-deploy

# Create production bundle structure
echo "📁 Creating production bundle..."
mkdir -p build/app-bundle/{app,config}

# Copy built application (from root dist)
cp -r ../../dist/* build/app-bundle/app/

# Copy package files for production install (from root)
cp ../../package.json build/app-bundle/
cp ../../package-lock.json build/app-bundle/

# Copy source files that might be needed (from root)
cp -r ../../src/web build/app-bundle/app/

# Create production package.json (remove dev dependencies)
echo "📦 Creating production package.json..."
node -e "
const pkg = require('../../package.json');
delete pkg.devDependencies;
pkg.scripts = {
  'start': 'node app/server.js'
};
require('fs').writeFileSync('build/app-bundle/package.json', JSON.stringify(pkg, null, 2));
"

# Create systemd service file
echo "⚙️  Creating systemd service file..."
cat > build/app-bundle/config/nfc-terminal.service << 'EOF'
[Unit]
Description=NFC Payment Terminal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=freepay
WorkingDirectory=/opt/nfc-terminal
Environment=NODE_ENV=production
EnvironmentFile=/opt/nfc-terminal/.env
ExecStart=/usr/bin/node app/server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/nfc-terminal

[Install]
WantedBy=multi-user.target
EOF

# Create WiFi connection service
echo "📶 Creating WiFi connection service..."
cat > build/app-bundle/config/wifi-connect.service << 'EOF'
[Unit]
Description=WiFi Connection Service
Before=network-online.target
After=systemd-networkd.service wifi-unblock.service
Wants=wifi-unblock.service systemd-networkd.service

[Service]
Type=oneshot
ExecStartPre=/bin/bash -c 'for i in {1..10}; do if ip link show wlan0 2>/dev/null; then echo "wlan0 interface found"; break; else echo "Waiting for wlan0 interface ($i/10)"; sleep 2; fi; done'
ExecStartPre=/usr/sbin/rfkill unblock wifi
ExecStartPre=/usr/sbin/rfkill unblock wlan
ExecStartPre=/sbin/ip link set wlan0 up
ExecStartPre=/bin/bash -c 'echo "Checking wpa_supplicant config files..."; ls -la /etc/wpa_supplicant/wpa_supplicant*.conf'
ExecStart=/bin/bash -c 'echo "Manual WiFi connection approach..."; if ! pgrep wpa_supplicant.*wlan0; then echo "Starting wpa_supplicant for wlan0..."; wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf -D nl80211; sleep 8; echo "Checking wpa_supplicant status..."; iwconfig wlan0 | grep ESSID || echo "Not associated yet"; fi; echo "Requesting DHCP..."; if systemctl is-active --quiet systemd-networkd; then echo "Using systemd-networkd for DHCP"; networkctl reload; networkctl reconfigure wlan0; else echo "Using dhclient for DHCP"; dhclient -v wlan0 || true; fi; sleep 5; echo "Final status:"; ip addr show wlan0'
RemainAfterExit=yes
TimeoutStartSec=90
Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
EOF

# Create display setup service
echo "🖥️  Creating display setup service..."
cat > build/app-bundle/config/display-setup.service << 'EOF'
[Unit]
Description=Setup 7inch Display
Before=graphical.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'echo "Display setup complete"'
RemainAfterExit=yes

[Install]
WantedBy=graphical.target
EOF

# Create Chromium kiosk service
echo "🌐 Creating Chromium kiosk service..."
cat > build/app-bundle/config/chromium-kiosk.service << 'EOF'
[Unit]
Description=Chromium Kiosk Mode
After=graphical-session.target nfc-terminal.service
Requires=nfc-terminal.service

[Service]
Type=simple
User=freepay
Environment=DISPLAY=:0
ExecStartPre=/bin/bash -c 'until curl -f http://localhost:3000; do sleep 2; done'
ExecStart=/usr/bin/chromium-browser --kiosk --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-features=TranslateUI --no-first-run --fast --fast-start --disable-default-apps --disable-popup-blocking --disable-translate --disable-background-timer-throttling --disable-renderer-backgrounding --disable-device-discovery-notifications --autoplay-policy=no-user-gesture-required --no-sandbox --disable-dev-shm-usage http://localhost:3000
Restart=always
RestartSec=5

[Install]
WantedBy=graphical-session.target
EOF

# Create first-boot configuration script
echo "🚀 Creating first-boot setup script..."
cat > build/app-bundle/config/first-boot-setup.sh << 'EOF'
#!/bin/bash
set -e

echo "🚀 NFC Payment Terminal - First Boot Setup"

# Enable auto-login for freepay user
echo "⚙️  Configuring auto-login..."
sudo systemctl set-default graphical.target
sudo mkdir -p /etc/systemd/system/getty@tty1.service.d/
cat > /tmp/autologin.conf << AUTOLOGIN
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin freepay --noclear %I \$TERM
AUTOLOGIN
sudo mv /tmp/autologin.conf /etc/systemd/system/getty@tty1.service.d/

# Configure X11 to start automatically
echo "🖥️  Configuring X11 auto-start..."
sudo -u freepay mkdir -p /home/freepay/.config/autostart
cat > /tmp/autostart-x.desktop << AUTOSTART
[Desktop Entry]
Type=Application
Name=Start X and Chromium
Exec=startx
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
AUTOSTART
sudo mv /tmp/autostart-x.desktop /home/freepay/.config/autostart/
sudo chown freepay:freepay /home/freepay/.config/autostart/autostart-x.desktop

# Create .xinitrc for freepay user
echo "🌐 Configuring X11 startup..."
cat > /tmp/xinitrc << XINITRC
#!/bin/bash
# Disable screen blanking
xset -dpms
xset s off
xset s noblank

# Hide cursor
unclutter -idle 1 &

# Start window manager (lightweight)
openbox-session &

# Wait for window manager
sleep 2

# Start Chromium kiosk
chromium-browser --kiosk --no-sandbox --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state --disable-features=TranslateUI --no-first-run --fast --fast-start --disable-default-apps --disable-popup-blocking --disable-translate --disable-background-timer-throttling --disable-renderer-backgrounding --disable-device-discovery-notifications --autoplay-policy=no-user-gesture-required --disable-dev-shm-usage http://localhost:3000
XINITRC
sudo mv /tmp/xinitrc /home/freepay/.xinitrc
sudo chown freepay:freepay /home/freepay/.xinitrc
sudo chmod +x /home/freepay/.xinitrc

echo "✅ First boot setup complete"
echo "System will reboot to apply changes..."
sudo reboot
EOF
chmod +x build/app-bundle/config/first-boot-setup.sh

# Create install script for the Pi
echo "📥 Creating Pi installation script..."
cat > build/app-bundle/install-on-pi.sh << 'EOF'
#!/bin/bash
set -e

echo "📦 Installing NFC Payment Terminal on Raspberry Pi..."

# Update system
echo "🔄 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "📦 Installing required packages..."
sudo apt install -y nodejs npm chromium-browser openbox unclutter libnfc-bin libpcsclite-dev pcscd pcsc-tools

# Install ACR1252U-M1 specific drivers
echo "📡 Installing ACR1252U-M1 NFC reader drivers..."
wget -O /tmp/acsccid.deb http://downloads.acs.com.hk/drivers/en/API-ACR1252U-M1-P1.5.01/API-ACR1252U-M1-P1.5.01.tar.gz
cd /tmp && tar -xzf API-ACR1252U-M1-P1.5.01.tar.gz
sudo dpkg -i acsccid_*.deb || sudo apt-get install -f -y

# Install application
echo "📁 Installing application..."
sudo mkdir -p /opt/nfc-terminal
sudo cp -r app/* /opt/nfc-terminal/
sudo cp .env /opt/nfc-terminal/ 2>/dev/null || echo "⚠️  No .env file found - will be created by build script"
sudo chown -R freepay:freepay /opt/nfc-terminal

# Install application dependencies
echo "📦 Installing Node.js dependencies..."
cd /opt/nfc-terminal
sudo -u freepay npm ci --production --silent >/dev/null 2>&1

# Install systemd services
echo "⚙️  Installing systemd services..."
sudo cp config/*.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable services
echo "🚀 Enabling services..."
sudo systemctl enable wifi-connect.service
sudo systemctl enable nfc-terminal.service
sudo systemctl enable display-setup.service

# Configure PCSC for NFC
echo "📡 Configuring NFC services..."
sudo systemctl enable pcscd
sudo usermod -a -G plugdev freepay

echo "✅ Installation complete!"
echo "Run first-boot setup with: sudo ./config/first-boot-setup.sh"
EOF
chmod +x build/app-bundle/install-on-pi.sh

# Create environment template
echo "📝 Creating environment template..."
cat > build/app-bundle/.env.template << 'EOF'
# This file will be populated by the build script
# with values from build-config.env

NODE_ENV=production
PORT=3000
LOG_LEVEL=info

# These will be injected during build:
# ALCHEMY_API_KEY=
# MERCHANT_ETH_ADDRESS=
# BLOCKCHAIN_NETWORKS=
EOF

# Create updated systemd services and helpers for freepay user
echo "⚙️  Creating freepay user services and helpers..."

# Update NFC terminal service for freepay user
cat > build/app-bundle/config/nfc-terminal.service << 'EOF'
[Unit]
Description=NFC Payment Terminal
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=freepay
WorkingDirectory=/opt/nfc-terminal
Environment=NODE_ENV=production
EnvironmentFile=-/opt/nfc-terminal/.env
ExecStartPre=/bin/bash -c 'echo "Checking NFC terminal directory..."; ls -la /opt/nfc-terminal/ || (echo "ERROR: /opt/nfc-terminal not found"; exit 1)'
ExecStartPre=/bin/bash -c 'echo "Checking Node.js and server.js..."; which node || echo "Node.js not found"; ls -la /opt/nfc-terminal/server.js || echo "server.js not found"'
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

# Security settings
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/nfc-terminal

[Install]
WantedBy=multi-user.target
EOF

# Create start-gui service
cat > build/app-bundle/config/start-gui.service << 'EOF'
[Unit]
Description=Start GUI for NFC Terminal
After=multi-user.target nfc-terminal.service
Wants=nfc-terminal.service
Before=getty@tty1.service
Conflicts=getty@tty1.service

[Service]
Type=simple
User=root
Group=root
Environment=HOME=/home/freepay
Environment=DISPLAY=:0
Environment=XDG_RUNTIME_DIR=/run/user/1000
WorkingDirectory=/home/freepay
ExecStartPre=/bin/bash -c 'echo "Waiting for freepay user..."; for i in {1..60}; do if id freepay &>/dev/null; then echo "freepay user found: $(id freepay)"; break; else echo "Waiting for freepay user ($i/60)"; sleep 1; fi; done; if ! id freepay &>/dev/null; then echo "ERROR: freepay user not found after 60 seconds"; exit 1; fi'
ExecStartPre=/bin/bash -c 'echo "Setting up runtime directory..."; mkdir -p /run/user/1000; chown freepay:freepay /run/user/1000; chmod 700 /run/user/1000'
ExecStartPre=/bin/bash -c 'echo "Verifying home directory..."; ls -la /home/freepay || (echo "ERROR: /home/freepay not found"; exit 1)'
ExecStartPre=/bin/bash -c 'echo "Verifying GUI files..."; test -f /home/freepay/start-kiosk.sh || (echo "ERROR: start-kiosk.sh not found"; exit 1); test -x /home/freepay/start-kiosk.sh || (echo "ERROR: start-kiosk.sh not executable"; exit 1)'
ExecStartPre=/bin/bash -c 'echo "Checking GUI packages..."; which chromium-browser || (echo "ERROR: chromium-browser not installed"; exit 1); which openbox || (echo "ERROR: openbox not installed"; exit 1)'
ExecStartPre=/bin/bash -c 'echo "Verifying NFC terminal accessibility..."; timeout 30 bash -c "until curl -f http://localhost:3000 >/dev/null 2>&1; do sleep 2; done" || echo "WARNING: NFC terminal not responding, proceeding anyway"'
ExecStartPre=/bin/bash -c 'echo "Starting X11 server for freepay user..."'
ExecStart=/bin/bash -c 'cd /home/freepay && export HOME=/home/freepay && export USER=freepay && sudo -u freepay env HOME=/home/freepay USER=freepay DISPLAY=:0 /usr/bin/startx /home/freepay/start-kiosk.sh -- :0 vt1 -keeptty -nolisten tcp'
Restart=always
RestartSec=20
StandardOutput=journal
StandardError=journal
KillMode=mixed
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target graphical.target
EOF

# Create WiFi unblock service
cat > build/app-bundle/config/wifi-unblock.service << 'EOF'
[Unit]
Description=Unblock WiFi on boot
Before=wifi-connect.service wpa_supplicant@wlan0.service systemd-networkd.service
After=rfkill-unblock-wifi.service
DefaultDependencies=no

[Service]
Type=oneshot
ExecStartPre=/bin/bash -c 'echo "Checking rfkill status..."; rfkill list || true'
ExecStart=/bin/bash -c 'echo "Unblocking WiFi interfaces..."; rfkill unblock wifi; rfkill unblock wlan; rfkill unblock all'
ExecStartPost=/bin/bash -c 'echo "WiFi unblock completed"; rfkill list wifi || true'
RemainAfterExit=yes
TimeoutStartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Create a simple diagnostic service to help debug boot issues
cat > build/app-bundle/config/boot-debug.service << 'EOF'
[Unit]
Description=Boot Debug Service
After=graphical.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c 'sleep 15; echo "=== Boot Debug $(date) ===" > /tmp/boot-debug.log; echo "Freepay User Check:" >> /tmp/boot-debug.log; id freepay >> /tmp/boot-debug.log 2>&1 || echo "freepay user not found" >> /tmp/boot-debug.log; echo "Home Directory:" >> /tmp/boot-debug.log; ls -la /home/ >> /tmp/boot-debug.log; echo "Runtime Directory:" >> /tmp/boot-debug.log; ls -la /run/user/ >> /tmp/boot-debug.log 2>&1 || echo "no /run/user/" >> /tmp/boot-debug.log; echo "Failed Services:" >> /tmp/boot-debug.log; systemctl list-units --failed >> /tmp/boot-debug.log; echo "GUI Service Status:" >> /tmp/boot-debug.log; systemctl status start-gui.service >> /tmp/boot-debug.log 2>&1; echo "GUI Service Logs:" >> /tmp/boot-debug.log; journalctl -u start-gui.service --no-pager -n 20 >> /tmp/boot-debug.log 2>&1; echo "=== End Debug ===" >> /tmp/boot-debug.log'
RemainAfterExit=yes

[Install]
WantedBy=graphical.target
EOF

# Create kiosk startup script (enhanced with complete portrait mode support)
echo "🖥️  Creating kiosk startup script..."
cat > build/app-bundle/config/start-kiosk.sh << 'EOF'
#!/bin/bash
echo "🖥️ Starting NFC Terminal Kiosk Mode..."

# Set display for portrait mode
export DISPLAY=:0

# Detect display type
echo "🔍 Detecting display type..."
DISPLAY_TYPE="unknown"

# Check for DPI/DSI interfaces first (ribbon cable displays)
if [ -e "/sys/class/drm/card0-DPI-1" ] || [ -e "/sys/class/drm/card1-DPI-1" ]; then
    DISPLAY_TYPE="dfrobot-dpi"
    echo "✅ Detected DFRobot display (DPI ribbon cable)"
elif [ -e "/sys/class/drm/card0-DSI-1" ] || [ -e "/sys/class/drm/card1-DSI-1" ]; then
    # Check if it's DFRobot or Raspberry Pi DSI
    if dmesg | grep -i "dfrobot" > /dev/null 2>&1; then
        DISPLAY_TYPE="dfrobot-dsi"
        echo "✅ Detected DFRobot display (DSI ribbon cable)"
    else
        DISPLAY_TYPE="raspberry-pi-dsi"
        echo "✅ Detected Raspberry Pi DSI display"
    fi
# Check for HDMI displays with specific touch controllers
elif xinput list 2>/dev/null | grep -i "ADS7846" > /dev/null; then
    DISPLAY_TYPE="raspberry-pi-hdmi"
    echo "✅ Detected Raspberry Pi HDMI display (via touch controller)"
else
    DISPLAY_TYPE="generic"
    echo "⚠️  Using generic display configuration"
fi

# Wait for X server to be ready
echo "⏳ Waiting for X server..."
for i in {1..30}; do
    if xdpyinfo >/dev/null 2>&1; then
        echo "✅ X server is ready"
        break
    fi
    echo "Waiting for X server ($i/30)..."
    sleep 1
done

# Wait for NFC terminal service to be ready
echo "⏳ Waiting for NFC terminal service..."
timeout=120
while [ $timeout -gt 0 ]; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ NFC terminal service ready"
        break
    fi
    echo "NFC terminal not ready, waiting... ($timeout seconds left)"
    sleep 2
    timeout=$((timeout - 2))
done

if [ $timeout -le 0 ]; then
    echo "❌ ERROR: NFC terminal service not available after 2 minutes"
    # Show an error page instead of exiting
    echo "<html><body><h1>NFC Terminal Starting...</h1><p>Please wait while the service initializes.</p></body></html>" > /tmp/loading.html
    chromium-browser --kiosk --no-sandbox file:///tmp/loading.html &
    sleep 30
    # Try to connect again
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        pkill chromium-browser
    else
        exit 1
    fi
fi

# Configure display rotation based on detected type
echo "🔄 Setting up portrait display rotation..."

# Find active display output
ACTIVE_OUTPUT=""
for output in HDMI-1 HDMI-2 HDMI-A-1 DSI-1 DPI-1; do
    if xrandr | grep "$output connected" > /dev/null 2>&1; then
        ACTIVE_OUTPUT="$output"
        echo "✅ Found active display output: $ACTIVE_OUTPUT"
        break
    fi
done

if [ -n "$ACTIVE_OUTPUT" ]; then
    xrandr --output "$ACTIVE_OUTPUT" --rotate left 2>/dev/null || \
    echo "Display rotation not applied (may be configured at boot level)"
else
    echo "⚠️  No active display output found for rotation"
fi

# Get actual screen dimensions after rotation
SCREEN_INFO=$(xrandr | grep " connected" | head -1)
if [[ $SCREEN_INFO =~ ([0-9]+)x([0-9]+) ]]; then
    SCREEN_WIDTH="${BASH_REMATCH[1]}"
    SCREEN_HEIGHT="${BASH_REMATCH[2]}"
    echo "📏 Detected resolution: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}"
else
    # Default to expected portrait dimensions
    SCREEN_WIDTH=480
    SCREEN_HEIGHT=800
    echo "⚠️  Using default resolution: ${SCREEN_WIDTH}x${SCREEN_HEIGHT}"
fi

# Configure touchscreen based on display type
echo "👆 Configuring touchscreen for $DISPLAY_TYPE..."

case "$DISPLAY_TYPE" in
    "dfrobot-dpi"|"dfrobot-dsi")
        # DFRobot ribbon cable displays need swapped + inverted X axes
        echo "Configuring DFRobot ribbon cable display touch..."
        for device in $(xinput list | grep -i "touch" | grep -oP 'id=\K[0-9]+'); do
            echo "Configuring DFRobot touch device ID: $device"
            # Swapped + Inverted X transformation (proven to work)
            xinput set-prop "$device" "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null || \
            xinput set-prop "$device" "libinput Calibration Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null || \
            echo "Could not set transformation for device $device"
        done
        ;;
    "raspberry-pi-hdmi"|"raspberry-pi-dsi")
        # Raspberry Pi official touchscreen
        xinput set-prop "ADS7846 Touchscreen" "Coordinate Transformation Matrix" 1 0 0 0 1 0 0 0 1 2>/dev/null || \
        echo "Touchscreen transformation not applied (device may not be present)"
        ;;
    *)
        # Generic touch configuration
        echo "Using generic touch configuration"
        # Try to configure any touch device found
        for device in $(xinput list | grep -i "touch" | grep -oP 'id=\K[0-9]+'); do
            xinput set-prop "$device" "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null || true
        done
        ;;
esac

# Set up display power management
echo "⚡ Configuring display settings..."
xset -dpms
xset s off  
xset s noblank

# Hide cursor
echo "🖱️ Hiding mouse cursor..."
unclutter -idle 1 &

echo "🌐 Starting Chromium in kiosk mode..."
exec chromium-browser \
    --kiosk \
    --app=http://localhost:3000 \
    --no-sandbox \
    --disable-infobars \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    --disable-features=TranslateUI,VizDisplayCompositor,TouchpadAndWheelScrollLatching,kBackgroundResourceFetch \
    --no-first-run \
    --fast \
    --fast-start \
    --disable-default-apps \
    --disable-popup-blocking \
    --disable-translate \
    --disable-background-timer-throttling \
    --disable-renderer-backgrounding \
    --disable-device-discovery-notifications \
    --disable-suggestions-service \
    --disable-save-password-bubble \
    --autoplay-policy=no-user-gesture-required \
    --disable-dev-shm-usage \
    --disable-extensions \
    --disable-plugins \
    --disable-web-security \
    --allow-running-insecure-content \
    --touch-events=enabled \
    --start-fullscreen \
    --window-size=${SCREEN_WIDTH:-480},${SCREEN_HEIGHT:-800} \
    --window-position=0,0 \
    --force-device-scale-factor=1 \
    --overscroll-history-navigation=0 \
    --disable-pinch \
    --disable-features=Translate \
    --hide-scrollbars \
    --no-default-browser-check \
    --no-first-run \
    --disable-background-color
EOF
chmod +x build/app-bundle/config/start-kiosk.sh

# Create touch screen calibration script
echo "📱 Creating touch screen calibration script..."
cat > build/app-bundle/config/calibrate-touch.sh << 'EOF'
#!/bin/bash
echo "Touch Screen Calibration Tool (Portrait Mode)"
echo "=============================================="
echo "This script helps calibrate your 5\" touchscreen in portrait mode."
echo ""
echo "Current configuration:"
echo "- Display: Portrait mode (90° counterclockwise rotation)"
echo "- Touch rotation: Configured with transformation matrix (no inversion)"
echo ""
echo "Touch configuration files:"
echo "- Hardware config: /boot/config.txt (ads7846 overlay)"
echo "- X11 config: /etc/X11/xorg.conf.d/99-calibration.conf"
echo ""
echo "To run interactive calibration:"
echo "1. Make sure X11 is running (startx)"
echo "2. Run: xinput_calibrator"
echo "3. Follow the on-screen instructions"
echo "4. Update values in X11 config if needed"
echo ""
echo "Portrait mode settings:"
echo "- TransformationMatrix: \"1 0 0 0 1 0 0 0 1\" (identity - no transformation)"
echo "- SwapAxes: enabled (hardware-level axis swapping for rotation)"
echo "- InvertX: disabled, InvertY: enabled (correct orientation for left rotation)"
echo ""
echo "Current hardware configuration:"
grep "ads7846" /boot/config.txt || echo "No ads7846 configuration found"
echo ""
echo "Current X11 touch configuration:"
cat /etc/X11/xorg.conf.d/99-calibration.conf 2>/dev/null || echo "X11 touch config not found"
EOF
chmod +x build/app-bundle/config/calibrate-touch.sh

# Create WiFi connection helper script
echo "📶 Creating WiFi helper script..."
cat > build/app-bundle/config/connect-wifi.sh << 'EOF'
#!/bin/bash
echo "WiFi Connection Helper"
echo "======================"
echo ""

# Check current WiFi status
echo "Current WiFi status:"
if rfkill list wifi | grep -q "Soft blocked: yes"; then
    echo "❌ WiFi is blocked by rfkill"
    echo "   Attempting to unblock..."
    sudo rfkill unblock wifi
    sleep 2
fi

iwconfig wlan0 2>/dev/null | grep ESSID

echo ""
echo "Attempting WiFi connection..."

# Check if wpa_supplicant is running
if pgrep -x "wpa_supplicant" > /dev/null; then
    echo "✅ wpa_supplicant is running"
else
    echo "🔄 Starting wpa_supplicant..."
    if sudo wpa_supplicant -B -i wlan0 -c /etc/wpa_supplicant/wpa_supplicant.conf; then
        echo "✅ wpa_supplicant started"
        sleep 5
        
        # Check if associated
        if iwconfig wlan0 2>/dev/null | grep -q "Access Point"; then
            echo "✅ WiFi associated"
            echo "   Getting IP address..."
            if sudo dhclient wlan0; then
                echo "✅ DHCP successful"
                ip addr show wlan0 | grep "inet "
            else
                echo "⚠️  WiFi associated but DHCP failed"
                echo "   Check router DHCP settings"
            fi
        else
            echo "❌ Failed to start wpa_supplicant"
            echo "   Check WiFi credentials in /etc/wpa_supplicant/wpa_supplicant.conf"
        fi
    else
        echo "❌ Failed to start wpa_supplicant"
        echo "   Check WiFi credentials in /etc/wpa_supplicant/wpa_supplicant.conf"
    fi
else
    echo "✅ WiFi already connected"
    iwconfig wlan0 2>/dev/null | grep ESSID
    ip addr show wlan0 | grep "inet "
fi

echo ""
echo "💡 Note: NFC terminal works with ethernet if WiFi fails"
echo "   Check service status: sudo systemctl status nfc-terminal"
EOF
chmod +x build/app-bundle/config/connect-wifi.sh

# Create GUI debug script
echo "🔍 Creating GUI debug script..."
cat > build/app-bundle/config/debug-gui.sh << 'EOF'
#!/bin/bash
echo "🔍 NFC Terminal GUI Debug Script"
echo "================================="
echo ""

echo "📊 System Status:"
echo "- Uptime: $(uptime)"
echo "- Default target: $(systemctl get-default)"
echo "- Current user: $(whoami)"
echo "- Groups: $(groups)"
echo ""

echo "🔧 Service Status:"
echo "- NFC Terminal: $(systemctl is-active nfc-terminal.service)"
echo "- Start GUI: $(systemctl is-active start-gui.service)"
echo "- Display Setup: $(systemctl is-active display-setup.service)"
echo ""

echo "🌐 Network Status:"
echo "- NFC Terminal responding: $(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 || echo "No response")"
echo ""

echo "🖥️ Display Status:"
echo "- X11 processes: $(ps aux | grep -E '[Xx]org|xinit|startx' | wc -l) running"
echo "- Chromium processes: $(ps aux | grep -v grep | grep chromium | wc -l) running"
echo ""

echo "📁 Critical Files Check:"
echo "- start-kiosk.sh: $(test -f /home/freepay/start-kiosk.sh && echo "✅ exists" || echo "❌ missing")"
echo "- start-kiosk.sh executable: $(test -x /home/freepay/start-kiosk.sh && echo "✅ yes" || echo "❌ no")"
echo "- .xinitrc: $(test -f /home/freepay/.xinitrc && echo "✅ exists" || echo "❌ missing")"
echo "- X11 wrapper config: $(test -f /etc/X11/Xwrapper.config && echo "✅ exists" || echo "❌ missing")"
echo ""

echo "📦 Required Packages:"
for pkg in chromium-browser openbox unclutter xinit curl; do
    if command -v $pkg >/dev/null 2>&1; then
        echo "- $pkg: ✅ installed"
    else
        echo "- $pkg: ❌ missing"
    fi
done
echo ""

echo "👤 User & Permissions:"
echo "- freepay user: $(id freepay 2>/dev/null || echo "❌ not found")"
echo "- freepay groups: $(groups freepay 2>/dev/null || echo "❌ cannot check")"
echo "- Runtime dir: $(test -d /run/user/1000 && echo "✅ exists" || echo "❌ missing")"
echo "- Runtime ownership: $(ls -ld /run/user/1000 2>/dev/null | awk '{print $3":"$4}' || echo "❌ cannot check")"
echo ""

echo "🖥️ X11 Configuration:"
echo "- X11 wrapper config:"
cat /etc/X11/Xwrapper.config 2>/dev/null || echo "❌ File not found"
echo ""

echo "📋 Detailed Service Logs (last 20 lines):"
echo ""
echo "=== NFC Terminal Service ==="
sudo journalctl -u nfc-terminal.service --no-pager -l -n 20
echo ""
echo "=== Start GUI Service ==="
sudo journalctl -u start-gui.service --no-pager -l -n 20
echo ""

echo "🔧 Manual Test Commands:"
echo ""
echo "To test GUI manually:"
echo "1. Stop the service: sudo systemctl stop start-gui.service"
echo "2. Kill any stuck X processes: sudo pkill -f 'Xorg|xinit'"
echo "3. Test kiosk script directly: sudo -u freepay /home/freepay/start-kiosk.sh"
echo "4. Test X11 manually: sudo -u freepay DISPLAY=:0 startx /home/freepay/start-kiosk.sh -- :0 vt1"
echo ""
echo "To see live logs:"
echo "sudo journalctl -u start-gui.service -f"
echo ""
echo "To restart everything cleanly:"
echo "sudo systemctl stop start-gui.service"
echo "sudo pkill -f 'Xorg|xinit|chromium'"
echo "sudo systemctl start start-gui.service"
echo ""
EOF
chmod +x build/app-bundle/config/debug-gui.sh

# Create display detection script
echo "🔍 Creating display detection script..."
cat > build/app-bundle/config/detect-display.sh << 'EOF'
#!/bin/bash
set -e

echo "🔍 Detecting Display Type and Configuration..."
echo "============================================"

# Function to detect display type
detect_display() {
    local display_type="unknown"
    
    # Check for DFRobot display markers (ribbon cable DSI/DPI)
    if [ -e "/sys/class/drm/card0-DSI-1" ] || [ -e "/sys/class/drm/card1-DSI-1" ]; then
        # Check if it's DFRobot by looking at EDID or other markers
        if dmesg | grep -i "dfrobot" > /dev/null 2>&1; then
            display_type="dfrobot-dsi"
        else
            display_type="raspberry-pi-dsi"
        fi
    elif [ -e "/sys/class/drm/card0-DPI-1" ] || [ -e "/sys/class/drm/card1-DPI-1" ]; then
        display_type="dfrobot-dpi"
    # Check for HDMI displays with touch controllers
    elif dmesg | grep -i "ads7846" > /dev/null 2>&1; then
        display_type="raspberry-pi-hdmi"
    elif xinput list 2>/dev/null | grep -i "ADS7846" > /dev/null; then
        display_type="raspberry-pi-hdmi"
    else
        display_type="generic"
    fi
    
    echo "$display_type"
}

# Function to get display resolution
get_display_info() {
    local info=""
    if command -v xrandr > /dev/null 2>&1 && [ -n "$DISPLAY" ]; then
        info=$(xrandr 2>/dev/null | grep " connected" | head -1 || echo "")
    fi
    echo "$info"
}

# Main detection
DISPLAY_TYPE=$(detect_display)
echo "📺 Detected Display Type: $DISPLAY_TYPE"

# Get current display info
if [ -n "$DISPLAY" ]; then
    DISPLAY_INFO=$(get_display_info)
    echo "🖥️  Display Info: $DISPLAY_INFO"
fi

# Show current boot configuration
echo ""
echo "🔧 Current Boot Configuration:"
echo "=============================="
if [ -r /boot/config.txt ]; then
    echo "Display rotation: $(grep "display_rotate" /boot/config.txt 2>/dev/null || echo "not set")"
    echo "HDMI mode: $(grep "hdmi_mode" /boot/config.txt 2>/dev/null || echo "not set")"
    echo "Framebuffer: $(grep "framebuffer" /boot/config.txt 2>/dev/null || echo "not set")"
    echo "Touch overlay: $(grep "dtoverlay=ads7846" /boot/config.txt 2>/dev/null || echo "not set")"
else
    echo "❌ Cannot read /boot/config.txt"
fi

# Show touch devices
echo ""
echo "👆 Touch Devices:"
echo "================"
if command -v xinput > /dev/null 2>&1 && [ -n "$DISPLAY" ]; then
    xinput list 2>/dev/null | grep -i "touch\|pointer" | grep -v "Virtual core" || echo "No touch devices found via xinput"
else
    echo "xinput not available or no display"
fi

# Show DSI/DPI status
echo ""
echo "🔌 Display Interfaces:"
echo "====================="
for interface in /sys/class/drm/card*-*; do
    if [ -e "$interface" ]; then
        echo "Found: $(basename $interface)"
    fi
done

# Provide configuration recommendations
echo ""
echo "💡 Configuration Recommendations:"
echo "================================"

case "$DISPLAY_TYPE" in
    "dfrobot-dsi"|"dfrobot-dpi")
        echo "✅ DFRobot 5\" Display Detected (Ribbon Cable)"
        echo ""
        echo "Recommended settings:"
        echo "- Display connected via DSI/DPI ribbon cable"
        echo "- May need specific DPI timing configuration"
        echo "- Touch interface may be I2C or SPI based"
        echo ""
        echo "If display is cut off or misaligned:"
        echo "  sudo /home/freepay/fix-dfrobot-display.sh"
        ;;
    
    "raspberry-pi-hdmi"|"raspberry-pi-dsi")
        echo "✅ Raspberry Pi Official Display Detected"
        echo ""
        echo "Current configuration should work correctly."
        echo "Touch calibration is set for ADS7846 controller."
        ;;
    
    *)
        echo "⚠️  Unknown Display Type"
        echo ""
        echo "Using generic configuration."
        echo "You may need to manually configure display and touch settings."
        ;;
esac
EOF
chmod +x build/app-bundle/config/detect-display.sh

# Create DFRobot display fix script
echo "🔧 Creating DFRobot display fix script..."
cat > build/app-bundle/config/fix-dfrobot-display.sh << 'EOF'
#!/bin/bash
set -e

echo "🔧 Fixing DFRobot 5\" Display Configuration (Ribbon Cable)..."
echo "======================================================="

# Function to detect display type
detect_display_output() {
    for output in DSI-1 DPI-1 HDMI-1 HDMI-2 HDMI-A-1; do
        if xrandr 2>/dev/null | grep "$output connected" > /dev/null; then
            echo "$output"
            return 0
        fi
    done
    echo "DSI-1"  # Default for ribbon cable displays
}

# Apply immediate X11 configuration
echo "📱 Applying display configuration..."

# Detect active display output
DISPLAY_OUTPUT=$(detect_display_output)
echo "✅ Active display output: $DISPLAY_OUTPUT"

# Apply rotation
if xrandr --output "$DISPLAY_OUTPUT" --rotate left 2>/dev/null; then
    echo "✅ Display rotated to portrait mode"
else
    echo "⚠️  Could not apply rotation via xrandr"
fi

# Get actual resolution
RESOLUTION=$(xrandr 2>/dev/null | grep "$DISPLAY_OUTPUT" | grep -oP '\d+x\d+' | head -1)
echo "📏 Current resolution: $RESOLUTION"

# Fix DPI/DSI configuration if needed
echo "🖼️  Checking display interface configuration..."
if [ -w /boot/config.txt ]; then
    # Backup config
    sudo cp /boot/config.txt /boot/config.txt.backup-dfrobot
    echo "✅ Backed up /boot/config.txt"
    
    # Add DPI configuration for DFRobot displays
    if [[ "$DISPLAY_OUTPUT" == "DPI-1" ]] && ! grep -q "dpi_group" /boot/config.txt; then
        echo "" | sudo tee -a /boot/config.txt
        echo "# DFRobot DPI display configuration" | sudo tee -a /boot/config.txt
        echo "dpi_group=2" | sudo tee -a /boot/config.txt
        echo "dpi_mode=87" | sudo tee -a /boot/config.txt
        echo "dpi_timings=800 0 40 48 88 480 0 13 3 32 0 0 0 60 0 32000000 6" | sudo tee -a /boot/config.txt
        echo "✅ Added DPI timing configuration"
    fi
    
    # Update framebuffer settings
    if ! grep -q "framebuffer_width" /boot/config.txt; then
        echo "" | sudo tee -a /boot/config.txt
        echo "# DFRobot display framebuffer settings" | sudo tee -a /boot/config.txt
        echo "framebuffer_width=800" | sudo tee -a /boot/config.txt
        echo "framebuffer_height=480" | sudo tee -a /boot/config.txt
        echo "✅ Added framebuffer settings"
    else
        echo "ℹ️  Framebuffer settings already present"
    fi
    
    # Ensure overscan is disabled
    sudo sed -i 's/^#*disable_overscan=.*/disable_overscan=1/' /boot/config.txt
    if ! grep -q "overscan_" /boot/config.txt; then
        echo "overscan_left=0" | sudo tee -a /boot/config.txt
        echo "overscan_right=0" | sudo tee -a /boot/config.txt
        echo "overscan_top=0" | sudo tee -a /boot/config.txt
        echo "overscan_bottom=0" | sudo tee -a /boot/config.txt
        echo "✅ Added overscan settings"
    fi
fi

# Configure touch for DFRobot (may be I2C or SPI based)
echo "👆 Configuring touch input..."

# Find touch devices (could be I2C, SPI, or other)
TOUCH_DEVICES=$(xinput list 2>/dev/null | grep -i "touch" | grep -oP 'id=\K[0-9]+' || true)

if [ -n "$TOUCH_DEVICES" ]; then
    for device in $TOUCH_DEVICES; do
        DEVICE_NAME=$(xinput list --name-only "$device" 2>/dev/null || echo "Device $device")
        echo "📱 Configuring touch device: $DEVICE_NAME (ID: $device)"
        
        # Apply swapped + inverted X transformation (proven to work for DFRobot)
        if xinput set-prop "$device" "Coordinate Transformation Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null; then
            echo "✅ Applied transformation matrix (Swapped + Inverted X)"
        elif xinput set-prop "$device" "libinput Calibration Matrix" 0 -1 1 1 0 0 0 0 1 2>/dev/null; then
            echo "✅ Applied libinput calibration matrix (Swapped + Inverted X)"
        else
            echo "⚠️  Could not apply transformation"
        fi
    done
else
    echo "⚠️  No touch devices found"
    echo "Touch controller may need I2C/SPI enabled in /boot/config.txt"
fi

# Update X11 configuration for persistence
echo "💾 Updating X11 configuration..."
sudo mkdir -p /etc/X11/xorg.conf.d

sudo tee /etc/X11/xorg.conf.d/99-dfrobot.conf > /dev/null << 'XCONF'
# DFRobot 5" Display Configuration (Ribbon Cable)
Section "InputClass"
    Identifier "dfrobot-touch"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "evdev"
    # Swapped + Inverted X transformation (proven to work for DFRobot)
    Option "TransformationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection

Section "InputClass"
    Identifier "dfrobot-libinput-touch"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "libinput"
    # Swapped + Inverted X calibration (proven to work for DFRobot)
    Option "CalibrationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection
XCONF

echo "✅ Created /etc/X11/xorg.conf.d/99-dfrobot.conf"

# Restart display manager to apply changes
echo ""
echo "🔄 Applying changes..."
if systemctl is-active --quiet start-gui.service; then
    echo "Restarting GUI service..."
    sudo systemctl restart start-gui.service
    echo "✅ GUI service restarted"
fi

echo ""
echo "✅ DFRobot display configuration completed!"
echo ""
echo "📋 Summary of changes:"
echo "- Display rotated to portrait mode"
echo "- DPI/DSI timing configured (if applicable)"
echo "- Framebuffer set to 800x480"
echo "- Overscan disabled completely"
echo "- Touch transformation matrix applied"
echo "- X11 configuration saved for persistence"
echo ""
echo "🔄 Next steps:"
echo "1. Test touch by tapping different areas of the screen"
echo "2. If display still has issues, reboot the system:"
echo "   sudo reboot"
echo ""
echo "🔙 To revert changes:"
echo "- Config backup: sudo cp /boot/config.txt.backup-dfrobot /boot/config.txt"
echo "- Remove X11 config: sudo rm /etc/X11/xorg.conf.d/99-dfrobot.conf"
EOF
chmod +x build/app-bundle/config/fix-dfrobot-display.sh

# Create .xinitrc for X11 startup (enhanced with complete portrait mode support)
echo "🪟 Creating .xinitrc..."
cat > build/app-bundle/config/xinitrc << 'EOF'
#!/bin/bash
echo "🪟 Starting X11 session with portrait mode..."

# Set display
export DISPLAY=:0

# Disable screen saver and power management
echo "⚡ Configuring display power management..."
xset -dpms
xset s off
xset s noblank

# Configure display rotation (90 degrees counterclockwise for portrait)
echo "🔄 Setting up portrait display rotation..."
xrandr --output HDMI-1 --rotate left 2>/dev/null || \
xrandr --output HDMI-2 --rotate left 2>/dev/null || \
xrandr --output HDMI-A-1 --rotate left 2>/dev/null || \
echo "Display rotation not applied (may be configured at boot level)"

# Configure touchscreen for portrait mode (swap axes approach)
echo "👆 Configuring touchscreen transformation..."
xinput set-prop "ADS7846 Touchscreen" "Coordinate Transformation Matrix" 1 0 0 0 1 0 0 0 1 2>/dev/null || \
echo "Touchscreen transformation not applied (device may not be present)"

# Hide cursor after 1 second of inactivity
echo "🖱️ Hiding mouse cursor..."
unclutter -idle 1 &

# Start window manager
echo "🪟 Starting window manager..."
openbox-session &

# Wait for window manager to initialize
echo "⏳ Waiting for window manager..."
sleep 3

# Start the kiosk application
echo "🚀 Launching kiosk application..."
exec /home/freepay/start-kiosk.sh
EOF
chmod +x build/app-bundle/config/xinitrc

# Create .bashrc append for freepay user (minimal - using systemd service for GUI)
echo "📝 Creating bashrc configuration..."
cat > build/app-bundle/config/bashrc-append << 'EOF'

# freepay user configuration
export PATH="/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games"
EOF

# Create X11 input configuration for multiple touchscreen types
echo "👆 Creating X11 touch configuration..."
mkdir -p build/app-bundle/config/xorg.conf.d
cat > build/app-bundle/config/xorg.conf.d/99-calibration.conf << 'EOF'
# Configuration for Raspberry Pi official touchscreen
Section "InputClass"
    Identifier "calibration-rpi"
    MatchProduct "ADS7846 Touchscreen"
    Option "Calibration" "200 3900 200 3900"
    Option "SwapAxes" "0"
    Option "InvertX" "true"
    Option "InvertY" "false"
    Option "TransformationMatrix" "1 0 0 0 1 0 0 0 1"
EndSection

# Configuration for FT5x06 touch controller (used by DFRobot displays)
Section "InputClass"
    Identifier "ft5x06-dfrobot-touch"
    MatchProduct "ft5x06"
    MatchIsTouchscreen "on"
    Driver "libinput"
    # Swapped + Inverted X calibration for DFRobot displays
    Option "CalibrationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection

# Alternative match for FT5x06
Section "InputClass"
    Identifier "ft5x06-generic-touch"
    MatchProduct "generic ft5x06"
    MatchIsTouchscreen "on"
    Driver "libinput"
    # Swapped + Inverted X calibration
    Option "CalibrationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection

# Configuration for DFRobot touchscreens (ribbon cable) - fallback
Section "InputClass"
    Identifier "calibration-dfrobot"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "evdev"
    # Swapped + Inverted X transformation for DFRobot displays
    Option "TransformationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection

# Configuration for DFRobot with libinput driver - fallback
Section "InputClass"
    Identifier "calibration-dfrobot-libinput"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "libinput"
    # Swapped + Inverted X calibration for DFRobot displays
    Option "CalibrationMatrix" "0 -1 1 1 0 0 0 0 1"
EndSection

# Generic touchscreen configuration
Section "InputClass"
    Identifier "evdev touchscreen catchall"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "evdev"
    Option "TransformationMatrix" "1 0 0 0 1 0 0 0 1"
EndSection

# Libinput configuration for modern touchscreens
Section "InputClass"
    Identifier "libinput touchscreen catchall"
    MatchIsTouchscreen "on"
    MatchDevicePath "/dev/input/event*"
    Driver "libinput"
    Option "CalibrationMatrix" "1 0 0 0 1 0 0 0 1"
EndSection
EOF

# Create udev rule for WiFi unblocking
echo "📡 Creating udev rules..."
mkdir -p build/app-bundle/config/udev/rules.d
cat > build/app-bundle/config/udev/rules.d/10-wifi-unblock.rules << 'EOF'
# Automatically unblock WiFi on boot
ACTION=="add", SUBSYSTEM=="rfkill", ATTR{type}=="wlan", ATTR{state}="0"
EOF

# Create user setup scripts
echo "👤 Creating user setup scripts..."

# SSH user setup script
cat > build/app-bundle/config/setup-ssh-user.sh << 'EOF'
#!/bin/bash
echo "Setting up SSH user..."

# Set default values if not provided
SSH_USERNAME=${SSH_USERNAME:-freepay}
SSH_PASSWORD=${SSH_PASSWORD:-freepay}

echo "Setting up SSH user: $SSH_USERNAME"

if [ -z "$SSH_USERNAME" ] || [ "$SSH_USERNAME" = "SSH_USERNAME_VALUE" ]; then
    echo "❌ No valid SSH username provided, skipping SSH user setup"
    exit 0
fi

# Create the user if it doesn't exist
if ! id "$SSH_USERNAME" &>/dev/null; then
    if useradd -m -s /bin/bash "$SSH_USERNAME"; then
        echo "✅ User $SSH_USERNAME created"
    else
        echo "❌ Failed to create user $SSH_USERNAME"
        exit 1
    fi
else
    echo "✅ User $SSH_USERNAME already exists"
fi

# Set password
if echo "$SSH_USERNAME:$SSH_PASSWORD" | chpasswd; then
    echo "✅ Password set for $SSH_USERNAME"
else
    echo "❌ Failed to set password for $SSH_USERNAME"
    exit 1
fi

# Add user to essential groups
echo "Adding $SSH_USERNAME to groups..."
for group in sudo plugdev dialout; do
    if getent group "$group" &>/dev/null; then
        if usermod -aG "$group" "$SSH_USERNAME"; then
            echo "✅ Added $SSH_USERNAME to $group group"
        else
            echo "❌ Failed to add $SSH_USERNAME to $group group"
        fi
    else
        echo "⚠️  Group $group does not exist"
    fi
done

# Ensure SSH directory exists for the user
echo "Setting up SSH directory..."
if mkdir -p "/home/$SSH_USERNAME/.ssh" && chmod 700 "/home/$SSH_USERNAME/.ssh" && chown "$SSH_USERNAME:$SSH_USERNAME" "/home/$SSH_USERNAME/.ssh"; then
    echo "✅ SSH directory setup completed"
else
    echo "❌ Failed to setup SSH directory"
fi

echo "✅ SSH user $SSH_USERNAME setup completed successfully"
EOF
chmod +x build/app-bundle/config/setup-ssh-user.sh

# Freepay user setup script
cat > build/app-bundle/config/setup-freepay-user.sh << 'EOF'
#!/bin/bash
echo "Setting up main freepay user..."

# Function to safely create user
create_freepay_user() {
    # Kill any processes by existing freepay user
    pkill -u freepay 2>/dev/null || true
    sleep 1
    
    # Remove existing freepay user if it exists
    if id freepay &>/dev/null; then
        echo "Removing existing freepay user..."
        userdel -r freepay 2>/dev/null || userdel -f freepay 2>/dev/null || true
        # Clean up home directory if it still exists
        rm -rf /home/freepay 2>/dev/null || true
    fi
    
    # Check if UID 1000 is taken by another user
    if getent passwd 1000 &>/dev/null; then
        existing_user=$(getent passwd 1000 | cut -d: -f1)
        if [ "$existing_user" != "freepay" ]; then
            echo "UID 1000 taken by $existing_user, removing..."
            pkill -u "$existing_user" 2>/dev/null || true
            sleep 1
            userdel -r "$existing_user" 2>/dev/null || userdel -f "$existing_user" 2>/dev/null || true
            # Clean up any remaining home directory
            rm -rf "/home/$existing_user" 2>/dev/null || true
        fi
    fi
    
    # Ensure no conflicting home directory exists
    if [ -d "/home/freepay" ]; then
        echo "Cleaning up existing home directory..."
        rm -rf /home/freepay
    fi
    
    # Create freepay user with UID 1000
    echo "Creating freepay user with UID 1000..."
    if useradd -m -s /bin/bash -u 1000 -U freepay; then
        echo "✅ freepay user created successfully"
    else
        echo "❌ Failed to create with UID 1000, trying alternative..."
        # Try without specific UID as fallback
        if useradd -m -s /bin/bash -U freepay; then
            echo "✅ freepay user created with auto-assigned UID"
        else
            echo "❌ Failed to create freepay user"
            return 1
        fi
    fi
}

# Attempt user creation
if ! create_freepay_user; then
    echo "❌ Failed to create freepay user, exiting"
    exit 1
fi

# Set password - try multiple methods for reliability
echo "Setting password for freepay..."
if echo "freepay:freepay" | chpasswd; then
    echo "✅ Password set via chpasswd"
elif printf "freepay\nfreepay\n" | passwd freepay; then
    echo "✅ Password set via passwd"
else
    echo "❌ Failed to set password"
fi

# Add to groups
echo "Adding freepay to essential groups..."
for group in sudo plugdev dialout video audio input tty users; do
    if getent group "$group" &>/dev/null; then
        usermod -aG "$group" freepay && echo "✅ Added to $group" || echo "❌ Failed to add to $group"
    else
        echo "⚠️  Group $group does not exist"
    fi
done

# Setup directories
echo "Setting up directories..."
mkdir -p /home/freepay
chown -R freepay:freepay /home/freepay 2>/dev/null || echo "❌ Failed to set home ownership"
chmod 755 /home/freepay

# Setup runtime directory for X11
user_id=$(id -u freepay 2>/dev/null || echo "1000")
mkdir -p "/run/user/$user_id"
chown freepay:freepay "/run/user/$user_id" 2>/dev/null || echo "❌ Failed to set runtime dir ownership"
chmod 700 "/run/user/$user_id"

# Add to sudoers for passwordless sudo
echo "Setting up sudo access..."
mkdir -p /etc/sudoers.d
echo "freepay ALL=(ALL) NOPASSWD:ALL" > /etc/sudoers.d/freepay
chmod 440 /etc/sudoers.d/freepay

# Verify setup
echo "Verifying freepay user setup..."
if id freepay &>/dev/null; then
    echo "✅ User info: $(id freepay)"
    echo "✅ Groups: $(groups freepay)"
    echo "✅ Home: $(ls -ld /home/freepay 2>/dev/null || echo 'not found')"
    echo "✅ Runtime: $(ls -ld /run/user/$user_id 2>/dev/null || echo 'not found')"
    echo "✅ Freepay user setup completed successfully"
else
    echo "❌ ERROR: freepay user verification failed"
    exit 1
fi
EOF
chmod +x build/app-bundle/config/setup-freepay-user.sh

echo ""
echo "✅ Production build complete!"
echo ""
echo "Created files:"
echo "  - build/app-bundle/ (complete application bundle)"
echo "  - build/app-bundle/app/ (built application)"
echo "  - build/app-bundle/config/ (systemd services & helper scripts)"
echo "  - build/app-bundle/install-on-pi.sh (Pi installation script)"
echo "  - build/app-bundle/.env.template (environment template)"
echo ""
echo "Configuration files created:"
echo "  - *.service files (systemd services)"
echo "  - Helper scripts (start-kiosk.sh, debug-gui.sh, etc.)"
echo "  - X11 configuration (xinitrc, touch calibration)"
echo "  - User setup scripts (freepay & SSH users)"
echo ""
echo "Next: Run image creation script to embed this into Raspberry Pi image" 