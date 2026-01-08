const mongoose = require('mongoose');
const User = require('../models/User');

// 连接数据库
mongoose.connect('mongodb://localhost:27017/video-danmaku', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function setSuperAdmin() {
  try {
    // 查找用户名为 02 的用户
    const user = await User.findOne({ username: '02' });

    if (!user) {
      console.log('未找到用户名为 02 的用户');
      process.exit(1);
    }

    // 设置为超级管理员
    user.isSuperAdmin = true;
    await user.save();

    console.log('成功将用户 02 设置为超级管理员');
    console.log('用户信息:', {
      username: user.username,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin
    });

    process.exit(0);
  } catch (error) {
    console.error('设置超级管理员失败:', error);
    process.exit(1);
  }
}

setSuperAdmin();
