<template>
  <div class="student-detail-page">
    <!-- 返回 -->
    <div class="back-link">
      <router-link to="/admin/students">← 返回学员列表</router-link>
    </div>

    <div v-if="loading" class="loading-wrap">加载中...</div>

    <template v-else-if="student">
      <!-- 学员信息卡片 -->
      <div class="student-card">
        <div class="student-info">
          <h2>{{ student.name }}</h2>
          <p class="phone">{{ student.phone || '-' }}</p>
        </div>
      </div>

      <!-- Mentor 分配（按计划维度） -->
      <div class="mentor-section">
        <h3>👤 数据 Mentor</h3>

        <!-- 已有分配列表 -->
        <div v-if="student.mentors && student.mentors.length > 0" class="mentor-list">
          <div v-for="ma in student.mentors" :key="ma.id" class="mentor-assign-item">
            <span class="ma-plan">📋 {{ ma.projectName || '?' }} / {{ ma.planName || '?' }}</span>
            <span class="ma-arrow">→</span>
            <span class="ma-mentor">{{ ma.mentorName }}</span>
            <button class="btn-remove" @click="removeMentorAssignment(ma.id)">✕</button>
          </div>
        </div>
        <div v-else class="mentor-empty">暂无分配</div>

        <!-- 新增分配 -->
        <div v-if="!showAddMentor" class="add-mentor-trigger">
          <button class="btn-add" @click="showAddMentor = true">+ 新增 Mentor 分配</button>
        </div>
        <div v-else class="add-mentor-form">
          <select v-model="addForm.projectId" @change="onAddProjectChange">
            <option value="">选择项目</option>
            <option v-for="p in allProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <select v-model="addForm.planId" :disabled="!addForm.projectId">
            <option value="">选择计划</option>
            <option v-for="p in availablePlans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <select v-model="addForm.mentorId" :disabled="!addForm.planId">
            <option value="">选择 Mentor</option>
            <option v-for="m in mentors" :key="m.id" :value="m.id">{{ m.name }}</option>
          </select>
          <button class="btn-confirm" :disabled="!addForm.planId || !addForm.mentorId" @click="doAddMentor">确认</button>
          <button class="btn-cancel" @click="showAddMentor = false; resetAddForm()">取消</button>
        </div>
      </div>

      <!-- 培训进度（按项目→计划→关卡→单元 分层） -->
      <div class="stages-section">
        <h3>📚 培训进度</h3>
        <div v-if="!groupedProgress.length" class="empty-plan">暂无学习数据</div>
        <div v-for="proj in groupedProgress" :key="proj.id" class="project-group">
          <div class="project-group-header">
            <span>📁</span> {{ proj.name }}
            <span class="project-group-meta">
              {{ projCompletedStages(proj) }}/{{ projTotalStages(proj) }} 关卡
            </span>
            <div class="pixel-progress" style="width: 60px; margin-left: 8px;">
              <div class="pixel-progress-fill" :style="{ width: projProgressPct(proj) + '%' }"></div>
            </div>
          </div>
          <div class="project-group-body">
            <div v-for="plan in proj.plans" :key="plan.id" class="plan-section">
              <div class="plan-title">
                📋 {{ plan.name }}
                <span class="stage-status" :class="planStatus(plan)">{{ planStatusText(plan) }}</span>
              </div>
              <ul class="stage-list">
                <li v-for="stage in plan.stages" :key="stage.id" class="stage-item" @click="toggleStage(stage.id)">
                  <span class="stage-icon">
                    <template v-if="stage.status === 'completed'">✅</template>
                    <template v-else-if="stage.status === 'active'">🚩</template>
                    <template v-else>🔒</template>
                  </span>
                  <span class="stage-name" :class="stage.status">{{ stage.title }}</span>
                  <!-- 时间信息 -->
                  <span v-if="stage.started_at" class="stage-time-info">
                    <span class="time-label">{{ formatShortDate(stage.started_at) }}</span>
                    <template v-if="stage.completed_at">
                      <span class="time-arrow">→</span>
                      <span class="time-label">{{ formatShortDate(stage.completed_at) }}</span>
                    </template>
                    <span v-if="stage.time_spent_seconds > 0" class="time-duration">
                      学习 {{ formatTimeSpent(stage.time_spent_seconds) }}
                    </span>
                  </span>
                  <!-- 单元 chips（始终显示） -->
                  <div class="unit-chips">
                    <span v-for="unit in stage.units" :key="unit.id" class="unit-chip" :class="unit.status"
                          :title="unit.title">
                      {{ unitTypeIcon(unit.unit_type) }}
                      {{ unitChipLabel(unit) }}
                    </span>
                  </div>
                  <!-- 错题按钮（不用展开就能看到） -->
                  <template v-for="unit in stage.units" :key="'wrong-'+unit.id">
                    <button v-if="unit.unit_type === 'quiz' && unit.wrong_answers && unit.wrong_answers.length > 0"
                      class="btn-wrong-inline" @click.stop="openWrongAnswers(unit, stage)">
                      📋 错题({{ unit.wrong_answers.length }})
                    </button>
                  </template>
                </li>
              </ul>
              <!-- 展开的关卡详情 -->
              <div v-for="stage in plan.stages" :key="'detail-'+stage.id">
                <div v-if="expandedStages.includes(stage.id)" class="units-detail">
                  <div class="units-detail-title">{{ stage.title }} · 单元详情</div>
                  <div v-for="unit in stage.units" :key="unit.id" class="unit-row">
                    <span class="unit-type-icon">{{ unitTypeIcon(unit.unit_type) }}</span>
                    <span class="unit-title">{{ unit.title }}</span>
                    <span class="unit-status" :class="unit.status">{{ statusText(unit.status) }}</span>
                    <span v-if="unit.score !== null && unit.score !== undefined" class="unit-score">
                      {{ unit.score }}分
                    </span>
                    <span v-if="unit.unit_type === 'quiz'" class="unit-attempts">
                      尝试：{{ unit.attempt_count || 0 }}/2
                    </span>
                    <span v-if="unit.unit_type === 'quiz' && (unit.attempt_count || 0) > 0" class="unit-action">
                      <button class="btn-reset" @click.stop="resetUnit(unit.id)">重置</button>
                    </span>
                    <span v-if="unit.unit_type === 'quiz' && unit.wrong_answers && unit.wrong_answers.length > 0" class="unit-action">
                      <button class="btn-wrong" @click.stop="openWrongAnswers(unit, stage)">📋 错题({{ unit.wrong_answers.length }})</button>
                    </span>
                    <span v-if="unit.unit_type === 'practical' && unit.status === 'active'" class="unit-action">
                      <button v-if="!unit.notified" class="btn-notify" @click.stop="notifyDataReady(stage, unit)" :disabled="notifying">
                        📤 通知学员试标
                      </button>
                      <span v-else class="notify-sent">✅ 已通知 ({{ unit.notifiedAt }})</span>
                    </span>
                  </div>
                </div>
              </div>
              <div v-if="!plan.stages.length" class="empty-plan">暂无关卡</div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 错题详情弹窗 -->
    <Teleport to="body">
      <div v-if="wrongModal.visible" class="wrong-overlay" @click.self="wrongModal.visible = false">
        <div class="wrong-modal">
          <div class="wrong-modal-header">
            <h3>📋 错题详情 — {{ wrongModal.unitTitle }}</h3>
            <button class="wrong-modal-close" @click="wrongModal.visible = false">✕</button>
          </div>
          <div class="wrong-modal-body">
            <div class="wrong-stats">
              <span>答错：<strong>{{ wrongModal.items.length }}</strong> 题</span>
              <span v-if="wrongModal.score !== null">得分：<strong>{{ wrongModal.score }}</strong> 分</span>
            </div>
            <div v-for="(item, idx) in wrongModal.items" :key="idx" class="wrong-item">
              <div class="wrong-q-header">
                <span class="wrong-q-num">第 {{ idx + 1 }} 题</span>
                <span v-if="item.questionType" class="wrong-q-type">{{ quizTypeLabel(item.questionType) }}</span>
              </div>
              <div class="wrong-q-content" v-html="renderMd(item.content)"></div>
              <template v-if="item.options && item.options.length">
                <div v-for="opt in item.options" :key="opt.key"
                  class="wrong-opt"
                  :class="wrongOptClass(item, opt.key)">
                  {{ opt.key }}. <span v-html="renderMdInline(opt.text)"></span>
                  <span v-if="item.correctAnswer?.includes(opt.key) && item.userAnswer?.includes(opt.key)" class="opt-marker correct-marker">✓ 学员选</span>
                  <span v-else-if="item.correctAnswer?.includes(opt.key)" class="opt-marker correct-marker">正确答案</span>
                  <span v-else-if="item.userAnswer?.includes(opt.key)" class="opt-marker wrong-marker">学员选</span>
                </div>
              </template>
              <div class="wrong-answer-row">
                <p>学员答案：{{ item.userAnswer || '未作答' }}</p>
                <p>正确答案：{{ item.correctAnswer }}</p>
              </div>
              <div v-if="item.analysis" class="wrong-analysis">💡 <span v-html="renderMd(item.analysis)"></span></div>
              <div v-if="item.note" class="wrong-note">
                <div class="wrong-note-label">📝 学员笔记</div>
                <div class="wrong-note-text">{{ item.note }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useMessage, useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })
function renderMd(text) { return text ? marked.parse(String(text)) : '' }
function renderMdInline(text) { return text ? marked.parseInline(String(text)) : '' }

const route = useRoute()
const studentId = route.params.id
const message = useMessage()
const dialog = useDialog()

const student = ref(null)
const mentors = ref([])
const loading = ref(true)
const notifying = ref(false)
const expandedStages = ref([])
const groupedProgress = ref([])

// 错题弹窗
const wrongModal = ref({ visible: false, unitTitle: '', score: null, items: [] })

function openWrongAnswers(unit, stage) {
  wrongModal.value = {
    visible: true,
    unitTitle: unit.title || stage?.title || '测验',
    score: unit.score,
    items: unit.wrong_answers || []
  }
}

function wrongOptClass(item, key) {
  const isUserSelected = item.userAnswer?.includes(key)
  const isCorrect = item.correctAnswer?.includes(key)
  if (isUserSelected && isCorrect) return 'is-correct'
  if (isUserSelected && !isCorrect) return 'user-wrong'
  if (isCorrect) return 'is-correct'
  return ''
}

function quizTypeLabel(type) {
  return { single: '单选', multiple: '多选', judge: '判断' }[type] || type
}
// 新增 mentor 分配相关
const showAddMentor = ref(false)
const addForm = ref({ projectId: '', planId: '', mentorId: '' })
const allProjects = ref([])
const projectPlansCache = ref({}) // projectId → plans[]

const availablePlans = computed(() => {
  if (!addForm.value.projectId) return []
  const plans = projectPlansCache.value[addForm.value.projectId] || []
  // 排除已分配的计划
  const assignedPlanIds = (student.value?.mentors || []).map(m => m.planId)
  return plans.filter(p => !assignedPlanIds.includes(p.id))
})

function statusText(status) {
  const map = {
    locked: '未解锁',
    active: '进行中',
    completed: '已完成',
    failed: '未通过'
  }
  return map[status] || status
}

function formatShortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function calcDuration(start, end) {
  if (!start || !end) return ''
  const ms = new Date(end) - new Date(start)
  const hours = Math.floor(ms / 3600000)
  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  if (days > 0) return `${days}天${remainHours}小时`
  if (hours > 0) return `${hours}小时`
  const mins = Math.floor(ms / 60000)
  return `${mins}分钟`
}

function formatTimeSpent(seconds) {
  if (!seconds || seconds < 60) return '不足1分钟'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}小时${m}分钟`
  return `${m}分钟`
}

function unitTypeIcon(type) {
  const map = {
    article: '📖',
    video: '🎬',
    practice: '📝',
    quiz: '🎯',
    practical: '🔧'
  }
  return map[type] || '📌'
}

function unitChipLabel(unit) {
  const typeMap = { article: '学习', video: '视频', practice: '练习', quiz: '测验', practical: '实战' }
  let label = typeMap[unit.unit_type] || unit.unit_type
  if (unit.score !== null && unit.score !== undefined) label += ` ${unit.score}分`
  return label
}

function projCompletedStages(proj) {
  let count = 0
  for (const plan of proj.plans) {
    for (const stage of plan.stages) {
      if (stage.status === 'completed') count++
    }
  }
  return count
}

function projTotalStages(proj) {
  let count = 0
  for (const plan of proj.plans) count += plan.stages.length
  return count
}

function projProgressPct(proj) {
  const total = projTotalStages(proj)
  return total > 0 ? Math.round(projCompletedStages(proj) / total * 100) : 0
}

function planStatus(plan) {
  if (!plan.stages.length) return 'locked'
  const all = plan.stages.every(s => s.status === 'completed')
  const any = plan.stages.some(s => s.status === 'active' || s.status === 'completed')
  return all ? 'completed' : any ? 'active' : 'locked'
}

function planStatusText(plan) {
  const s = planStatus(plan)
  return { completed: '已通关', active: '学习中', locked: '未开始' }[s] || s
}

function toggleStage(stageId) {
  const idx = expandedStages.value.indexOf(stageId)
  if (idx >= 0) {
    expandedStages.value.splice(idx, 1)
  } else {
    expandedStages.value.push(stageId)
  }
}

async function loadStudent(silent = false) {
  if (!silent) loading.value = true
  try {
    const res = await api.get(`/admin/students/${studentId}`)
    if (res.success) {
      student.value = res.data
      await buildGroupedProgress(res.data.stages || [])
    }
  } catch (err) {
    console.error('获取学员详情失败:', err)
  } finally {
    loading.value = false
  }
}

async function buildGroupedProgress(stages) {
  try {
    const projRes = await api.get('/projects')
    const projects = projRes.data || []
    const result = []

    // 并行查所有项目的计划
    const planResults = await Promise.all(
      projects.map(proj => api.get(`/projects/${proj.id}/plans`).then(r => ({ projId: proj.id, plans: r.data || [] })))
    )
    const plansByProject = Object.fromEntries(planResults.map(r => [r.projId, r.plans]))

    for (const proj of projects) {
      const plans = (plansByProject[proj.id] || []).map(plan => {
        const planStages = stages.filter(s => s.plan_id === plan.id)
        return { ...plan, stages: planStages }
      })
      // 只显示有关卡的项目，或者有进度的项目
      if (plans.some(p => p.stages.length > 0)) {
        result.push({ ...proj, plans: plans.filter(p => p.stages.length > 0) })
      }
    }

    // 处理没有 plan_id 的关卡（兼容旧数据）
    const orphanStages = stages.filter(s => !s.plan_id)
    if (orphanStages.length > 0) {
      result.push({ id: 'unassigned', name: '未分类', plans: [{ id: 'none', name: '未归属计划', stages: orphanStages }] })
    }

    groupedProgress.value = result
  } catch {
    // 降级：不分组
    groupedProgress.value = [{ id: 'all', name: '全部', plans: [{ id: 'all', name: '全部关卡', stages }] }]
  }
}

async function loadMentors() {
  try {
    const res = await api.get('/admin/mentors')
    if (res.success) mentors.value = res.data
  } catch (err) {
    console.error('获取Mentor列表失败:', err)
  }
}

async function loadAllProjects() {
  try {
    const res = await api.get('/projects')
    allProjects.value = (res.data || []).filter(p => p.status === 'active')
  } catch {}
}

function resetAddForm() {
  addForm.value = { projectId: '', planId: '', mentorId: '' }
}

async function onAddProjectChange() {
  addForm.value.planId = ''
  const pid = addForm.value.projectId
  if (pid && !projectPlansCache.value[pid]) {
    try {
      const res = await api.get(`/projects/${pid}/plans`)
      projectPlansCache.value[pid] = res.data || []
    } catch {}
  }
}

async function doAddMentor() {
  try {
    await api.post(`/admin/students/${studentId}/assign-mentor`, {
      mentorId: addForm.value.mentorId,
      planId: addForm.value.planId
    })
    showAddMentor.value = false
    resetAddForm()
    await loadStudent(true)
  } catch (err) {
    message.error('分配失败：' + err.message)
  }
}

async function removeMentorAssignment(assignmentId) {
  dialog.warning({
    title: '确认移除',
    content: '确定移除该 Mentor 分配？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/mentor-assignments/${assignmentId}`)
        await loadStudent(true)
      } catch (err) {
        message.error('移除失败：' + err.message)
      }
    }
  })
}

async function resetUnit(unitId) {
  dialog.warning({
    title: '确认重置',
    content: '确定要重置该单元的测验次数吗？',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.post(`/admin/students/${studentId}/reset-unit/${unitId}`)
        message.success('重置成功')
        await loadStudent(true)
      } catch (err) {
        message.error('重置失败：' + err.message)
      }
    }
  })
}

async function notifyDataReady(stage, unit) {
  notifying.value = true
  try {
    await api.post(`/admin/students/${studentId}/notify-data-ready`, { stageId: stage.id })
    message.success('已通知学员')
    unit.notified = true
    unit.notifiedAt = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  } catch (err) {
    message.error('通知失败：' + (err.response?.data?.message || err.message))
  } finally {
    notifying.value = false
  }
}

onMounted(() => {
  loadStudent()
  loadMentors()
  loadAllProjects()
})
</script>

<style scoped>
.student-detail-page { padding: 20px; ; }
.back-link { margin-bottom: 20px; }
.back-link a { color: #667eea; text-decoration: none; font-size: 14px; }
.back-link a:hover { text-decoration: underline; }

.loading-wrap { text-align: center; padding: 60px; color: #999; }

/* 学员信息卡片 */
.student-card {
  background: var(--pixel-card, #fffbf0); border: 2px solid var(--pixel-border, #8b6914);
  border-radius: 8px; padding: 20px 24px;
  margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;
}
.student-info h2 { margin: 0 0 4px; font-size: 18px; color: var(--pixel-text, #4a3728); }
.phone { margin: 0; color: var(--pixel-muted, #9e8a76); font-size: 13px; }

/* Mentor 分配区域 */
.mentor-section {
  background: var(--pixel-card, #fffbf0); border: 2px solid var(--pixel-border, #8b6914);
  border-radius: 8px; padding: 16px 20px; margin-bottom: 16px;
}
.mentor-section h3 { font-size: 14px; margin: 0 0 12px; color: var(--pixel-text, #4a3728); }

.mentor-list { margin-bottom: 12px; }
.mentor-assign-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 6px;
  font-size: 14px;
}
.ma-plan { color: #636366; }
.ma-arrow { color: #ccc; }
.ma-mentor { color: #333; font-weight: 500; }
.btn-remove {
  margin-left: auto;
  background: none;
  border: none;
  color: #ccc;
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
}
.btn-remove:hover { color: #e53935; background: #fce4ec; }
.mentor-empty { font-size: 13px; color: #999; margin-bottom: 12px; }

.add-mentor-trigger { margin-top: 4px; }
.btn-add {
  background: none;
  border: 1px dashed #ccc;
  color: #667eea;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  width: 100%;
}
.btn-add:hover { border-color: #667eea; background: #f5f7ff; }

.add-mentor-form {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8px;
}
.add-mentor-form select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  min-width: 130px;
}
.btn-confirm {
  padding: 8px 16px;
  background: #667eea;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}
.btn-confirm:disabled { opacity: 0.4; cursor: not-allowed; }
.btn-cancel {
  padding: 8px 12px;
  background: #f5f5f5;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
}

/* 关卡列表 - 分层样式 */
.stages-section h3 { font-size: 16px; margin: 0 0 16px; color: var(--pixel-text, #4a3728); }

.project-group { margin-bottom: 20px; }
.project-group-header {
  display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  background: #f0e6d2; border: 2px solid var(--pixel-border, #8b6914);
  border-radius: 8px 8px 0 0; font-weight: 600; font-size: 14px;
}
.project-group-meta { margin-left: auto; font-size: 12px; font-weight: 400; color: var(--pixel-muted, #9e8a76); }
.project-group-body {
  background: var(--pixel-card, #fffbf0); border: 2px solid var(--pixel-border, #8b6914);
  border-top: none; border-radius: 0 0 8px 8px; padding: 12px;
}

.plan-section { margin-left: 16px; border-left: 2px solid #e8dcc8; padding-left: 16px; margin-top: 8px; margin-bottom: 12px; }
.plan-title {
  font-size: 13px; font-weight: 600; color: var(--pixel-link, #4a90d9);
  margin-bottom: 6px; display: flex; align-items: center; gap: 6px;
}

.stage-list { list-style: none; padding: 0; margin: 0; }
.stage-item {
  display: flex; align-items: center; gap: 10px; padding: 6px 0;
  font-size: 13px; border-bottom: 1px dashed #f0e6d2; cursor: pointer;
}
.stage-item:last-child { border-bottom: none; }
.stage-item:hover { background: #faf5ea; border-radius: 4px; }
.stage-icon { width: 20px; text-align: center; }
.stage-name { flex-shrink: 0; }
.stage-name.completed { color: var(--pixel-text, #4a3728); }
.stage-name.active { color: var(--pixel-link, #4a90d9); font-weight: 500; }
.stage-name.locked { color: #aaa; }
.stage-time-info {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--pixel-text-secondary, #8B7355); margin-left: 8px; flex-shrink: 0;
}
.stage-time-info .time-label { color: #999; }
.stage-time-info .time-arrow { color: #ccc; }
.stage-time-info .time-duration {
  background: #FFF3E0; color: #E65100; padding: 1px 6px; border-radius: 3px; font-size: 10px;
}
.stage-time-info .time-duration.ongoing { background: #E3F2FD; color: #1565C0; }

/* 单元 chips */
.unit-chips { display: flex; gap: 4px; margin-left: auto; flex-wrap: wrap; }
.unit-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 6px; border-radius: 4px; font-size: 11px; white-space: nowrap;
}
.unit-chip.completed { background: #e8f5e1; color: #27ae60; }
.unit-chip.active { background: #e3f2fd; color: #2196f3; }
.unit-chip.pending_review { background: #fff3e0; color: #e67e22; }
.unit-chip.failed { background: #fce4ec; color: #e74c3c; }
.unit-chip.locked { background: #f5f0e8; color: #bbb; }

/* 展开的单元详情 */
.units-detail {
  background: #faf5ea; border: 1px solid #e8dcc8; border-radius: 6px;
  padding: 10px 14px; margin: 6px 0 10px 30px;
}
.units-detail-title { font-size: 12px; font-weight: 600; color: var(--pixel-muted, #9e8a76); margin-bottom: 6px; }

.unit-row {
  display: flex; align-items: center; gap: 10px; padding: 6px 0;
  border-bottom: 1px solid #f0e6d2; font-size: 13px;
}
.unit-row:last-child { border-bottom: none; }
.unit-type-icon { font-size: 14px; }
.unit-title { flex: 1; color: #333; }

.unit-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.unit-status.completed { background: #e8f5e9; color: #2e7d32; }
.unit-status.active { background: #fff3e0; color: #e65100; }
.unit-status.pending_review { background: #fff3e0; color: #e67e22; }
.unit-status.failed { background: #fce4ec; color: #c62828; }
.unit-status.locked { background: #f5f5f5; color: #999; }

.unit-score { color: #666; min-width: 50px; text-align: center; }
.unit-attempts { color: #86868b; font-size: 12px; }
.unit-action { margin-left: 8px; }

.btn-reset {
  padding: 4px 10px; background: #fff; border: 1px solid #ff9800;
  color: #ff9800; border-radius: 4px; font-size: 12px; cursor: pointer;
}
.btn-reset:hover { background: #fff8f0; }

.stage-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: normal; }
.stage-status.completed { background: #e8f5e9; color: #2e7d32; }
.stage-status.active { background: #e3f2fd; color: #2196f3; }
.stage-status.locked { background: #f5f5f5; color: #999; }

.empty-plan { font-size: 13px; color: #999; padding: 8px 0; }

/* 查看错题按钮 */
.btn-wrong { padding: 4px 10px; background: #FFF8E7; border: 1px solid var(--pixel-gold, #E8A93A); color: var(--pixel-brown, #5B3A29); border-radius: 4px; font-size: 12px; cursor: pointer; }
.btn-wrong:hover { background: #FFECB3; }
.btn-wrong-inline { padding: 2px 8px; background: #FFF8E7; border: 1px solid var(--pixel-gold, #E8A93A); color: var(--pixel-brown, #5B3A29); border-radius: 4px; font-size: 11px; cursor: pointer; flex-shrink: 0; }
.btn-wrong-inline:hover { background: #FFECB3; }
.btn-notify { padding: 4px 10px; background: #E3F2FD; border: 1px solid #90CAF9; color: #1565C0; border-radius: 4px; font-size: 12px; cursor: pointer; }
.btn-notify:hover { background: #BBDEFB; }
.btn-notify:disabled { opacity: 0.5; cursor: not-allowed; }
.notify-sent { font-size: 11px; color: #2E7D32; background: #E8F5E9; padding: 3px 8px; border-radius: 4px; }

/* 错题弹窗 */
.wrong-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.wrong-modal { background: var(--pixel-card, #FFFDF5); border: 3px solid var(--pixel-brown, #5B3A29); width: 640px; max-width: 92vw; max-height: 80vh; display: flex; flex-direction: column; box-shadow: 6px 6px 0 rgba(91,58,41,0.15); }
.wrong-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; background: #F5EFE0; border-bottom: 2px solid var(--pixel-border, #E0D5C8); }
.wrong-modal-header h3 { font-size: 15px; color: var(--pixel-brown, #5B3A29); margin: 0; }
.wrong-modal-close { cursor: pointer; font-size: 18px; color: var(--pixel-text-secondary, #8B7355); border: none; background: none; }
.wrong-modal-close:hover { color: var(--pixel-brown, #5B3A29); }
.wrong-modal-body { flex: 1; overflow-y: auto; padding: 16px 20px; }
.wrong-stats { display: flex; gap: 16px; padding: 10px 16px; background: #FFF0EE; border: 2px solid #EF9A9A; margin-bottom: 16px; font-size: 13px; }
.wrong-stats span { color: var(--pixel-text-secondary, #8B7355); }
.wrong-stats strong { color: var(--pixel-red, #C24A3A); }
.wrong-item { border: 2px solid var(--pixel-border, #E0D5C8); margin-bottom: 12px; padding: 14px 16px; border-left: 4px solid var(--pixel-red, #C24A3A); }
.wrong-q-header { display: flex; align-items: center; gap: 6px; margin-bottom: 8px; }
.wrong-q-num { font-size: 14px; font-weight: 600; color: var(--pixel-brown, #5B3A29); }
.wrong-q-type { font-size: 11px; color: var(--pixel-blue, #4A90B8); background: #F0F5FA; padding: 1px 6px; border: 1px solid #B8D4E8; }
.wrong-q-content { font-size: 14px; line-height: 1.7; margin-bottom: 10px; padding: 8px 12px; background: #FDFAF0; border: 2px solid var(--pixel-border, #E0D5C8); }
.wrong-q-content :deep(code) { background: #f0e6d2; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.wrong-q-content :deep(pre) { background: #f5edd8; padding: 10px 12px; border-radius: 6px; overflow-x: auto; margin: 8px 0; white-space: pre-wrap; word-wrap: break-word; }
.wrong-q-content :deep(pre code) { background: none; padding: 0; }
.wrong-q-content :deep(p) { margin: 4px 0; }
.wrong-q-content :deep(ul), .wrong-q-content :deep(ol) { margin: 6px 0; padding-left: 24px; }
.wrong-q-content :deep(li) { margin: 2px 0; }
.wrong-analysis :deep(p) { margin: 2px 0; display: inline; }
.wrong-analysis :deep(code) { background: #d4edda; padding: 1px 4px; border-radius: 3px; font-size: 12px; }
.wrong-analysis :deep(ul), .wrong-analysis :deep(ol) { margin: 4px 0; padding-left: 20px; }
.wrong-opt { display: flex; align-items: center; gap: 8px; padding: 7px 12px; border: 2px solid var(--pixel-border, #E0D5C8); font-size: 13px; background: var(--pixel-card, #FFFDF5); margin-bottom: 3px; }
.wrong-opt.is-correct { border-color: var(--pixel-green, #5C8A4D); background: #ECF5E8; }
.wrong-opt.user-wrong { border-color: var(--pixel-red, #C24A3A); background: #FFF0EE; }
.opt-marker { font-size: 10px; padding: 1px 5px; border: 1px solid; margin-left: auto; }
.opt-marker.correct-marker { border-color: var(--pixel-green, #5C8A4D); color: var(--pixel-green, #5C8A4D); }
.opt-marker.wrong-marker { border-color: var(--pixel-red, #C24A3A); color: var(--pixel-red, #C24A3A); }
.wrong-answer-row { margin-top: 8px; font-size: 12px; color: var(--pixel-text-secondary, #8B7355); }
.wrong-answer-row p { margin: 2px 0; }
.wrong-analysis { color: var(--pixel-blue, #4A90B8); font-size: 12px; line-height: 1.5; margin-top: 4px; padding: 6px 10px; background: #F0F5FA; border-left: 3px solid var(--pixel-blue, #4A90B8); }
.wrong-note { margin-top: 8px; padding: 8px 12px; background: #FFF8E7; border-left: 3px solid #E8D5A0; border-radius: 0 4px 4px 0; font-size: 12px; line-height: 1.6; }
.wrong-note-label { font-size: 11px; font-weight: 600; color: #D4882A; margin-bottom: 3px; }
.wrong-note-text { color: var(--pixel-text, #4a3728); }
</style>
