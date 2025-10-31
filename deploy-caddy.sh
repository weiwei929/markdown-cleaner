#!/bin/bash

# Markdown Cleaner 一键部署脚本 (Caddy 版本)
# 适用于 Ubuntu 20.04+ / Debian 11+

set -e

echo "🚀 开始部署 Markdown Cleaner..."

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查是否为 root 用户
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}请不要使用 root 用户运行此脚本${NC}"
   exit 1
fi

# 获取域名
read -p "请输入你的域名 (例如: markdown.example.com): " DOMAIN
if [[ -z "$DOMAIN" ]]; then
    echo -e "${RED}域名不能为空${NC}"
    exit 1
fi

echo -e "${GREEN}📋 准备为域名 $DOMAIN 部署 Markdown Cleaner${NC}"

# 更新系统
echo -e "${YELLOW}📦 更新系统包...${NC}"
sudo apt update && sudo apt upgrade -y

# 安装 Node.js
echo -e "${YELLOW}📦 安装 Node.js...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 安装 Caddy
echo -e "${YELLOW}📦 安装 Caddy...${NC}"
if ! command -v caddy &> /dev/null; then
    sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
    sudo apt update && sudo apt install caddy
fi

echo "✅ Caddy 版本: $(caddy version)"

# 克隆项目
echo -e "${YELLOW}📥 下载项目源码...${NC}"
if [[ -d "markdown-cleaner" ]]; then
    echo "⚠️  项目目录已存在，正在更新..."
    cd markdown-cleaner
    git pull origin main
else
    git clone https://github.com/weiwei929/markdown-cleaner.git
    cd markdown-cleaner
fi

# 安装依赖
echo -e "${YELLOW}📦 安装项目依赖...${NC}"
npm install --production

# 安装 PM2
echo -e "${YELLOW}📦 安装 PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
fi

# 启动应用
echo -e "${YELLOW}🚀 启动应用...${NC}"
pm2 delete markdown-cleaner 2>/dev/null || true
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup | tail -n 1 | sudo bash
pm2 save

# 配置 Caddy
echo -e "${YELLOW}⚙️  配置 Caddy...${NC}"
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
$DOMAIN {
    reverse_proxy localhost:3000
    encode gzip
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options nosniff
        X-Frame-Options DENY
        X-XSS-Protection "1; mode=block"
    }
    
    request_body {
        max_size 10MB
    }
}
EOF

# 重启 Caddy
echo -e "${YELLOW}🔄 重启 Caddy...${NC}"
sudo systemctl enable caddy
sudo systemctl restart caddy

# 配置防火墙
echo -e "${YELLOW}🛡️  配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
    sudo ufw allow 22    # SSH
    sudo ufw allow 80    # HTTP
    sudo ufw allow 443   # HTTPS
    sudo ufw --force enable
fi

# 检查服务状态
echo -e "${YELLOW}🔍 检查服务状态...${NC}"
sleep 3

echo "📊 应用状态:"
pm2 status

echo "📊 Caddy 状态:"
sudo systemctl status caddy --no-pager -l

# 完成
echo ""
echo -e "${GREEN}🎉 部署完成！${NC}"
echo ""
echo -e "${GREEN}📍 访问地址: https://$DOMAIN${NC}"
echo ""
echo "📋 管理命令:"
echo "  查看应用日志: pm2 logs markdown-cleaner"
echo "  重启应用:     pm2 restart markdown-cleaner"
echo "  查看 Caddy 日志: sudo journalctl -u caddy -f"
echo ""
echo "🔒 Caddy 已自动申请 SSL 证书，你的网站现在支持 HTTPS！"
echo ""
echo -e "${YELLOW}⚠️  请确保域名 $DOMAIN 已正确解析到此服务器 IP${NC}"