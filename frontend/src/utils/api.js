/**
 * Axios 实例配置
 * 配置请求/响应拦截器，自动添加认证头
 */

import axios from 'axios';
import { authStore } from '../store/auth';

const api = axios.create({
    baseURL: '',
    timeout: 30000
});

// 请求拦截器 - 自动添加认证头
api.interceptors.request.use(
    (config) => {
        // 自动添加认证头
        const headers = authStore.getAuthHeader();
        if (headers.Authorization) {
            config.headers.Authorization = headers.Authorization;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 响应拦截器 - 处理 401 错误
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // 处理 401 错误 - 自动登出并跳转到首页
        if (error.response && error.response.status === 401) {
            authStore.logout();
            window.location.href = '/';
        }
        return Promise.reject(error);
    }
);

export default api;
