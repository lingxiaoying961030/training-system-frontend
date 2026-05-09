<template>
  <div class="audit-page">
    <div class="pixel-page-header">
      <h2><span>📝</span> 操作日志</h2>
    </div>

    <!-- 筛选 -->
    <div class="pixel-filter-bar">
      <select class="pixel-filter-select" v-model="filterAction" style="width: 180px;">
        <option :value="null">全部操作类型</option>
        <option v-for="opt in actionOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <select class="pixel-filter-select" v-model="filterUserId" style="width: 160px;">
        <option :value="null">全部操作人</option>
        <option v-for="opt in operatorOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <input class="pixel-filter-input" type="date" v-model="startDate" style="width: 150px;" />
      <span style="color: #999;">至</span>
      <input class="pixel-filter-input" type="date" v-model="endDate" style="width: 150px;" />
      <button class="pixel-btn pixel-btn-ghost pixel-btn-sm" @click="loadLogs">查询</button>
    </div>

    <!-- 日志列表 -->
    <div v-if="loading" class="pixel-empty">加载中...</div>
    <div v-else-if="logs.length === 0" class="pixel-empty">暂无操作日志</div>
    <div v-else class="pixel-table-wrap">
      <table class="pixel-table">
        <thead>
          <tr>
            <th style="width: 180px; white-space: nowrap;">时间</th>
            <th style="width: 100px;">操作人</th>
            <th style="width: 130px;">操作类型</th>
            <th>详情</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td style="white-space: nowrap;">{{ formatTime(log.created_at) }}</td>
            <td>{{ log.user_name || '-' }}</td>
            <td>
              <span class="pixel-tag" :class="actionTagClass(log.action)">
                {{ actionLabel(log.action) }}
              </span>
            </td>
            <td style="font-size: 13px; color: #666;">{{ formatDetail(log) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pixel-pagination">
      <span class="page-info">共 {{ total }} 条</span>
      <button class="page-btn" :disabled="currentPage <= 1" @click="currentPage > 1 && (currentPage--, loadLogs())">‹</button>
      <template v-for="p in visiblePages" :key="p">
        <span v-if="p === '...'" class="page-ellipsis">…</span>
        <button v-else class="page-btn" :class="{ active: p === currentPage }" @click="currentPage = p; loadLogs()">{{ p }}</button>
      </template>
      <button class="page-btn" :disabled="currentPage >= totalPages" @click="currentPage < totalPages && (currentPage++, loadLogs())">›</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import api from '../../api/index.js'

const loading = ref(false)
const logs = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20

const totalPages = computed(() => Math.ceil(total.value / pageSize))
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

const filterAction = ref(null)
const filterUserId = ref(null)
const startDate = ref('')
const endDate = ref('')
const operatorOptions = ref([])

const actionMap = {
  reset_quiz: '重置测验',
  review_pass: '审核通过',
  review_fail: '审核不通过',
  review_reset: '重置审核',
  assign_mentor: '分配 Mentor',
  remove_mentor: '移除 Mentor',
  delete_user: '删除用户',
  import_students: '批量导入'
}

const actionOptions = Object.entries(actionMap).map(([value, label]) => ({ label, value }))

function actionLabel(action) {
  return actionMap[action] || action
}

function actionTagClass(action) {
  if (action === 'review_pass') return 'pixel-tag-green'
  if (action === 'review_fail' || action === 'delete_user') return 'pixel-tag-red'
  if (action === 'review_reset' || action === 'reset_quiz') return 'pixel-tag-orange'
  if (action === 'import_students') return 'pixel-tag-blue'
  return 'pixel-tag-gray'
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDetail(log) {
  const d = log.detail || {}
  switch (log.action) {
    case 'reset_quiz':
      return `重置「${d.studentName || d.studentId || '-'}」的单元测验${d.stageName ? '（' + d.stageName + (d.unitName ? ' › ' + d.unitName : '') + '）' : ''}`
    case 'assign_mentor':
      return `为「${d.studentName || '-'}」分配 Mentor「${d.mentorName || '-'}」${d.planName ? '（' + d.planName + '）' : ''}`
    case 'remove_mentor':
      return `移除 Mentor 分配`
    case 'delete_user':
      return `删除用户`
    case 'review_pass':
      return `审核通过${d.studentName ? '「' + d.studentName + '」' : ''}，评分: ${d.score || '-'}${d.comment ? '，备注: ' + d.comment : ''}`
    case 'review_fail':
      return `审核不通过${d.studentName ? '「' + d.studentName + '」' : ''}，评分: ${d.score || '-'}${d.comment ? '，备注: ' + d.comment : ''}`
    case 'review_reset':
      return `重置${d.studentName ? '「' + d.studentName + '」的' : ''}审核记录`
    case 'import_students':
      return `批量导入 ${d.success || 0} 人，跳过 ${d.skipped || 0} 人，失败 ${d.failedCount || 0} 行`
    default:
      return JSON.stringify(d)
  }
}

async function loadLogs() {
  loading.value = true
  try {
    const params = {
      limit: pageSize,
      offset: (currentPage.value - 1) * pageSize
    }
    if (filterAction.value) params.action = filterAction.value
    if (filterUserId.value) params.userId = filterUserId.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await api.get('/admin/audit-logs', { params })
    logs.value = res.data || []
    total.value = res.total || 0
  } catch (err) {
    console.error('加载日志失败:', err)
  } finally {
    loading.value = false
  }
}

async function loadOperators() {
  try {
    const res = await api.get('/admin/audit-logs/operators')
    operatorOptions.value = (res.data || []).map(o => ({ label: o.name, value: o.id }))
  } catch {}
}

onMounted(() => {
  loadLogs()
  loadOperators()
})
</script>

<style scoped>
.audit-page { }
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
