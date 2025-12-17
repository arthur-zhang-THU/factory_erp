import axios from 'axios';
import { message } from 'antd';

// 定义后端地址
const API_URL = 'http://localhost:8000'; // 或者用环境变量

// 创建 axios 实例
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// 🟢 请求拦截器
api.interceptors.request.use(
  (config) => {
    // 🚨 修正点：这里改成读取 'token'，以匹配你 Login.tsx 里的写法
    const token = localStorage.getItem('token'); 
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔴 响应拦截器
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      message.error('登录已过期，请重新登录');
      localStorage.clear(); 
      window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);

export default api;