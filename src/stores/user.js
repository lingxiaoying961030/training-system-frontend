import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('training_token') || '')
  const userInfo = ref(null)

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => {
    const roles = userInfo.value?.roles || []
    return roles.includes('admin')
  })
  // 能访问管理后台（admin/mentor/guide/data_mentor）
  const canAccessAdmin = computed(() => {
    const roles = userInfo.value?.roles || []
    return roles.some(r => ['admin', 'mentor', 'guide', 'data_mentor'].includes(r))
  })

  function setToken(newToken) {
    token.value = newToken
    localStorage.setItem('training_token', newToken)
    // 自动从 token 解析用户信息
    parseUserInfo(newToken)
  }

  function setUserInfo(info) {
    userInfo.value = info
    localStorage.setItem('training_user', JSON.stringify(info))
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('training_token')
    localStorage.removeItem('training_user')
  }

  /**
   * 从 JWT token 中解析用户信息（不需要密钥，只读 payload）
   * 页面刷新时恢复状态用
   */
  function parseUserInfo(tokenStr) {
    try {
      const base64 = tokenStr.split('.')[1]
      const jsonStr = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''))
      const payload = JSON.parse(jsonStr)
      userInfo.value = {
        id: payload.userId,
        name: payload.name,
        roles: payload.roles,
        phone: payload.phone,
        avatar: JSON.parse(localStorage.getItem('training_user') || '{}').avatar || null
      }
      localStorage.setItem('training_user', JSON.stringify(userInfo.value))
    } catch {
      // token 格式不对，忽略
    }
  }

  /**
   * 初始化 — 页面加载时从 localStorage 恢复
   */
  function init() {
    if (token.value) {
      // 先尝试从 localStorage 读缓存的 userInfo
      const cached = localStorage.getItem('training_user')
      if (cached) {
        try {
          userInfo.value = JSON.parse(cached)
        } catch {
          userInfo.value = null
        }
      }
      // 再从 token 解析（保证最新）
      parseUserInfo(token.value)
    }
  }

  return {
    token, userInfo, isLoggedIn, isAdmin, canAccessAdmin,
    setToken, setUserInfo, logout, init
  }
})
