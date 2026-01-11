// 统一的配置文件，从环境变量读取后端地址

// API 基础地址（不包含 /api 后缀）
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api';

// 服务器基础地址（用于访问静态资源如图片、视频等）
export const SERVER_BASE_URL = process.env.REACT_APP_SERVER_BASE_URL || 'http://localhost:5002';

// 获取完整的资源 URL
export const getResourceUrl = (path) => {
  if (!path) return '';
  // 如果路径已经是完整 URL，直接返回
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // 如果路径不以 / 开头，添加 /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${SERVER_BASE_URL}${normalizedPath}`;
};

// 获取视频流 URL
export const getVideoStreamUrl = (videoId) => {
  return `${API_BASE_URL}/videos/stream/${videoId}`;
};
