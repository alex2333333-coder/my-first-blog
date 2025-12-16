# GitHub第三方登录修复方案

## 问题分析
从用户提供的截图可以看到，GitHub登录URL使用的是`id`参数而非正确的`client_id`，导致GitHub服务器返回404错误。

## 可能的原因
1. **参数名错误**：生成GitHub授权URL时使用了`id`参数而非GitHub OAuth标准的`client_id`参数
2. **配置冲突**：可能存在多个Node.js进程在运行，导致旧版本的代码仍在处理请求
3. **缓存问题**：浏览器或服务器可能缓存了旧的授权URL

## 修复步骤

### 1. 检查并修复GitHub授权URL生成代码
```javascript
// 错误示例
const githubAuthUrl = `https://github.com/login/oauth/authorize?id=${process.env.GITHUB_CLIENT_ID}&...`;

// 正确示例
const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&...`;
```

### 2. 停止所有Node.js进程
```bash
taskkill /F /IM node.exe
```

### 3. 重启后端服务
```bash
npm start
```

### 4. 测试GitHub登录功能
- 访问前端页面，点击"GitHub登录"按钮
- 检查是否能正确跳转到GitHub授权页面
- 完成授权后是否能正确返回并登录成功

## 预期结果
- GitHub登录按钮点击后能正确跳转到GitHub授权页面
- 完成授权后能成功返回博客并登录
- 登录状态能正确显示

## 注意事项
- 确保GitHub应用的回调URL与配置文件中的一致
- 确保GitHub应用的Client ID和Client Secret正确
- 确保只有一个后端服务在运行