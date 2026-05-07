<template>
  <div class="projects-page">
    <!-- 欢迎 Banner（方案A：田园纹理） -->
    <div class="welcome-banner">
      <img :src="$base + '/pixel-icons/dobo/notebookModal_v1.png'" class="banner-bg" alt="" />
      <div class="banner-content">
        <img :src="$base + '/pixel-icons/ui/trophy.png'" class="hero-icon" alt="" />
        <h1>{{ siteSettings.get('banner_title', '欢迎来到培训系统') }}</h1>
        <p class="subtitle">{{ siteSettings.get('banner_subtitle', '选择一个项目，开始你的冒险之旅！') }}</p>
      </div>
    </div>

    <!-- 搜索 -->
    <div v-if="projects.length > 0" class="search-bar">
      <input v-model="searchKeyword" type="text" placeholder="🔍 搜索项目名称..." class="search-input" />
    </div>

    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in skeletonCount" :key="i" class="skeleton-card">
        <div class="skel-wood"></div>
        <div class="skel-cover"></div>
        <div class="skel-body"><div class="skel-line w80"></div><div class="skel-prog"></div></div>
      </div>
    </div>
    <div v-else-if="!projects.length" class="pixel-empty-fancy">
      <img :src="$base + '/pixel-icons/decorations/deco_junimo.png'" class="empty-icon" />
      <div class="empty-title">暂无开放项目</div>
      <div class="empty-sub">冒险尚未开启，耐心等待吧 ⏳</div>
    </div>
    <div v-else-if="!filteredProjects.length" class="pixel-empty-fancy">
      <img :src="$base + '/pixel-icons/dobo/close_icon_64px.png'" class="empty-icon" />
      <div class="empty-title">没有找到匹配项目</div>
      <div class="empty-sub">换个关键词试试？</div>
    </div>

    <div v-else class="project-grid">
      <div
        v-for="(p, idx) in filteredProjects"
        :key="p.id"
        class="project-card pixel-pop-in"
        :style="{ animationDelay: Math.min(idx * 60, 480) + 'ms' }"
        @click="$router.push(`/projects/${p.id}/plans`)"
      >
        <div class="wood-label">
            <img :src="$base + '/pixel-icons/dobo/wood_label.png'" class="wood-label-bg" alt="" />
            <span class="wood-label-text">{{ p.name }}</span>
          </div>
        <div class="project-cover" :style="{ background: getCoverGradient(p.id) }">
          <img :src="getProjectIcon(p)" class="cover-icon" alt="" />
        </div>
        <div class="project-body">
          <p>{{ p.description || '暂无描述' }}</p>
          <!-- 进度条：有进度时显示 -->
          <template v-if="getProjectProgress(p.id)">
            <div class="progress-wrap">
              <div
                :class="getProjectStatus(p.id) === 'completed' ? 'progress-fill-green' : 'progress-fill-yellow'"
                :style="{ width: progressReady ? getProjectProgress(p.id).percent + '%' : '0%' }"
              ></div>
            </div>
            <div class="progress-text">
              <img :src="getProjectStatus(p.id) === 'completed' ? $base + '/pixel-icons/ui/trophy.png' : $base + '/pixel-icons/ui/star_gold.png'" alt="" />
              {{ getProjectProgress(p.id).text }}
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import api from '../../api/index.js'
import { PROJECT_ICONS, COVER_GRADIENTS, getProjectIcon, getCoverGradient, hashId } from '../../pixel-icons.js'
import { assetUrl, BASE } from '../../asset-url.js'

const floorTextureBg = `url('${BASE}/pixel-icons/ui/floor_02.png') repeat`
import { useSiteSettingsStore } from '../../stores/siteSettings.js'

const siteSettings = useSiteSettingsStore()
const loading = ref(true)
const projects = ref([])
const skeletonCount = ref(parseInt(localStorage.getItem('projects_count')) || 2)
const searchKeyword = ref('')
const projectStatusMap = ref({})
const projectProgressMap = ref({})
const progressReady = ref(false)

const filteredProjects = computed(() => {
  if (!searchKeyword.value) return projects.value
  const kw = searchKeyword.value.toLowerCase()
  return projects.value.filter(p => p.name?.toLowerCase().includes(kw))
})

function getStatusIcon(status) {
  if (status === 'completed') return assetUrl('/pixel-icons/ui/checkmark.png')
  if (status === 'in_progress') return assetUrl('/pixel-icons/ui/flag.png')
  return ''
}

function getProjectStatus(projectId) {
  return projectStatusMap.value[projectId] || null
}

function getProjectTagText(projectId) {
  const s = projectStatusMap.value[projectId]
  if (s === 'completed') return '已完成'
  if (s === 'in_progress') return '学习中'
  return ''
}

function getProjectProgress(projectId) {
  return projectProgressMap.value[projectId] || null
}

onMounted(async () => {
  try {
    const [projRes, progressRes] = await Promise.all([
      api.get('/projects'),
      api.get('/training/my-progress-summary').catch(() => ({ data: [] }))
    ])
    projects.value = (projRes.data || []).filter(p => p.status === 'active')
    localStorage.setItem('projects_count', String(projects.value.length))

    const summaryList = progressRes.data || []
    const byProject = {}
    for (const s of summaryList) {
      if (!s.projectId) continue
      if (!byProject[s.projectId]) byProject[s.projectId] = []
      byProject[s.projectId].push(s)
    }

    for (const [pid, planSummaries] of Object.entries(byProject)) {
      const withStages = planSummaries.filter(p => p.totalStages > 0)
      if (withStages.length === 0) continue

      const totalStages = withStages.reduce((sum, p) => sum + p.totalStages, 0)
      const completedStages = withStages.reduce((sum, p) => sum + p.completedStages, 0)
      const allCompleted = withStages.every(p => p.status === 'completed')
      const anyProgress = withStages.some(p => p.status === 'in_progress' || p.status === 'completed')

      if (allCompleted) {
        projectStatusMap.value[pid] = 'completed'
        projectProgressMap.value[pid] = { percent: 100, text: '全部通关！' }
      } else if (anyProgress) {
        projectStatusMap.value[pid] = 'in_progress'
        const pct = totalStages > 0 ? Math.round(completedStages / totalStages * 100) : 0
        projectProgressMap.value[pid] = { percent: pct, text: `${completedStages}/${totalStages} 关卡已完成` }
      }
    }
  } catch {} finally {
    loading.value = false
    nextTick(() => { setTimeout(() => { progressReady.value = true }, 300) })
  }
})
</script>

<style scoped>
.projects-page { padding-bottom: 40px; }

/* 欢迎 Banner — notebookModal 素材 */
.welcome-banner {
  position: relative; text-align: center;
  margin-bottom: 32px; overflow: hidden;
  padding: 52px 24px 56px;
}
.banner-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill; z-index: 0;
}
.banner-content {
  position: relative; z-index: 1;
}
.welcome-banner h1 { font-size: 28px; color: var(--pixel-brown); margin-bottom: 10px; font-family: var(--pixel-font-title); letter-spacing: 2px; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
.welcome-banner .subtitle { font-size: 15px; color: var(--pixel-text-secondary); }
.hero-icon { width: 56px; height: 56px; image-rendering: pixelated; margin-bottom: 12px; }

/* 搜索框 */
.search-bar { margin-bottom: 24px; }
.search-input {
  width: 100%; max-width: 400px; padding: 10px 16px;
  border: 2px solid var(--pixel-border); border-radius: 0;
  font-size: 14px; outline: none;
  background: var(--pixel-card); color: var(--pixel-text);
}
.search-input:focus { border-color: var(--pixel-green); }

/* 项目网格 */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

/* 项目卡片 */
.project-card {
  background: var(--pixel-card);
  border: 3px solid var(--pixel-border);
  overflow: hidden; cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
}
.project-card.pixel-pop-in {
  animation: pixel-pop-in 350ms ease-out both;
}
@keyframes pixel-pop-in {
  from { opacity: 0; transform: scale(0.92) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.project-card:hover {
  transform: translateY(-3px);
  box-shadow: 4px 6px 0 var(--pixel-brown);
  border-color: var(--pixel-brown);
}
.project-card:active {
  transform: translateY(0);
  box-shadow: 2px 2px 0 var(--pixel-brown);
}

.project-cover {
  height: 140px;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  border-bottom: 3px solid var(--pixel-border);
}
/* 纹理叠层 */
.project-cover::before {
  content: ''; position: absolute; inset: 0;
  background: v-bind(floorTextureBg);
  background-size: 24px; image-rendering: pixelated;
  opacity: 0.06; z-index: 0;
}

/* 木质标题条 — 贴边，在 cover 外面 */
.wood-label {
  position: relative; height: 34px;
  z-index: 2; overflow: hidden;
}
.wood-label-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill;
}
.wood-label-text {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: var(--pixel-font-title); font-size: 14px; letter-spacing: 2px;
  color: #FFF8E7; text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}

.cover-icon { width: 56px; height: 56px; image-rendering: pixelated; filter: drop-shadow(2px 2px 0 rgba(0,0,0,0.1)); transition: transform 0.3s; position: relative; z-index: 1; margin-top: 16px; }
/* P4: 图标弹跳 */
.project-card:hover .cover-icon { animation: pixel-icon-hop 0.4s ease; }

.project-body { padding: 12px 16px; }
.project-body p { font-size: 13px; color: var(--pixel-text-secondary); margin: 0; line-height: 1.5; }

/* 进度条 — 条纹像素风 */
.progress-wrap {
  margin-top: 10px; height: 14px;
  background: #E0D5C8; border: 2px solid var(--pixel-brown, #5B3A29);
  position: relative;
}
.progress-fill-yellow {
  height: 100%;
  background: repeating-linear-gradient(90deg, #E8A93A 0px, #E8A93A 6px, #F0B84A 6px, #F0B84A 12px);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
}
.progress-fill-yellow::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.4); }
.progress-fill-green {
  height: 100%;
  background: repeating-linear-gradient(90deg, #5C8A4D 0px, #5C8A4D 6px, #6B9A5D 6px, #6B9A5D 12px);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  position: relative;
}
.progress-fill-green::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.4); }
.progress-text { font-size: 11px; color: var(--pixel-text-secondary); margin-top: 4px; display: flex; align-items: center; gap: 4px; }
.progress-text img { width: 14px; height: 14px; image-rendering: pixelated; }

.pixel-empty { text-align: center; padding: 60px 0; color: var(--pixel-text-secondary); }

/* 空状态 — 图标+分层文案 */
.pixel-empty-fancy {
  text-align: center; padding: 60px 24px;
  display: flex; flex-direction: column; align-items: center;
}
.pixel-empty-fancy .empty-icon { height: 48px; opacity: 0.55; image-rendering: pixelated; margin-bottom: 12px; }
.pixel-empty-fancy .empty-title {
  font-family: var(--pixel-font-title); font-size: 16px; letter-spacing: 2px;
  color: var(--pixel-text-secondary); margin-bottom: 4px;
}
.pixel-empty-fancy .empty-sub { font-size: 12px; color: #B0A090; }

/* 骨架屏 */
.skeleton-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px;
}
.skeleton-card { border: 3px solid var(--pixel-border); background: var(--pixel-card); overflow: hidden; }
.skel-wood { height: 34px; background: #D4B896; position: relative; overflow: hidden; }
.skel-wood::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.3) 50%, transparent 100%);
  animation: shimmer 1.8s ease-in-out infinite;
}
.skel-cover { height: 106px; background: #F0EAE0; position: relative; overflow: hidden; }
.skel-cover::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%);
  animation: shimmer 1.8s ease-in-out infinite;
}
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.skel-body { padding: 12px 16px; }
.skel-line { height: 10px; background: #EDE7DA; margin-bottom: 8px; position: relative; overflow: hidden; }
.skel-line::after {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%);
  animation: shimmer 1.8s ease-in-out infinite;
}
.skel-line.w80 { width: 80%; }
.skel-prog { height: 10px; background: #EDE7DA; border: 2px solid #D4B896; }
</style>
