import React, { useState } from 'react';
import axios from 'axios';
import './SeriesUpload.css';

const API_URL = 'http://localhost:5002/api';

function SeriesUpload() {
  // 剧集信息
  const [seriesData, setSeriesData] = useState({
    title: '',
    description: '',
    thumbnail: null
  });

  // 批量上传的视频文件列表
  const [batchVideos, setBatchVideos] = useState([]);
  const [uploadedEpisodes, setUploadedEpisodes] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [currentUploadIndex, setCurrentUploadIndex] = useState(0);
  const [message, setMessage] = useState('');
  const [dragEnabled, setDragEnabled] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // 创建剧集并上传视频
  const handleCreateAndUpload = async (e) => {
    e.preventDefault();
    if (!seriesData.title) {
      setMessage('请输入剧集标题');
      return;
    }

    if (batchVideos.length === 0) {
      setMessage('请选择视频文件');
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      setMessage('请先登录');
      return;
    }

    try {
      setUploading(true);

      // 第一步：创建剧集
      const formData = new FormData();
      formData.append('title', seriesData.title);
      formData.append('description', seriesData.description);
      if (seriesData.thumbnail) {
        formData.append('thumbnail', seriesData.thumbnail);
      }

      const response = await axios.post(`${API_URL}/series/create`, formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });

      const newSeriesId = response.data.series.id;
      setMessage('剧集创建成功！开始上传视频...');

      // 第二步：批量上传剧集
      setCurrentUploadIndex(0);

      for (let i = 0; i < batchVideos.length; i++) {
        const video = batchVideos[i];
        setCurrentUploadIndex(i);

        setBatchVideos(prev => prev.map((v, idx) =>
          idx === i ? { ...v, status: 'uploading' } : v
        ));

        try {
          const episodeFormData = new FormData();
          episodeFormData.append('video', video.file);
          episodeFormData.append('episodeNumber', video.episodeNumber);
          episodeFormData.append('sortOrder', i);
          episodeFormData.append('title', video.title);
          episodeFormData.append('description', video.description);

          await axios.post(
            `${API_URL}/series/${newSeriesId}/upload-episode`,
            episodeFormData,
            {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                setBatchVideos(prev => prev.map((v, idx) =>
                  idx === i ? { ...v, progress } : v
                ));
              }
            }
          );

          setBatchVideos(prev => prev.map((v, idx) =>
            idx === i ? { ...v, status: 'success', progress: 100 } : v
          ));
          setUploadedEpisodes(prev => [...prev, video]);
        } catch (error) {
          setBatchVideos(prev => prev.map((v, idx) =>
            idx === i ? { ...v, status: 'error' } : v
          ));
          console.error(`上传第${video.episodeNumber}集失败:`, error);
        }
      }

      setMessage('剧集上传完成！');
      setTimeout(() => window.location.href = '/', 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || '创建剧集失败');
    } finally {
      setUploading(false);
    }
  };

  // 处理批量选择视频文件（追加模式）
  const handleBatchVideoSelect = (e) => {
    const files = Array.from(e.target.files);
    const currentCount = batchVideos.length;

    const videoFiles = files.map((file, index) => ({
      file,
      episodeNumber: uploadedEpisodes.length + currentCount + index + 1,
      title: file.name.replace(/\.[^/.]+$/, ''),
      description: '',
      status: 'pending',
      progress: 0
    }));

    // 追加到现有列表
    setBatchVideos(prev => [...prev, ...videoFiles]);
    setMessage(`已添加 ${files.length} 个视频文件，当前共 ${currentCount + files.length} 个`);

    // 清空input，允许重复选择相同文件
    e.target.value = '';
  };

  // 更新单个视频的标题
  const updateVideoTitle = (index, newTitle) => {
    setBatchVideos(prev => prev.map((v, idx) =>
      idx === index ? { ...v, title: newTitle } : v
    ));
  };

  // 更新单个视频的集数
  const updateVideoEpisodeNumber = (index, newEpisodeNumber) => {
    setBatchVideos(prev => prev.map((v, idx) =>
      idx === index ? { ...v, episodeNumber: newEpisodeNumber } : v
    ));
  };

  // 拖拽开始
  const handleDragStart = (e, index) => {
    if (!dragEnabled) {
      e.preventDefault();
      return;
    }
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', index);
  };

  // 鼠标按下拖拽手柄
  const handleDragHandleMouseDown = () => {
    setDragEnabled(true);
  };

  // 鼠标松开
  const handleMouseUp = () => {
    setDragEnabled(false);
    setDraggedIndex(null);
  };

  // 拖拽经过
  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    if (draggedIndex === null || draggedIndex === index) return;

    // 实时交换位置
    const newVideos = [...batchVideos];
    const draggedItem = newVideos[draggedIndex];
    newVideos.splice(draggedIndex, 1);
    newVideos.splice(index, 0, draggedItem);

    // 更新拖拽索引
    setDraggedIndex(index);
    setBatchVideos(newVideos);
  };

  // 放置
  const handleDrop = (e, dropIndex) => {
    e.preventDefault();

    // 重新分配集数
    const updatedVideos = batchVideos.map((video, index) => ({
      ...video,
      episodeNumber: uploadedEpisodes.length + index + 1
    }));

    setBatchVideos(updatedVideos);
    setDraggedIndex(null);
  };

  return (
    <div className="series-upload-container">
      <h2>上传剧集</h2>
      {message && <div className="message">{message}</div>}

      <form onSubmit={handleCreateAndUpload} className="series-upload-form">
        <div className="form-section">
          <h3>剧集信息</h3>
          <div className="form-group">
            <label>剧集标题 *</label>
            <input
              type="text"
              value={seriesData.title}
              onChange={(e) => setSeriesData({ ...seriesData, title: e.target.value })}
              placeholder="例如：我的番剧第一季"
              required
              disabled={uploading}
            />
          </div>

            <div className="form-group">
              <label>剧集描述</label>
              <textarea
                value={seriesData.description}
                onChange={(e) => setSeriesData({ ...seriesData, description: e.target.value })}
                placeholder="介绍一下这个剧集..."
                rows="4"
                disabled={uploading}
              />
            </div>

            <div className="form-group">
              <label>剧集封面（可选）</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSeriesData({ ...seriesData, thumbnail: e.target.files[0] })}
                disabled={uploading}
              />
            </div>
        </div>

        <div className="form-section">
          <h3>批量上传视频</h3>
          <div className="form-group">
            <label>选择多个视频文件 *</label>
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleBatchVideoSelect}
              disabled={uploading}
            />
            <p className="hint">可以一次选择多个视频文件（按住Ctrl/Cmd多选）</p>
          </div>

          {batchVideos.length > 0 && (
            <div className="batch-videos-list">
              <h4>待上传的视频列表（可拖拽排序）：</h4>
                {batchVideos.map((video, index) => (
                  <div
                    key={index}
                    className={`batch-video-item ${video.status} ${draggedIndex === index ? 'dragging' : ''}`}
                    draggable={!uploading}
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => handleDrop(e, index)}
                    onDragEnd={handleMouseUp}
                  >
                    <div className="video-info-row">
                      <span
                        className="drag-handle"
                        onMouseDown={handleDragHandleMouseDown}
                        onMouseUp={handleMouseUp}
                      >
                        ☰
                      </span>
                      <input
                        type="text"
                        value={video.episodeNumber}
                        onChange={(e) => updateVideoEpisodeNumber(index, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                        disabled={uploading}
                        className="episode-num-input"
                      />
                      <input
                        type="text"
                        value={video.title}
                        onChange={(e) => updateVideoTitle(index, e.target.value)}
                        onMouseDown={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                        disabled={uploading}
                        className="video-title-input"
                      />
                      <span className="status-badge">{getStatusText(video.status)}</span>
                    </div>
                    {video.status === 'uploading' && (
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${video.progress}%` }}>
                          {video.progress}%
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
        </div>

        <button type="submit" disabled={uploading || batchVideos.length === 0} className="upload-button">
          {uploading ? `上传中 (${currentUploadIndex + 1}/${batchVideos.length})` : '创建剧集并上传视频'}
        </button>
      </form>
    </div>
  );
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    pending: '等待上传',
    uploading: '上传中',
    success: '✓ 成功',
    error: '✗ 失败'
  };
  return statusMap[status] || '';
}

export default SeriesUpload;
