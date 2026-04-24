import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router/index.js'
import App from './App.vue'
import { useUserStore } from './stores/user.js'
import { useSiteSettingsStore } from './stores/siteSettings.js'
import './style.css'
import './pixel-theme.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)

// 初始化用户状态（从 localStorage 恢复）
const userStore = useUserStore()
userStore.init()

// 加载站点配置
const siteSettingsStore = useSiteSettingsStore()
siteSettingsStore.load()

app.mount('#app')
