import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { useUserStore } from './stores/user.js'
import { useSiteSettingsStore } from './stores/siteSettings.js'
import { BASE } from './asset-url.js'
import './style.css'
import './pixel-theme.css'

const app = createApp(App)
app.config.globalProperties.$base = BASE
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 初始化用户状态（从 localStorage 恢复）
const userStore = useUserStore()
userStore.init()

// 加载站点配置
const siteSettingsStore = useSiteSettingsStore()
siteSettingsStore.load()

// 环境标题 & favicon
document.title = import.meta.env.VITE_APP_TITLE || '培训系统'
const faviconEl = document.querySelector('link[rel="icon"]')
if (faviconEl) faviconEl.href = import.meta.env.VITE_APP_FAVICON || `${import.meta.env.BASE_URL}favicon.svg`

app.mount('#app')
