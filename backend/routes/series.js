const express = require('express');
const router = express.Router();
const Series = require('../models/Series');
const Episode = require('../models/Episode');
const User = require('../models/User');
const auth = require('../middleware/auth');
const upload = require('../middleware/upload');
const fs = require('fs');
const path = require('path');
const { generateThumbnail, getVideoAspectRatio } = require('../utils/thumbnail');
const { buildSearchQuery } = require('../utils/searchHelper');
const { sortSearchResults } = require('../utils/sortHelper');

// 创建新系列
router.post('/create', auth, upload.single('thumbnail'), async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({ error: '请提供系列标题' });
    }

    let thumbnailPath = '';
    if (req.file) {
      thumbnailPath = req.file.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
    }

    const series = new Series({
      title,
      description: description || '',
      thumbnail: thumbnailPath,
      uploader: req.userId
    });

    await series.save();

    res.status(201).json({
      message: '系列创建成功',
      series: {
        id: series._id,
        title: series.title,
        description: series.description,
        thumbnail: series.thumbnail
      }
    });
  } catch (error) {
    console.error('创建系列失败:', error);
    res.status(500).json({ error: '创建系列失败' });
  }
});

// 上传剧集到系列
router.post('/:seriesId/upload-episode', auth, upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]), async (req, res) => {
  try {
    const { seriesId } = req.params;
    const { episodeNumber, title, description, sortOrder } = req.body;

    if (!req.files || !req.files.video) {
      return res.status(400).json({ error: '请选择视频文件' });
    }

    // 检查系列是否存在
    const series = await Series.findById(seriesId);
    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    // 检查是否是系列创建者
    if (series.uploader.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: '无权上传到此系列' });
    }

    const videoFile = req.files.video[0];
    const thumbnailFile = req.files.thumbnail ? req.files.thumbnail[0] : null;

    let thumbnailPath = '';

    // 处理封面
    if (thumbnailFile) {
      thumbnailPath = thumbnailFile.path.replace(/\\/g, '/').replace(/^.*\/uploads\//, 'uploads/');
    } else {
      try {
        const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
        const thumbnailFilename = `${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
        const fullPath = path.join(thumbnailDir, thumbnailFilename);

        await generateThumbnail(videoFile.path, fullPath);
        thumbnailPath = `uploads/thumbnails/${thumbnailFilename}`;
      } catch (err) {
        console.error('生成封面失败:', err);
      }
    }

    // 获取视频宽高比
    let aspectRatio = 1.78;
    try {
      aspectRatio = await getVideoAspectRatio(videoFile.path);
    } catch (err) {
      console.error('获取视频宽高比失败:', err);
    }

    const episode = new Episode({
      series: seriesId,
      episodeNumber: episodeNumber || 1,
      sortOrder: sortOrder || 0,
      title: title || `第${episodeNumber}集`,
      description: description || '',
      filename: videoFile.filename,
      filepath: videoFile.path,
      thumbnail: thumbnailPath,
      aspectRatio: aspectRatio
    });

    await episode.save();

    // 更新系列的总集数
    const episodeCount = await Episode.countDocuments({ series: seriesId });
    series.totalEpisodes = episodeCount;
    series.updatedAt = Date.now();

    // 如果系列还没有封面，使用第一集的封面
    if (!series.thumbnail && thumbnailPath) {
      series.thumbnail = thumbnailPath;
    }

    // 如果系列还没有aspectRatio，使用第一集的aspectRatio
    if (!series.aspectRatio || series.aspectRatio === 1.78) {
      series.aspectRatio = aspectRatio;
    }

    await series.save();

    res.status(201).json({
      message: '剧集上传成功',
      episode: {
        id: episode._id,
        episodeNumber: episode.episodeNumber,
        title: episode.title,
        thumbnail: episode.thumbnail
      }
    });
  } catch (error) {
    console.error('上传剧集失败:', error);
    res.status(500).json({ error: '上传剧集失败' });
  }
});

// 搜索建议（返回匹配的标题列表）
router.get('/suggestions', async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.json({ suggestions: [] });
    }

    const searchQuery = buildSearchQuery(query);

    if (Object.keys(searchQuery).length === 0) {
      return res.json({ suggestions: [] });
    }

    // 只返回标题，限制10条
    const series = await Series.find(searchQuery)
      .select('title')
      .limit(10);

    const suggestions = series.map(s => s.title);

    res.json({ suggestions });
  } catch (error) {
    console.error('获取搜索建议失败:', error);
    res.json({ suggestions: [] });
  }
});

// 搜索系列
router.get('/search', async (req, res) => {
  try {
    const { query, page = 1, limit = 20 } = req.query;

    if (!query) {
      return res.status(400).json({ error: '请提供搜索关键词' });
    }

    const searchQuery = buildSearchQuery(query);

    if (Object.keys(searchQuery).length === 0) {
      return res.json({
        series: [],
        totalPages: 0,
        currentPage: page,
        message: '搜索关键词不符合最小长度要求（至少1个字符）'
      });
    }

    // 获取所有匹配的系列（不在数据库层面排序和分页）
    const allSeries = await Series.find(searchQuery)
      .populate('uploader', 'username avatar');

    // 使用自定义排序函数：先按播放次数，再按字母顺序
    const sortedSeries = sortSearchResults(allSeries);

    // 在内存中进行分页
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit * 1;
    const paginatedSeries = sortedSeries.slice(startIndex, endIndex);

    const count = sortedSeries.length;

    res.json({
      series: paginatedSeries,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('搜索系列失败:', error);
    res.status(500).json({ error: '搜索系列失败' });
  }
});

// 获取所有系列列表
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const series = await Series.find()
      .populate('uploader', 'username avatar')
      .sort({ updatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Series.countDocuments();

    res.json({
      series,
      totalPages: Math.ceil(count / limit),
      currentPage: page
    });
  } catch (error) {
    console.error('获取系列列表失败:', error);
    res.status(500).json({ error: '获取系列列表失败' });
  }
});

// 获取单个系列详情（包含所有剧集）
router.get('/:id', async (req, res) => {
  try {
    const series = await Series.findById(req.params.id)
      .populate('uploader', 'username avatar');

    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    const episodes = await Episode.find({ series: req.params.id })
      .sort({ sortOrder: 1 });

    series.views += 1;
    await series.save();

    res.json({ series, episodes });
  } catch (error) {
    console.error('获取系列详情失败:', error);
    res.status(500).json({ error: '获取系列详情失败' });
  }
});

// 获取单个剧集详情
router.get('/episode/:id', async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.id)
      .populate({
        path: 'series',
        populate: { path: 'uploader', select: 'username avatar' }
      });

    if (!episode) {
      return res.status(404).json({ error: '剧集不存在' });
    }

    episode.views += 1;
    await episode.save();

    res.json({ episode });
  } catch (error) {
    console.error('获取剧集详情失败:', error);
    res.status(500).json({ error: '获取剧集详情失败' });
  }
});

// 流式传输剧集视频
router.get('/stream/:episodeId', async (req, res) => {
  try {
    const episode = await Episode.findById(req.params.episodeId);

    if (!episode) {
      return res.status(404).json({ error: '剧集不存在' });
    }

    const videoPath = path.resolve(episode.filepath);

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
    console.error('视频流传输失败:', error);
    res.status(500).json({ error: '视频流传输失败' });
  }
});

// 删除系列（会删除所有剧集）
router.delete('/:id', auth, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);

    if (!series) {
      return res.status(404).json({ error: '系列不存在' });
    }

    const currentUser = await User.findById(req.userId);
    const isOwner = series.uploader.toString() === req.userId.toString();
    const isSuperAdmin = currentUser && currentUser.isSuperAdmin;

    if (!isOwner && !isSuperAdmin) {
      return res.status(403).json({ error: '无权删除此系列' });
    }

    // 获取所有剧集
    const episodes = await Episode.find({ series: req.params.id });

    // 删除所有剧集的视频文件和封面
    for (const episode of episodes) {
      if (fs.existsSync(episode.filepath)) {
        fs.unlinkSync(episode.filepath);
      }
      if (episode.thumbnail) {
        const thumbnailPath = path.join(__dirname, '..', episode.thumbnail);
        if (fs.existsSync(thumbnailPath)) {
          fs.unlinkSync(thumbnailPath);
        }
      }
    }

    // 删除系列封面
    if (series.thumbnail) {
      const thumbnailPath = path.join(__dirname, '..', series.thumbnail);
      if (fs.existsSync(thumbnailPath)) {
        fs.unlinkSync(thumbnailPath);
      }
    }

    // 删除所有剧集记录
    await Episode.deleteMany({ series: req.params.id });

    // 删除系列记录
    await Series.findByIdAndDelete(req.params.id);

    res.json({ message: '系列删除成功' });
  } catch (error) {
    console.error('删除系列失败:', error);
    res.status(500).json({ error: '删除系列失败' });
  }
});

module.exports = router;
