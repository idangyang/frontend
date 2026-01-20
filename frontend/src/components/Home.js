import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { getResourceUrl } from '../config';
import './Home.css';

// 预设背景图片配置
const PRESET_BACKGROUNDS = [
  { id: 'bg1', name: '背景1', url: require('../assets/backgrounds/bg1.png') },
  { id: 'bg2', name: '背景2', url: require('../assets/backgrounds/bg2.png') },
  { id: 'bg3', name: '背景3', url: require('../assets/backgrounds/bg3.png') },
  { id: 'bg4', name: '背景4', url: require('../assets/backgrounds/bg4.png') },
  { id: 'bg5', name: '背景5', url: require('../assets/backgrounds/bg5.png') },
  { id: 'bg6', name: '背景6', url: require('../assets/backgrounds/bg6.png') },
  { id: 'bg7', name: '背景7', url: require('../assets/backgrounds/bg7.png') },
  { id: 'bg8', name: '背景8', url: require('../assets/backgrounds/bg8.png') },
];

const SearchIcon = () => (
  <svg
    className="search-icon-svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const Home = () => {
  const [videos, setVideos] = useState([]);
  const [series, setSeries] = useState([]);
  const [viewMode, setViewMode] = useState('all'); // 'all', 'videos', 'series'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showBackgroundModal, setShowBackgroundModal] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [selectedPresetBg, setSelectedPresetBg] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isComposing, setIsComposing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // 格式化视频时长（秒 -> MM:SS 或 HH:MM:SS）
  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return null;

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    fetchVideos();
    fetchSeries();
    fetchCurrentUser();
    loadBackgroundImage();
  }, []);

  // 搜索建议防抖
  useEffect(() => {
    // 如果正在使用中文输入法输入拼音，不获取建议
    if (isComposing) {
      return;
    }

    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        fetchSuggestions();
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
        // 如果清空搜索框且之前搜索过，重新加载所有内容
        if (hasSearched) {
          setHasSearched(false);
          fetchVideos();
          fetchSeries();
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isComposing]);

  // 点击外部关闭搜索建议
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoClick = () => {
    setSearchQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (hasSearched) {
      setHasSearched(false);
      fetchVideos();
      fetchSeries();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 监听路由变化，点击导航栏 Logo (to="/") 时重置搜索
  useEffect(() => {
    if (location.pathname === '/' && !location.search && hasSearched) {
      handleLogoClick();
    }
  }, [location]);

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
      setVideos(response.data.videos || []);
      setError('');
    } catch (err) {
      console.error('获取视频列表失败:', err);
      setError('加载视频失败，请稍后重试');
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeries = async () => {
    try {
      const response = await api.get('/series');
      setSeries(response.data.series || []);
    } catch (err) {
      console.error('获取系列列表失败:', err);
      setSeries([]);
    }
  };

  const fetchSuggestions = async () => {
    try {
      const [videoSuggestions, seriesSuggestions] = await Promise.all([
        api.get('/videos/suggestions', { params: { query: searchQuery } }),
        api.get('/series/suggestions', { params: { query: searchQuery } })
      ]);

      const allSuggestions = [
        ...(videoSuggestions.data.suggestions || []),
        ...(seriesSuggestions.data.suggestions || [])
      ];

      // 去重
      const uniqueSuggestions = [...new Set(allSuggestions)];
      setSuggestions(uniqueSuggestions.slice(0, 10));
      setShowSuggestions(uniqueSuggestions.length > 0);
    } catch (err) {
      console.error('获取搜索建议失败:', err);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const performSearch = async () => {
    try {
      setIsSearching(true);
      setLoading(true);
      setShowSuggestions(false);
      setHasSearched(true);

      const [videosResponse, seriesResponse] = await Promise.all([
        api.get('/videos/search', { params: { query: searchQuery } }),
        api.get('/series/search', { params: { query: searchQuery } })
      ]);

      setVideos(videosResponse.data.videos || []);
      setSeries(seriesResponse.data.series || []);
      setError('');
    } catch (err) {
      console.error('搜索失败:', err);
      setError('搜索失败，请稍后重试');
      setVideos([]);
      setSeries([]);
    } finally {
      setLoading(false);
      setIsSearching(false);
    }
  };

  const handleSearchClick = () => {
    // 始终可以点击，但无内容时不执行搜索
    if (!searchQuery.trim()) {
      return;
    }
    performSearch();
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    // 延迟一下再搜索，让 searchQuery 更新完成
    setTimeout(() => {
      performSearch();
    }, 100);
  };

  const handleVideoClick = (videoId) => {
    navigate(`/video/${videoId}`);
  };

  const handleSeriesClick = (seriesId) => {
    navigate(`/series/${seriesId}`);
  };

  // 加载背景图片
  const loadBackgroundImage = () => {
    const savedBackground = localStorage.getItem('homeBackground');
    const backgroundType = localStorage.getItem('homeBackgroundType');

    if (savedBackground && backgroundType) {
      // 用户已设置背景，使用用户设置的背景
      document.body.style.backgroundImage = `url(${savedBackground})`;
      document.body.style.backgroundSize = 'cover';
      document.body.style.backgroundPosition = 'center';
      document.body.style.backgroundAttachment = 'fixed';
    } else {
      // 用户未设置背景，随机选择一张预设背景
      if (PRESET_BACKGROUNDS.length > 0) {
        const randomIndex = Math.floor(Math.random() * PRESET_BACKGROUNDS.length);
        const randomBg = PRESET_BACKGROUNDS[randomIndex];
        document.body.style.backgroundImage = `url(${randomBg.url})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
      }
    }
  };

  // 处理预设背景选择
  const handlePresetSelect = (preset) => {
    setSelectedPresetBg(preset.id);
    setPreviewImage(preset.url);
    setBackgroundImage(null); // 清除自定义上传的图片
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
      setSelectedPresetBg(null); // 清除预设背景选择
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // 上传背景图片
  const handleUploadBackground = () => {
    // 如果选择了预设背景
    if (selectedPresetBg) {
      const preset = PRESET_BACKGROUNDS.find(bg => bg.id === selectedPresetBg);
      if (preset) {
        localStorage.setItem('homeBackground', preset.url);
        localStorage.setItem('homeBackgroundType', 'preset');
        localStorage.setItem('homeBackgroundPresetId', preset.id);
        document.body.style.backgroundImage = `url(${preset.url})`;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.body.style.backgroundAttachment = 'fixed';
        setShowBackgroundModal(false);
        setSelectedPresetBg(null);
        setPreviewImage(null);
        alert('背景设置成功');
      }
      return;
    }

    // 如果上传了自定义图片
    if (!backgroundImage) {
      alert('请先选择图片或预设背景');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      localStorage.setItem('homeBackground', imageData);
      localStorage.setItem('homeBackgroundType', 'custom');
      localStorage.removeItem('homeBackgroundPresetId');
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
      localStorage.removeItem('homeBackgroundType');
      localStorage.removeItem('homeBackgroundPresetId');
      document.body.style.backgroundImage = '';
      document.body.style.backgroundColor = '';
      setShowBackgroundModal(false);
      setBackgroundImage(null);
      setPreviewImage(null);
      setSelectedPresetBg(null);
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
      {/* 搜索框 */}
      <div className={`search-container ${hasSearched ? 'is-searched-page' : ''}`} ref={searchRef}>
        <div className="search-input-wrapper">
          <div className="search-input-container">
            <input
              type="text"
              className="search-input"
              placeholder="搜索视频标题"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSearchClick();
                }
              }}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
            />
            {searchQuery && (
              <button
                className="search-clear-button"
                onClick={() => {
                  setSearchQuery('');
                  setSuggestions([]);
                  setShowSuggestions(false);
                }}
              >
                ✕
              </button>
            )}
          </div>
          <button
            className="search-button"
            onClick={handleSearchClick}
          >
            <SearchIcon /> 搜索
          </button>
        </div>
        {isSearching && <span className="search-loading">搜索中...</span>}

        {/* 搜索建议 */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="search-suggestions">
            {suggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <SearchIcon /> {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 视图切换按钮 */}
      <div className="view-mode-buttons">
        <button
          className={viewMode === 'all' ? 'active' : ''}
          onClick={() => setViewMode('all')}
        >
          全部
        </button>
        <button
          className={viewMode === 'videos' ? 'active' : ''}
          onClick={() => setViewMode('videos')}
        >
          单个视频
        </button>
        <button
          className={viewMode === 'series' ? 'active' : ''}
          onClick={() => setViewMode('series')}
        >
          剧集
        </button>
      </div>

      {/* 背景设置按钮 */}
      <button className="background-button" onClick={() => setShowBackgroundModal(true)}>
        🎨 设置背景
      </button>

      {/* 剧集显示 */}
      {(viewMode === 'all' || viewMode === 'series') && series.length > 0 && (
        <div className="series-section">
          <h2 className="section-title">剧集</h2>
          <div className="video-grid">
            {series.map((s) => {
              // 剧集根据aspectRatio判断是否为竖屏，如果没有aspectRatio则默认为横屏
              const isVertical = s.aspectRatio && s.aspectRatio < 1;

              if (isVertical) {
                // 竖屏布局
                return (
                  <div
                    key={s._id}
                    className="video-card vertical"
                    onClick={() => handleSeriesClick(s._id)}
                  >
                    <div className="video-thumbnail-wrapper">
                      <div className="video-thumbnail">
                        {s.thumbnail ? (
                          <img src={getResourceUrl(s.thumbnail)} alt={s.title} />
                        ) : (
                          <div className="thumbnail-placeholder">
                            <span>📺</span>
                          </div>
                        )}
                        <div className="series-badge">剧集 {s.totalEpisodes}集</div>
                      </div>
                    </div>
                    <div className="video-info">
                      <h3 className="video-title">{s.title}</h3>
                      <p className="video-description">{s.description || '暂无描述'}</p>
                      <div className="video-meta">
                        <span className="video-uploader">
                          {s.uploader?.username || '未知用户'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              } else {
                // 横屏布局：简介在上，封面在中，标题和发布人在下
                return (
                  <div
                    key={s._id}
                    className="video-card horizontal"
                    onClick={() => handleSeriesClick(s._id)}
                  >
                    <div className="video-info">
                      <p className="video-description">{s.description || '暂无描述'}</p>
                    </div>
                    <div className="video-thumbnail-wrapper">
                      <div className="video-thumbnail">
                        {s.thumbnail ? (
                          <img src={getResourceUrl(s.thumbnail)} alt={s.title} />
                        ) : (
                          <div className="thumbnail-placeholder">
                            <span>📺</span>
                          </div>
                        )}
                        <div className="series-badge">剧集 {s.totalEpisodes}集</div>
                      </div>
                    </div>
                    <h3 className="video-title">{s.title}</h3>
                    <div className="video-meta">
                      <span className="video-uploader">
                        {s.uploader?.username || '未知用户'}
                      </span>
                    </div>
                  </div>
                );
              }
            })}
          </div>
        </div>
      )}

      {/* 单个视频显示 */}
      {(viewMode === 'all' || viewMode === 'videos') && (
        <>
          {viewMode === 'all' && videos.length > 0 && (
            <h2 className="section-title">单个视频</h2>
          )}
          {videos.length === 0 ? (
            <div className="no-videos">暂无视频，快去上传吧！</div>
          ) : (
            <div className="video-grid">
              {videos.map((video) => {
                const isVertical = video.aspectRatio && video.aspectRatio < 1; // 竖屏视频：宽/高 < 1

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
                            <img src={getResourceUrl(video.thumbnail)} alt={video.title} />
                          ) : (
                            <div className="thumbnail-placeholder">
                              <span>📹</span>
                            </div>
                          )}
                          {formatDuration(video.duration) && (
                            <div className="video-duration">{formatDuration(video.duration)}</div>
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
                            <img src={getResourceUrl(video.thumbnail)} alt={video.title} />
                          ) : (
                            <div className="thumbnail-placeholder">
                              <span>📹</span>
                            </div>
                          )}
                          {formatDuration(video.duration) && (
                            <div className="video-duration">{formatDuration(video.duration)}</div>
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
        </>
      )}

      {/* 背景设置模态框 */}
      {showBackgroundModal && (
        <div className="background-modal-overlay" onClick={() => setShowBackgroundModal(false)}>
          <div className="background-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>设置背景图片</h2>

            {/* 预设背景选择 */}
            <div className="preset-backgrounds-section">
              <h3>选择预设背景</h3>
              <div className="preset-backgrounds-grid">
                {PRESET_BACKGROUNDS.map((preset) => (
                  <div
                    key={preset.id}
                    className={`preset-bg-item ${selectedPresetBg === preset.id ? 'selected' : ''}`}
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <img src={preset.url} alt={preset.name} />
                    <span className="preset-bg-name">{preset.name}</span>
                    {selectedPresetBg === preset.id && (
                      <div className="preset-bg-check">✓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 分隔线 */}
            <div className="background-divider">
              <span>或</span>
            </div>

            {/* 自定义上传 */}
            <div className="background-upload-area" onClick={() => document.getElementById('background-input').click()}>
              <input
                id="background-input"
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
              />
              <p>📁 点击上传自定义图片</p>
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
              <button className="btn-upload" onClick={handleUploadBackground} disabled={!backgroundImage && !selectedPresetBg}>
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
