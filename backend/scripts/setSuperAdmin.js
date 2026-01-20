const mongoose = require('mongoose');
const User = require('../models/User');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// 获取命令行参数中的用户名，默认为 '02'
const targetUsername = process.argv[2] || '02';

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/video-danmaku';
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log(`数据库连接成功: ${mongoURI.replace(/:([^:@]+)@/, ':****@')}`); // 隐藏密码打印
  } catch (error) {
    console.error('数据库连接失败:', error);
    process.exit(1);
  }
};

async function setSuperAdmin() {
  await connectDB();

  try {
    console.log(`正在查找用户: ${targetUsername}...`);
    // 查找指定用户名的用户
    const user = await User.findOne({ username: targetUsername });

    if (!user) {
      console.error(`错误: 未找到用户名为 "${targetUsername}" 的用户。`);
      console.log('请确保该用户已经在云端完成注册。');
      process.exit(1);
    }

    if (user.isSuperAdmin) {
      console.log(`用户 "${targetUsername}" 已经是超级管理员，无需重复设置。`);
      process.exit(0);
    }

    // 设置为超级管理员
    user.isSuperAdmin = true;
    await user.save();

    console.log(`\n成功！用户 "${targetUsername}" 已被设置为超级管理员。`);
    console.log('用户信息:', {
      id: user._id,
      username: user.username,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin
    });

    process.exit(0);
  } catch (error) {
    console.error('设置超级管理员过程中发生错误:', error);
    process.exit(1);
  }
}

setSuperAdmin();
