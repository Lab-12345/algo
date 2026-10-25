#!/bin/bash
# TradePilot VPS Deployment Script for Ubuntu 22.04 / 24.04 LTS (AWS Lightsail)
set -e

echo "=== TradePilot VPS Deployment Initiated ==="

# 1. Update OS packages
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git ufw nginx

# 2. Check and print public outbound IPv4
OUTBOUND_IP=$(curl -4s https://checkip.amazonaws.com)
echo "Current Outbound Public IPv4: $OUTBOUND_IP"
echo "Ensure this exact IPv4 is registered in your Angel One SmartAPI Developer Portal."

# 3. Setup UFW Firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

# 4. Install Node.js LTS (v20.x) if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

# 5. Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2 process manager..."
    sudo npm install -g pm2
fi

# 6. Install project dependencies & build
npm install
npm --workspace=client run build

# 7. Configure Nginx
sudo cp ops/nginx/tradepilot.conf /etc/nginx/sites-available/tradepilot
sudo ln -sf /etc/nginx/sites-available/tradepilot /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 8. Start PM2 processes
mkdir -p logs
pm2 start ops/pm2/ecosystem.config.cjs
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo "=== TradePilot successfully deployed! ==="
