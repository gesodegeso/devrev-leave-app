#!/bin/bash

# Deployment script for Teams Leave Bot on Ubuntu 24.04

set -e

echo "Teams Leave Bot Deployment Script"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
APP_DIR="${SCRIPT_DIR}"
APP_USER="${SUDO_USER:-$USER}"

echo -e "${GREEN}Step 1: Installing system dependencies${NC}"
apt-get update
apt-get install -y curl git nginx certbot python3-certbot-nginx

# Install Node.js 20.x
if ! command -v node &> /dev/null; then
    echo -e "${GREEN}Installing Node.js 20.x${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo -e "${YELLOW}Node.js already installed${NC}"
fi

# Install PM2 globally
if ! command -v pm2 &> /dev/null; then
    echo -e "${GREEN}Installing PM2${NC}"
    npm install -g pm2
else
    echo -e "${YELLOW}PM2 already installed${NC}"
fi

echo -e "${GREEN}Step 2: Installing application dependencies${NC}"
cd "${APP_DIR}"
npm install --production

echo -e "${GREEN}Step 3: Setting up environment file${NC}"
if [ ! -f "${APP_DIR}/.env" ]; then
    echo -e "${YELLOW}Creating .env file from .env.example${NC}"
    cp "${APP_DIR}/.env.example" "${APP_DIR}/.env"
    echo -e "${RED}WARNING: Please edit .env file with your actual credentials!${NC}"
else
    echo -e "${YELLOW}.env file already exists${NC}"
fi

echo -e "${GREEN}Step 4: Creating logs directory${NC}"
mkdir -p "${APP_DIR}/logs"
chown -R "${APP_USER}:${APP_USER}" "${APP_DIR}/logs"

echo -e "${GREEN}Step 5: Setting up PM2${NC}"
# Stop existing process if any
sudo -u "${APP_USER}" pm2 delete teams-leave-bot 2>/dev/null || true

# Start the application
sudo -u "${APP_USER}" pm2 start "${APP_DIR}/ecosystem.config.js" --env production

# Save PM2 configuration
sudo -u "${APP_USER}" pm2 save

# Setup PM2 to start on system boot
pm2 startup systemd -u "${APP_USER}" --hp "/home/${APP_USER}"
sudo -u "${APP_USER}" pm2 save

echo -e "${GREEN}Step 6: Configuring Nginx${NC}"
if [ -f "${APP_DIR}/nginx.conf.example" ]; then
    echo -e "${YELLOW}Please configure nginx.conf.example with your domain and SSL certificates${NC}"
    echo -e "${YELLOW}Then copy it to /etc/nginx/sites-available/teams-bot${NC}"
    echo -e "${YELLOW}And create symlink: ln -s /etc/nginx/sites-available/teams-bot /etc/nginx/sites-enabled/${NC}"
fi

echo -e "${GREEN}Step 7: Firewall configuration${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo -e "${GREEN}Firewall rules added for ports 80 and 443${NC}"
fi

echo ""
echo -e "${GREEN}=================================="
echo "Deployment Complete!"
echo -e "==================================${NC}"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Bot credentials and DevRev API token"
echo "2. Configure nginx.conf.example with your domain"
echo "3. Copy nginx config: sudo cp nginx.conf.example /etc/nginx/sites-available/teams-bot"
echo "4. Create symlink: sudo ln -s /etc/nginx/sites-available/teams-bot /etc/nginx/sites-enabled/"
echo "5. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "6. Test nginx config: sudo nginx -t"
echo "7. Reload nginx: sudo systemctl reload nginx"
echo "8. Restart bot: pm2 restart teams-leave-bot"
echo ""
echo "Useful commands:"
echo "  - View logs: pm2 logs teams-leave-bot"
echo "  - Restart bot: pm2 restart teams-leave-bot"
echo "  - Stop bot: pm2 stop teams-leave-bot"
echo "  - Bot status: pm2 status"
echo ""
