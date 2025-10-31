# VPS 部署指南

## 环境要求
- Ubuntu 18.04+ / CentOS 7+ / Debian 9+
- Node.js 16+ 
- 内存: 512MB+
- 硬盘: 1GB+

## 快速部署

### 1. 安装 Node.js
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
sudo yum install -y nodejs
```

### 2. 部署应用
```bash
# 克隆项目
git clone https://github.com/weiwei929/markdown-cleaner.git
cd markdown-cleaner

# 安装依赖
npm install --production

# 安装 PM2 进程管理器
sudo npm install -g pm2
```

### 3. 启动服务
```bash
# 使用 PM2 启动
pm2 start ecosystem.config.js --env production

# 设置开机自启
pm2 startup
pm2 save
```

### 4. 配置反向代理 (Nginx)
```bash
# 安装 Nginx
sudo apt install nginx  # Ubuntu/Debian
sudo yum install nginx  # CentOS

# 创建配置文件
sudo nano /etc/nginx/sites-available/markdown-cleaner
```

```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/markdown-cleaner /etc/nginx/sites-enabled/
sudo nginx -t  # 测试配置
sudo systemctl restart nginx
```

### 5. SSL 证书 (可选)
```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx

# 获取免费 SSL 证书
sudo certbot --nginx -d your-domain.com
```

## 安全配置

### 防火墙设置
```bash
# Ubuntu (UFW)
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# CentOS (Firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 限制访问 (可选)
如果只想内部使用，可以在 Nginx 配置中添加 IP 白名单：

```nginx
location / {
    allow 192.168.1.0/24;  # 允许内网访问
    allow your.ip.address;  # 允许特定 IP
    deny all;               # 拒绝其他访问
    
    proxy_pass http://localhost:3000;
    # ... 其他配置
}
```

## 管理命令

### PM2 常用命令
```bash
pm2 status              # 查看状态
pm2 logs                # 查看日志
pm2 restart all         # 重启应用
pm2 stop all           # 停止应用
pm2 delete all         # 删除应用
pm2 monit              # 监控面板
```

### 更新应用
```bash
cd markdown-cleaner
git pull origin main    # 拉取最新代码
npm install            # 安装新依赖
pm2 restart all        # 重启应用
```

## 监控和维护

### 日志管理
```bash
# 查看应用日志
pm2 logs markdown-cleaner

# 查看 Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 性能监控
```bash
# 系统资源
htop
df -h
free -h

# 应用监控
pm2 monit
```

## 故障排查

1. **端口占用**: `sudo netstat -tlnp | grep 3000`
2. **进程状态**: `pm2 status`
3. **日志检查**: `pm2 logs` 和 `sudo tail -f /var/log/nginx/error.log`
4. **权限问题**: 确保文件权限正确 `sudo chown -R $USER:$USER .`

## 备份建议

```bash
# 定期备份配置文件
tar -czf backup-$(date +%Y%m%d).tar.gz markdown-cleaner/ /etc/nginx/sites-available/
```