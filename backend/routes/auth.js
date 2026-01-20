const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { generateMonthlyUid } = require('../utils/uidGenerator');

// 注册
router.post('/register', [
  body('username').trim().notEmpty().withMessage('用户名不能为空'),
  body('email').isEmail().withMessage('请输入有效的邮箱'),
  body('password').isLength({ min: 4 }).withMessage('密码至少4个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, password } = req.body;

    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ error: '用户名或邮箱已存在' });
    }

    // 生成月份格式的 UID
    const uid = await generateMonthlyUid();

    const user = new User({ username, email, password, uid });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: '注册成功',
      token,
      user: {
        id: user._id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin || false
      }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 登录
router.post('/login', [
  body('identifier').notEmpty().withMessage('请输入用户名、邮箱或UID'),
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { identifier, password } = req.body;

    // 尝试通过邮箱、用户名或 UID 查找用户
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { uid: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: '用户不存在' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '密码错误' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'your_jwt_secret_key_here',
      { expiresIn: '7d' }
    );

    res.json({
      message: '登录成功',
      token,
      user: {
        id: user._id,
        uid: user.uid,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        isSuperAdmin: user.isSuperAdmin || false
      }
    });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 修改密码
router.put('/change-password', [
  auth,
  body('currentPassword').notEmpty().withMessage('请输入当前密码'),
  body('newPassword').isLength({ min: 4 }).withMessage('新密码至少4个字符')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ error: '当前密码错误' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 修改邮箱
router.put('/change-email', [
  auth,
  body('password').notEmpty().withMessage('请输入密码'),
  body('newEmail').isEmail().withMessage('请输入有效的邮箱')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password, newEmail } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '密码错误' });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser) {
      return res.status(400).json({ error: '该邮箱已被使用' });
    }

    user.email = newEmail;
    await user.save();

    res.json({ message: '邮箱修改成功', email: newEmail });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 注销账号
router.post('/deactivate', [
  auth,
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { password } = req.body;
    const user = await User.findById(req.userId);

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '密码错误' });
    }

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({ message: '账号已注销，数据将在30天后删除' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员查看指定用户信息（只读）
router.get('/user/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const targetUserId = req.params.userId;

    // 只有管理员或用户本人可以查看
    if (!currentUser.isSuperAdmin && req.userId.toString() !== targetUserId) {
      return res.status(403).json({ error: '无权查看此用户信息' });
    }

    const user = await User.findById(targetUserId).select('-password');
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员修改用户密码
router.put('/admin/change-password/:userId', [
  auth,
  body('newPassword').isLength({ min: 4 }).withMessage('新密码至少4个字符')
], async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    // 只有管理员可以修改其他用户密码
    if (!currentUser.isSuperAdmin) {
      return res.status(403).json({ error: '无权执行此操作' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newPassword } = req.body;
    const targetUserId = req.params.userId;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: '密码修改成功' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员修改用户邮箱
router.put('/admin/change-email/:userId', [
  auth,
  body('newEmail').isEmail().withMessage('请输入有效的邮箱')
], async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    // 只有管理员可以修改其他用户邮箱
    if (!currentUser.isSuperAdmin) {
      return res.status(403).json({ error: '无权执行此操作' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { newEmail } = req.body;
    const targetUserId = req.params.userId;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const existingUser = await User.findOne({ email: newEmail });
    if (existingUser && existingUser._id.toString() !== targetUserId) {
      return res.status(400).json({ error: '该邮箱已被使用' });
    }

    user.email = newEmail;
    await user.save();

    res.json({ message: '邮箱修改成功', email: newEmail });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

// 管理员注销用户账号
router.post('/admin/deactivate/:userId', auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);

    // 只有管理员可以注销其他用户账号
    if (!currentUser.isSuperAdmin) {
      return res.status(403).json({ error: '无权执行此操作' });
    }

    const targetUserId = req.params.userId;

    const user = await User.findById(targetUserId);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    user.isDeactivated = true;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({ message: '账号已注销，数据将在30天后删除' });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

module.exports = router;
