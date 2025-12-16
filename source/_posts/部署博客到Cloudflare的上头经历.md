---
title: 上头不务正业：熬夜把博客部署到Cloudflare

date: 2025-12-08 22:45:00
tags: [博客部署, Cloudflare, 熬夜, Python考试]
categories: [碎碎念]
---

# 上头不务正业：熬夜把博客部署到Cloudflare

救命啊家人们！！明天早上8点就Python考试了，我现在居然在熬夜部署博客？？？

本来今天想着狠狠复习考试，结果看到Cloudflare免费部署，emm我先尝尝这白嫖的咸淡🫠

## 不管了，先搞！

说干就干，直接开整。

### 1. 后端Worker部署

先切换到`backend`目录，配置`wrangler.toml`文件：
```bash
cd d:\phpstudy_pro\blog-cloudflare\backend
```

修改配置，添加了`nodejs_compat`兼容性标志，然后安装`itty-router`依赖：
```bash
npm install itty-router
```

最后执行部署：
```bash
npm run deploy
```

居然顺顺利利就部署好了，Worker URL：`https://blog-backend.2136026360.workers.dev`

### 2. 数据库部署

接下来是Cloudflare D1数据库，这步遇到了两个坑：

1. **编码问题**：初始导出的`comments.sql`是UTF-16编码，D1不支持，必须转换为UTF-8
2. **事务问题**：SQL文件中包含`BEGIN TRANSACTION`语句，D1不支持，得简化SQL

最后在`backend`目录下创建了简化版SQL文件`comments-simple.sql`，包含所有必要的表结构和示例数据，然后执行：

```bash
wrangler d1 execute blog-comments --file=comments-simple.sql --remote
```

终于！数据库导入成功~~

![D1数据库导入成功截图](/images/cloudflare-deploy/d1-import-success.png)

## 静态博客部署

最后是静态博客部署，回到项目根目录：
```bash
cd ..  # 回到 d:\phpstudy_pro\blog-cloudflare
```

先执行构建命令生成静态文件到`public`目录：
```bash
npm run build
```

然后用Wrangler部署`public`目录：
```bash
npx wrangler pages deploy public
```

系统让我输入项目名，我先随便打了个`blog`，后面感觉起的不好🥲，换成了`blog-static-website`，生产分支默认`main`

![静态博客上传进度截图](/images/cloudflare-deploy/static-upload-progress.png)

### 部署成功！

"Deployment complete! Take a peek over at https://c12a05af.blog-static-website.pages.dev" 

终于成功了🥰！
现在我可以通过访问网站了，美中不足是要通过梯子（悲），救命啊，明天早上8点的Python考试啊！我现在居然在这儿熬夜搞网站？真的不复习的时候干什么都开心🤣

部署成功了，但需要梯子才能看——这种兴奋又有点失望的心情系怎么回事？！
蒜鸟蒜鸟，明天考完Python，再来研究怎么配置自定义域名，争取让国内能直接访问。
现在，我要悲壮地去睡觉了... 就写到这里吧，祝我明天Python考试别挂🙏

-----
## 2025-12-08 23:29

刚考完老友记最后一季，真的很好哭😢，emm有时候哭应该也不是坏事吧...
![alt text](/images/cloudflare-deploy/26822068a92b0008602751e3500f923c.jpg)
<small>*请恕我放的是看最后一集的完整截图，因为我想要保留一些记忆，让我后面如果看到这张图还能更体会此时的一些感动，时间不太合适因为是写的时候截的，但应该也在一小时之前*</small>
🌨️🌨️感觉就像一个好朋友要离开一样...很难忍住眼泪，也许人生就是这样前进？就像那句歌词“看了多少悲情电影，还是忍不住泪眼婆娑~”（夏日重现片尾曲）

想起来，那时在成功的时候也是这样，真希望可以和他/她 们好好告个别   唉...   有种被朋友遗弃的感觉（大哭）

![alt text](/images/cloudflare-deploy/备案image.png)
cloudflare放弃了，免费节点加墙整不好，腾讯云一年轻量服务器安排上，静等审核通过

anyway,gonna go to sleep...

碎碎念：要不看看魔法少女小圆吧
