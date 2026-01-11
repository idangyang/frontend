# 语音弹幕网站

一个基于 React + Node.js 的语音弹幕+视频播放网站项目。

## 功能特性

- ✅ 用户注册和登录
- ✅ 视频上传和管理
- ✅ 视频播放
- ✅ 实时弹幕显示
- ✅ 弹幕发送和管理
- ✅ 用户个人中心

## 技术栈

### 后端
- Node.js + Express
- MongoDB + Mongoose
- JWT 认证
- Multer 文件上传

### 前端
- React
- Axios (HTTP 请求)
- React Router (路由)
- 弹幕播放器组件

## 项目结构

```
video-danmaku-site/
├── backend/              # 后端服务
│   ├── models/          # 数据模型
│   ├── routes/          # API 路由
│   ├── middleware/      # 中间件
│   ├── uploads/         # 上传文件目录
│   └── server.js        # 服务器入口
└── frontend/            # 前端应用
    ├── src/
    │   ├── components/  # React 组件
    │   ├── pages/       # 页面组件
    │   └── services/    # API 服务
    └── public/
```

## 安装和运行

### 1. 安装依赖

```bash
# 安装后端依赖
cd backend
npm install

# 安装前端依赖
cd ../frontend
npm install
```

### 2. 配置环境变量

在 `backend` 目录下创建 `.env` 文件：

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/video-danmaku
JWT_SECRET=your_jwt_secret_key_here
UPLOAD_PATH=./uploads
```

### 3. 启动 MongoDB

确保 MongoDB 服务正在运行：

```bash
# macOS (使用 Homebrew)
brew services start mongodb-community

# Linux
sudo systemctl start mongod
```

### 4. 运行项目

```bash
# 启动后端服务器 (在 backend 目录)
npm run dev

# 启动前端开发服务器 (在 frontend 目录，新终端)
npm start
```

后端服务器将运行在 `http://localhost:5000`
前端应用将运行在 `http://localhost:3000`

## API 接口

### 用户认证
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

### 视频管理
- `POST /api/videos/upload` - 上传视频
- `GET /api/videos` - 获取视频列表
- `GET /api/videos/:id` - 获取单个视频

### 弹幕管理
- `POST /api/danmaku` - 发送弹幕
- `GET /api/danmaku/video/:videoId` - 获取视频弹幕
- `DELETE /api/danmaku/:id` - 删除弹幕

## 开发说明

### 后端开发
- 使用 `nodemon` 实现热重载
- 所有 API 路由都以 `/api` 为前缀
- 使用 JWT 进行用户认证
- 视频文件存储在 `uploads/videos` 目录

### 前端开发
- 使用 React Hooks 进行状态管理
- 使用 Axios 进行 API 请求
- 弹幕功能基于 Canvas 实现

## 待完成功能

- [ ] 视频缩略图生成
- [ ] 弹幕高级过滤
- [ ] 用户头像上传
- [ ] 视频搜索功能
- [ ] 评论系统
- [ ] 点赞和收藏

## 许可证

MIT
dsfsdfsdfsdf


