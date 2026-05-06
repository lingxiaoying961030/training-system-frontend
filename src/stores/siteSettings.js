import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'
import api from '../api/index.js'

const API_BASE = api.defaults.baseURL
const CACHE_KEY = 'site_settings_cache'
const CACHE_TTL = 5 * 60 * 1000 // 5分钟本地缓存

export const useSiteSettingsStore = defineStore('siteSettings', () => {
  const settings = ref({})
  const loaded = ref(false)

  // 先从 localStorage 恢复，立即可用
  function restoreFromCache() {
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const { data, time } = JSON.parse(raw)
        if (Date.now() - time < CACHE_TTL) {
          settings.value = data
          loaded.value = true
          return true
        }
      }
    } catch {}
    return false
  }

  async function load() {
    // 先用缓存立即显示
    const hasCached = restoreFromCache()

    try {
      const res = await axios.get(`${API_BASE}/site-settings`)
      if (res.data?.success) {
        const map = {}
        for (const item of res.data.data) {
          map[item.key] = item.value
        }
        settings.value = map
        loaded.value = true
        // 写入缓存
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ data: map, time: Date.now() }))
        } catch {}
      }
    } catch (err) {
      console.error('[SiteSettings] 加载失败:', err.message)
      // 如果网络失败但有缓存，继续用缓存
    }
  }

  function get(key, defaultValue = '') {
    return settings.value[key] ?? defaultValue
  }

  function getJSON(key, defaultValue = []) {
    const raw = settings.value[key]
    if (!raw) return defaultValue
    try { return JSON.parse(raw) } catch { return defaultValue }
  }

  return { settings, loaded, load, get, getJSON }
})
