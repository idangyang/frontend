# 互联网远程访问配置指南

本指南说明如何让远程的朋友通过互联网访问你电脑上的后端服务。

---

## 方案1：使用 cpolar 内网穿透（推荐）

### 优点
- ✅ 配置简单，5分钟搞定
- ✅ 免费版足够开发使用
- ✅ 国内访问速度快
- ✅ 不需要云服务器
- ✅ 不需要公网 IP

### 缺点
- ⚠️ 免费版每次重启后域名会变化
- ⚠️ 有流量限制（免费版每月 1GB）

### 步骤1：安装 cpolar

**访问官网：** https://www.cpolar.com/

1. 注册账号（免费）
2. 下载对应系统的客户端
   - macOS: 下载 .pkg 安装包
   - Windows: 下载 .exe 安装包
   - Linux: 使用命令行安装

**macOS 安装：**
```bash
# 或者使用 Homebrew
brew install cpolar
```

### 步骤2：登录 cpolar

```bash
cpolar authtoken <你的token>
```

token 在 cpolar 官网的控制台可以找到。

### 步骤3：启动后端服务

```bash
cd video-danmaku-site/backend
npm start
```

确保后端运行在端口 5002。

### 步骤4：启动 cpolar 穿透

```bash
cpolar http 5002
```

你会看到类似这样的输出：

```
Forwarding  https://xxxx-xx-xx-xx-xx.cpolar.cn -> http://localhost:5002
```

**重要：** 复制这个 `https://xxxx-xx-xx-xx-xx.cpolar.cn` 地址，这就是你的公网访问地址！

### 步骤5：告诉你的朋友

将这个地址发给你的朋友，格式为：
```
https://xxxx-xx-xx-xx-xx.cpolar.cn/api
```

### 步骤6：你朋友配置前端

你的朋友在他的电脑上：

1. 克隆项目
```bash
git clone <你的GitHub仓库地址>
cd video-danmaku-site/frontend
npm install
```

2. 创建 `.env` 文件
```bash
cp .env.example .env
```

3. 编辑 `.env` 文件
```env
REACT_APP_API_BASE_URL=https://xxxx-xx-xx-xx-xx.cpolar.cn/api
```

4. 启动前端
```bash
npm start
```

### 注意事项

- 保持 cpolar 和后端服务一直运行
- 每次重启 cpolar，域名会变化（免费版）
- 如果需要固定域名，可以升级到付费版（约 10 元/月）

---

## 方案2：使用 ngrok（国际版）

### 优点
- ✅ 全球知名，稳定可靠
- ✅ 配置简单
- ✅ 支持 HTTPS

### 缺点
- ⚠️ 国内访问可能较慢
- ⚠️ 免费版域名每次重启会变化

### 步骤

1. **访问官网：** https://ngrok.com/
2. **注册并下载客户端**
3. **认证：**
```bash
ngrok authtoken <你的token>
```

4. **启动穿透：**
```bash
ngrok http 5002
```

5. **复制生成的 URL**（类似 `https://xxxx.ngrok.io`）
6. **你朋友配置前端 `.env`：**
```env
REACT_APP_API_BASE_URL=https://xxxx.ngrok.io/api
```

---

## 方案3：使用云服务器部署后端（最稳定）

### 优点
- ✅ 最稳定，适合长期使用
- ✅ 固定域名/IP
- ✅ 性能好，无流量限制
- ✅ 可以配置 HTTPS 证书

### 缺点
- ⚠️ 需要购买云服务器（约 10-50 元/月）
- ⚠️ 配置相对复杂

### 推荐云服务商
- **阿里云**（学生机 9.5 元/月）
- **腾讯云**（学生机 10 元/月）
- **AWS**（免费一年）

### 简要步骤

1. **购买云服务器**（选择 Ubuntu 20.04 系统）
2. **安装 Node.js 和 MongoDB**
3. **上传后端代码到服务器**
4. **配置防火墙开放端口 5002**
5. **使用 PM2 保持后端运行**
6. **你朋友配置前端 `.env`：**
```env
REACT_APP_API_BASE_URL=http://你的服务器IP:5002/api
```

详细的云服务器部署教程可以另外提供。

---

## 方案对比

| 特性 | cpolar | ngrok | 云服务器 |
|------|--------|-------|----------|
| 配置难度 | ⭐ 简单 | ⭐ 简单 | ⭐⭐⭐ 复杂 |
| 费用 | 免费/10元月 | 免费 | 10-50元/月 |
| 稳定性 | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| 国内速度 | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| 固定域名 | 付费版 | 付费版 | ✅ |
| 适用场景 | 临时测试 | 临时测试 | 长期使用 |

**推荐选择：**
- 🎯 **快速测试**：使用 cpolar（方案1）
- 🎯 **长期使用**：使用云服务器（方案3）

---

## 常见问题

### Q1: 使用内网穿透安全吗？
A: 对于开发测试是安全的，但不要暴露敏感数据。建议：
- 使用强密码
- 不要在生产环境使用
- 测试完成后关闭穿透

### Q2: 免费版够用吗？
A: 对于开发测试完全够用。如果需要长期使用或固定域名，建议升级付费版或使用云服务器。

### Q3: 视频上传会很慢吗？
A: 使用内网穿透上传大文件会比较慢，因为数据要经过中转服务器。如果需要频繁上传大文件，建议使用云服务器。

### Q4: 如何保持服务一直运行？
A: 
- **内网穿透**：保持终端窗口打开，或使用 `screen`/`tmux`
- **云服务器**：使用 PM2 进程管理工具

### Q5: 域名每次都变化怎么办？
A: 
- 升级到付费版获得固定域名
- 或者每次启动后通知朋友新的域名
- 或者使用云服务器获得固定IP

---

## 快速开始（推荐 cpolar）

### 你的电脑（后端）：

```bash
# 1. 安装 cpolar
# 访问 https://www.cpolar.com/ 下载安装

# 2. 启动后端
cd video-danmaku-site/backend
npm start

# 3. 新开一个终端，启动 cpolar
cpolar http 5002

# 4. 复制显示的 URL，发给你的朋友
# 例如：https://xxxx.cpolar.cn
```

### 你朋友的电脑（前端）：

```bash
# 1. 克隆项目
git clone <GitHub仓库地址>
cd video-danmaku-site/frontend

# 2. 安装依赖
npm install

# 3. 创建配置文件
cp .env.example .env

# 4. 编辑 .env 文件，填入你提供的 URL
# REACT_APP_API_BASE_URL=https://xxxx.cpolar.cn/api

# 5. 启动前端
npm start
```

完成！现在你的朋友可以在 http://localhost:3000 访问前端，数据会从你的电脑获取。

---

## 故障排查

### 问题1：连接超时
- 检查后端服务是否正在运行
- 检查 cpolar/ngrok 是否正在运行
- 检查 URL 是否正确

### 问题2：CORS 错误
- 后端已配置 `origin: '*'`，应该不会有 CORS 问题
- 如果仍有问题，检查浏览器控制台的具体错误

### 问题3：上传失败
- 检查文件大小是否超过限制
- 内网穿透上传大文件会较慢，请耐心等待
- 查看后端日志是否有错误信息

### 问题4：MongoDB 连接失败
- 确保 MongoDB 服务正在运行
- 检查 `.env` 文件中的 `MONGODB_URI` 配置

---

## 下一步

配置完成后，你的朋友就可以：
- ✅ 注册/登录账号
- ✅ 上传视频
- ✅ 观看视频
- ✅ 发送弹幕
- ✅ 发表评论

所有数据都会保存在你的电脑上（后端服务器）。

如果需要更详细的云服务器部署教程，请告诉我！
