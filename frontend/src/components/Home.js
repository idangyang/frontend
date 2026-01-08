import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Home.css';

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchVideos();
    fetchCurrentUser();
    loadBackgroundImage();
  }, []);

  const fetchCurrentUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        setCurrentUser(user);
      } catch (err) {
        console.error('解析用户信息失败:', err);
      }
    }
  };

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/videos');
      setVideos(response.data.videos);
      setError('');
    } catch (err) {
      console.error('获取视频列表失败:', err);
      setError('加载视频失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  // 加载背景图片
  const loadBackgroundImage = () => {
    const savedBackground = localStorage.getItem('homeBackground');
    if (savedBackground) {
      document.body.style.backgroundImage = `url(${savedBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    }
  };

  // 处理图片选择
  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
      }
      setBackgroundImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传背景图片
  const handleUploadBackground = () => {
    if (!backgroundImage) {
      alert('请先选择图片');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      localStorage.setItem('homeBackground', imageData);
      document.body.style.backgroundImage = `url(${imageData})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
      setShowBackgroundModal(false);
      setBackgroundImage(null);
      setPreviewImage(null);
      alert('背景设置成功');
    };
    reader.readAsDataURL(backgroundImage);
  };

  // 重置背景
  const handleResetBackground = () => {
    if (window.confirm('确定要恢复默认背景吗？')) {
      localStorage.removeItem('homeBackground');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
      setShowBackgroundModal(false);
      setBackgroundImage(null);
      setPreviewImage(null);
      alert('已恢复默认背景');
    }
  };

  if (loading) {
    return <div className="home-container"><div className="loading">加载中...</div></div>;
  }

  if (error) {
    return <div className="home-container"><div className="error">{error}</div></div>;
  }

  return (
    <div className="home-container">
      <div className="home-header">
        <h1 className="home-title">视频列表</h1>
        {currentUser && (
          <div className="user-display" onClick={() => navigate('/profile')}>
            {currentUser.username}
          </div>
        )}
      </div>

      {/* 背景设置按钮 */}
      <button className="background-button" onClick={() => setShowBackgroundModal(true)}>
        🎨 设置背景
      </button>
      {videos.length === 0 ? (
        <div className="no-videos">暂无视频，快去上传吧！</div>
      ) : (
        <div className="video-grid">
          {videos.map((video) => {
            const isVertical = video.aspectRatio < 1; // 竖屏视频：宽/高 < 1

            if (isVertical) {
              // 竖屏视频布局：封面在左，右侧从上到下是标题、简介、发布人
              return (
                <div
                  key={video._id}
                  className="video-card vertical"
                  onClick={() => handleVideoClick(video._id)}
                >
                  <div className="video-thumbnail-wrapper">
                    <div className="video-thumbnail">
                      {video.thumbnail ? (
                        <img src={`http://localhost:5001/${video.thumbnail}`} alt={video.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span>📹</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="video-info">
                    <h3 className="video-title">{video.title}</h3>
                    <p className="video-description">{video.description || '暂无描述'}</p>
                    <div className="video-meta">
                      <span className="video-uploader">
                        {video.uploader?.username || '未知用户'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            } else {
              // 横屏视频布局：简介在上，封面在中，标题和发布人在下
              return (
                <div
                  key={video._id}
                  className="video-card horizontal"
                  onClick={() => handleVideoClick(video._id)}
                >
                  <div className="video-info">
                    <p className="video-description">{video.description || '暂无描述'}</p>
                  </div>
                  <div className="video-thumbnail-wrapper">
                    <div className="video-thumbnail">
                      {video.thumbnail ? (
                        <img src={`http://localhost:5001/${video.thumbnail}`} alt={video.title} />
                      ) : (
                        <div className="thumbnail-placeholder">
                          <span>📹</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <h3 className="video-title">{video.title}</h3>
                  <div className="video-meta">
                    <span className="video-uploader">
                      {video.uploader?.username || '未知用户'}
                    </span>
                  </div>
                </div>
              );
            }
          })}
        </div>
      )}

      {/* 背景设置模态框 */}
      {showBackgroundModal && (
        <div className="background-modal-overlay" onClick={() => setShowBackgroundModal(false)}>
          <div className="background-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>设置背景图片</h2>

            <div className="background-upload-area" onClick={() => document.getElementById('background-input').click()}>
              <input
                id="background-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
              />
              <p>📁 点击选择图片</p>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '10px' }}>
                支持 JPG、PNG、GIF 等格式
              </p>
            </div>

            {previewImage && (
              <div className="background-preview">
                <img src={previewImage} alt="预览" />
              </div>
            )}

            <div className="background-modal-actions">
              <button className="btn-upload" onClick={handleUploadBackground} disabled={!backgroundImage}>
                确认设置
              </button>
              <button className="btn-reset" onClick={handleResetBackground}>
                恢复默认
              </button>
              <button className="btn-cancel" onClick={() => setShowBackgroundModal(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
