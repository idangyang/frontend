import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Auth.css';

const Auth = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    identifier: '', // 用于登录时的用户名或邮箱
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const data = isLogin
        ? { identifier: formData.identifier, password: formData.password }
        : formData;

      const response = await api.post(endpoint, data);

      console.log('Auth - 登录响应数据:', response.data);
      console.log('Auth - 用户信息:', response.data.user);
      console.log('Auth - isSuperAdmin:', response.data.user.isSuperAdmin);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('userId', response.data.user._id);

      console.log('Auth - 已保存到localStorage的用户信息:', JSON.parse(localStorage.getItem('user')));

      alert(isLogin ? '登录成功！' : '注册成功！');

      if (onLoginSuccess) {
        onLoginSuccess(response.data.user);
      }

      // 登录成功后跳转到主页
      navigate('/');
    } catch (error) {
      const errorMsg = error.response?.data?.error || '操作失败，请重试';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2>{isLogin ? '登录' : '注册'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>用户名</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}

          {isLogin ? (
            <div className="form-group">
              <label>用户名或邮箱</label>
              <input
                type="text"
                name="identifier"
                value={formData.identifier}
                onChange={handleChange}
                placeholder="请输入用户名或邮箱"
                required
              />
            </div>
          ) : (
            <div className="form-group">
              <label>邮箱</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={4}
            />
          </div>

          <button type="submit" disabled={loading} className="auth-button">
            {loading ? '处理中...' : (isLogin ? '登录' : '注册')}
          </button>
        </form>

        <p className="auth-switch">
          {isLogin ? '还没有账号？' : '已有账号？'}
          <span onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? '立即注册' : '立即登录'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
