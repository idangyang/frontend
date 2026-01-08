const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

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

    const user = new User({ username, email, password });
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
  body('identifier').notEmpty().withMessage('请输入用户名或邮箱'),
  body('password').notEmpty().withMessage('请输入密码')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { identifier, password } = req.body;

    // 尝试通过邮箱或用户名查找用户
    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({ error: '用户名/邮箱或密码错误' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: '用户名/邮箱或密码错误' });
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

// 获取当前用户信息
router.get('/me', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        username: req.user.username,
        email: req.user.email,
        avatar: req.user.avatar
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

module.exports = router;
