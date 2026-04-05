import { createRouter, createWebHistory } from 'vue-router';
import { authStore } from '../store/auth';

// 复用现有组件
const PracticeMode = () => import('../components/PracticeMode.vue');
const CategoryPractice = () => import('../components/CategoryPractice.vue');
const ExamCategoryPractice = () => import('../components/ExamCategoryPractice.vue');
const CustomPractice = () => import('../components/CustomPractice.vue');
const SmartReview = () => import('../components/SmartReview.vue');
const IntelligentReview = () => import('../components/IntelligentReview.vue');
const WrongAnswersBook = () => import('../components/WrongAnswersBook.vue');
const ProgressStats = () => import('../components/ProgressStats.vue');

const routes = [
  { path: '/login', name: 'login', component: () => import('../views/LoginPage.vue'), meta: { public: true } },
  { path: '/register', name: 'register', component: () => import('../views/RegisterPage.vue'), meta: { public: true } },
  { path: '/', name: 'home', component: () => import('../views/HomePage.vue'), meta: { requiresAuth: true } },
  { path: '/practice', name: 'practice', component: PracticeMode, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/category-practice', name: 'category-practice', component: CategoryPractice, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/exam-category-practice', name: 'exam-category-practice', component: ExamCategoryPractice, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/custom-practice', name: 'custom-practice', component: CustomPractice, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/document-review', name: 'document-review', component: () => import('../components/DocumentReview.vue'), meta: { requiresAuth: true, requiresUser: true } },
  { path: '/smart-review', name: 'smart-review', component: SmartReview, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/intelligent-review', name: 'intelligent-review', component: IntelligentReview, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/wrong-answers', name: 'wrong-answers', component: WrongAnswersBook, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/progress', name: 'progress', component: ProgressStats, meta: { requiresAuth: true, requiresUser: true } },
  { path: '/admin', name: 'admin', component: () => import('../views/AdminDashboard.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach((to, from, next) => {
  const isAuthenticated = authStore.isAuthenticated;
  const isAdmin = authStore.isAdmin();

  if (to.meta.public) {
    if (isAuthenticated) return next('/');
    return next();
  }

  if (to.meta.requiresAuth && !isAuthenticated) return next('/login');
  if (to.meta.requiresAdmin && !isAdmin) return next('/');
  if (to.meta.requiresUser && isAdmin) return next('/admin');

  next();
});

export default router;
