const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config({ path: '../.env' });

const findAdmins = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-danmaku';
    await mongoose.connect(mongoUri);
    console.log('连接数据库成功...');

    const admins = await User.find({ isSuperAdmin: true }).select('username email uid createdAt');
    
    if (admins.length === 0) {
      console.log('未找到任何管理员账户。');
    } else {
      console.log(`找到 ${admins.length} 个管理员:`);
      admins.forEach((admin, index) => {
        console.log(`${index + 1}. 用户名: ${admin.username}, 邮箱: ${admin.email}, UID: ${admin.uid}`);
      });
    }
  } catch (err) {
    console.error('查询出错:', err);
  } finally {
    await mongoose.disconnect();
  }
};

findAdmins();
