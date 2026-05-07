<template>
  <div class="plans-page">
    <!-- 顶部 Header（方案A风格） -->
    <div class="plans-header">
      <img :src="$base + '/pixel-icons/dobo/notebookModal_v1.png'" class="banner-bg" alt="" />
      <div class="banner-content">
        <div class="plans-breadcrumb">
          <router-link to="/projects">全部项目</router-link>
          <span> / </span>
          <span>{{ projectName || '...' }}</span>
        </div>
        <h1>{{ projectName }}</h1>
        <p v-if="projectDesc" class="plans-subtitle">{{ projectDesc }}</p>
      </div>
    </div>

    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in skeletonCount" :key="i" class="skeleton-card">
        <div class="skel-cover"></div>
        <div class="skel-body"><div class="skel-line w80"></div><div class="skel-line w60"></div><div class="skel-prog"></div></div>
      </div>
    </div>
    <div v-else-if="!plans.length" class="pixel-empty-fancy">
      <img :src="$base + '/pixel-icons/plans/book.png'" class="empty-icon" />
      <div class="empty-title">暂无学习计划</div>
      <div class="empty-sub">管理员还在准备中...</div>
    </div>

    <div v-else class="plan-list">
      <div
        v-for="(plan, idx) in plans"
        :key="plan.id"
        class="plan-card pixel-pop-in"
        :style="{ animationDelay: Math.min(idx * 60, 480) + 'ms' }"
        @click="$router.push(`/plans/${plan.id}/map`)"
      >
        <div class="plan-wood-label">
          <img :src="$base + '/pixel-icons/dobo/wood_label.png'" class="wood-bg" alt="" />
          <span class="wood-text">{{ plan.name }}</span>
        </div>
        <div class="plan-inner">
          <img :src="getPlanIcon(plan)" class="plan-icon-img" alt="" />
          <div class="plan-body">
          <p>{{ plan.description || '暂无描述' }}
            <span v-if="getPlanProgress(plan.id) && getPlanProgress(plan.id).totalStages > 0" class="plan-tag" :class="getPlanProgress(plan.id).status">
              <img :src="getPlanStatusIcon(getPlanProgress(plan.id).status)" alt="" />
              {{ getPlanTagText(plan.id) }}
            </span>
            <span v-else class="plan-tag empty">📭 暂无关卡</span>
          </p>
          <!-- 有进度时显示进度条 -->
          <div v-if="getPlanProgress(plan.id) && getPlanProgress(plan.id).totalStages > 0" class="plan-progress">
            <div class="plan-progress-bar">
              <div
                :class="getPlanProgress(plan.id).status === 'completed' ? 'progress-fill-green' : 'progress-fill-yellow'"
                :style="{ width: progressReady ? getPlanProgressPercent(plan.id) + '%' : '0%', height: '100%' }"
              ></div>
            </div>
            <span class="plan-progress-text">
              <img :src="getPlanProgress(plan.id).status === 'completed' ? $base + '/pixel-icons/ui/trophy.png' : $base + '/pixel-icons/ui/star_gold.png'" alt="" />
              {{ getPlanProgress(plan.id).completedStages }}/{{ getPlanProgress(plan.id).totalStages }}
            </span>
          </div>
        </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import api from '../../api/index.js'
import { PLAN_ICONS, getPlanIcon, hashId } from '../../pixel-icons.js'
import { assetUrl } from '../../asset-url.js'

const route = useRoute()
const projectId = route.params.projectId

const loading = ref(true)
const projectName = ref('')
const projectDesc = ref('')
const plans = ref([])
const skeletonCount = ref(parseInt(localStorage.getItem(`plans_count_${projectId}`)) || 2)
const progressMap = ref({})
const progressReady = ref(false)

function getPlanStatusIcon(status) {
  if (status === 'completed') return assetUrl('/pixel-icons/ui/checkmark.png')
  if (status === 'in_progress') return assetUrl('/pixel-icons/ui/flag.png')
  if (status === 'not_started') return assetUrl('/pixel-icons/ui/lock.png')
  return ''
}

function getPlanProgress(planId) {
  return progressMap.value[planId] || null
}

function getPlanTagText(planId) {
  const p = progressMap.value[planId]
  if (!p) return ''
  if (p.status === 'completed') return '已完成'
  if (p.status === 'in_progress') return '学习中'
  if (p.status === 'not_started') return '未开始'
  return ''
}

function getPlanProgressPercent(planId) {
  const p = progressMap.value[planId]
  if (!p || !p.totalStages) return 0
  return Math.round(p.completedStages / p.totalStages * 100)
}

onMounted(async () => {
  try {
    const [projRes, planRes, progressRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/plans`),
      api.get('/training/my-progress-summary').catch(() => ({ data: [] }))
    ])
    projectName.value = projRes.data?.name || ''
    projectDesc.value = projRes.data?.description || ''
    plans.value = (planRes.data || []).filter(p => p.status === 'active')
    localStorage.setItem(`plans_count_${projectId}`, String(plans.value.length))

    const summaryList = progressRes.data || []
    for (const s of summaryList) {
      progressMap.value[s.planId] = s
    }
  } catch (err) {
    console.error('[Plans] 加载失败:', err.message)
  } finally {
    loading.value = false
    nextTick(() => { setTimeout(() => { progressReady.value = true }, 300) })
  }
})
</script>

<style scoped>
.plans-page { padding-bottom: 40px; }

/* 顶部 Header — notebookModal 统一样式 */
.plans-header {
  position: relative; text-align: center;
  padding: 36px 24px 40px;
  margin-bottom: 32px; overflow: hidden;
}
.banner-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill; z-index: 0;
}
.banner-content { position: relative; z-index: 1; }
.plans-breadcrumb { font-size: 13px; color: var(--pixel-text-secondary); margin-bottom: 12px; }
.plans-breadcrumb a { color: var(--pixel-blue); text-decoration: none; }
.plans-header h1 { font-size: 24px; color: var(--pixel-brown); margin: 0 0 8px; font-family: var(--pixel-font-title); letter-spacing: 2px; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
.plans-subtitle { font-size: 14px; color: var(--pixel-text-secondary); }

/* 计划列表 */
.plan-list { display: flex; flex-direction: column; gap: 12px; }
.plan-card {
  overflow: hidden;
  background: var(--pixel-card);
  border: 3px solid var(--pixel-border);
  padding: 0; cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.plan-card.pixel-pop-in {
  animation: pixel-pop-in 350ms ease-out both;
}
@keyframes pixel-pop-in {
  from { opacity: 0; transform: scale(0.92) translateY(10px); }
  to   { opacity: 1; transform: scale(1) translateY(0); }
}
.plan-card:hover {
  transform: translateX(4px);
  box-shadow: 4px 4px 0 var(--pixel-brown);
  border-color: var(--pixel-brown);
}

/* 木质标题条 */
.plan-wood-label { position: relative; height: 32px; overflow: hidden; }
.plan-wood-label .wood-bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill; }
.plan-wood-label .wood-text {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  font-family: var(--pixel-font-title); font-size: 13px; letter-spacing: 2px;
  color: #FFF8E7; text-shadow: 0 1px 2px rgba(0,0,0,0.4);
}
.plan-inner { display: flex; align-items: center; gap: 14px; padding: 14px 18px; }

.plan-icon-img { width: 36px; height: 36px; image-rendering: pixelated; flex-shrink: 0; }
.plan-body { flex: 1; }
.plan-status-row { margin-bottom: 4px; }
.plan-body p { font-size: 13px; color: var(--pixel-text-secondary); margin: 0; }
.plan-arrow-img { width: 24px; height: 24px; image-rendering: pixelated; opacity: 0.6; flex-shrink: 0; }

/* 状态标签 */
.plan-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; padding: 2px 8px; font-weight: 500;
  border: 2px solid; background: var(--pixel-card);
}
.plan-tag img { width: 14px; height: 14px; image-rendering: pixelated; }
.plan-tag.completed { border-color: #A5D6A7; color: #2E7D32; }
.plan-tag.in_progress { border-color: #FFCC80; color: #E65100; }
.plan-tag.not_started { border-color: #D5C9B8; color: #8B7355; }
.plan-tag.empty { border-color: #E0D5C8; color: #aaa; background: #F8F5EE; }

/* 进度条 */
.plan-progress { margin-top: 8px; display: flex; align-items: center; gap: 8px; }
.plan-progress-bar {
  flex: 1; max-width: 160px; height: 10px;
  background: #E0D5C8; border: 2px solid var(--pixel-brown, #5B3A29);
}
.progress-fill-yellow {
  background: repeating-linear-gradient(90deg, #E8A93A 0px, #E8A93A 6px, #F0B84A 6px, #F0B84A 12px);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); position: relative;
}
.progress-fill-yellow::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.4); }
.progress-fill-green {
  background: repeating-linear-gradient(90deg, #5C8A4D 0px, #5C8A4D 6px, #6B9A5D 6px, #6B9A5D 12px);
  transition: width 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94); position: relative;
}
.progress-fill-green::after { content: ''; position: absolute; right: 0; top: 0; bottom: 0; width: 3px; background: rgba(255,255,255,0.4); }
.plan-progress-text { font-size: 11px; color: var(--pixel-text-secondary); display: flex; align-items: center; gap: 3px; }
.plan-progress-text img { width: 12px; height: 12px; image-rendering: pixelated; }

.pixel-empty { text-align: center; padding: 60px 0; color: var(--pixel-text-secondary); }
.pixel-empty-fancy { text-align: center; padding: 60px 24px; display: flex; flex-direction: column; align-items: center; }
.pixel-empty-fancy .empty-icon { height: 40px; opacity: 0.55; image-rendering: pixelated; margin-bottom: 12px; }
.pixel-empty-fancy .empty-title { font-family: var(--pixel-font-title); font-size: 16px; letter-spacing: 2px; color: var(--pixel-text-secondary); margin-bottom: 4px; }
.pixel-empty-fancy .empty-sub { font-size: 12px; color: #B0A090; }
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
.skeleton-card { border: 3px solid var(--pixel-border); background: var(--pixel-card); overflow: hidden; }
.skel-cover { height: 80px; background: #F0EAE0; position: relative; overflow: hidden; }
.skel-cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%); animation: shimmer 1.8s ease-in-out infinite; }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.skel-body { padding: 12px 16px; }
.skel-line { height: 10px; background: #EDE7DA; margin-bottom: 8px; position: relative; overflow: hidden; }
.skel-line::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%); animation: shimmer 1.8s ease-in-out infinite; }
.skel-line.w80 { width: 80%; } .skel-line.w60 { width: 60%; }
.skel-prog { height: 10px; background: #EDE7DA; border: 2px solid #D4B896; }
</style>
