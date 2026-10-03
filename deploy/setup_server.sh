#!/usr/bin/env bash
# Quick Server Hardening & Docker Setup Script for Ubuntu 24.04 LTS
# Matching Step 2 from Section 7 of the Dairy Parlour Project Plan
set -euo pipefail

echo "==> Updating system packages..."
sudo apt update && sudo apt upgrade -y

echo "==> Configuring firewall (UFW)..."
sudo ufw allow 22/tcp comment 'SSH'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
sudo ufw --force enable

echo "==> Creating 2GB swapfile for 1GB RAM VM stability..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

echo "==> Installing Docker and Docker Compose..."
if ! command -v docker >/dev/null 2>&1; then
    curl -fsSL https://get.docker.com | sudo sh
fi

echo "==> Setup completed! You can now start the application with:"
echo "    docker compose -f docker-compose.prod.yml up -d --build"
