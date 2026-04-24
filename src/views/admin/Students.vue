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
                  </div>
                </template>
                <template v-else>
                  <span style="color: #aaa; font-size: 13px;">未开始</span>
                </template>
              </div>
            </td>
            <td>{{ student.mentor?.name || '-' }}</td>
            <td>
              <button class="pixel-btn-text" @click.stop="goToDetail(student.id)">查看详情</button>
            </td>
          </tr>
        </tbody>
      </table>

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

const filteredStudents = computed(() => {
  if (!searchKeyword.value) return students.value
  const kw = searchKeyword.value.toLowerCase()
  return students.value.filter(s =>
    s.name?.toLowerCase().includes(kw) ||
    s.phone?.includes(kw)
  )
})

function goToDetail(id) {
  router.push(`/admin/students/${id}`)
}

function onProjectChange() {
  filterPlanId.value = null
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

watch(filterPlanId, loadStudents)
onMounted(() => { loadFilters(); loadStudents() })
</script>

<style scoped>
.students-page { ; }

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
