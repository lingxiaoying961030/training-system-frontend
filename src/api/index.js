import axios from 'axios'
import router from '../router/index.js'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3002/api' : '/api'),
  timeout: 60000,
  withCredentials: false
})

// 请求拦截器 - 自动携带 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('training_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || '网络错误，请稍后重试'
    
    // 401 未登录 → 跳转登录页（登录接口自身的401不跳转）
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('training_token')
      router.push('/login')
    }
    
    return Promise.reject(new Error(message))
  }
)

export default api
