# 魔法少年猫尾草的博客

这是我的个人博客，使用Hexo和Butterfly主题构建，用于记录学习过程和分享技术心得。

## 技术栈

- **Hexo** - 静态博客生成器
- **Butterfly** - 博客主题
- **Markdown** - 文章编写格式
- **Node.js** - 后端开发环境
- **SQLite** - 数据库

## 项目结构

```
.
├── _config.butterfly.yml    # Butterfly主题配置
├── _config.yml             # Hexo配置
├── backend/                # 后端服务代码
├── layout/                 # 自定义布局文件
├── public/                 # 生成的静态文件
├── source/                 # 源代码
│   ├── _posts/             # 文章内容
│   ├── images/             # 图片资源
│   └── css/                # 自定义CSS
└── themes/                 # 主题目录
```

## 安装和运行

### 前置要求

- Node.js >= 18.0.0
- Git

### 安装依赖

```bash
# 安装Hexo依赖
npm install

# 安装后端依赖
cd backend
npm install
cd ..
```

### 本地运行

```bash
# 启动Hexo本地服务器
hexo s

# 启动后端服务
cd backend
node server.js
cd ..
```

### 生成静态文件

```bash
hexo generate
```

## 功能特性

- 响应式设计，适配各种设备
- 支持Markdown语法
- 支持代码高亮
- 支持评论功能
- 支持标签和分类
- 支持RSS订阅
- 支持搜索功能

## 部署

### GitHub Pages

可以通过GitHub Actions自动部署到GitHub Pages，或者手动部署：

```bash
hexo deploy
```

### Vercel

也可以部署到Vercel，项目中已包含vercel.json配置文件。

## 自定义主题

### 修改配置

主要配置文件位于`_config.butterfly.yml`，可以修改主题的各种设置，如颜色、字体、导航栏等。

### 添加新页面

```bash
hexo new page <page_name>
```

### 添加新文章

```bash
hexo new <post_name>
```

## 贡献

欢迎提交Issue和Pull Request，一起完善这个博客。

## 许可证

MIT License

## 联系方式

- GitHub: [alex2333333-coder](https://github.com/alex2333333-coder)
- Email: 2136026360@qq.com
