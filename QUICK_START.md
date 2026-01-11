# 快速开始 - 前端测试指南

## 前端功能测试

前端已经完成以下功能：
- ✅ 视频播放器（支持弹幕显示）
- ✅ 弹幕发送功能
- ✅ 视频上传功能

## 启动前端应用

```bash
cd video-danmaku-site/frontend
npm start
```
sadasdasds
前端将运行在 `http://localhost:3000`

## 测试步骤

### 1. 测试视频播放和弹幕

有两种方式测试视频播放：

**方式一：使用网络视频URL**
1. 在"测试视频播放"区域输入任意网络视频URL
2. 例如：`https://www.w3schools.com/html/mov_bbb.mp4`
3. 点击"加载视频"按钮
4. 视频将开始播放

**方式二：使用本地视频文件**
1. 将本地视频文件放到 `frontend/public` 目录
2. 在输入框输入：`/your-video.mp4`
3. 点击"加载视频"按钮

### 2. 测试弹幕功能

视频加载后：
1. 播放视频
2. 在视频下方的弹幕输入框输入文字
3. 可以点击颜色选择器选择弹幕颜色
4. 点击"发送"按钮
5. 弹幕将立即在视频上方滚动显示

**注意**：发送弹幕需要登录，如果未登录会提示错误。测试时可以先忽略后端登录功能。

### 3. 测试视频上传功能

在"上传视频"区域：
1. 点击"选择视频文件"按钮
2. 选择一个本地视频文件（支持 mp4, avi, mov, mkv, webm 格式）
3. 输入视频标题
4. 输入视频描述（可选）
5. 点击"上传视频"按钮
6. 可以看到上传进度条
7. 上传成功后会显示提示信息

**注意**：视频上传需要后端服务器运行。如果只测试前端，上传会失败。

## 推荐测试视频

可以使用以下免费测试视频URL：
- `https://www.w3schools.com/html/mov_bbb.mp4` (Big Buck Bunny)
- `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4`

## 项目结构

```
frontend/
├── src/
│   ├── components/
│   │   ├── VideoPlayer.js      # 视频播放器组件
│   │   ├── VideoPlayer.css     # 播放器样式
│   │   ├── VideoUpload.js      # 视频上传组件
│   │   └── VideoUpload.css     # 上传组件样式
│   ├── utils/
│   │   └── DanmakuEngine.js    # 弹幕渲染引擎
│   ├── services/
│   │   └── api.js              # API 服务封装
│   ├── App.js                  # 主应用组件
│   └── App.css                 # 主应用样式
└── public/                     # 静态资源目录
```

## 功能特性

### 视频播放器
- ✅ 支持标准 HTML5 视频播放
- ✅ 实时弹幕渲染（Canvas 实现）
- ✅ 弹幕颜色自定义
- ✅ 弹幕自动滚动
- ✅ 弹幕时间同步

### 弹幕系统
- ✅ 实时发送弹幕
- ✅ 弹幕颜色选择
- ✅ 弹幕文本限制（最多100字符）
- ✅ 弹幕平滑滚动动画

### 视频上传
- ✅ 支持多种视频格式
- ✅ 实时上传进度显示
- ✅ 文件大小限制（100MB）
- ✅ 标题和描述编辑

## 下一步

如果需要完整功能（包括用户登录、视频列表等），需要启动后端服务器。详见主 README.md 文件。
