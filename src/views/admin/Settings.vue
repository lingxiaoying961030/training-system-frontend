<template>
  <div class="settings-page">
    <div class="pixel-page-header">
      <h2><span>⚙️</span> 系统设置</h2>
      <button class="pixel-btn pixel-btn-primary" :disabled="!hasChanges || saving" @click="handleSave">
        {{ saving ? '保存中...' : '💾 保存修改' }}
      </button>
    </div>

    <n-spin :show="loading">
      <div v-if="!loading && groups.length === 0" class="pixel-empty">暂无设置项</div>

      <div v-for="group in groups" :key="group.category" class="settings-group">
        <h3 class="group-title">{{ categoryLabels[group.category] || group.category }}</h3>
        <div class="settings-list">
          <div v-for="item in group.items" :key="item.key" class="setting-row">
            <div class="setting-label">
              <span class="label-text">{{ item.label }}</span>
              <span class="label-key">{{ item.key }}</span>
            </div>
            <div class="setting-input">
              <!-- JSON 数组用 textarea -->
              <textarea
                v-if="item.key === 'welcome_lines'"
                class="pixel-textarea"
                v-model="form[item.key]"
                rows="5"
                placeholder="每行一句台词"
              />
              <!-- 其他用普通 input -->
              <input
                v-else
                class="pixel-filter-input"
                v-model="form[item.key]"
                :placeholder="item.value"
              />
            </div>
          </div>
        </div>
      </div>

      <!-- welcome_lines 格式提示 -->
      <div class="format-tip">
        💡 <strong>欢迎页对话台词</strong>格式：每行一句台词，保存时自动转为 JSON 数组。<br>
        如果你熟悉 JSON，也可以直接写 <code>["第一句","第二句"]</code> 格式。
      </div>
    </n-spin>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api/index.js'

const loading = ref(true)
const saving = ref(false)
const rawSettings = ref([])
const form = ref({})

const categoryLabels = {
  general: '🏰 全局设置',
  login: '🔑 登录页',
  projects: '📋 项目页',
  map: '🗺️ 地图页',
  welcome: '✨ 欢迎页'
}
const categoryOrder = ['general', 'login', 'projects', 'map', 'welcome']

const groups = computed(() => {
  const map = {}
  for (const item of rawSettings.value) {
    if (!map[item.category]) map[item.category] = { category: item.category, items: [] }
    map[item.category].items.push(item)
  }
  return categoryOrder.filter(c => map[c]).map(c => map[c])
})

const hasChanges = computed(() => {
  for (const item of rawSettings.value) {
    const original = item.key === 'welcome_lines' ? formatLines(item.value) : item.value
    if (form.value[item.key] !== original) return true
  }
  return false
})

function formatLines(raw) {
  // JSON 数组 → 每行一句展示
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.join('\n')
  } catch {}
  return raw
}

function linesToJSON(text) {
  // 如果已经是 JSON 数组格式，直接返回
  const trimmed = text.trim()
  if (trimmed.startsWith('[')) {
    try { JSON.parse(trimmed); return trimmed } catch {}
  }
  // 否则按行拆分
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
  return JSON.stringify(lines)
}

async function fetchSettings() {
  loading.value = true
  try {
    const res = await api.get('/site-settings')
    rawSettings.value = res.data || []
    const f = {}
    for (const item of rawSettings.value) {
      f[item.key] = item.key === 'welcome_lines' ? formatLines(item.value) : item.value
    }
    form.value = f
  } catch (err) {
    window.$message?.error('加载设置失败: ' + err.message)
  } finally {
    loading.value = false
  }
}

async function handleSave() {
  saving.value = true
  try {
    const items = []
    for (const item of rawSettings.value) {
      const original = item.key === 'welcome_lines' ? formatLines(item.value) : item.value
      const current = form.value[item.key]
      if (current !== original) {
        items.push({
          key: item.key,
          value: item.key === 'welcome_lines' ? linesToJSON(current) : current
        })
      }
    }
    if (items.length === 0) return

    await api.put('/site-settings', { items })
    window.$message?.success('保存成功 ✅')
    await fetchSettings()
  } catch (err) {
    window.$message?.error('保存失败: ' + err.message)
  } finally {
    saving.value = false
  }
}

onMounted(fetchSettings)
</script>

<style scoped>
.settings-page { padding: 0; }

.settings-group {
  background: var(--pixel-card, #FFFDF5);
  border: 3px solid var(--pixel-border, #E0D5C8);
  margin-bottom: 16px;
  overflow: hidden;
}
.group-title {
  font-size: 15px; font-weight: 600; color: var(--pixel-brown, #5B3A29);
  padding: 12px 20px; margin: 0;
  background: #FAF6EF;
  border-bottom: 2px solid var(--pixel-border, #E0D5C8);
}

.settings-list { padding: 4px 0; }

.setting-row {
  display: flex; align-items: flex-start; gap: 16px;
  padding: 12px 20px;
  border-bottom: 1px solid #F0EAE0;
  transition: background 0.15s;
}
.setting-row:last-child { border-bottom: none; }
.setting-row:hover { background: #FFFBF2; }

.setting-label { flex: 0 0 200px; padding-top: 6px; }
.label-text { font-size: 14px; font-weight: 500; color: var(--pixel-brown, #5B3A29); display: block; }
.label-key { font-size: 11px; color: #B0A090; font-family: monospace; }

.setting-input { flex: 1; }
.setting-input .pixel-filter-input {
  width: 100%; box-sizing: border-box;
}

.pixel-textarea {
  width: 100%; box-sizing: border-box;
  padding: 8px 12px; font-size: 13px; line-height: 1.6;
  border: 2px solid var(--pixel-border, #E0D5C8);
  background: var(--pixel-bg, #FFF8E7);
  color: var(--pixel-text, #3E2723);
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.2s;
}
.pixel-textarea:focus {
  outline: none;
  border-color: var(--pixel-gold, #E8A93A);
}

.format-tip {
  font-size: 12px; color: var(--pixel-text-secondary, #8B7355);
  padding: 12px 16px; background: #FFF8E7;
  border: 2px dashed var(--pixel-border, #E0D5C8);
  line-height: 1.6;
}
.format-tip code {
  background: #F5EFE0; padding: 1px 6px; font-size: 11px;
}
</style>
