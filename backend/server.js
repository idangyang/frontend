const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// 中间件
app.use(cors({
  origin: '*',
  credentials: false,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 数据库连接
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-danmaku')
  .then(() => {
    // console.log('MongoDB 连接成功')
  })
  .catch(err => console.error('MongoDB 连接失败:', err));

// 导入路由
const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/video');
const danmakuRoutes = require('./routes/danmaku');
const commentRoutes = require('./routes/comment');
const seriesRoutes = require('./routes/series');

// 路由
app.get('/', (req, res) => {
  res.json({ message: '视频弹幕网站 API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/danmaku', danmakuRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/series', seriesRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  // console.log(`服务器运行在端口 ${PORT}`);
});
