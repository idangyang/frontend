const express = require('express');
const router = express.Router();
const Video = require('../models/Video');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const { generateThumbnail, getVideoAspectRatio } = require('../utils/thumbnail');

// 上传视频
router.post('/upload', auth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: '请选择视频文件' });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;
    const { title, description } = req.body;

    let thumbnailPath = '';

    // 如果用户上传了封面，使用用户上传的封面
    if (thumbnailFile) {
      // 存储相对路径，方便前端访问
      thumbnailPath = thumbnailFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
    } else {
      // 如果没有上传封面，自动生成视频第一帧作为封面
      try {
        const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
        const thumbnailFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const fullPath = path.join(thumbnailDir, thumbnailFilename);

        await generateThumbnail(videoFile.path, fullPath);
        // 存储相对路径
        thumbnailPath = `uploads/thumbnails/${thumbnailFilename}`;
      } catch (err) {
        console.error('生成封面失败:', err);
        // 如果生成失败，继续保存视频，只是没有封面
      }
    }

    // 获取视频宽高比
    let aspectRatio = 1.78; // 默认16:9
    try {
      aspectRatio = await getVideoAspectRatio(videoFile.path);
      console.log('视频宽高比:', aspectRatio);
    } catch (err) {
      console.error('获取视频宽高比失败:', err);
    }

    const video = new Video({
      title: title || videoFile.originalname,
      description: description || '',
      filename: videoFile.filename,
      filepath: videoFile.path,
      thumbnail: thumbnailPath,
      aspectRatio: aspectRatio,
      uploader: req.userId
    });

    await video.save();

    res.status(201).json({
      message: '视频上传成功',
      video: {
        id: video._id,
        title: video.title,
        description: video.description,
        thumbnail: video.thumbnail,
        createdAt: video.createdAt
      }
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ error: '上传失败' });
  }
});

// 获取视频列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const videos = await Video.find()
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Video.countDocuments();

    res.json({
      videos,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

// 获取当前用户上传的视频列表（必须在 /:id 之前）
router.get('/my-videos', auth, async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.userId })
      .populate('uploader', 'username avatar')
      .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (error) {
    console.error('获取用户视频列表失败:', error);
    res.status(500).json({ error: '获取视频列表失败' });
  }
});

// 获取单个视频
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploader', 'username avatar');

    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    video.views += 1;
    await video.save();

    res.json({ video });
  } catch (error) {
    res.status(500).json({ error: '获取视频失败' });
  }
});

// 流式传输视频
router.get('/stream/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    const videoPath = path.resolve(video.filepath);

    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: '视频文件不存在' });
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(videoPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(videoPath).pipe(res);
    }
  } catch (error) {
    res.status(500).json({ error: '视频流传输失败' });
  }
});

// 删除视频
router.delete('/:id', auth, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ error: '视频不存在' });
    }

    // 获取当前用户信息，检查是否是超级管理员
    const currentUser = await User.findById(req.userId);

    // 检查是否是视频上传者或超级管理员
    const isOwner = video.uploader.toString() === req.userId.toString();
    const isSuperAdmin = currentUser && currentUser.isSuperAdmin;

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: '无权删除此视频' });
    }

    // 删除视频文件
    if (fs.existsSync(video.filepath)) {
      fs.unlinkSync(video.filepath);
    }

    // 删除封面文件
    if (video.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', video.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // 从数据库删除视频记录
    await Video.findByIdAndDelete(req.params.id);

    res.json({ message: '视频删除成功' });
  } catch (error) {
    console.error('删除视频失败:', error);
    res.status(500).json({ error: '删除视频失败' });
  }
});

// 搜索用户（仅超级管理员）
router.get('/admin/search-users', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.isSuperAdmin) {
      return res.status(403).json({ error: '无权访问' });
    }

    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: '请提供用户名' });
    }

    const users = await User.find({
      username: { $regex: username, $options: 'i' }
    }).select('_id username email').limit(10);

    res.json({ users });
  } catch (error) {
    console.error('搜索用户失败:', error);
    res.status(500).json({ error: '搜索用户失败' });
  }
});

// 获取指定用户的视频（仅超级管理员）
router.get('/admin/user-videos/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    if (!currentUser || !currentUser.isSuperAdmin) {
      return res.status(403).json({ error: '无权访问' });
    }

    const videos = await Video.find({ uploader: req.params.userId })
      .populate('uploader', 'username')
      .sort({ createdAt: -1 });

    res.json({ videos });
  } catch (error) {
    console.error('获取用户视频失败:', error);
    res.status(500).json({ error: '获取用户视频失败' });
  }
});

module.exports = router;
