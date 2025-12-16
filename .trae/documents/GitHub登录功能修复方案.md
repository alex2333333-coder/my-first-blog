# GitHub登录功能修复方案

## 问题分析
通过对比GitHub和Gitee登录的实现代码，发现GitHub登录实现缺少了一些标准的OAuth 2.0参数，而Gitee登录实现是完整的。这可能导致GitHub登录失败。

## 主要差异

### 1. 授权URL构建
- **GitHub**：使用手动构建的URL，缺少`response_type: 'code'`参数
- **Gitee**：使用`querystring.stringify()`构建URL，包含`response_type: 'code'`参数

### 2. 令牌交换请求
- **GitHub**：缺少`grant_type: 'authorization_code'`参数
- **Gitee**：包含`grant_type: 'authorization_code'`参数

### 3. URL构建方式
- **GitHub**：手动构建URL，可能存在编码问题
- **Gitee**：使用`querystring.stringify()`，自动处理参数编码

## 修复方案

### 1. 更新GitHub授权URL生成
将GitHub授权URL生成方式从手动构建改为使用`querystring.stringify()`，并添加`response_type: 'code'`参数：

```javascript
// 修复前
const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.GITHUB_CALLBACK_URL)}&scope=user:email&state=${state}`;

// 修复后
const githubAuthUrl = `https://github.com/login/oauth/authorize?${querystring.stringify({
  client_id: process.env.GITHUB_CLIENT_ID,
  redirect_uri: process.env.GITHUB_CALLBACK_URL,
  scope: 'user:email',
  state: state,
  response_type: 'code' // 添加标准OAuth 2.0参数
})}`;
```

### 2. 更新GitHub令牌交换请求
在GitHub令牌交换请求中添加`grant_type: 'authorization_code'`参数：

```javascript
// 修复前
const postData = querystring.stringify({
  client_id: process.env.GITHUB_CLIENT_ID,
  client_secret: process.env.GITHUB_CLIENT_SECRET,
  code: code,
  redirect_uri: process.env.GITHUB_CALLBACK_URL
});

// 修复后
const postData = querystring.stringify({
  client_id: process.env.GITHUB_CLIENT_ID,
  client_secret: process.env.GITHUB_CLIENT_SECRET,
  code: code,
  redirect_uri: process.env.GITHUB_CALLBACK_URL,
  grant_type: 'authorization_code' // 添加标准OAuth 2.0参数
});
```

## 修复预期
- GitHub登录实现符合标准OAuth 2.0授权码流程
- 修复后GitHub登录功能可以正常工作
- 实现方式与Gitee登录保持一致

## 修复步骤
1. 修改`server.js`文件中的GitHub授权URL生成代码
2. 修改`server.js`文件中的GitHub令牌交换请求代码
3. 重启后端服务
4. 测试GitHub登录功能

## 注意事项
- 确保GitHub应用的回调URL与配置文件中的一致
- 确保GitHub应用的Client ID和Client Secret正确
- 确保后端服务重启成功

这个修复方案基于标准的OAuth 2.0授权码流程，并参考了Gitee登录的成功实现，应该能够解决GitHub登录失败的问题。