# GitHub登录问题排查步骤

## 1. 检查GitHub应用设置

### 回调URL配置
- 确保GitHub应用的**授权回调URL**与 `.env` 文件中的 `GITHUB_CALLBACK_URL` 完全一致
- 目前配置：`http://localhost:5000/api/auth/github/callback`
- 登录GitHub → 点击头像 → Settings → Developer settings → OAuth Apps → 找到你的应用 → 检查Authorization callback URL

### 权限范围
- 确保GitHub应用已勾选 `user:email` 权限
- 登录GitHub → 点击头像 → Settings → Developer settings → OAuth Apps → 找到你的应用 → 检查权限设置

### 应用状态
- 确保GitHub应用是**已发布**状态，而不是仅在开发中

## 2. 检查本地服务

### 后端服务状态
- 后端服务正在运行，端口5000已开放
- 路由配置正确：
  - `GET /api/auth/github` - 登录重定向
  - `GET /api/auth/github/callback` - 回调处理

### 前端配置
- 前端GitHub登录按钮点击事件正确指向：`http://localhost:5000/api/auth/github`

## 3. 测试登录流程

### 直接测试API端点
```bash
# 使用curl测试登录重定向
curl -I http://localhost:5000/api/auth/github

# 预期响应：302 Found，Location指向GitHub授权页面
```

### 浏览器测试
1. 打开浏览器，访问前端页面：`http://localhost:4000`
2. 点击GitHub登录按钮
3. 查看浏览器地址栏，确认是否正确重定向到GitHub授权页面
4. 如果出现404错误，检查地址栏中的URL，确认是否来自GitHub

## 4. 常见问题

### GitHub返回404
- 原因：GitHub应用配置问题，如回调URL不正确
- 解决：检查GitHub应用的回调URL配置

### 本地服务返回404
- 原因：路由配置错误或服务未运行
- 解决：检查后端服务状态和路由配置

### 授权成功后无法返回应用
- 原因：GitHub应用的回调URL与本地服务URL不匹配
- 解决：确保GitHub应用的回调URL与本地服务URL完全一致

## 5. 日志检查

### 后端日志
- 检查后端服务日志，查看是否有请求记录
- 查看是否有任何错误信息

### 浏览器控制台
- 打开浏览器控制台，查看是否有JavaScript错误
- 查看网络请求，确认登录按钮点击后是否发送了正确的请求

## 6. 重新配置GitHub应用

如果上述步骤都无法解决问题，建议重新创建GitHub应用：

1. 登录GitHub → 点击头像 → Settings → Developer settings → OAuth Apps → New OAuth App
2. 填写应用信息：
   - Application name: 你的应用名称
   - Homepage URL: `http://localhost:4000`
   - Authorization callback URL: `http://localhost:5000/api/auth/github/callback`
3. 点击"Register application"
4. 更新 `.env` 文件中的 `GITHUB_CLIENT_ID` 和 `GITHUB_CLIENT_SECRET`
5. 重启后端服务

## 7. 检查网络环境

- 确保本地网络可以访问GitHub
- 检查是否有防火墙或代理阻止了请求
- 尝试使用不同的网络环境测试

## 8. 联系GitHub支持

如果上述步骤都无法解决问题，建议联系GitHub支持，提供详细的错误信息和配置情况。