<template>
  <div class="progress-detail-page">
    <div class="pixel-page-header">
      <h2><span>📊</span> 学习明细</h2>
    </div>

    <!-- 筛选 -->
    <div class="pixel-filter-bar">
      <select class="pixel-filter-select" v-model="selectedProjectId" @change="onProjectChange" style="width: 180px;">
        <option :value="null">请选择项目</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select class="pixel-filter-select" v-model="selectedPlanId" @change="loadData" style="width: 180px;">
        <option :value="null">请选择计划</option>
        <option v-for="p in filteredPlans" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <input class="pixel-filter-input" type="text" v-model="searchName" placeholder="搜索学员姓名..." style="width: 160px;" />
      <button class="pixel-btn pixel-btn-ghost pixel-btn-sm" @click="loadData">🔍 查询</button>
    </div>

    <!-- 未选择计划提示 -->
    <div v-if="!selectedPlanId" class="pixel-empty">请选择项目和计划查看学习明细</div>

    <!-- 加载中 -->
    <div v-else-if="loading" class="pixel-empty">加载中...</div>

    <!-- 数据展示 -->
    <template v-else-if="data">
      <!-- 计划信息条 -->
      <div class="plan-info-bar">
        <span><span class="info-label">项目：</span><strong>{{ data.plan.projectName }}</strong></span>
        <span class="info-sep">|</span>
        <span><span class="info-label">计划：</span><strong>{{ data.plan.name }}</strong></span>
        <span class="info-sep">|</span>
        <span><span class="info-label">关卡数：</span><strong>{{ data.plan.stageCount }} 个</strong></span>
        <span class="info-sep">|</span>
        <span><span class="info-label">参与学员：</span><strong>{{ data.plan.studentCount }} 人</strong></span>
        <span class="info-sep">|</span>
        <span><span class="info-label">通过线：</span><strong>{{ data.plan.passScore }}分</strong></span>
        <span class="info-sep">|</span>
        <span><span class="info-label">测验次数：</span><strong>{{ data.plan.maxAttempts }}次</strong></span>
      </div>

      <!-- 统计卡片 -->
      <div class="pixel-stat-grid">
        <div class="pixel-stat-card">
          <div class="label">👥 参与人数</div>
          <div class="value">{{ data.stats.total }}</div>
        </div>
        <div class="pixel-stat-card">
          <div class="label">🏆 全部通关</div>
          <div class="value" style="color: #2E7D32;">{{ data.stats.allCompleted }}</div>
          <div class="sub" v-if="data.stats.total">完成率 {{ Math.round(data.stats.allCompleted / data.stats.total * 100) }}%</div>
        </div>
        <div class="pixel-stat-card">
          <div class="label">🟡 学习中</div>
          <div class="value" style="color: #E65100;">{{ data.stats.inProgress }}</div>
        </div>
        <div class="pixel-stat-card">
          <div class="label">❌ 有关卡受阻</div>
          <div class="value" style="color: #C24A3A;">{{ data.stats.hasFailed }}</div>
        </div>
        <div class="pixel-stat-card">
          <div class="label">😴 未开始</div>
          <div class="value" style="color: #aaa;">{{ data.stats.notStarted }}</div>
        </div>
      </div>

      <!-- 图例 + 导出 -->
      <div class="toolbar">
        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background: #E8F5E9; border: 1px solid #81C784;"></span> 已完成</span>
          <span class="legend-item"><span class="legend-dot" style="background: #FFF3E0; border: 1px solid #FFB74D;"></span> 进行中</span>
          <span class="legend-item"><span class="legend-dot" style="background: #FFEBEE; border: 1px solid #EF9A9A;"></span> 未通过</span>
          <span class="legend-item"><span class="legend-dot" style="background: #F0EBE3; border: 1px solid #D7CFC4;"></span> 未解锁</span>
        </div>
      </div>

      <!-- 无数据 -->
      <div v-if="filteredStudents.length === 0" class="pixel-empty">暂无学员数据</div>

      <!-- 矩阵表格 -->
      <div v-else class="pixel-table-wrap">
        <table class="pixel-table matrix-table">
          <thead>
            <tr>
              <th class="sticky-col" style="min-width: 150px;">学员</th>
              <th v-for="stage in data.stages" :key="stage.id" style="text-align: center;">
                <div class="stage-col-header">
                  <span class="stage-col-title">{{ stage.title }}</span>
                  <span class="stage-col-sub">{{ unitTypeIcons(stage.unitTypes) }}</span>
                  <span v-if="stage.mentors.length" class="stage-col-mentor">👤 {{ stage.mentors.join('、') }}</span>
                </div>
              </th>
              <th style="text-align: center; min-width: 80px;">整体进度</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in paginatedStudents" :key="student.id">
              <td class="sticky-col">
                <div class="student-cell">
                  <div class="student-avatar">
                    <img :src="getAvatarHead(student.avatar, student.id)" class="avatar-img" />
                  </div>
                  <div class="student-name-wrap">
                    <span class="student-name">{{ student.name }}</span>
                    <span class="student-phone">{{ maskPhone(student.phone) }}</span>
                  </div>
                </div>
              </td>
              <td v-for="(ss, idx) in student.stages" :key="data.stages[idx].id" class="status-cell">
                <span class="status-badge" :class="'status-' + ss.status">{{ statusIcon(ss.status) }} {{ statusText(ss.status) }}</span>
                <div v-if="ss.startedAt" class="status-detail">
                  <template v-if="ss.completedAt">
                    {{ shortDate(ss.startedAt) }} → {{ shortDate(ss.completedAt) }}
                    <template v-if="ss.quizScore != null"> · {{ ss.quizScore }}分</template>
                  </template>
                  <template v-else>
                    {{ shortDate(ss.startedAt) }}起 · 已{{ calcDuration(ss.startedAt) }}
                    <template v-if="ss.quizScore != null"> · {{ ss.quizScore }}分</template>
                  </template>
                </div>
              </td>
              <td class="overall-cell">
                <div class="progress-ring" :style="ringStyle(student)">
                  {{ student.completedCount }}/{{ student.totalStages }}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 分页 -->
      <div v-if="filteredStudents.length > pageSize" class="pixel-pagination">
        <span class="page-info">共 {{ filteredStudents.length }} 条</span>
        <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage--">‹</button>
        <template v-for="p in visiblePages" :key="p">
          <span v-if="p === '...'" class="page-ellipsis">…</span>
          <button v-else class="page-btn" :class="{ active: p === currentPage }" @click="currentPage = p">{{ p }}</button>
        </template>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage++">›</button>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api/index.js'
import { getAvatarHead } from '../../pixel-map.js'

const loading = ref(false)
const projects = ref([])
const plans = ref([])
const selectedProjectId = ref(null)
const selectedPlanId = ref(null)
const searchName = ref('')
const data = ref(null)
const currentPage = ref(1)
const pageSize = 15

const filteredPlans = computed(() => {
  if (!selectedProjectId.value) return plans.value
  return plans.value.filter(p => p.project_id === selectedProjectId.value)
})

const filteredStudents = computed(() => {
  if (!data.value) return []
  const kw = searchName.value.trim().toLowerCase()
  if (!kw) return data.value.students
  return data.value.students.filter(s => s.name.toLowerCase().includes(kw))
})

const totalPages = computed(() => Math.ceil(filteredStudents.value.length / pageSize))
const paginatedStudents = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredStudents.value.slice(start, start + pageSize)
})
const visiblePages = computed(() => {
  const tp = totalPages.value
  const cp = currentPage.value
  if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1)
  const pages = [1]
  if (cp > 3) pages.push('...')
  for (let i = Math.max(2, cp - 1); i <= Math.min(tp - 1, cp + 1); i++) pages.push(i)
  if (cp < tp - 2) pages.push('...')
  pages.push(tp)
  return pages
})

function onProjectChange() {
  selectedPlanId.value = null
  data.value = null
}

async function loadData() {
  if (!selectedPlanId.value) return
  loading.value = true
  currentPage.value = 1
  try {
    const res = await api.get('/admin/progress-detail', { params: { planId: selectedPlanId.value } })
    data.value = res.data
  } catch (err) {
    console.error('加载学习明细失败:', err)
  } finally {
    loading.value = false
  }
}

async function loadFilters() {
  try {
    const [projRes, planRes] = await Promise.all([
      api.get('/admin/projects'),
      api.get('/admin/plans')
    ])
    projects.value = projRes.data || []
    plans.value = planRes.data || []
  } catch {}
}

function unitTypeIcons(types) {
  const map = { article: '📖文章', video: '🎬视频', practice: '⚡练习', quiz: '⭐测验', practical: '⚔️实战' }
  return (types || []).map(t => map[t] || t).join(' · ')
}

function statusIcon(status) {
  const map = { completed: '✅', active: '🟡', failed: '❌', locked: '🔒' }
  return map[status] || ''
}

function statusText(status) {
  const map = { completed: '已完成', active: '进行中', failed: '未通过', locked: '未解锁' }
  return map[status] || status
}

function shortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function calcDuration(startStr) {
  if (!startStr) return ''
  const ms = Date.now() - new Date(startStr).getTime()
  const days = Math.floor(ms / 86400000)
  if (days > 0) return `${days}天`
  const hours = Math.floor(ms / 3600000)
  return `${hours}小时`
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return phone || ''
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

function ringStyle(student) {
  const pct = student.totalStages > 0 ? Math.round(student.completedCount / student.totalStages * 100) : 0
  const hasFailed = student.stages.some(s => s.status === 'failed')
  const hasActive = student.stages.some(s => s.status === 'active')
  const completedPct = pct
  let color2 = '#E0D5C8'
  if (hasFailed) color2 = '#EF9A9A'
  else if (hasActive) color2 = '#FFE0B2'
  const textColor = pct === 100 ? '#fff' : 'var(--pixel-text, #3E2723)'
  return {
    background: `conic-gradient(#5C8A4D ${completedPct}%, ${color2} ${completedPct}%)`,
    color: textColor
  }
}

onMounted(loadFilters)
</script>

<style scoped>
.progress-detail-page { }

.plan-info-bar {
  background: var(--pixel-card, #FFFDF5);
  border: 1px solid var(--pixel-border, #E0D5C8);
  border-radius: var(--pixel-radius, 8px);
  padding: 12px 20px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  font-size: 13px;
  flex-wrap: wrap;
}
.info-label { color: var(--pixel-text-secondary, #8B7355); }
.info-sep { color: #ddd; }

.pixel-stat-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 20px; }
.pixel-stat-card {
  background: var(--pixel-card, #FFFDF5);
  border: 1px solid var(--pixel-border, #E0D5C8);
  border-radius: var(--pixel-radius, 8px);
  padding: 16px 20px;
}
.pixel-stat-card .label { font-size: 12px; color: var(--pixel-text-secondary, #8B7355); margin-bottom: 6px; }
.pixel-stat-card .value { font-size: 24px; font-weight: 700; }
.pixel-stat-card .sub { font-size: 11px; color: #aaa; margin-top: 4px; }

.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.legend { display: flex; gap: 12px; font-size: 11px; color: var(--pixel-text-secondary, #8B7355); }
.legend-item { display: flex; align-items: center; gap: 4px; }
.legend-dot { width: 10px; height: 10px; border-radius: 3px; }

/* 表格 */
.matrix-table { font-size: 13px; }
.sticky-col {
  position: sticky; left: 0; z-index: 2;
  background: inherit;
}
thead .sticky-col { background: #FAF6EE; }
tbody tr:hover .sticky-col { background: #FFFDF0; }

.stage-col-header { display: flex; flex-direction: column; gap: 2px; min-width: 130px; }
.stage-col-title { font-size: 12px; font-weight: 600; color: var(--pixel-text, #3E2723); }
.stage-col-sub { font-size: 10px; color: #aaa; font-weight: 400; }
.stage-col-mentor { font-size: 10px; color: var(--pixel-blue, #4A90B8); font-weight: 400; margin-top: 1px; }

.student-cell { display: flex; align-items: center; gap: 8px; min-width: 140px; }
.student-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: #FFF8E7; border: 2px solid var(--pixel-border, #E0D5C8);
  overflow: hidden; display: flex; align-items: center; justify-content: center;
}
.avatar-img { width: 28px; height: 28px; image-rendering: pixelated; }
.student-name-wrap { display: flex; flex-direction: column; }
.student-name { font-weight: 500; font-size: 13px; }
.student-phone { font-size: 11px; color: #aaa; }

.status-cell { text-align: center; }
.status-badge {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap;
}
.status-completed { background: #E8F5E9; color: #2E7D32; }
.status-active { background: #FFF3E0; color: #E65100; }
.status-failed { background: #FFEBEE; color: #C24A3A; }
.status-locked { background: #F0EBE3; color: #aaa; }

.status-detail { font-size: 10px; color: #999; margin-top: 2px; }

.overall-cell { text-align: center; }
.progress-ring {
  width: 36px; height: 36px; border-radius: 50%;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; margin: 0 auto;
}

/* 分页 */
.pixel-pagination {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  margin-top: 16px; padding: 12px;
}
.page-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--pixel-border, #E0D5C8); border-radius: 6px;
  background: var(--pixel-card, #FFFDF5); font-size: 13px; cursor: pointer;
  color: var(--pixel-text, #3E2723);
}
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-btn.active { background: var(--pixel-green, #5C8A4D); color: #fff; border-color: var(--pixel-green, #5C8A4D); }
.page-btn:hover:not(.active):not(:disabled) { background: #F0EBE3; }
.page-info { font-size: 12px; color: var(--pixel-text-secondary, #8B7355); }
.page-ellipsis { font-size: 12px; color: #aaa; }
</style>
