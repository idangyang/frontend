import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './UserProfile.css';

const UserProfile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'videos', 'others'
  const [myVideos, setMyVideos] = useState([]);
  const [selectedVideos, setSelectedVideos] = useState([]); // 选中的视频ID列表
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  // 他人视频管理相关状态
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [otherUserVideos, setOtherUserVideos] = useState([]);

  // 修改密码表单
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // 修改邮箱表单
  const [emailForm, setEmailForm] = useState({
    password: '',
    newEmail: ''
  });

  // 注销账号表单
  const [deactivatePassword, setDeactivatePassword] = useState('');

  useEffect(() => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const userData = JSON.parse(userStr);
      console.log('UserProfile - 从localStorage读取的用户数据:', userData);
      console.log('UserProfile - isSuperAdmin值:', userData.isSuperAdmin);
      setUser(userData);
      // 直接从 localStorage 读取超级管理员状态
      setIsSuperAdmin(userData.isSuperAdmin || false);
      console.log('UserProfile - 设置isSuperAdmin为:', userData.isSuperAdmin || false);
    } else {
      navigate('/auth');
    }

    // 如果在视频管理标签，加载用户的视频
    if (activeTab === 'videos') {
      fetchMyVideos();
    }
  }, [navigate, activeTab]);

  // 获取用户上传的视频
  const fetchMyVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos/my-videos');
      setMyVideos(response.data.videos);
    } catch (error) {
      console.error('获取视频列表失败:', error);
      alert('获取视频列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除视频
  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('确定要删除这个视频吗？删除后无法恢复。')) {
      return;
    }

    try {
      await api.delete(`/videos/${videoId}`);
      alert('视频删除成功');
      // 重新加载视频列表
      fetchMyVideos();
    } catch (error) {
      console.error('删除视频失败:', error);
      alert(error.response?.data?.error || '删除失败，请重试');
    }
  };

  // 切换视频选中状态
  const toggleVideoSelection = (videoId) => {
    setSelectedVideos(prev =>
      prev.includes(videoId)
        ? prev.filter(id => id !== videoId)
        : [...prev, videoId]
    );
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedVideos.length === myVideos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(myVideos.map(v => v._id));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedVideos.length === 0) {
      alert('请先选择要删除的视频');
      return;
    }

    if (!window.confirm(`确定要删除选中的 ${selectedVideos.length} 个视频吗？删除后无法恢复。`)) {
      return;
    }

    try {
      setLoading(true);
      await Promise.all(selectedVideos.map(id => api.delete(`/videos/${id}`)));
      alert('批量删除成功');
      setSelectedVideos([]);
      fetchMyVideos();
    } catch (error) {
      console.error('批量删除失败:', error);
      alert('批量删除失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 修改密码
  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('两次输入的新密码不一致');
      return;
    }

    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      alert('密码修改成功');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('修改密码错误:', error);
      console.error('错误详情:', error.response?.data);
      const errorMsg = error.response?.data?.error || error.response?.data?.errors?.[0]?.msg || '修改失败，请重试';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 修改邮箱
  const handleChangeEmail = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await api.put('/auth/change-email', {
        password: emailForm.password,
        newEmail: emailForm.newEmail
      });

      alert('邮箱修改成功');
      const updatedUser = { ...user, email: response.data.email };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setEmailForm({ password: '', newEmail: '' });
    } catch (error) {
      const errorMsg = error.response?.data?.error || '修改失败，请重试';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 退出登录
  const handleLogout = () => {
    if (window.confirm('确定要退出登录吗？')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      navigate('/auth');
    }
  };

  // 注销账号
  const handleDeactivate = async (e) => {
    e.preventDefault();

    if (!window.confirm('注销账号后，您的数据将在30天后永久删除。确定要注销吗？')) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/deactivate', {
        password: deactivatePassword
      });

      alert('账号已注销，数据将在30天后删除');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      navigate('/auth');
    } catch (error) {
      const errorMsg = error.response?.data?.error || '注销失败，请重试';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // 搜索用户
  const handleSearchUsers = async () => {
    if (!searchUsername.trim()) {
      alert('请输入用户名');
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/videos/admin/search-users?username=${searchUsername}`);
      setSearchResults(response.data.users);
    } catch (error) {
      console.error('搜索用户失败:', error);
      alert('搜索用户失败');
    } finally {
      setLoading(false);
    }
  };

  // 选择用户并获取其视频
  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setSearchResults([]);
    setSearchUsername('');

    try {
      setLoading(true);
      const response = await api.get(`/videos/admin/user-videos/${user._id}`);
      setOtherUserVideos(response.data.videos);
    } catch (error) {
      console.error('获取用户视频失败:', error);
      alert('获取用户视频失败');
    } finally {
      setLoading(false);
    }
  };

  // 删除他人视频
  const handleDeleteOtherVideo = async (videoId) => {
    if (!window.confirm('确定要删除这个视频吗？删除后无法恢复。')) {
      return;
    }

    try {
      await api.delete(`/videos/${videoId}`);
      alert('视频删除成功');
      // 重新加载该用户的视频列表
      if (selectedUser) {
        handleSelectUser(selectedUser);
      }
    } catch (error) {
      console.error('删除视频失败:', error);
      alert(error.response?.data?.error || '删除失败，请重试');
    }
  };

  if (!user) {
    return <div className="profile-container"><div className="loading">加载中...</div></div>;
  }

  return (
    <div className="profile-container">
      {/* 左侧导航栏 */}
      <div className="profile-sidebar">
        <button
          className={`sidebar-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          个人中心
        </button>
        <button
          className={`sidebar-btn ${activeTab === 'videos' ? 'active' : ''}`}
          onClick={() => setActiveTab('videos')}
        >
          视频管理
        </button>
        {isSuperAdmin && (
          <button
            className={`sidebar-btn ${activeTab === 'others' ? 'active' : ''}`}
            onClick={() => setActiveTab('others')}
          >
            他人视频
          </button>
        )}
      </div>

      {/* 右侧内容区域 */}
      <div className="profile-content">
        {activeTab === 'profile' ? (
          // 个人中心内容
          <div className="profile-box">
            <h2 className="profile-title">个人中心</h2>

            {/* 用户信息 */}
            <div className="profile-section">
              <h3>用户信息</h3>
              <div className="info-item">
                <label>用户名：</label>
                <span>{user.username}</span>
              </div>
              <div className="info-item">
                <label>邮箱：</label>
                <span>{user.email}</span>
              </div>
            </div>

            {/* 修改密码 */}
            <div className="profile-section">
              <h3>修改密码</h3>
              <form onSubmit={handleChangePassword}>
                <div className="form-group">
                  <label>当前密码</label>
                  <input
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>新密码</label>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                    minLength={4}
                  />
                </div>
                <div className="form-group">
                  <label>确认新密码</label>
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    required
                    minLength={4}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '处理中...' : '修改密码'}
                </button>
              </form>
            </div>

            {/* 修改邮箱 */}
            <div className="profile-section">
              <h3>修改邮箱</h3>
              <form onSubmit={handleChangeEmail}>
                <div className="form-group">
                  <label>密码</label>
                  <input
                    type="password"
                    value={emailForm.password}
                    onChange={(e) => setEmailForm({...emailForm, password: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>新邮箱</label>
                  <input
                    type="email"
                    value={emailForm.newEmail}
                    onChange={(e) => setEmailForm({...emailForm, newEmail: e.target.value})}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary">
                  {loading ? '处理中...' : '修改邮箱'}
                </button>
              </form>
            </div>

            {/* 退出登录 */}
            <div className="profile-section">
              <h3>退出登录</h3>
              <button onClick={handleLogout} className="btn-secondary">
                退出登录
              </button>
            </div>

            {/* 注销账号 */}
            <div className="profile-section danger-section">
              <h3>注销账号</h3>
              <p className="warning-text">注销账号后，您的数据将在30天后永久删除</p>
              <form onSubmit={handleDeactivate}>
                <div className="form-group">
                  <label>请输入密码确认注销</label>
                  <input
                    type="password"
                    value={deactivatePassword}
                    onChange={(e) => setDeactivatePassword(e.target.value)}
                    required
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-danger">
                  {loading ? '处理中...' : '注销账号'}
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === 'videos' ? (
          // 视频管理内容
          <div className="profile-box">
            <h2 className="profile-title">视频管理</h2>

            {loading ? (
              <div className="loading">加载中...</div>
            ) : myVideos.length === 0 ? (
              <div className="no-videos">暂无上传的视频</div>
            ) : (
              <>
                {/* 批量操作工具栏 */}
                <div className="batch-actions">
                  <div className="batch-actions-left">
                    <label className="select-all-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedVideos.length === myVideos.length}
                        onChange={toggleSelectAll}
                      />
                      全选
                    </label>
                    <span className="selected-count">
                      已选择 {selectedVideos.length} 个视频
                    </span>
                  </div>
                </div>

                {/* 视频列表 */}
                <div className="videos-list">
                  {myVideos.map((video) => (
                    <div key={video._id} className="video-item">
                      {/* 复选框 */}
                      <input
                        type="checkbox"
                        className="video-item-checkbox"
                        checked={selectedVideos.includes(video._id)}
                        onChange={() => toggleVideoSelection(video._id)}
                      />

                      <div className="video-item-thumbnail">
                        {video.thumbnail ? (
                          <img src={`http://localhost:5001/${video.thumbnail}`} alt={video.title} />
                        ) : (
                          <div className="thumbnail-placeholder">📹</div>
                        )}
                      </div>
                      <div className="video-item-info">
                        <h3>{video.title}</h3>
                        <p>{video.description || '暂无描述'}</p>
                        <div className="video-item-meta">
                          <span>👁 {video.views} 次观看</span>
                          <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="video-item-actions">
                        <button
                          onClick={() => navigate(`/video/${video._id}`)}
                          className="btn-view"
                        >
                          查看
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video._id)}
                          className="btn-delete"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 浮动批量删除按钮 */}
                {selectedVideos.length > 0 && (
                  <button
                    className="btn-batch-delete-floating"
                    onClick={handleBatchDelete}
                  >
                    批量删除 ({selectedVideos.length})
                  </button>
                )}
              </>
            )}
          </div>
        ) : activeTab === 'others' ? (
          // 他人视频管理内容
          <div className="profile-box">
            <h2 className="profile-title">他人视频管理</h2>

            {/* 搜索用户 */}
            <div className="search-user-section">
              <div className="search-input-group">
                <input
                  type="text"
                  className="search-input"
                  placeholder="输入用户名搜索..."
                  value={searchUsername}
                  onChange={(e) => setSearchUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchUsers()}
                />
                <button className="btn-search" onClick={handleSearchUsers}>
                  搜索
                </button>
              </div>

              {/* 搜索结果 */}
              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((user) => (
                    <div
                      key={user._id}
                      className="search-result-item"
                      onClick={() => handleSelectUser(user)}
                    >
                      <span className="result-username">{user.username}</span>
                      <span className="result-email">{user.email}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 选中用户信息 */}
            {selectedUser && (
              <div className="selected-user-info">
                <h3>当前管理用户：{selectedUser.username}</h3>
                <button
                  className="btn-clear-selection"
                  onClick={() => {
                    setSelectedUser(null);
                    setOtherUserVideos([]);
                  }}
                >
                  清除选择
                </button>
              </div>
            )}

            {/* 他人视频列表 */}
            {loading ? (
              <div className="loading">加载中...</div>
            ) : selectedUser && otherUserVideos.length === 0 ? (
              <div className="no-videos">该用户暂无视频</div>
            ) : selectedUser && otherUserVideos.length > 0 ? (
              <div className="videos-list">
                {otherUserVideos.map((video) => (
                  <div key={video._id} className="video-item">
                    <div className="video-item-thumbnail">
                      {video.thumbnail ? (
                        <img src={`http://localhost:5001/${video.thumbnail}`} alt={video.title} />
                      ) : (
                        <div className="thumbnail-placeholder">📹</div>
                      )}
                    </div>
                    <div className="video-item-info">
                      <h3>{video.title}</h3>
                      <p>{video.description || '暂无描述'}</p>
                      <div className="video-item-meta">
                        <span>👁 {video.views} 次观看</span>
                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="video-item-actions">
                      <button
                        onClick={() => navigate(`/video/${video._id}`)}
                        className="btn-view"
                      >
                        查看
                      </button>
                      <button
                        onClick={() => handleDeleteOtherVideo(video._id)}
                        className="btn-delete"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default UserProfile;
