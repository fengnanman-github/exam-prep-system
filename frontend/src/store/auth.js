/**
 * 认证状态管理
 * 管理用户登录状态、Token 和用户信息
 */

import { reactive } from 'vue';

const STORAGE_KEY = 'exam_auth_token';
const USER_KEY = 'exam_auth_user';

export const authStore = reactive({
    isAuthenticated: false,
    isDefault: true,  // true=使用默认用户, false=已登录
    user: null,
    token: null,

    /**
     * 初始化：从 localStorage 恢复登录状态
     */
    init() {
        const savedToken = localStorage.getItem(STORAGE_KEY);
        const savedUser = localStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
            try {
                this.token = savedToken;
                this.user = JSON.parse(savedUser);
                this.isAuthenticated = true;
                this.isDefault = false;
            } catch (error) {
                this.clear();
            }
        }
    },

    /**
     * 登录
     * @param {string} token - JWT Token
     * @param {Object} user - 用户信息 { id, username, display_name, role }
     */
    login(token, user) {
        this.token = token;
        this.user = user;
        this.isAuthenticated = true;
        this.isDefault = false;

        localStorage.setItem(STORAGE_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    /**
     * 登出
     */
    logout() {
        this.token = null;
        this.user = null;
        this.isAuthenticated = false;
        this.isDefault = true;

        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(USER_KEY);
    },

    /**
     * 清除无效状态
     */
    clear() {
        this.logout();
    },

    /**
     * 获取当前用户ID
     * 如果已登录返回用户名，否则返回默认用户 ID
     * @returns {string}
     */
    getCurrentUserId() {
        if (this.isAuthenticated && this.user) {
            return this.user.username;
        }
        return 'exam_user_001';
    },

    /**
     * 获取认证头
     * @returns {Object} 包含 Authorization header 的对象
     */
    getAuthHeader() {
        if (this.token) {
            return { Authorization: `Bearer ${this.token}` };
        }
        return {};
    },

    /**
     * 是否为管理员
     * @returns {boolean}
     */
    isAdmin() {
        return this.isAuthenticated && this.user && this.user.role === 'admin';
    }
});

// 安全初始化（延迟执行以避免模块加载时的潜在错误）
if (typeof window !== 'undefined') {
    try {
        authStore.init();
    } catch (error) {
        console.error('认证状态初始化失败:', error);
    }
}
