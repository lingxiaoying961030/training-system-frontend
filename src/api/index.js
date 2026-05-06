import axios from 'axios'
import router from '../router/index.js'

function resolveApiBaseURL() {
  const configuredBaseURL = import.meta.env.VITE_API_URL?.trim()
  if (configuredBaseURL) {
    return configuredBaseURL
  }

  if (typeof window === 'undefined') {
    return '/api'
  }

  const { protocol, hostname, pathname } = window.location

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return `${protocol}//${hostname}:3002/api`
  }

  if (pathname.startsWith('/lxy-training/')) {
    return '/lxy-training/api'
  }

  return '/api'
}

const api = axios.create({
  baseURL: resolveApiBaseURL(),
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
