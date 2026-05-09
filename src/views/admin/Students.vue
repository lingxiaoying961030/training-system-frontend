<template>
  <div class="students-page">
    <div class="pixel-page-header">
      <h2><span>📊</span> 学员进度</h2>
    </div>

    <!-- 筛选 -->
    <div class="pixel-filter-bar">
      <input class="pixel-filter-input" v-model="searchKeyword" placeholder="🔍 搜索姓名或手机号..." />
      <select class="pixel-filter-select" v-model="filterProjectId" @change="onProjectChange" style="width: 180px;">
        <option :value="null">全部项目</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select class="pixel-filter-select" v-model="filterPlanId" style="width: 180px;">
        <option :value="null">全部计划</option>
        <option v-for="p in planOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
    </div>

    <!-- 学员列表 -->
    <div class="pixel-table-wrap">
      <table class="pixel-table">
        <thead>
          <tr>
            <th>姓名</th>
            <th>手机号</th>
            <th>当前项目-计划进度</th>
            <th>数据 Mentor</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="5" style="text-align: center; padding: 40px; color: #999;">加载中...</td>
          </tr>
          <tr v-else-if="loadError">
            <td colspan="5" style="text-align: center; padding: 40px; color: #e74c3c;">{{ loadError }} <button class="pixel-btn-text" @click="loadStudents()">🔄 重试</button></td>
          </tr>
          <tr v-else-if="!filteredStudents.length">
            <td colspan="5" style="text-align: center; padding: 40px; color: #999;">暂无学员数据</td>
          </tr>
          <tr v-else v-for="(student, sIdx) in filteredStudents" :key="student.id" @click="goToDetail(student.id)" style="cursor: pointer;">
            <td><strong>{{ student.name }}</strong></td>
            <td>{{ student.phone || '-' }}</td>
            <td>
              <div class="progress-hover-trigger"
                   @mouseenter="showPopover($event, student)"
                   @mouseleave="hidePopover">
                <!-- 当前进度显示 -->
                <template v-if="student.isCompleted">
                  <span class="pixel-tag pixel-tag-green">✅ 全部通关</span>
                  <span v-if="student.projectPlans?.length" style="font-size: 12px; color: #aaa; margin-left: 6px;">{{ student.projectPlans.length }}个项目</span>
                </template>
                <template v-else-if="student.currentPlan">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <span style="font-size: 12px; color: var(--pixel-link, #4a90d9);">{{ student.currentPlan.projectName }}</span>
                    <span style="color: #ccc; font-size: 11px;">›</span>
                    <span style="font-size: 12px;">{{ student.currentPlan.planName }}</span>
                    <div class="pixel-progress" style="width: 60px;">
                      <div class="pixel-progress-fill" :style="{ width: (student.currentPlan.completedStages / student.currentPlan.totalStages * 100) + '%' }"></div>
                    </div>
                    <span style="font-size: 11px; color: #aaa;">{{ student.currentPlan.completedStages }}/{{ student.currentPlan.totalStages }}</span>
                    <span v-if="student.currentPlan.hasFailed" class="prog-failed-tag">❌ 测验未通过</span>
                  </div>
                </template>
                <template v-else>
                  <span style="color: #aaa; font-size: 13px;">未开始</span>
                </template>
              </div>
            </td>
            <td>
              <template v-if="student.mentors && student.mentors.length > 0">
                <span class="mentor-primary">{{ student.mentors[0].name }}</span>
                <span v-if="student.mentors.length > 1" class="mentor-more" @mouseenter="positionTooltip">
                  +{{ student.mentors.length - 1 }}
                  <div class="mentor-tooltip" ref="tooltipRefs">
                    <div v-for="m in student.mentors" :key="m.id + m.planId" class="tt-row">
                      <span>{{ m.name }}</span>
                      <span class="tt-plan">{{ m.planName }}</span>
                    </div>
                  </div>
                </span>
              </template>
              <template v-else>-</template>
            </td>
            <td>
              <button class="pixel-btn-text" @click.stop="goToDetail(student.id)">查看详情</button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 翻页 -->
      <div v-if="totalPages > 1" class="px-pagination">
        <button class="px-page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">‹ 上一页</button>
        <template v-for="p in paginationPages" :key="p">
          <span v-if="p === '...'" style="color:#ccc;font-size:12px">…</span>
          <span v-else class="px-page-num" :class="{ active: p === currentPage }" @click="goPage(p)">{{ p }}</span>
        </template>
        <button class="px-page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页 ›</button>
        <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
      </div>
      <div v-else-if="searchFiltered.length > 0" class="px-pagination">
        <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
      </div>

      <!-- Fixed 弹窗：渲染到 body 层，不受表格 overflow 限制 -->
      <Teleport to="body">
        <div v-if="popoverStudent" class="progress-popover-fixed"
             :style="popoverStyle"
             @mouseenter="popoverHovering = true"
             @mouseleave="hidePopover">
          <div class="popover-title">📚 {{ popoverStudent.name }} · 全部学习进度</div>
          <div v-for="proj in popoverStudent.projectPlans" :key="proj.id" class="popover-project">
            <div class="popover-project-name">📘 {{ proj.name }}</div>
            <div v-for="plan in proj.plans" :key="plan.id" class="popover-plan-row">
              <span>{{ plan.name }}</span>
              <span style="display: flex; align-items: center; gap: 6px;">
                <span v-if="plan.status === 'completed'" class="pixel-tag pixel-tag-green" style="font-size: 11px; padding: 1px 6px;">已通关</span>
                <span v-else-if="plan.status === 'failed'" class="pixel-tag pixel-tag-red" style="font-size: 11px; padding: 1px 6px;">❌ 测验卡住</span>
                <span v-else-if="plan.status === 'in_progress'" class="pixel-tag pixel-tag-blue" style="font-size: 11px; padding: 1px 6px;">学习中</span>
                <span v-else class="pixel-tag pixel-tag-gray" style="font-size: 11px; padding: 1px 6px;">未开始</span>
                <div v-if="plan.totalStages > 0" class="pixel-progress" style="width: 50px;">
                  <div class="pixel-progress-fill" :style="{ width: (plan.completedStages / plan.totalStages * 100) + '%' }"></div>
                </div>
                <span style="font-size: 11px; color: #aaa;">{{ plan.completedStages }}/{{ plan.totalStages }}</span>
              </span>
            </div>
          </div>
        </div>
      </Teleport>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/index.js'

const router = useRouter()
const students = ref([])
const loading = ref(true)
const loadError = ref('')
const searchKeyword = ref('')
const filterProjectId = ref(null)

// 弹窗状态
const popoverStudent = ref(null)
const popoverStyle = ref({})
const popoverHovering = ref(false)
let popoverTimer = null

function showPopover(e, student) {
  if (!student.projectPlans?.length) return
  clearTimeout(popoverTimer)
  popoverHovering.value = false
  popoverStudent.value = student

  const rect = e.currentTarget.getBoundingClientRect()
  const viewH = window.innerHeight
  const popH = 200 // 估算高度
  // 如果下方空间不够，向上弹
  if (rect.bottom + popH > viewH) {
    popoverStyle.value = { left: rect.left + 'px', bottom: (viewH - rect.top + 4) + 'px', top: 'auto' }
  } else {
    popoverStyle.value = { left: rect.left + 'px', top: (rect.bottom + 4) + 'px', bottom: 'auto' }
  }
}

function hidePopover() {
  popoverTimer = setTimeout(() => {
    if (!popoverHovering.value) popoverStudent.value = null
  }, 100)
}
const filterPlanId = ref(null)
const projects = ref([])
const plans = ref([])

const planOptions = computed(() => {
  const list = filterProjectId.value
    ? plans.value.filter(p => p.project_id === filterProjectId.value)
    : plans.value
  return list.map(p => ({ label: p.name, value: p.id }))
})

const currentPage = ref(1)
const pageSize = 15

const searchFiltered = computed(() => {
  if (!searchKeyword.value) return students.value
  const kw = searchKeyword.value.toLowerCase()
  return students.value.filter(s =>
    s.name?.toLowerCase().includes(kw) ||
    s.phone?.includes(kw)
  )
})

const totalPages = computed(() => Math.ceil(searchFiltered.value.length / pageSize))

const filteredStudents = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return searchFiltered.value.slice(start, start + pageSize)
})

function goPage(p) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

const paginationPages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
  const pages = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

function goToDetail(id) {

function positionTooltip(e) {
  const trigger = e.currentTarget
  const tooltip = trigger.querySelector('.mentor-tooltip')
  if (!tooltip) return
  // 用 fixed 定位到视口层，避免任何父级遮挡
  const rect = trigger.getBoundingClientRect()
  tooltip.style.position = 'fixed'
  tooltip.style.left = Math.max(8, rect.right - 220) + 'px'
  // 判断上下空间
  const tooltipHeight = tooltip.scrollHeight || 80
  if (rect.top > tooltipHeight + 20) {
    tooltip.style.top = (rect.top - tooltipHeight - 8) + 'px'
  } else {
    tooltip.style.top = (rect.bottom + 8) + 'px'
  }
}
  router.push(`/admin/students/${id}`)
}

function onProjectChange() {
  filterPlanId.value = null
  currentPage.value = 1
  loadStudents()
}

async function loadStudents() {
  loading.value = true
  loadError.value = ''
  try {
    const params = {}
    if (filterPlanId.value) params.planId = filterPlanId.value
    else if (filterProjectId.value) params.projectId = filterProjectId.value
    const res = await api.get('/admin/students', { params })
    if (res.success) students.value = res.data
  } catch (err) {
    console.error('获取学员列表失败:', err)
    loadError.value = '加载失败，请检查网络后重试'
  } finally {
    loading.value = false
  }
}

async function loadFilters() {
  try {
    const projRes = await api.get('/projects')
    projects.value = projRes.data || []
    const results = await Promise.all(
      projects.value.map(proj => api.get(`/projects/${proj.id}/plans`).then(r => (r.data || []).map(p => ({ ...p, project_id: proj.id }))))
    )
    plans.value = results.flat()
  } catch {}
}

watch(searchKeyword, () => { currentPage.value = 1 })
watch(filterPlanId, () => { currentPage.value = 1; loadStudents() })
onMounted(() => { loadFilters(); loadStudents() })
</script>

<style scoped>
.students-page { ; }

/* 多Mentor展示 */
.mentor-primary { font-size: 13px; }
.mentor-more {
  font-size: 11px; color: #4A90B8; cursor: pointer;
  margin-left: 4px; position: relative; display: inline-block;
}
.mentor-more:hover .mentor-tooltip { display: block; }
.mentor-tooltip {
  display: none; position: fixed; z-index: 9999;
  background: #fff; border: 1px solid #E0D5C8; border-radius: 6px;
  padding: 8px 12px; min-width: 200px; box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  font-size: 12px; line-height: 1.8;
}
.tt-row { display: flex; justify-content: space-between; gap: 16px; white-space: nowrap; }
.tt-plan { color: #999; font-size: 11px; }

/* 翻页 */
.px-pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; font-size: 13px; color: var(--pixel-muted, #9e8a76); border-top: 1px solid #e8dcc8; background: #faf8f0; }
.px-page-btn { padding: 5px 12px; border: 2px solid #d4c5a0; background: var(--pixel-card, #fffbf0); border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--pixel-text, #4a3728); transition: all 0.15s; }
.px-page-btn:hover:not(:disabled) { border-color: var(--pixel-border, #8b6914); background: #f0e6d2; }
.px-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.px-page-num { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #d4c5a0; background: var(--pixel-card, #fffbf0); border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.px-page-num:hover { border-color: var(--pixel-border, #8b6914); background: #f0e6d2; }
.px-page-num.active { background: var(--pixel-link, #4a90d9); color: #fff; border-color: #3a7bc8; }
.px-page-total { margin-left: 8px; font-size: 11px; color: var(--pixel-muted, #9e8a76); }

/* failed 标签 */
.prog-failed-tag { display: inline-flex; align-items: center; gap: 2px; padding: 1px 6px; background: #ffebee; color: #c62828; border-radius: 3px; font-size: 10px; font-weight: 600; }
.pixel-tag-red { background: #ffebee; color: #c62828; border: 1px solid #ef9a9a; }

/* Hover 弹窗 */
.progress-hover-trigger { cursor: pointer; }

/* Fixed 弹窗 - 渲染到 body */
.progress-popover-fixed {
  position: fixed; z-index: 9999;
  background: var(--pixel-card, #fffbf0); border: 2px solid var(--pixel-border, #8b6914);
  border-radius: 8px; padding: 12px 16px; min-width: 340px; max-width: 420px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.18);
  pointer-events: auto;
}

.popover-title { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--pixel-text, #4a3728); }
.popover-project { margin-bottom: 6px; }
.popover-project-name { font-size: 12px; font-weight: 600; color: var(--pixel-link, #4a90d9); margin: 6px 0 3px; }
.popover-plan-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 3px 0; font-size: 12px; border-bottom: 1px dashed #e8dcc8;
}
.popover-plan-row:last-child { border-bottom: none; }
</style>
