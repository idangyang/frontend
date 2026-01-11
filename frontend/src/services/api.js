import axios from 'axios';

// 从环境变量读取 API 地址，如果没有则使用默认值
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// 请求拦截器 - 添加 token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
