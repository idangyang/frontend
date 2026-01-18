const mongoose = require('mongoose');
require('dotenv').config();

const Video = require('../models/Video');
const Danmaku = require('../models/Danmaku');

async function updateDanmakuLikes() {
  try {
    // 连接数据库
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/video-danmaku');
    console.log('数据库连接成功');

    // 查找视频
    const videoTitle = 'Summer Pockets - S01E02 - [三明治摆烂组][简繁内封][H265 10bit 1080P]';
    const video = await Video.findOne({ title: videoTitle });

    if (!video) {
      console.log('未找到视频:', videoTitle);
      process.exit(1);
    }

    console.log('找到视频:', video.title);
    console.log('视频ID:', video._id);

    // 获取该视频的所有弹幕
    const danmakus = await Danmaku.find({ videoId: video._id }).sort({ createdAt: 1 });
    console.log(`找到 ${danmakus.length} 条弹幕`);

    if (danmakus.length < 5) {
      console.log('弹幕数量不足5条，无法更新');
      process.exit(1);
    }

    // 更新前5条弹幕的点赞数
    const likesArray = [10, 20, 40, 80, 100];

    for (let i = 0; i < 5; i++) {
      danmakus[i].likes = likesArray[i];
      await danmakus[i].save();
      console.log(`更新弹幕 ${i + 1}: "${danmakus[i].text}" - 点赞数: ${likesArray[i]}`);
    }

    console.log('\n更新完成！');
    process.exit(0);
  } catch (error) {
    console.error('错误:', error);
    process.exit(1);
  }
}

updateDanmakuLikes();
