import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import DanmakuEngine from '../utils/DanmakuEngine';
import VoiceRecorder from './VoiceRecorder';
import { getResourceUrl, getVideoStreamUrl } from '../config';
import './VideoDetail.css';

const VideoDetail = () => {
  const { id } = useParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const danmakuEngineRef = useRef(null);

  const [video, setVideo] = useState(null);
  const [danmakus, setDanmakus] = useState([]);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [danmakuText, setDanmakuText] = useState('');
  const [danmakuColor, setDanmakuColor] = useState('#FFFFFF');
  const [commentText, setCommentText] = useState('');
  const [lastTime, setLastTime] = useState(0);
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const shownDanmakusRef = useRef(new Set());

  // 播放控制状态
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const playerWrapperRef = useRef(null);

  useEffect(() => {
    fetchVideoData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // 键盘控制
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch(e.key) {
        case ' ':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(10);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, duration]);

  // 全屏状态监听
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement || !!document.webkitFullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && canvasRef.current && video) {
      if (!danmakuEngineRef.current) {
        danmakuEngineRef.current = new DanmakuEngine(canvasRef.current);
      }

      // 确保 Canvas 尺寸正确
      danmakuEngineRef.current.init();
      danmakuEngineRef.current.start();
      // console.log('DanmakuEngine 初始化完成, Canvas尺寸:', canvasRef.current.width, 'x', canvasRef.current.height);
    }

    return () => {
      if (danmakuEngineRef.current) {
        danmakuEngineRef.current.stop();
      }
    };
  }, [video]);

  const fetchVideoData = async () => {
    try {
      setLoading(true);
      const [videoRes, danmakuRes, commentRes] = await Promise.all([
        api.get(`/videos/${id}`),
        api.get(`/danmaku/video/${id}`),
        api.get(`/comments/video/${id}`)
      ]);

      setVideo(videoRes.data.video);
      setDanmakus(danmakuRes.data.danmakus);
      setComments(commentRes.data.comments);
      setError('');
      // console.log('加载的弹幕数据:', danmakuRes.data.danmakus);
    } catch (err) {
      console.error('获取视频数据失败:', err);
      setError('加载视频失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !danmakuEngineRef.current) return;

    const currentTime = videoRef.current.currentTime;
    setCurrentTime(currentTime);

    // 检测是否发生了时间跳跃（拖动进度条）
    const timeJump = Math.abs(currentTime - lastTime) > 1;

    danmakus.forEach(danmaku => {
      // 弹幕应该在当前时间点显示
      const shouldShow = danmaku.time >= lastTime && danmaku.time <= currentTime;

      // 检查这条弹幕是否已经显示过
      if (!shownDanmakusRef.current.has(danmaku._id)) {
        if (shouldShow || timeJump) {
          // 如果是时间跳跃，只显示当前时间点附近的弹幕
          if (timeJump) {
            if (Math.abs(danmaku.time - currentTime) < 0.5) {
              // console.log('显示弹幕:', danmaku.text, '弹幕时间:', danmaku.time, '当前时间:', currentTime);
              // console.log('弹幕数据:', { isVoice: danmaku.isVoice, audioUrl: danmaku.audioUrl });
              danmakuEngineRef.current.add(
                danmaku.text,
                danmaku.color || '#FFFFFF',
                danmaku.type || 'scroll',
                danmaku.isVoice || false,
                danmaku.audioUrl || null
              );
              shownDanmakusRef.current.add(danmaku._id);
            }
          } else {
            // console.log('显示弹幕:', danmaku.text, '弹幕时间:', danmaku.time, '当前时间:', currentTime);
            // console.log('弹幕数据:', { isVoice: danmaku.isVoice, audioUrl: danmaku.audioUrl });
            danmakuEngineRef.current.add(
              danmaku.text,
              danmaku.color || '#FFFFFF',
              danmaku.type || 'scroll',
              danmaku.isVoice || false,
              danmaku.audioUrl || null
            );
            shownDanmakusRef.current.add(danmaku._id);
          }
        }
      }
    });

    setLastTime(currentTime);
  };

  const handlePlayStateChange = () => {
    if (videoRef.current) {
      setIsPlaying(!videoRef.current.paused);
      if (danmakuEngineRef.current) {
        if (videoRef.current.paused) {
          danmakuEngineRef.current.pause();
        } else {
          danmakuEngineRef.current.resume();
        }
      }
    }
  };

  const handleSeeking = () => {
    if (videoRef.current && danmakuEngineRef.current) {
      // 清除所有正在显示的弹幕
      danmakuEngineRef.current.clear();
      // 清空已显示弹幕的记录
      shownDanmakusRef.current.clear();
      // 更新时间追踪
      setLastTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    // 视频元数据加载完成后，重新初始化 Canvas
    if (canvasRef.current && danmakuEngineRef.current) {
      danmakuEngineRef.current.init();
      // console.log('视频加载完成，Canvas重新初始化:', canvasRef.current.width, 'x', canvasRef.current.height);
    }
  };

  const handleSendDanmaku = async (e) => {
    e.preventDefault();
    if (!danmakuText.trim()) return;

    try {
      const currentTime = videoRef.current?.currentTime || 0;
      const response = await api.post('/danmaku', {
        videoId: id,
        text: danmakuText,
        time: currentTime,
        color: danmakuColor,
        type: 'scroll'
      });

      if (danmakuEngineRef.current) {
        danmakuEngineRef.current.add(danmakuText, danmakuColor, 'scroll', false, null);
        shownDanmakusRef.current.add(response.data.danmaku._id);
      }

      setDanmakus([...danmakus, response.data.danmaku]);
      setDanmakuText('');
    } catch (err) {
      console.error('发送弹幕失败:', err);
      alert('发送弹幕失败');
    }
  };

  const handleVoiceRecordComplete = async ({ audioBlob, text, duration }) => {
    try {
      const currentTime = videoRef.current?.currentTime || 0;
      const formData = new FormData();

      formData.append('videoId', id);
      formData.append('text', text);
      formData.append('time', currentTime);
      formData.append('color', danmakuColor);
      formData.append('type', 'scroll');
      formData.append('isVoice', 'true');
      formData.append('duration', duration);
      formData.append('audio', audioBlob, 'voice-danmaku.webm');

      const response = await api.post('/danmaku', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (danmakuEngineRef.current) {
        const audioUrl = getResourceUrl(response.data.danmaku.audioUrl);
        danmakuEngineRef.current.add(text, danmakuColor, 'scroll', true, audioUrl);
        shownDanmakusRef.current.add(response.data.danmaku._id);
      }

      setDanmakus([...danmakus, response.data.danmaku]);
      setIsVoiceMode(false);
    } catch (err) {
      console.error('发送语音弹幕失败:', err);
      alert('发送语音弹幕失败');
    }
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await api.post('/comments', {
        videoId: id,
        text: commentText
      });

      setComments([response.data.comment, ...comments]);
      setCommentText('');
    } catch (err) {
      console.error('发送评论失败:', err);
      alert('发送评论失败');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('确定要删除这条评论吗？')) return;

    try {
      await api.delete(`/comments/${commentId}`);
      setComments(comments.filter(c => c._id !== commentId));
    } catch (err) {
      console.error('删除评论失败:', err);
      alert('删除评论失败');
    }
  };

  // 播放控制函数
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleLoadedMetadataUpdate = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      setVolume(videoRef.current.volume);
    }
    handleLoadedMetadata();
  };

  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.volume = volume || 0.5;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const toggleFullscreen = () => {
    if (!playerWrapperRef.current) return;

    if (!isFullscreen) {
      if (playerWrapperRef.current.requestFullscreen) {
        playerWrapperRef.current.requestFullscreen();
      } else if (playerWrapperRef.current.webkitRequestFullscreen) {
        playerWrapperRef.current.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  };

  const togglePictureInPicture = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.error('画中画模式切换失败:', err);
    }
  };

  const skipTime = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds));
  };

  const formatTime = (time) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="video-detail-container"><div className="loading">加载中...</div></div>;
  }

  if (error) {
    return <div className="video-detail-container"><div className="error">{error}</div></div>;
  }

  if (!video) {
    return <div className="video-detail-container"><div className="error">视频不存在</div></div>;
  }

  const videoUrl = getVideoStreamUrl(video._id);

  return (
    <div className="video-detail-container">
      <div className="video-content">
        <div className="video-section">
          {video.transcodeStatus === 'transcoding' && (
            <div className="transcode-notice">
              ⚠️ 视频正在后台转码中，当前播放原始文件。转码完成后画质和兼容性会更好，请稍后刷新页面。
            </div>
          )}
          <div className="video-player-wrapper" ref={playerWrapperRef}>
            <video
              ref={videoRef}
              className="video-player"
              src={videoUrl}
              autoPlay
              onTimeUpdate={handleTimeUpdate}
              onPlay={handlePlayStateChange}
              onPause={handlePlayStateChange}
              onSeeking={handleSeeking}
              onLoadedMetadata={handleLoadedMetadataUpdate}
            />
            <canvas ref={canvasRef} className="danmaku-canvas" />
          </div>

          <div className="custom-controls">
            <div className="progress-bar-container">
              <input
                type="range"
                min="0"
                max={duration || 0}
                value={currentTime}
                onChange={handleProgressChange}
                className="progress-bar"
              />
              <div className="time-display">
                <span>{formatTime(currentTime)}</span>
                <span> / </span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            <div className="controls-row">
              <div className="controls-left">
                <button onClick={() => skipTime(-10)} className="control-btn" title="后退10秒">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 19 2 12 11 5 11 19"></polygon>
                    <polygon points="22 19 13 12 22 5 22 19"></polygon>
                  </svg>
                </button>
                <button onClick={togglePlay} className="control-btn play-btn" title={isPlaying ? '暂停' : '播放'}>
                  {isPlaying ? (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                  ) : (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                  )}
                </button>
                <button onClick={() => skipTime(10)} className="control-btn" title="快进10秒">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 19 22 12 13 5 13 19"></polygon>
                    <polygon points="2 19 11 12 2 5 2 19"></polygon>
                  </svg>
                </button>
              </div>

              <div className="controls-right">
                <div className="volume-control">
                  <button onClick={toggleMute} className="control-btn" title={isMuted ? '取消静音' : '静音'}>
                    {isMuted || volume === 0 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <line x1="23" y1="9" x2="17" y2="15"></line>
                        <line x1="17" y1="9" x2="23" y2="15"></line>
                      </svg>
                    ) : volume < 0.5 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                      </svg>
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="volume-slider"
                  />
                </div>
                <button onClick={togglePictureInPicture} className="control-btn" title="画中画">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <rect x="8" y="10" width="12" height="8" rx="1" ry="1"></rect>
                  </svg>
                </button>
                <button onClick={toggleFullscreen} className="control-btn" title={isFullscreen ? '退出全屏' : '全屏'}>
                  {isFullscreen ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="video-info-section">
            <h1 className="video-title">{video.title}</h1>
            <p className="video-description">{video.description || '暂无描述'}</p>
            <div className="video-meta">
              <span>上传者: {video.uploader?.username || '未知用户'}</span>
              <span>观看次数: {video.views}</span>
            </div>
          </div>

          <div className="danmaku-input-section">
            <div className="danmaku-header">
              <h3>发送弹幕</h3>
              <div className="danmaku-mode-toggle">
                <button
                  type="button"
                  className={!isVoiceMode ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => setIsVoiceMode(false)}
                >
                  文字弹幕
                </button>
                <button
                  type="button"
                  className={isVoiceMode ? 'mode-btn active' : 'mode-btn'}
                  onClick={() => setIsVoiceMode(true)}
                >
                  语音弹幕
                </button>
              </div>
            </div>

            {!isVoiceMode ? (
              <form onSubmit={handleSendDanmaku} className="danmaku-form">
                <input
                  type="text"
                  value={danmakuText}
                  onChange={(e) => setDanmakuText(e.target.value)}
                  placeholder="输入弹幕内容..."
                  maxLength={100}
                  className="danmaku-input"
                />
                <input
                  type="color"
                  value={danmakuColor}
                  onChange={(e) => setDanmakuColor(e.target.value)}
                  className="color-picker"
                />
                <button type="submit" className="send-button">发送</button>
              </form>
            ) : (
              <VoiceRecorder onRecordComplete={handleVoiceRecordComplete} maxDuration={10} />
            )}
          </div>
        </div>

        <div className="comments-section">
          <h3>评论区 ({comments.length})</h3>
          <form onSubmit={handleSendComment} className="comment-form">
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="发表你的评论..."
              maxLength={500}
              className="comment-textarea"
            />
            <button type="submit" className="send-button">发表评论</button>
          </form>

          <div className="comments-list">
            {comments.map((comment) => (
              <div key={comment._id} className="comment-item">
                <div className="comment-header">
                  <span className="comment-author">{comment.user?.username || '未知用户'}</span>
                  <span className="comment-time">
                    {new Date(comment.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <p className="comment-text">{comment.text}</p>
                {comment.user?._id === localStorage.getItem('userId') && (
                  <button
                    onClick={() => handleDeleteComment(comment._id)}
                    className="delete-button"
                  >
                    删除
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoDetail;