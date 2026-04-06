import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { authStore } from './store/auth'

// 引入全局样式
import './styles/common.css'
import './styles/mobile.css'
import './styles/mobile-enhanced.css'

const app = createApp(App)

app.use(router)

// 提供全局认证状态
app.provide('authStore', authStore)

app.mount('#app')
