<template>
  <div class="pm-page">
    <div class="pm-layout">
      <!-- 左侧树 -->
      <div class="pm-tree">
        <div class="pm-tree-header">
          <span>📁 项目结构</span>
          <button class="pm-btn-sm" @click="createProject">+ 新项目</button>
        </div>
        <div class="pm-tree-body">
          <div v-if="treeLoading" style="padding: 20px; text-align: center; color: var(--pixel-muted);">加载中...</div>
          <template v-else>
            <template v-for="proj in projects" :key="proj.id">
              <div class="pm-tree-project" :class="{ active: selected.type === 'project' && selected.id === proj.id }"
                   @click="selectProject(proj)">
                <span @click.stop="toggleProject(proj.id)" style="cursor: pointer;">{{ expandedProjects.includes(proj.id) ? '▼' : '▸' }}</span>
                📁 {{ proj.name }}
                <span class="pm-tree-badge">{{ getProjectPlans(proj.id).length }}</span>
              </div>
              <template v-if="expandedProjects.includes(proj.id)">
                <template v-for="plan in getProjectPlans(proj.id)" :key="plan.id">
                  <div class="pm-tree-plan" :class="{ active: selected.type === 'plan' && selected.id === plan.id }"
                       @click="selectPlan(plan, proj)">
                    <span @click.stop="togglePlan(plan.id)" style="cursor: pointer;">{{ expandedPlans.includes(plan.id) ? '▼' : '▸' }}</span>
                    📋 {{ plan.name }}
                    <span class="pm-tree-badge">{{ getPlanStages(plan.id).length }}</span>
                  </div>
                  <template v-if="expandedPlans.includes(plan.id)">
                    <div v-for="stage in getPlanStages(plan.id)" :key="stage.id"
                         class="pm-tree-stage" :class="{ active: selected.type === 'stage' && selected.id === stage.id }"
                         @click="selectStage(stage, plan, proj)">
                      {{ stage.icon || '🏁' }} {{ stage.title }}
                    </div>
                  </template>
                </template>
              </template>
            </template>
          </template>
        </div>
      </div>

      <!-- 右侧详情 -->
      <div class="pm-detail">
        <!-- 空状态 -->
        <div v-if="!selected.type" class="pm-empty">
          <div style="font-size: 48px; margin-bottom: 12px;">👈</div>
          <div>从左侧选择项目、计划或关卡</div>
        </div>

        <!-- 项目详情 -->
        <div v-else-if="selected.type === 'project'" class="pm-detail-content">
          <div class="pm-breadcrumb">{{ selected.data.name }}</div>
          <div class="pm-detail-header">
            <h3>📁 {{ selected.data.name }}</h3>
            <div class="pm-actions">
              <button class="pm-btn-sm" @click="editProject(selected.data)">✏️ 编辑</button>
              <button class="pm-btn-sm" @click="createPlan">+ 新建计划</button>
              <button class="pm-btn-sm danger" @click="deleteProject(selected.data)">🗑</button>
            </div>
          </div>
          <div class="pm-desc">{{ selected.data.description || '暂无描述' }}</div>
          <div class="pm-stats-bar">
            <div class="pm-stat">计划：<strong>{{ getProjectPlans(selected.id).length }}</strong></div>
            <div class="pm-stat">关卡：<strong>{{ getProjectStageCount(selected.id) }}</strong></div>
          </div>
          <h4 style="margin: 16px 0 8px;">📋 培训计划</h4>
          <div class="pm-cards">
            <div v-for="plan in getProjectPlans(selected.id)" :key="plan.id" class="pm-card" @click="selectPlan(plan, selected.data)">
              <div class="pm-card-title">📋 {{ plan.name }}</div>
              <div class="pm-card-meta">{{ getPlanStages(plan.id).length }} 关卡 · 通过线 {{ plan.pass_score ?? 80 }}分</div>
            </div>
            <div v-if="getProjectPlans(selected.id).length === 0" class="pm-empty-inline">暂无计划</div>
          </div>
        </div>

        <!-- 计划详情 -->
        <div v-else-if="selected.type === 'plan'" class="pm-detail-content">
          <div class="pm-breadcrumb">
            <span class="pm-crumb-link" @click="selectProject(selected.project)">{{ selected.project.name }}</span> › {{ selected.data.name }}
          </div>
          <div class="pm-detail-header">
            <h3>📋 {{ selected.data.name }}</h3>
            <div class="pm-actions">
              <button class="pm-btn-sm" @click="editPlan(selected.data)">✏️ 编辑</button>
              <button class="pm-btn-sm" @click="createStage">+ 新建关卡</button>
              <button class="pm-btn-sm danger" @click="deletePlan(selected.data)">🗑</button>
            </div>
          </div>
          <div class="pm-desc">{{ selected.data.description || '暂无描述' }}</div>
          <div class="pm-stats-bar">
            <div class="pm-stat">关卡：<strong>{{ getPlanStages(selected.id).length }}</strong></div>
            <div class="pm-stat">通过线：<strong>{{ selected.data.pass_score ?? 80 }}分</strong></div>
            <div class="pm-stat">测验次数：<strong>{{ selected.data.max_attempts ?? 2 }}次</strong></div>
          </div>
          <h4 style="margin: 16px 0 8px;">🏁 关卡列表 <span style="font-size: 11px; font-weight: 400; color: var(--pixel-muted);">拖拽排序</span></h4>
          <div class="pm-stage-list">
            <draggable v-model="planStagesList" item-key="id" handle=".pm-drag-handle" ghost-class="pm-drag-ghost" @end="onStageReorder">
              <template #item="{ element: stage, index: idx }">
                <div class="pm-stage-item" @click="selectStage(stage, selected.data, selected.project)">
                  <span class="pm-drag-handle" @click.stop>⠿</span>
                  <span class="pm-stage-order">{{ idx + 1 }}</span>
                  <span>{{ stage.icon || '🏁' }}</span>
                  <span class="pm-stage-name">{{ stage.title }}</span>
                  <span class="pm-stage-status" :class="stage.status">{{ statusLabel(stage.status) }}</span>
                </div>
              </template>
            </draggable>
            <div v-if="getPlanStages(selected.id).length === 0" class="pm-empty-inline">暂无关卡，点击上方按钮创建</div>
          </div>
        </div>

        <!-- 关卡详情 - Tabs 面板 -->
        <div v-else-if="selected.type === 'stage'" class="pm-detail-content">
          <div class="pm-breadcrumb">
            <span class="pm-crumb-link" @click="selectProject(selected.project)">{{ selected.project.name }}</span> ›
            <span class="pm-crumb-link" @click="selectPlan(selected.plan, selected.project)">{{ selected.plan.name }}</span> ›
            {{ selected.data.title }}
          </div>
          <div class="pm-detail-header">
            <h3>{{ selected.data.icon || '🏁' }} {{ selected.data.title }}
              <span class="pm-status-tag" :class="selected.data.status">{{ statusLabel(selected.data.status) }}</span>
            </h3>
            <div class="pm-actions">
              <button class="pm-btn-sm" @click="editStage(selected.data)">✏️ 编辑信息</button>
              <button class="pm-btn-sm danger" @click="deleteStage(selected.data)">🗑</button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="pm-tabs">
            <div class="pm-tab" :class="{ active: stageTab === 'overview' }" @click="stageTab = 'overview'">📋 概览</div>
            <div class="pm-tab" :class="{ active: stageTab === 'units' }" @click="stageTab = 'units'">📚 学习单元 <span class="pm-tab-count">{{ units.length }}</span></div>
            <div v-if="hasQuizUnits" class="pm-tab" :class="{ active: stageTab === 'quiz' }" @click="stageTab = 'quiz'">📝 练习/测验 <span class="pm-tab-count">{{ quizUnits.length }}</span></div>
            <div class="pm-tab" :class="{ active: stageTab === 'mentors' }" @click="stageTab = 'mentors'">👨‍🏫 导师 <span class="pm-tab-count">{{ mentors.length }}</span></div>
          </div>

          <div class="pm-tab-content">
            <!-- 概览 Tab -->
            <div v-if="stageTab === 'overview'" class="pm-tab-panel">
              <div v-if="unitsLoading" style="color: var(--pixel-muted); font-size: 13px;">加载中...</div>
              <template v-else>
                <div class="pm-info-grid">
                  <span class="pm-info-label">关卡标题</span><span>{{ selected.data.title }}</span>
                  <span class="pm-info-label">描述</span><span>{{ selected.data.description || '暂无' }}</span>
                  <span class="pm-info-label">图标</span><span>{{ selected.data.icon || '🏁' }}</span>
                  <span class="pm-info-label">状态</span><span><span class="pm-status-tag" :class="selected.data.status">{{ statusLabel(selected.data.status) }}</span></span>
                  <span class="pm-info-label">排序</span><span>{{ selected.data.sort_order }}</span>
                  <span class="pm-info-label">单元数</span><span>{{ units.length }} 个{{ unitTypeSummary }}</span>
                  <span class="pm-info-label">导师</span><span>{{ mentors.length > 0 ? mentors.map(m => m.training_users?.name || '未知').join('、') : '未分配' }}</span>
                </div>
                <div v-if="!hasQuizUnits" class="pm-hint-box" style="margin-top: 14px;">
                  💡 本关卡暂无练习/测验单元。在「学习单元」Tab 中添加练习或测验类型的单元后，将自动出现「练习/测验」配置 Tab
                </div>
              </template>
            </div>

            <!-- 学习单元 Tab -->
            <div v-if="stageTab === 'units'" class="pm-tab-panel">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="font-size: 12px; color: var(--pixel-muted);">⠿ 拖拽调整顺序 · 共 {{ units.length }} 个单元</span>
                <button class="pm-btn-sm pm-btn-primary" style="background:#4a90d9;color:#fff;border-color:#3a7bc8" @click="createUnit">+ 添加单元</button>
              </div>
              <div v-if="unitsLoading" style="color: var(--pixel-muted); font-size: 13px; padding: 20px;">加载中...</div>
              <div v-else-if="units.length === 0" class="pm-empty-inline">暂无学习单元，点击上方按钮添加</div>
              <template v-else>
                <draggable v-model="units" item-key="id" handle=".pm-unit-drag" ghost-class="pm-drag-ghost" @end="onUnitReorder">
                  <template #item="{ element: unit }">
                    <div class="pm-unit-row">
                      <span class="pm-unit-drag" @click.stop>⠿</span>
                      <span class="pm-unit-tag" :class="unit.unit_type">{{ unitLabel(unit.unit_type) }}</span>
                      <span class="pm-unit-name-text">{{ unit.title }}</span>
                      <span v-if="unit.is_required" class="pm-unit-req">必学</span>
                      <span v-else class="pm-unit-opt">选学</span>
                      <div class="pm-unit-actions">
                        <button class="pm-btn-xs" @click="$router.push(`/admin/units/${unit.id}/content`)" :title="contentBtnLabel(unit.unit_type)">📝 {{ contentBtnLabel(unit.unit_type) }}</button>
                        <button class="pm-btn-xs" @click="editUnit(unit)">⚙️</button>
                        <button class="pm-btn-xs pm-btn-danger" @click="deleteUnit(unit)">🗑</button>
                      </div>
                    </div>
                  </template>
                </draggable>
              </template>
            </div>

            <!-- 练习/测验 Tab -->
            <div v-if="stageTab === 'quiz' && hasQuizUnits" class="pm-tab-panel">
              <div v-for="qu in quizUnits" :key="qu.id" class="pm-quiz-config">
                <div class="pm-quiz-hdr">
                  <span>{{ qu.unit_type === 'practice' ? '📝 练习配置' : '🎯 测验配置' }} · {{ qu.title }}</span>
                  <button class="pm-btn-xs" @click="$router.push(`/admin/units/${qu.id}/content`)">📝 编辑配置</button>
                </div>
                <div class="pm-quiz-body">
                  <div class="pm-quiz-info">
                    抽题：单选 {{ qu.content?.single_count || 0 }} · 多选 {{ qu.content?.multiple_count || 0 }} · 判断 {{ qu.content?.judge_count || 0 }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 导师 Tab -->
            <div v-if="stageTab === 'mentors'" class="pm-tab-panel">
              <div style="margin-bottom: 12px;">
                <button class="pm-btn-sm pm-btn-primary" style="background:#4a90d9;color:#fff;border-color:#3a7bc8" @click="addMentor">+ 添加导师</button>
              </div>
              <div v-if="mentors.length === 0" class="pm-empty-inline">暂未分配导师</div>
              <div v-for="m in mentors" :key="m.id" class="pm-mentor-card">
                <div class="pm-mentor-avatar">👤</div>
                <div class="pm-mentor-info">
                  <div class="pm-mentor-name">{{ m.training_users?.name || '未知' }}</div>
                  <div class="pm-mentor-role">导师</div>
                </div>
                <button class="pm-btn-xs pm-btn-danger" @click="removeMentor(m)">移除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 通用编辑弹窗 -->
    <div v-if="modal.show" class="pm-modal-overlay" @click.self="modal.show = false">
      <div class="pm-modal">
        <h3>{{ modal.title }}</h3>
        <div v-for="field in modal.fields" :key="field.key" class="pm-form-row">
          <label>{{ field.label }}</label>
          <input v-if="field.type === 'text'" v-model="modal.form[field.key]" :placeholder="field.placeholder">
          <textarea v-else-if="field.type === 'textarea'" v-model="modal.form[field.key]" :placeholder="field.placeholder" rows="3"></textarea>
          <select v-else-if="field.type === 'select'" v-model="modal.form[field.key]">
            <option v-for="opt in field.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
          <input v-else-if="field.type === 'number'" type="number" v-model.number="modal.form[field.key]" :min="field.min" :max="field.max">
        </div>
        <div class="pm-modal-actions">
          <button class="pm-btn-outline" @click="modal.show = false" :disabled="modal.saving">取消</button>
          <button class="pm-btn" @click="doSave" :disabled="modal.saving">{{ modal.saving ? '保存中...' : (modal.saveText || '确认') }}</button>
        </div>
      </div>
    </div>

    <!-- 像素风确认弹窗 -->
    <div v-if="confirmDialog.show" class="pm-modal-overlay" @click.self="confirmDialog.show = false">
      <div class="pm-modal" style="max-width: 380px;">
        <div class="pm-modal-header"><span>⚠️ {{ confirmDialog.title }}</span><button @click="confirmDialog.show = false">✕</button></div>
        <div class="pm-modal-body" style="padding: 20px; font-size: 13px; color: #5B3A29; line-height: 1.6;">{{ confirmDialog.msg }}</div>
        <div class="pm-modal-actions">
          <button class="pm-btn-outline" @click="confirmDialog.show = false">取消</button>
          <button class="pm-btn" style="background:#C24A3A;border-color:#A83A2A;" @click="confirmDialog.onConfirm(); confirmDialog.show = false">确认删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import draggable from 'vuedraggable'
import api from '../../api/index.js'
import { useToast } from '../../composables/useToast.js'

const router = useRouter()
const route = useRoute()
const toast = useToast()

async function doSave() {
  if (modal.saving) return
  modal.saving = true
  try { await modal.onSave() } catch (err) { toast.error('操作失败', err.message || '请重试') } finally { modal.saving = false }
}

function pixelConfirm(title, msg) {
  return new Promise(resolve => {
    confirmDialog.title = title
    confirmDialog.msg = msg
    confirmDialog.onConfirm = () => resolve(true)
    confirmDialog.show = true
  })
}

const treeLoading = ref(true)
const projects = ref([])
const plans = ref([])
const stages = ref([])
const units = ref([])
const unitsLoading = ref(false)

const stageTab = ref('overview')
const mentors = ref([])
const userOptions = ref([])

const hasQuizUnits = computed(() => units.value.some(u => u.unit_type === 'practice' || u.unit_type === 'quiz'))
const quizUnits = computed(() => units.value.filter(u => u.unit_type === 'practice' || u.unit_type === 'quiz'))
const unitTypeSummary = computed(() => {
  if (units.value.length === 0) return ''
  const counts = {}
  units.value.forEach(u => { counts[u.unit_type] = (counts[u.unit_type] || 0) + 1 })
  return '（' + Object.entries(counts).map(([t, c]) => `${unitLabel(t)} ${c}`).join(' · ') + '）'
})

function contentBtnLabel(type) { return { article: '内容', video: '内容', practice: '配置', quiz: '配置', practical: '内容' }[type] || '内容' }

const expandedProjects = ref([])
const expandedPlans = ref([])

const selected = reactive({ type: '', id: '', data: null, project: null, plan: null })

const modal = reactive({ show: false, title: '', fields: [], form: {}, onSave: () => {}, saveText: '确认', saving: false })
const confirmDialog = reactive({ show: false, title: '', msg: '', onConfirm: () => {} })

function getProjectPlans(projectId) {
  return plans.value.filter(p => p.project_id === projectId)
}
function getPlanStages(planId) {
  return stages.value.filter(s => s.plan_id === planId).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
}
function getProjectStageCount(projectId) {
  const planIds = getProjectPlans(projectId).map(p => p.id)
  return stages.value.filter(s => planIds.includes(s.plan_id)).length
}

function toggleProject(id) {
  const idx = expandedProjects.value.indexOf(id)
  if (idx >= 0) expandedProjects.value.splice(idx, 1)
  else expandedProjects.value.push(id)
}
function togglePlan(id) {
  const idx = expandedPlans.value.indexOf(id)
  if (idx >= 0) expandedPlans.value.splice(idx, 1)
  else expandedPlans.value.push(id)
}

function selectProject(proj) {
  selected.type = 'project'; selected.id = proj.id; selected.data = proj; selected.project = proj; selected.plan = null
  if (!expandedProjects.value.includes(proj.id)) expandedProjects.value.push(proj.id)
}
function selectPlan(plan, proj) {
  selected.type = 'plan'; selected.id = plan.id; selected.data = plan; selected.project = proj; selected.plan = plan
  if (!expandedProjects.value.includes(proj.id)) expandedProjects.value.push(proj.id)
  if (!expandedPlans.value.includes(plan.id)) expandedPlans.value.push(plan.id)
}
function selectStage(stage, plan, proj) {
  selected.type = 'stage'; selected.id = stage.id; selected.data = stage; selected.project = proj; selected.plan = plan
  stageTab.value = 'overview'
  loadStageDetail(stage.id)
}

async function loadStageDetail(stageId) {
  unitsLoading.value = true; units.value = []; mentors.value = []
  try {
    const res = await api.get(`/admin/stages/${stageId}`)
    units.value = res.data?.units || []
    mentors.value = res.data?.mentors || []
  } catch {} finally { unitsLoading.value = false }
}

async function loadUnits(stageId) {
  unitsLoading.value = true; units.value = []
  try {
    const res = await api.get(`/admin/stages/${stageId}/units`)
    units.value = res.data || []
  } catch {} finally { unitsLoading.value = false }
}

function statusLabel(s) { return { draft: '草稿', published: '已发布', active: '启用', archived: '已归档' }[s] || s }

// 计划关卡列表（可写，供 draggable v-model 使用）
const planStagesList = computed({
  get: () => selected.type === 'plan' ? getPlanStages(selected.id) : [],
  set: (val) => {
    // 更新 stages 数组中该 plan 的排序
    val.forEach((s, i) => {
      const found = stages.value.find(st => st.id === s.id)
      if (found) found.sort_order = i + 1
    })
  }
})

async function onStageReorder() {
  const list = getPlanStages(selected.id)
  try {
    await Promise.all(list.map((s, i) =>
      api.put(`/admin/stages/${s.id}`, { sort_order: i + 1 })
    ))
  } catch { toast.error('排序失败', '保存排序时出错，请重试') }
}
function unitIcon(t) { return { article: '📖', video: '🎬', practice: '📝', quiz: '🎯', practical: '🔧' }[t] || '📌' }
function unitLabel(t) { return { article: '文章', video: '视频', practice: '练习', quiz: '测验', practical: '实战' }[t] || t }

// 单元 CRUD
function createUnit() {
  modal.title = '添加学习单元'; modal.saveText = '添加'
  modal.fields = [
    { key: 'title', label: '标题', type: 'text', placeholder: '单元标题' },
    { key: 'unit_type', label: '类型', type: 'select', options: [
      { label: '文章', value: 'article' }, { label: '视频', value: 'video' },
      { label: '练习', value: 'practice' }, { label: '测验', value: 'quiz' },
      { label: '实战演练', value: 'practical' }
    ]},
    { key: 'is_required', label: '必学', type: 'select', options: [{ label: '是', value: true }, { label: '否', value: false }] }
  ]
  modal.form = { title: '', unit_type: 'article', is_required: true }
  modal.onSave = async () => {
    if (!modal.form.title?.trim()) return toast.warning('请输入标题')
    await api.post(`/admin/stages/${selected.id}/units`, modal.form)
    modal.show = false; await loadStageDetail(selected.id)
    toast.success('创建成功', `单元「${modal.form.title}」已添加`)
  }
  modal.show = true
}

function editUnit(unit) {
  modal.title = '编辑单元'; modal.saveText = '保存'
  modal.fields = [
    { key: 'title', label: '标题', type: 'text' },
    { key: 'unit_type', label: '类型', type: 'select', options: [
      { label: '文章', value: 'article' }, { label: '视频', value: 'video' },
      { label: '练习', value: 'practice' }, { label: '测验', value: 'quiz' },
      { label: '实战演练', value: 'practical' }
    ]},
    { key: 'is_required', label: '必学', type: 'select', options: [{ label: '是', value: true }, { label: '否', value: false }] }
  ]
  modal.form = { title: unit.title, unit_type: unit.unit_type, is_required: unit.is_required }
  modal.onSave = async () => {
    await api.put(`/admin/units/${unit.id}`, modal.form)
    modal.show = false; await loadStageDetail(selected.id)
    toast.success('保存成功', `单元「${modal.form.title}」已更新`)
  }
  modal.show = true
}

async function deleteUnit(unit) {
  if (!await pixelConfirm('删除单元', `确定删除单元「${unit.title}」吗？此操作不可恢复。`)) return
  await api.delete(`/admin/units/${unit.id}`)
  await loadStageDetail(selected.id)
  toast.success('删除成功', `单元「${unit.title}」已删除`)
}

async function onUnitReorder() {
  const orders = units.value.map((u, i) => ({ id: u.id, sort_order: i }))
  try { await api.put(`/admin/stages/${selected.id}/units/order`, orders) } catch { toast.error('排序失败', '请重试') }
}

// 导师管理
async function addMentor() {
  if (userOptions.value.length === 0) {
    try {
      const res = await api.get('/admin/mentors/list')
      userOptions.value = (res.data || []).map(u => ({ label: u.name, value: u.id }))
    } catch {}
  }
  modal.title = '添加导师'; modal.saveText = '确认'
  modal.fields = [
    { key: 'user_id', label: '选择用户', type: 'select', options: userOptions.value }
  ]
  modal.form = { user_id: '' }
  modal.onSave = async () => {
    if (!modal.form.user_id) return toast.warning('请选择用户')
    await api.post(`/admin/stages/${selected.id}/mentors`, { user_id: modal.form.user_id, role: 'mentor' })
    modal.show = false; await loadStageDetail(selected.id)
    toast.success('添加成功', '导师已分配')
  }
  modal.show = true
}

async function removeMentor(m) {
  if (!await pixelConfirm('移除导师', `确定移除导师「${m.training_users?.name || ''}」吗？`)) return
  await api.delete(`/admin/mentors/${m.id}`)
  await loadStageDetail(selected.id)
  toast.success('移除成功', '导师已移除')
}

// === CRUD 操作 ===
function createProject() {
  modal.title = '新建项目'; modal.saveText = '创建'
  modal.fields = [
    { key: 'name', label: '项目名称', type: 'text', placeholder: '如：数据分析入门' },
    { key: 'description', label: '描述', type: 'textarea', placeholder: '项目简介' },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }] }
  ]
  modal.form = { name: '', description: '', status: 'active' }
  modal.onSave = async () => {
    if (!modal.form.name?.trim()) return toast.warning('请输入名称')
    await api.post('/projects', modal.form)
    modal.show = false; await loadAll()
    toast.success('创建成功', `项目「${modal.form.name}」已创建`)
  }
  modal.show = true
}

function editProject(proj) {
  modal.title = '编辑项目'; modal.saveText = '保存'
  modal.fields = [
    { key: 'name', label: '项目名称', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }] }
  ]
  modal.form = { name: proj.name, description: proj.description || '', status: proj.status }
  modal.onSave = async () => {
    await api.put(`/projects/${proj.id}`, modal.form)
    modal.show = false; await loadAll()
    if (selected.id === proj.id) selected.data = { ...proj, ...modal.form }
    toast.success('保存成功', `项目「${modal.form.name}」已更新`)
  }
  modal.show = true
}

async function deleteProject(proj) {
  if (!await pixelConfirm('删除项目', `确定删除项目「${proj.name}」及其所有计划和关卡吗？此操作不可恢复。`)) return
  await api.delete(`/projects/${proj.id}`)
  selected.type = ''; await loadAll()
  toast.success('删除成功', `项目「${proj.name}」已删除`)
}

function createPlan() {
  const projId = selected.id
  modal.title = '新建计划'; modal.saveText = '创建'
  modal.fields = [
    { key: 'name', label: '计划名称', type: 'text', placeholder: '如：2026春季班' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'pass_score', label: '通过分数', type: 'number', min: 0, max: 100 },
    { key: 'max_attempts', label: '测验次数', type: 'number', min: 1, max: 99 },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }] }
  ]
  modal.form = { name: '', description: '', status: 'active', pass_score: 80, max_attempts: 2 }
  modal.onSave = async () => {
    if (!modal.form.name?.trim()) return toast.warning('请输入名称')
    await api.post(`/projects/${projId}/plans`, modal.form)
    modal.show = false; await loadAll()
    toast.success('创建成功', `计划「${modal.form.name}」已创建`)
  }
  modal.show = true
}

function editPlan(plan) {
  modal.title = '编辑计划'; modal.saveText = '保存'
  modal.fields = [
    { key: 'name', label: '计划名称', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'pass_score', label: '通过分数', type: 'number', min: 0, max: 100 },
    { key: 'max_attempts', label: '测验次数', type: 'number', min: 1, max: 99 },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }] }
  ]
  modal.form = { name: plan.name, description: plan.description || '', status: plan.status, pass_score: plan.pass_score ?? 80, max_attempts: plan.max_attempts ?? 2 }
  modal.onSave = async () => {
    await api.put(`/projects/${selected.project.id}/plans/${plan.id}`, modal.form)
    modal.show = false; await loadAll()
    if (selected.id === plan.id) selected.data = { ...plan, ...modal.form }
    toast.success('保存成功', `计划「${modal.form.name}」已更新`)
  }
  modal.show = true
}

async function deletePlan(plan) {
  if (!await pixelConfirm('删除计划', `确定删除计划「${plan.name}」及其所有关卡吗？此操作不可恢复。`)) return
  await api.delete(`/projects/${selected.project.id}/plans/${plan.id}`)
  selectProject(selected.project); await loadAll()
  toast.success('删除成功', `计划「${plan.name}」已删除`)
}

function createStage() {
  const planId = selected.id
  const projId = selected.project.id
  modal.title = '新建关卡'; modal.saveText = '创建'
  modal.fields = [
    { key: 'title', label: '关卡标题', type: 'text', placeholder: '如：第一关：Excel 基础' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'icon', label: '图标', type: 'text', placeholder: 'emoji，如 🎯' },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }, { label: '已归档', value: 'archived' }] }
  ]
  modal.form = { title: '', description: '', icon: '', status: 'draft' }
  modal.onSave = async () => {
    if (!modal.form.title?.trim()) return toast.warning('请输入标题')
    await api.post(`/admin/stages`, { ...modal.form, plan_id: planId })
    modal.show = false; await loadAll()
    toast.success('创建成功', `关卡「${modal.form.title}」已创建`)
  }
  modal.show = true
}

function editStage(stage) {
  modal.title = '编辑关卡'; modal.saveText = '保存'
  modal.fields = [
    { key: 'title', label: '关卡标题', type: 'text' },
    { key: 'description', label: '描述', type: 'textarea' },
    { key: 'icon', label: '图标', type: 'text' },
    { key: 'status', label: '状态', type: 'select', options: [{ label: '草稿', value: 'draft' }, { label: '已发布', value: 'published' }, { label: '已归档', value: 'archived' }] }
  ]
  modal.form = { title: stage.title, description: stage.description || '', icon: stage.icon || '', status: stage.status }
  modal.onSave = async () => {
    await api.put(`/admin/stages/${stage.id}`, modal.form)
    modal.show = false; await loadAll()
    if (selected.id === stage.id) selected.data = { ...stage, ...modal.form }
    toast.success('保存成功', `关卡「${modal.form.title}」已更新`)
  }
  modal.show = true
}

async function deleteStage(stage) {
  if (!await pixelConfirm('删除关卡', `确定删除关卡「${stage.title}」吗？此操作不可恢复。`)) return
  await api.delete(`/admin/stages/${stage.id}`)
  selectPlan(selected.plan, selected.project); await loadAll()
  toast.success('删除成功', `关卡「${stage.title}」已删除`)
}

// === 数据加载 ===
async function loadAll() {
  try {
    const [projRes, planRes, stageRes] = await Promise.all([
      api.get('/admin/projects'),
      api.get('/admin/plans'),
      api.get('/admin/stages')
    ])
    projects.value = projRes.data || []
    plans.value = planRes.data || []
    stages.value = stageRes.data || []
  } catch (err) { toast.error('加载失败', err.message || '请检查网络') } finally { treeLoading.value = false }
}

onMounted(async () => {
  await loadAll()
  // 从 query 参数恢复选中状态
  const q = route.query
  if (q.stage) {
    const stage = stages.value.find(s => s.id === q.stage)
    if (stage) {
      const plan = plans.value.find(p => p.id === stage.plan_id)
      const proj = plan ? projects.value.find(p => p.id === plan.project_id) : null
      if (proj && plan) {
        if (!expandedProjects.value.includes(proj.id)) expandedProjects.value.push(proj.id)
        if (!expandedPlans.value.includes(plan.id)) expandedPlans.value.push(plan.id)
        selectStage(stage, plan, proj)
        return
      }
    }
  }
  if (q.plan) {
    const plan = plans.value.find(p => p.id === q.plan)
    const proj = plan ? projects.value.find(p => p.id === plan.project_id) : null
    if (proj && plan) {
      if (!expandedProjects.value.includes(proj.id)) expandedProjects.value.push(proj.id)
      selectPlan(plan, proj)
      return
    }
  }
  if (q.project) {
    const proj = projects.value.find(p => p.id === q.project)
    if (proj) { selectProject(proj); return }
  }
  // 默认展开第一个项目
  if (projects.value.length > 0) {
    expandedProjects.value.push(projects.value[0].id)
  }
})
</script>

<style scoped>
.pm-page { height: calc(100vh - 72px); display: flex; flex-direction: column; margin: -24px -28px; }
.pm-layout { flex: 1; display: flex; overflow: hidden; }

/* 左侧树 */
.pm-tree { width: 270px; background: #faf5ea; border-right: 2px solid var(--pixel-border, #8b6914); display: flex; flex-direction: column; flex-shrink: 0; }
.pm-tree-header { padding: 12px 14px; font-weight: 600; font-size: 13px; border-bottom: 2px solid var(--pixel-border); background: #f0e6d2; display: flex; align-items: center; justify-content: space-between; }
.pm-tree-body { flex: 1; overflow-y: auto; }

.pm-tree-project { padding: 10px 14px; font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #e8dcc8; cursor: pointer; }
.pm-tree-project:hover { background: #f0e6d2; }
.pm-tree-project.active { background: #e0d5c0; border-left: 3px solid var(--pixel-link, #4a90d9); }

.pm-tree-plan { padding: 8px 14px 8px 28px; font-size: 13px; display: flex; align-items: center; gap: 6px; border-bottom: 1px solid #f0e6d2; cursor: pointer; }
.pm-tree-plan:hover { background: #f5edd8; }
.pm-tree-plan.active { background: #e8dcc8; color: var(--pixel-link); font-weight: 600; }

.pm-tree-stage { padding: 6px 14px 6px 46px; font-size: 12px; color: var(--pixel-muted, #9e8a76); border-bottom: 1px solid #f8f2e8; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.pm-tree-stage:hover { background: #faf5ea; color: var(--pixel-text); }
.pm-tree-stage.active { background: #e0edf8; color: var(--pixel-link); font-weight: 600; }

.pm-tree-badge { font-size: 10px; padding: 1px 5px; border-radius: 8px; background: #e8dcc8; color: var(--pixel-muted); margin-left: auto; }

/* 右侧详情 */
.pm-detail { flex: 1; overflow-y: auto; padding: 20px 24px; }
.pm-detail-content { }
.pm-empty { text-align: center; padding: 80px 20px; color: var(--pixel-muted); }
.pm-empty-inline { padding: 16px; text-align: center; color: var(--pixel-muted); font-size: 13px; }

.pm-breadcrumb { font-size: 12px; color: var(--pixel-muted); margin-bottom: 12px; }
.pm-crumb-link { color: var(--pixel-link); cursor: pointer; }
.pm-crumb-link:hover { text-decoration: underline; }

.pm-detail-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.pm-detail-header h3 { font-size: 16px; margin: 0; }
.pm-actions { display: flex; gap: 6px; }
.pm-desc { font-size: 13px; color: var(--pixel-muted); margin-bottom: 12px; }

.pm-stats-bar { display: flex; gap: 16px; padding: 10px 14px; background: #faf5ea; border: 1px solid #e8dcc8; border-radius: 6px; font-size: 12px; }
.pm-stat strong { color: var(--pixel-link); }

/* 卡片 */
.pm-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 10px; }
.pm-card { background: var(--pixel-card, #fffbf0); border: 2px solid #d4c5a0; border-radius: 8px; padding: 14px; cursor: pointer; transition: all 0.15s; }
.pm-card:hover { border-color: var(--pixel-link); box-shadow: 0 2px 8px rgba(74,144,217,0.12); }
.pm-card-title { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
.pm-card-meta { font-size: 12px; color: var(--pixel-muted); }

/* 关卡列表 */
.pm-stage-list { }
.pm-stage-item { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: var(--pixel-card, #fffbf0); border: 1px solid #e8dcc8; border-radius: 6px; margin-bottom: 6px; font-size: 13px; cursor: pointer; }
.pm-stage-item:hover { border-color: var(--pixel-link); }
.pm-drag-handle { cursor: grab; color: #ccc; font-size: 14px; padding: 0 4px; }
.pm-drag-handle:hover { color: #999; }
.pm-drag-ghost { opacity: 0.4; background: #e0edf8; }
.pm-stage-order { width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; background: #f0e6d2; border-radius: 50%; font-size: 11px; font-weight: 600; color: var(--pixel-muted); }
.pm-stage-name { flex: 1; }
.pm-stage-status { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.pm-stage-status.draft { background: #f5f5f5; color: #999; }
.pm-stage-status.published { background: #e8f5e9; color: #2e7d32; }
.pm-stage-status.active { background: #e8f5e9; color: #2e7d32; }
.pm-stage-status.archived { background: #fff3e0; color: #e65100; }

/* Tabs */
.pm-tabs { display: flex; background: #f0e6d2; border-bottom: 2px solid var(--pixel-border, #8b6914); margin-top: 12px; padding: 0 4px; }
.pm-tab { padding: 9px 14px; font-size: 12px; cursor: pointer; font-weight: 500; border-bottom: 3px solid transparent; color: var(--pixel-muted, #9e8a76); border-radius: 6px 6px 0 0; transition: all 0.15s; }
.pm-tab:hover { color: #4a3728; background: rgba(255,255,255,0.3); }
.pm-tab.active { color: var(--pixel-link, #4a90d9); border-bottom-color: var(--pixel-link, #4a90d9); font-weight: 600; background: var(--pixel-card, #fffbf0); }
.pm-tab-count { font-size: 10px; background: #e8dcc8; padding: 1px 5px; border-radius: 8px; margin-left: 3px; }
.pm-tab.active .pm-tab-count { background: #d0e3f5; color: var(--pixel-link); }
.pm-tab-content { }
.pm-tab-panel { padding: 16px 0; }

/* 概览信息网格 */
.pm-info-grid { display: grid; grid-template-columns: 70px 1fr; gap: 7px 12px; font-size: 13px; padding: 14px; background: var(--pixel-card, #fffbf0); border: 1px solid #e8dcc8; border-radius: 8px; }
.pm-info-label { color: var(--pixel-muted, #9e8a76); text-align: right; font-weight: 600; font-size: 12px; }
.pm-hint-box { padding: 10px 14px; background: #faf5ea; border: 1px dashed #d4c5a0; border-radius: 6px; font-size: 12px; color: var(--pixel-muted); }
.pm-status-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.pm-status-tag.draft { background: #f5f5f5; color: #999; }
.pm-status-tag.published { background: #e8f5e9; color: #2e7d32; }
.pm-status-tag.active { background: #e8f5e9; color: #2e7d32; }
.pm-status-tag.archived { background: #fff3e0; color: #e65100; }

/* 单元行（Tabs 内） */
.pm-unit-row { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border: 1px solid #e8dcc8; border-radius: 6px; margin-bottom: 6px; background: var(--pixel-card, #fffbf0); font-size: 13px; transition: all 0.15s; }
.pm-unit-row:hover { border-color: var(--pixel-link, #4a90d9); box-shadow: 0 1px 4px rgba(74,144,217,0.1); }
.pm-unit-drag { cursor: grab; color: #ccc; font-size: 14px; }
.pm-unit-drag:hover { color: #999; }
.pm-unit-tag { font-size: 10px; padding: 2px 6px; border-radius: 3px; white-space: nowrap; }
.pm-unit-tag.article { background: #e3f2fd; color: #1976d2; }
.pm-unit-tag.video { background: #e8f5e9; color: #2e7d32; }
.pm-unit-tag.practice { background: #f5f5f5; color: #666; }
.pm-unit-tag.quiz { background: #fff3e0; color: #e65100; }
.pm-unit-tag.practical { background: #fce4ec; color: #c62828; }
.pm-unit-name-text { flex: 1; font-weight: 500; }
.pm-unit-req { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #e8f5e9; color: #2e7d32; }
.pm-unit-opt { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #f5f5f5; color: #999; }
.pm-unit-actions { display: flex; gap: 4px; }
.pm-btn-xs { padding: 3px 8px; border: 1px solid #d4c5a0; background: #fff; border-radius: 3px; cursor: pointer; font-size: 10px; }
.pm-btn-xs:hover { background: #faf5ea; border-color: var(--pixel-border); }
.pm-btn-danger { color: #c0392b; border-color: #e8b4b4; }
.pm-btn-danger:hover { background: #fff5f3; }

/* 练习/测验配置 */
.pm-quiz-config { border: 2px solid #e8dcc8; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.pm-quiz-hdr { padding: 10px 14px; background: #f0e6d2; font-weight: 600; font-size: 12px; display: flex; align-items: center; justify-content: space-between; }
.pm-quiz-body { padding: 12px 14px; background: var(--pixel-card, #fffbf0); }
.pm-quiz-info { font-size: 12px; color: var(--pixel-muted); }

/* 导师 */
.pm-mentor-card { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: 1px solid #e8dcc8; border-radius: 6px; margin-bottom: 6px; background: var(--pixel-card, #fffbf0); }
.pm-mentor-avatar { width: 36px; height: 36px; background: #f0e6d2; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.pm-mentor-info { flex: 1; }
.pm-mentor-name { font-size: 13px; font-weight: 600; }
.pm-mentor-role { font-size: 11px; color: var(--pixel-muted); }

/* 按钮 */
.pm-btn { padding: 7px 14px; background: var(--pixel-link, #4a90d9); color: #fff; border: 2px solid #3a7bc8; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: 600; }
.pm-btn-outline { padding: 7px 14px; background: #fff; border: 2px solid #d4c5a0; border-radius: 6px; cursor: pointer; font-size: 12px; }
.pm-btn-sm { padding: 4px 10px; border: 1px solid #d4c5a0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 11px; font-weight: 500; color: #5B3A29; }
.pm-btn-sm:hover { border-color: var(--pixel-border); background: #faf5ea; }
.pm-btn-sm.pm-btn-primary { background: var(--pixel-link, #4a90d9); color: #fff; border-color: #3a7bc8; }
.pm-btn-sm.pm-btn-primary:hover { background: #3a7bc8; }
.pm-btn-sm.danger { color: #c0392b; border-color: #e8b4b4; }
.pm-btn-sm.danger:hover { background: #fff5f3; }

/* 弹窗 */
.pm-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.pm-modal { background: var(--pixel-card, #fffbf0); border: 3px solid var(--pixel-border, #8b6914); border-radius: 12px; padding: 24px; width: 460px; max-width: 90vw; }
.pm-modal h3 { font-size: 16px; margin-bottom: 16px; }
.pm-form-row { margin-bottom: 14px; }
.pm-form-row label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--pixel-muted); }
.pm-form-row input, .pm-form-row textarea, .pm-form-row select { padding: 8px 10px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 13px; width: 100%; font-family: inherit; }
.pm-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
</style>
