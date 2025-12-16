# 博客项目部署指南

## 1. 服务器准备

### 1.1 选择服务器
推荐选择：
- 阿里云ECS
- 腾讯云CVM
- 华为云ECS
- Vultr
- DigitalOcean

### 1.2 安装操作系统
推荐使用：
- Ubuntu 22.04 LTS
- CentOS 7/8

### 1.3 服务器初始化
```bash
# 更新系统
apt update && apt upgrade -y

# 安装必要工具
apt install -y git nginx nodejs npm

# 安装PM2（用于管理Node.js进程）
npm install -g pm2
```

## 2. 域名解析设置

### 2.1 登录域名提供商控制台
登录您购买域名的提供商控制台（如阿里云、腾讯云、万网等）。

### 2.2 添加DNS记录
添加两条A记录：
| 记录类型 | 主机记录 | 记录值 | TTL |
|----------|----------|--------|-----|
| A        | @        | 服务器IP | 10分钟 |
| A        | www      | 服务器IP | 10分钟 |

## 3. 博客项目部署

### 3.1 克隆项目到服务器
```bash
# 创建项目目录
mkdir -p /var/www/blog

# 克隆GitHub仓库
cd /var/www/blog
git clone https://github.com/alex2333333-coder/my-first-blog.git .

# 安装依赖
npm install

# 生成静态文件
hexo generate
```

### 3.2 配置后端服务
```bash
# 安装后端依赖
cd backend
npm install

# 使用PM2启动后端服务
pm run start
```

## 4. Nginx配置

### 4.1 创建Nginx配置文件
```bash
cat > /etc/nginx/sites-available/blog.conf << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    root /var/www/blog/public;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # 配置后端API代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
```

### 4.2 启用配置
```bash
# 创建软链接
ln -s /etc/nginx/sites-available/blog.conf /etc/nginx/sites-enabled/

# 测试配置
inginx -t

# 重启Nginx
systemctl restart nginx
```

## 5. SSL证书配置（可选但推荐）

### 5.1 安装Certbot
```bash
apt install -y certbot python3-certbot-nginx
```

### 5.2 申请SSL证书
```bash
certbot --nginx -d your-domain.com -d www.your-domain.com
```

### 5.3 设置自动续订
```bash
# 验证自动续订
certbot renew --dry-run
```

## 6. 自动部署配置

### 6.1 创建部署脚本
```bash
cat > /var/www/blog/deploy.sh << EOF
#!/bin/bash
cd /var/www/blog

# 拉取最新代码
git pull origin main

# 安装依赖
npm install

# 生成静态文件
hexo generate

# 重启后端服务
pm run restart

echo "Deploy completed at $(date)"
EOF

# 添加执行权限
chmod +x /var/www/blog/deploy.sh
```

### 6.2 设置GitHub Webhook
在GitHub仓库设置中添加Webhook，URL为：
```
http://your-domain.com/api/webhook
```

### 6.3 配置Webhook处理
在后端服务中添加Webhook处理逻辑，用于接收GitHub推送事件并自动执行部署脚本。

## 7. 访问测试

部署完成后，您可以通过以下方式访问博客：
- HTTP: http://your-domain.com
- HTTPS: https://your-domain.com

## 8. 常见问题排查

### 8.1 无法访问网站
- 检查服务器防火墙是否开放80/443端口
- 检查Nginx服务是否正常运行
- 检查DNS解析是否生效

### 8.2 后端API无法访问
- 检查后端服务是否正常运行
- 检查PM2日志
- 检查Nginx代理配置

### 8.3 博客更新不生效
- 检查静态文件是否重新生成
- 清除浏览器缓存
- 检查Nginx缓存设置

## 9. 维护建议

### 9.1 定期更新系统和依赖
```bash
# 更新系统
apt update && apt upgrade -y

# 更新依赖
cd /var/www/blog
npm update
cd backend
npm update
```

### 9.2 备份数据
- 定期备份数据库
- 定期备份博客内容
- 定期备份配置文件

### 9.3 监控服务
- 使用PM2监控后端服务
- 设置Nginx访问日志分析
- 配置服务器监控告警

## 10. 进阶优化

### 10.1 启用Gzip压缩
在Nginx配置中添加：
```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
gzip_proxied any;
gzip_comp_level 6;
gzip_buffers 16 8k;
gzip_http_version 1.1;
```

### 10.2 启用浏览器缓存
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 30d;
    add_header Cache-Control "public, no-transform";
}
```

### 10.3 配置CDN加速
将静态资源（图片、CSS、JS）部署到CDN，提高访问速度。

---

部署完成后，您的博客就可以通过域名正常访问了！如果遇到任何问题，欢迎查阅相关文档或寻求技术支持。