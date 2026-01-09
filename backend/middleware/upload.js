const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const videoDir = path.join(__dirname, '../uploads/videos');
const thumbnailDir = path.join(__dirname, '../uploads/thumbnails');
const audioDir = path.join(__dirname, '../uploads/audio');

if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}
if (!fs.existsSync(thumbnailDir)) {
  fs.mkdirSync(thumbnailDir, { recursive: true });
}
if (!fs.existsSync(audioDir)) {
  fs.mkdirSync(audioDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // 根据文件类型选择不同的目录
    if (file.fieldname === 'video') {
      cb(null, videoDir);
    } else if (file.fieldname === 'thumbnail') {
      cb(null, thumbnailDir);
    } else if (file.fieldname === 'audio') {
      cb(null, audioDir);
    } else {
      cb(null, videoDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    // 视频文件验证
    const allowedTypes = /mp4|avi|mov|mkv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持视频文件格式'));
    }
  } else if (file.fieldname === 'thumbnail') {
    // 图片文件验证
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /image\/(jpeg|jpg|png|gif|webp)/.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持图片文件格式'));
    }
  } else if (file.fieldname === 'audio') {
    // 音频文件验证
    const allowedTypes = /mp3|webm|ogg|wav|m4a/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = /audio\/(mpeg|webm|ogg|wav|mp4)/.test(file.mimetype);

    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('只支持音频文件格式'));
    }
  } else {
    cb(new Error('未知的文件字段'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 视频最大100MB
    files: 2 // 最多2个文件（视频+封面）
  }
});

module.exports = upload;
