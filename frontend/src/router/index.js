import { createRouter, createWebHistory } from 'vue-router';
import { authStore } from '../store/auth';

// 路由组件（懒加载）
const LoginPage = () => import('../views/LoginPage.vue');
const RegisterPage = () => import('../views/RegisterPage.vue');
const HomePage = () => import('../views/HomePage.vue');

// 管理员组件（懒加载）
const AdminDashboard = () => import('../views/AdminDashboard.vue');

// 练习组件（复用现有）
const PracticeMode = () => import('../components/PracticeMode.vue');

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginPage,
    meta: { public: true }
  },
  {
    path: '/register',
    name: 'register',
    component: RegisterPage,
    meta: { public: true }
  },
  {
    path: '/verify-email',
    name: 'verify-email',
    component: LoginPage, // 复用登录页面显示验证结果
    meta: { public: true }
  },
  {
    path: '/',
    name: 'home',
    component: HomePage,
    meta: { requiresAuth: true }
  },
  {
    path: '/practice',
    name: 'practice',
    component: PracticeMode,
    meta: { requiresAuth: true, requiresUser: true }
  },
  {
    path: '/admin',
    name: 'admin',
    component: AdminDashboard,
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/login'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// 路由守卫
router.beforeEach((to, from, next) => {
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin();

  // 公开路由直接放行
  if (to.meta.public) {
    if (isAuthenticated) {
      return next('/');
    }
    return next();
  }

  // 需要认证的路由
  if (to.meta.requiresAuth) {
    if (!isAuthenticated) {
      return next('/login');
    }

    // 检查管理员权限
    if (to.meta.requiresAdmin && !isAdmin) {
      return next('/');
    }

    // 检查用户权限（管理员不能访问用户练习功能）
    if (to.meta.requiresUser && isAdmin) {
      return next('/admin');
    }
  }

  next();
});

export default router;
