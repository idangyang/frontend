import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import './SeriesDetail.css';

const API_URL = 'http://localhost:5002/api';

function SeriesDetail() {
  const { seriesId } = useParams();
  const [series, setSeries] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [currentEpisode, setCurrentEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeriesData();
  }, [seriesId]);

  const fetchSeriesData = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/series/${seriesId}`);
      setSeries(response.data.series);
      setEpisodes(response.data.episodes);

      // 默认播放第一集
      if (response.data.episodes.length > 0) {
        setCurrentEpisode(response.data.episodes[0]);
      }
    } catch (err) {
      setError('加载剧集失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEpisodeChange = (episode) => {
    setCurrentEpisode(episode);
  };

  if (loading) {
    return <div className="loading">加载中...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!series) {
    return <div className="error">剧集不存在</div>;
  }

  return (
    <div className="series-detail-container">
      <div className="series-header">
        <h1>{series.title}</h1>
        <p className="series-description">{series.description}</p>
        <div className="series-info">
          <span>共 {series.totalEpisodes} 集</span>
          <span>观看次数: {series.views}</span>
        </div>
      </div>

      <div className="series-content">
        <div className="video-section">
          {currentEpisode && (
            <div className="current-episode">
              <h2>{currentEpisode.episodeNumber} - {currentEpisode.title}</h2>
              <video
                key={currentEpisode._id}
                controls
                autoPlay
                className="episode-video"
                src={`${API_URL}/series/stream/${currentEpisode._id}`}
              />
              {currentEpisode.description && (
                <p className="episode-description">{currentEpisode.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="episodes-list">
          <h3>选集</h3>
          <div className="episodes-grid">
            {episodes.map((episode) => (
              <div
                key={episode._id}
                className={`episode-item ${currentEpisode?._id === episode._id ? 'active' : ''}`}
                onClick={() => handleEpisodeChange(episode)}
              >
                <div className="episode-number">{episode.episodeNumber}</div>
                <div className="episode-title">{episode.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SeriesDetail;
