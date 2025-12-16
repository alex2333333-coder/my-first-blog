## 1. 更新环境变量

### 步骤1：编辑.env文件

使用文本编辑器打开 `backend/.env` 文件，将以下字段更新为您的GitHub OAuth凭证：

```
# GitHub OAuth配置
GITHUB_CLIENT_ID=0v231ik0Gpm392b44PJN
GITHUB_CLIENT_SECRET=24f158eee647b39f82858aebc4e03b6fd3345ee2d
GITHUB_CALLBACK_URL=http://localhost:5000/api/auth/github/callback
```

### 步骤2：保存文件

确保保存更新后的.env文件。

## 2. 重启后端服务

### 步骤1：停止当前服务

如果后端服务正在运行，先停止它。

### 步骤2：启动新服务

在backend目录下执行：
```bash
npm start
```

## 3. 测试登录流程

### 步骤1：访问前端页面

打开浏览器访问：`http://localhost:4000`

### 步骤2：点击GitHub登录按钮

在页面上找到并点击GitHub登录按钮。

### 步骤3：完成授权

- 系统将跳转到GitHub授权页面
- 登录GitHub账号（如果未登录）
- 点击 "Authorize bin-blog" 按钮

### 步骤4：检查登录结果

- 授权成功后，将自动跳回前端页面
- 检查是否显示登录成功信息
- 验证用户信息是否正确显示

## 预期结果

- ✅ 不再出现GitHub 404页面
- ✅ 成功跳转到GitHub授权页面
- ✅ 授权后能正确返回应用
- ✅ 登录成功，显示用户信息

## 常见问题排查

1. **仍然显示404**：
   - 检查Client ID和Client Secret是否正确复制
   - 确认回调URL完全一致
   - 检查后端服务是否正在运行

2. **授权后无法返回应用**：
   - 检查回调URL是否正确
   - 查看后端服务日志，检查是否有错误信息

3. **登录后用户信息不正确**：
   - 检查GitHub账号是否有公开或已验证的邮箱
   - 查看后端服务日志，检查用户信息获取过程

## 技术说明

当前项目代码已经完全支持GitHub OAuth App授权流程，包括：
- 正确生成授权URL
- 处理授权回调
- 交换授权码获取访问令牌
- 获取用户信息
- 数据库用户创建和更新

通过以上步骤，您应该能够成功配置GitHub OAuth App登录功能，解决之前的404错误问题。