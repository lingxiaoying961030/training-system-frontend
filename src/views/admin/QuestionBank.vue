<template>
  <div class="question-bank-page">
    <div class="pixel-page-header">
      <h2><span>📝</span> 题库管理</h2>
      <button v-if="!readonly" class="pixel-btn" @click="showUploadModal = true">📤 上传题目</button>
    </div>

    <!-- 统计卡片 -->
    <div class="qb-stats">
      <div class="qb-stat-card">
        <div class="qb-stat-label">总题目数</div>
        <div class="qb-stat-value">{{ questions.length }}</div>
      </div>
      <div class="qb-stat-card">
        <div class="qb-stat-label">单选</div>
        <div class="qb-stat-value">{{ typeCounts.single }}</div>
      </div>
      <div class="qb-stat-card">
        <div class="qb-stat-label">多选</div>
        <div class="qb-stat-value">{{ typeCounts.multiple }}</div>
      </div>
      <div class="qb-stat-card">
        <div class="qb-stat-label">判断</div>
        <div class="qb-stat-value">{{ typeCounts.judge }}</div>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="qb-toolbar">
      <select v-model="filterProjectId" @change="filterPlanId = ''; filterStageId = ''; loadQuestions()">
        <option value="">全部项目</option>
        <option v-for="p in projects" :key="p.id" :value="p.id">📁 {{ p.name }}</option>
      </select>
      <select v-model="filterPlanId" @change="filterStageId = ''" :disabled="!filterProjectId">
        <option value="">全部计划</option>
        <option v-for="p in filteredPlans" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
      <select v-model="filterStageId" :disabled="!filterPlanId">
        <option value="">全部关卡</option>
        <option v-for="s in filteredStages" :key="s.id" :value="s.id">🏁 {{ s.title }}</option>
      </select>
      <select v-model="filterType">
        <option value="">全部类型</option>
        <option value="single">单选</option>
        <option value="multiple">多选</option>
        <option value="judge">判断</option>
      </select>
      <select v-model="filterPool">
        <option value="">全部题池</option>
        <option value="exercise">练习池</option>
        <option value="quiz">测验池</option>
      </select>
      <input v-model="filterKeyword" placeholder="🔍 搜索题目内容..." class="qb-search">
    </div>

    <!-- 加载中 -->
    <!-- 骨架屏 -->
    <div v-if="loading" class="qb-skeleton">
      <div class="qb-skel-filter"><div class="skel" style="width:120px;height:32px"></div><div class="skel" style="width:120px;height:32px"></div><div class="skel" style="width:100px;height:32px"></div><div class="skel" style="flex:1;height:32px"></div></div>
      <div class="qb-skel-table">
        <div class="qb-skel-row header"><div class="skel" style="width:40px"></div><div class="skel" style="flex:2"></div><div class="skel" style="width:60px"></div><div class="skel" style="width:60px"></div><div class="skel" style="width:80px"></div></div>
        <div v-for="i in 5" :key="i" class="qb-skel-row"><div class="skel" style="width:40px;height:14px"></div><div class="skel" style="flex:2;height:14px"></div><div class="skel" style="width:60px;height:14px"></div><div class="skel" style="width:60px;height:14px"></div><div class="skel" style="width:80px;height:14px"></div></div>
      </div>
    </div>
    <!-- 加载失败 -->
    <div v-if="loadError && !loading" class="px-error-state">
      <div style="font-size:48px;margin-bottom:12px">🔌</div>
      <div style="font-size:16px;font-weight:600;color:#5B3A29;margin-bottom:6px">加载失败</div>
      <div style="font-size:13px;color:#8B7355;margin-bottom:16px">{{ loadError }}</div>
      <button class="pixel-btn" @click="loadAll()">🔄 重试</button>
    </div>

    <!-- 按计划→关卡分组 -->
    <template v-else>
      <div v-for="group in groupedQuestions" :key="group.key" class="qb-group">
        <div class="qb-group-header" @click="group.open = !group.open">
          <div class="qb-group-title">
            <span v-if="group.type === 'plan'">📋</span>
            <span v-else>🌐</span>
            {{ group.label }}
            <span class="qb-group-count">{{ group.questions.length }}题</span>
          </div>
          <div class="qb-group-meta">
            <span>单选{{ group.counts.single }}</span>
            <span>多选{{ group.counts.multiple }}</span>
            <span>判断{{ group.counts.judge }}</span>
            <span>{{ group.open ? '▲' : '▼' }}</span>
          </div>
        </div>
        <div v-show="group.open" class="qb-group-body">
          <!-- 关卡子分组 -->
          <template v-if="group.stages && group.stages.length > 0">
            <div v-for="sg in group.stages" :key="sg.key" class="qb-stage-section">
              <div class="qb-stage-header" @click="sg.open = !sg.open">
                <div class="qb-stage-title">🏁 {{ sg.label }} <span class="qb-stage-count">{{ sg.questions.length }}题</span></div>
                <div class="qb-stage-meta">{{ sg.open ? '▲' : '▼' }}</div>
              </div>
              <div v-show="sg.open">
                <div v-for="q in sg.pagedQuestions" :key="q.id">
                  <div class="qb-item">
                    <input type="checkbox" :checked="selectedIds.includes(q.id)" @change="toggleSelect(q.id)">
                    <span class="qb-type" :class="q.question_type">{{ typeLabel(q.question_type) }}</span>
                    <span class="qb-text" @click="togglePreview(q.id)">
                      {{ q.content?.substring(0, 80) }}{{ q.content?.length > 80 ? '...' : '' }}
                    </span>
                    <span class="qb-pool">{{ q.question_pool === 'exercise' ? '练习' : '测验' }}</span>
                    <button class="qb-btn" @click="togglePreview(q.id)" title="预览">👁</button>
                    <button v-if="!readonly" class="qb-btn" @click="editQuestion(q)" title="编辑">✏️</button>
                    <button v-if="!readonly" class="qb-btn" @click="confirmDelete(q)" title="删除">🗑</button>
                  </div>
                  <div v-if="previewId === q.id" class="qb-preview-box">
                    <div class="qb-preview-close" @click="previewId = null">✕ 关闭</div>
                    <div v-html="renderPreview(q)"></div>
                  </div>
                </div>
                <!-- 分页 -->
                <div v-if="sg.questions.length > sg.pageSize" class="qb-pagination">
                  <button class="qb-btn" :disabled="sg.page <= 1" @click="sg.page--">← 上一页</button>
                  <span>{{ sg.page }} / {{ Math.ceil(sg.questions.length / sg.pageSize) }}</span>
                  <button class="qb-btn" :disabled="sg.page >= Math.ceil(sg.questions.length / sg.pageSize)" @click="sg.page++">下一页 →</button>
                </div>
              </div>
            </div>
          </template>
          <!-- 无子分组（通用题） -->
          <template v-else>
            <div class="qb-general-hint" v-if="group.type === 'general'">
              ⚠️ 通用题未指定关卡，该项目下所有关卡的练习和测验都可能抽到
            </div>
            <div v-for="q in group.pagedQuestions" :key="q.id">
              <div class="qb-item">
                <input type="checkbox" :checked="selectedIds.includes(q.id)" @change="toggleSelect(q.id)">
                <span class="qb-type" :class="q.question_type">{{ typeLabel(q.question_type) }}</span>
                <span class="qb-text" @click="togglePreview(q.id)">
                  {{ q.content?.substring(0, 80) }}{{ q.content?.length > 80 ? '...' : '' }}
                </span>
                <span class="qb-pool">{{ q.question_pool === 'exercise' ? '练习' : '测验' }}</span>
                <button class="qb-btn" @click="togglePreview(q.id)" title="预览">👁</button>
                <button v-if="!readonly" class="qb-btn" @click="editQuestion(q)" title="编辑">✏️</button>
                <button v-if="!readonly" class="qb-btn" @click="confirmDelete(q)" title="删除">🗑</button>
              </div>
              <div v-if="previewId === q.id" class="qb-preview-box">
                <div class="qb-preview-close" @click="previewId = null">✕ 关闭</div>
                <div v-html="renderPreview(q)"></div>
              </div>
            </div>
            <div v-if="group.questions.length > group.pageSize" class="qb-pagination">
              <button class="qb-btn" :disabled="group.page <= 1" @click="group.page--">← 上一页</button>
              <span>{{ group.page }} / {{ Math.ceil(group.questions.length / group.pageSize) }}</span>
              <button class="qb-btn" :disabled="group.page >= Math.ceil(group.questions.length / group.pageSize)" @click="group.page++">下一页 →</button>
            </div>
          </template>
        </div>
      </div>

      <div v-if="groupedQuestions.length === 0 && !loading" style="text-align: center; padding: 40px; color: var(--pixel-muted);">暂无题目</div>
    </template>

    <!-- 批量操作 -->
    <div v-if="selectedIds.length > 0 && !readonly" class="qb-batch-bar">
      已选 <strong>{{ selectedIds.length }}</strong> 题
      <button class="pixel-btn-sm" @click="showMoveModal = true">📦 移动到关卡</button>
      <button class="pixel-btn-sm" @click="batchSwitchPool">🔄 切换题池</button>
      <button class="pixel-btn-sm danger" @click="confirmBatchDelete">🗑 删除</button>
    </div>

    <!-- 上传弹窗 -->
    <div v-if="showUploadModal" class="qb-modal-overlay" @click.self="showUploadModal = false">
      <div class="qb-modal">
        <h3>📤 上传题目</h3>
        <div class="qb-form-row">
          <label>所属项目 *</label>
          <select v-model="uploadForm.projectId" @change="uploadForm.planId = ''; uploadForm.stageId = ''">
            <option value="">请选择项目</option>
            <option v-for="p in projects" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
        </div>
        <div class="qb-form-row">
          <label>绑定计划</label>
          <select v-model="uploadForm.planId" @change="uploadForm.stageId = ''" :disabled="!uploadForm.projectId">
            <option value="">不指定（项目通用题）</option>
            <option v-for="p in uploadPlans" :key="p.id" :value="p.id">{{ p.name }}</option>
          </select>
          <div class="qb-form-hint">不指定时，题目作为项目通用题</div>
        </div>
        <div class="qb-form-row">
          <label>绑定关卡</label>
          <select v-model="uploadForm.stageId" :disabled="!uploadForm.planId">
            <option value="">不指定</option>
            <option v-for="s in uploadStages" :key="s.id" :value="s.id">{{ s.title }}</option>
          </select>
        </div>
        <div class="qb-form-row">
          <label>题池类型 *</label>
          <select v-model="uploadForm.pool">
            <option value="exercise">练习池</option>
            <option value="quiz">测验池</option>
          </select>
        </div>
        <div class="qb-form-row">
          <label>选择文件 *</label>
          <input type="file" accept=".xlsx,.xls" @change="uploadForm.file = $event.target.files[0]">
          <div class="qb-form-hint">xlsx 格式，无需填写分类列</div>
        </div>
        <div class="qb-modal-actions">
          <button class="pixel-btn-outline" @click="showUploadModal = false">取消</button>
          <button class="pixel-btn" @click="handleUpload" :disabled="!uploadForm.projectId || !uploadForm.file">📤 确认上传</button>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showEditModal" class="qb-modal-overlay" @click.self="showEditModal = false">
      <div class="qb-modal" style="max-width: 600px;">
        <h3>✏️ 编辑题目</h3>
        <div class="qb-form-row">
          <label>题目ID</label>
          <input v-model="editForm.question_id">
        </div>
        <div class="qb-form-row">
          <label>题目类型</label>
          <select v-model="editForm.question_type">
            <option value="single">单选</option>
            <option value="multiple">多选</option>
            <option value="judge">判断</option>
          </select>
        </div>
        <div class="qb-form-row">
          <label>题目内容（支持 Markdown）</label>
          <textarea v-model="editForm.content" rows="3"></textarea>
        </div>
        <div v-if="editForm.content" class="qb-preview-inline">
          <div class="qb-preview-label">📖 预览</div>
          <div class="qb-preview-content" v-html="renderMd(editForm.content)"></div>
        </div>
        <template v-if="editForm.question_type !== 'judge'">
          <div class="qb-form-row" v-for="o in ['a','b','c','d']" :key="o">
            <label>选项 {{ o.toUpperCase() }}</label>
            <input v-model="editForm['option_' + o]">
          </div>
        </template>
        <div class="qb-form-row">
          <label>正确答案</label>
          <input v-model="editForm.answer">
        </div>
        <div class="qb-form-row">
          <label>解析</label>
          <textarea v-model="editForm.analysis" rows="2"></textarea>
        </div>
        <div class="qb-form-row">
          <label>题池</label>
          <select v-model="editForm.question_pool">
            <option value="exercise">练习</option>
            <option value="quiz">测验</option>
          </select>
        </div>
        <div class="qb-form-row">
          <label>所属关卡</label>
          <select v-model="editForm.stage_id">
            <option value="">未指定</option>
            <option v-for="s in allStages" :key="s.id" :value="s.id">{{ s.planName }} › {{ s.title }}</option>
          </select>
        </div>
        <div class="qb-modal-actions">
          <button class="pixel-btn-outline" @click="showEditModal = false">取消</button>
          <button class="pixel-btn" @click="saveEdit">💾 保存</button>
        </div>
      </div>
    </div>

    <!-- 移动弹窗 -->
    <div v-if="showMoveModal" class="qb-modal-overlay" @click.self="showMoveModal = false">
      <div class="qb-modal" style="max-width: 400px;">
        <h3>📦 移动到关卡</h3>
        <div class="qb-form-row">
          <label>目标关卡</label>
          <select v-model="moveTargetStageId">
            <option value="">项目通用题（不绑定关卡）</option>
            <option v-for="s in allStages" :key="s.id" :value="s.id">{{ s.planName }} › {{ s.title }}</option>
          </select>
        </div>
        <div class="qb-modal-actions">
          <button class="pixel-btn-outline" @click="showMoveModal = false">取消</button>
          <button class="pixel-btn" @click="batchMove">确认移动</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import api from '../../api/index.js'
import { useToast } from '../../composables/useToast.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const readonly = computed(() => !userStore.isAdmin)
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })
function renderMd(text) { return text ? marked.parse(String(text)) : '' }
function renderMdInline(text) { return text ? marked.parseInline(String(text)) : '' }

const toast = useToast()
const loading = ref(false)
const loadError = ref('')
const questions = ref([])
const projects = ref([])
const plans = ref([])
const stages = ref([])

// 筛选
const filterProjectId = ref('')
const filterPlanId = ref('')
const filterStageId = ref('')
const filterType = ref('')
const filterPool = ref('')
const filterKeyword = ref('')

// 选中
const selectedIds = ref([])
const previewId = ref(null)

// 上传
const showUploadModal = ref(false)
const uploadForm = reactive({ projectId: '', planId: '', stageId: '', pool: 'exercise', file: null })

// 编辑
const showEditModal = ref(false)
const editForm = ref({})
const editingId = ref(null)

// 移动
const showMoveModal = ref(false)
const moveTargetStageId = ref('')

const typeLabel = (t) => ({ single: '单选', multiple: '多选', judge: '判断' }[t] || t)

const typeCounts = computed(() => {
  const c = { single: 0, multiple: 0, judge: 0 }
  questions.value.forEach(q => { if (c[q.question_type] !== undefined) c[q.question_type]++ })
  return c
})

const filteredPlans = computed(() => {
  if (!filterProjectId.value) return plans.value
  return plans.value.filter(p => p.project_id === filterProjectId.value)
})

const filteredStages = computed(() => {
  if (!filterPlanId.value) return []
  return stages.value.filter(s => s.plan_id === filterPlanId.value)
})

const uploadPlans = computed(() => {
  if (!uploadForm.projectId) return []
  return plans.value.filter(p => p.project_id === uploadForm.projectId)
})

const uploadStages = computed(() => {
  if (!uploadForm.planId) return []
  return stages.value.filter(s => s.plan_id === uploadForm.planId)
})

// 带 planName 的全部关卡列表（编辑弹窗用）
const allStages = computed(() => {
  return stages.value.map(s => {
    const plan = plans.value.find(p => p.id === s.plan_id)
    return { ...s, planName: plan?.name || '未知计划' }
  })
})

// 过滤后的题目
const filteredQuestions = computed(() => {
  let qs = questions.value
  if (filterProjectId.value) qs = qs.filter(q => q.project_id === filterProjectId.value)
  if (filterStageId.value) {
    qs = qs.filter(q => q.stage_id === filterStageId.value)
  } else if (filterPlanId.value) {
    const planStageIds = stages.value.filter(s => s.plan_id === filterPlanId.value).map(s => s.id)
    qs = qs.filter(q => planStageIds.includes(q.stage_id))
  }
  if (filterType.value) qs = qs.filter(q => q.question_type === filterType.value)
  if (filterPool.value) qs = qs.filter(q => q.question_pool === filterPool.value)
  if (filterKeyword.value) {
    const kw = filterKeyword.value.toLowerCase()
    qs = qs.filter(q => q.content?.toLowerCase().includes(kw) || q.question_id?.toLowerCase().includes(kw))
  }
  return qs
})

// 按计划→关卡分组
const groupedQuestions = computed(() => {
  const qs = filteredQuestions.value
  const groups = []
  const stageMap = {}
  stages.value.forEach(s => { stageMap[s.id] = s })
  const planMap = {}
  plans.value.forEach(p => { planMap[p.id] = p })

  // 按 plan 分组
  const planGroups = {}
  const generalQs = []

  for (const q of qs) {
    if (q.stage_id && stageMap[q.stage_id]) {
      const stage = stageMap[q.stage_id]
      const planId = stage.plan_id
      if (!planGroups[planId]) planGroups[planId] = {}
      if (!planGroups[planId][q.stage_id]) planGroups[planId][q.stage_id] = []
      planGroups[planId][q.stage_id].push(q)
    } else {
      generalQs.push(q)
    }
  }

  // 构建分组
  for (const [planId, stageGroups] of Object.entries(planGroups)) {
    const plan = planMap[planId]
    const allPlanQs = Object.values(stageGroups).flat()
    const stageList = Object.entries(stageGroups).map(([sid, sqs]) => {
      const stage = stageMap[sid]
      return reactive({
        key: sid, label: stage?.title || '未知关卡', questions: sqs,
        open: true, page: 1, pageSize: 15,
        get pagedQuestions() { return this.questions.slice((this.page - 1) * this.pageSize, this.page * this.pageSize) }
      })
    })
    groups.push(reactive({
      key: planId, type: 'plan',
      label: (plan?.name || '未知计划'),
      questions: allPlanQs, stages: stageList, open: true,
      counts: countTypes(allPlanQs)
    }))
  }

  // 通用题
  if (generalQs.length > 0) {
    groups.push(reactive({
      key: 'general', type: 'general',
      label: '项目通用题（未绑定关卡）',
      questions: generalQs, stages: null, open: true,
      page: 1, pageSize: 15,
      counts: countTypes(generalQs),
      get pagedQuestions() { return this.questions.slice((this.page - 1) * this.pageSize, this.page * this.pageSize) }
    }))
  }

  return groups
})

function countTypes(qs) {
  const c = { single: 0, multiple: 0, judge: 0 }
  qs.forEach(q => { if (c[q.question_type] !== undefined) c[q.question_type]++ })
  return c
}

function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

function togglePreview(id) {
  previewId.value = previewId.value === id ? null : id
}

function renderPreview(q) {
  if (!q) return ''
  let html = `<div style="margin-bottom:8px;"><strong>${typeLabel(q.question_type)}</strong> · ${q.question_pool === 'exercise' ? '练习池' : '测验池'}</div>`
  html += `<div style="font-size:14px;line-height:1.7;">${renderMd(q.content)}</div>`
  if (q.question_type !== 'judge') {
    html += '<div style="margin-top:8px;">'
    for (const o of ['a','b','c','d']) {
      if (q['option_' + o]) {
        const isCorrect = q.answer?.toUpperCase().includes(o.toUpperCase())
        html += `<div style="padding:3px 0;${isCorrect ? 'color:#5a9e4b;font-weight:600;' : ''}">
          ${isCorrect ? '✅' : ''} <strong>${o.toUpperCase()}.</strong> ${renderMdInline(q['option_' + o])}</div>`
      }
    }
    html += '</div>'
  } else {
    const isA = q.answer?.toUpperCase() === 'A'
    html += `<div style="margin-top:6px;"><span style="${isA ? 'color:#5a9e4b;font-weight:600;' : ''}">A. 对</span> · <span style="${!isA ? 'color:#5a9e4b;font-weight:600;' : ''}">B. 错</span></div>`
  }
  html += `<div style="margin-top:8px;font-size:12px;color:#5a9e4b;">正确答案：${q.answer || '-'}</div>`
  if (q.analysis) html += `<div style="margin-top:4px;font-size:12px;color:#9e8a76;">解析：${q.analysis}</div>`
  return html
}

// === API ===
async function loadProjects() {
  try {
    const res = await api.get('/admin/projects')
    projects.value = res.data || []
  } catch {}
}

async function loadPlans() {
  try {
    const res = await api.get('/admin/plans')
    plans.value = res.data || []
  } catch {}
}

async function loadStages() {
  try {
    const res = await api.get('/admin/stages')
    stages.value = res.data || []
  } catch {}
}

async function loadQuestions() {
  loading.value = true
  try {
    const params = { activeOnly: 'true' }
    if (filterProjectId.value) params.projectId = filterProjectId.value
    const res = await api.get('/admin/questions', { params })
    questions.value = res.data || []
  } catch (err) { loadError.value = err.message || '加载失败' } finally { loading.value = false }
}

async function handleUpload() {
  if (!uploadForm.file || !uploadForm.projectId) return
  try {
    const buffer = await uploadForm.file.arrayBuffer()
    const res = await api.post('/admin/questions/upload', {
      buffer: { data: Array.from(new Uint8Array(buffer)) },
      questionPool: uploadForm.pool,
      projectId: uploadForm.projectId,
      stageId: uploadForm.stageId || null
    })
    const d = res.data
    toast.success('上传完成', `成功 ${d.inserted}/${d.total} 条${d.errors?.length ? `，跳过 ${d.errors.length} 条` : ''}`)
    showUploadModal.value = false
    uploadForm.file = null
    await loadQuestions()
  } catch (err) { toast.error('上传失败', err.message) }
}

function editQuestion(q) {
  editingId.value = q.id
  editForm.value = { ...q }
  showEditModal.value = true
}

async function saveEdit() {
  try {
    await api.put(`/admin/questions/${editingId.value}`, editForm.value)
    showEditModal.value = false
    await loadQuestions()
  } catch (err) { toast.error('保存失败', err.message) }
}

function confirmDelete(q) {
  if (!confirm(`确定删除题目「${q.question_id}」吗？`)) return
  api.delete(`/admin/questions/${q.id}`).then(() => loadQuestions()).catch(() => toast.error('删除失败', '请重试'))
}

function confirmBatchDelete() {
  if (!confirm(`确定删除 ${selectedIds.value.length} 道题目吗？`)) return
  Promise.all(selectedIds.value.map(id => api.delete(`/admin/questions/${id}`))).then(() => {
    selectedIds.value = []
    loadQuestions()
  })
}

async function batchMove() {
  try {
    await Promise.all(selectedIds.value.map(id =>
      api.put(`/admin/questions/${id}`, { stage_id: moveTargetStageId.value || null })
    ))
    selectedIds.value = []
    showMoveModal.value = false
    await loadQuestions()
  } catch (err) { toast.error('移动失败', err.message) }
}

async function batchSwitchPool() {
  const qs = questions.value.filter(q => selectedIds.value.includes(q.id))
  try {
    await Promise.all(qs.map(q =>
      api.put(`/admin/questions/${q.id}`, { question_pool: q.question_pool === 'exercise' ? 'quiz' : 'exercise' })
    ))
    selectedIds.value = []
    await loadQuestions()
  } catch (err) { toast.error('操作失败', err.message) }
}

// 监听筛选变化
let debounceTimer = null
watch([filterType, filterPool, filterKeyword], () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {}, 300)
})

onMounted(async () => {
  await Promise.all([loadProjects(), loadPlans(), loadStages()])
  await loadQuestions()
})
</script>

<style scoped>
/* 统计卡片 */
.qb-stats { display: flex; gap: 12px; margin-bottom: 16px; }
.qb-stat-card { flex: 1; background: var(--pixel-card, #fffbf0); border: 2px solid #d4c5a0; border-radius: 8px; padding: 12px 14px; }
.qb-stat-label { font-size: 11px; color: var(--pixel-muted, #9e8a76); }
.qb-stat-value { font-size: 22px; font-weight: 700; color: var(--pixel-link, #4a90d9); }

/* 工具栏 */
.qb-toolbar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
.qb-toolbar select { padding: 7px 10px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 12px; background: #fff; }
.qb-search { padding: 7px 10px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 12px; flex: 1; min-width: 160px; }

/* 分组 */
.qb-group { margin-bottom: 16px; border: 2px solid var(--pixel-border, #8b6914); border-radius: 8px; overflow: hidden; }
.qb-group-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #f0e6d2; cursor: pointer; }
.qb-group-header:hover { background: #e8dcc8; }
.qb-group-title { font-weight: 600; font-size: 13px; display: flex; align-items: center; gap: 6px; }
.qb-group-count { font-size: 12px; font-weight: 400; color: var(--pixel-muted, #9e8a76); }
.qb-group-meta { font-size: 11px; color: var(--pixel-muted, #9e8a76); display: flex; gap: 8px; }
.qb-group-body { background: var(--pixel-card, #fffbf0); }

/* 关卡子分组 */
.qb-stage-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px; background: #faf5ea; border-bottom: 1px solid #e8dcc8; cursor: pointer; }
.qb-stage-header:hover { background: #f5edd8; }
.qb-stage-title { font-size: 12px; font-weight: 500; display: flex; align-items: center; gap: 6px; }
.qb-stage-count { font-size: 11px; color: var(--pixel-muted, #9e8a76); font-weight: 400; }
.qb-stage-meta { font-size: 11px; color: var(--pixel-muted, #9e8a76); }

/* 题目行 */
.qb-item { display: flex; align-items: center; gap: 8px; padding: 7px 14px 7px 24px; border-bottom: 1px solid #f0e6d2; font-size: 12px; }
.qb-item:last-child { border-bottom: none; }
.qb-item:hover { background: #faf8f0; }
.qb-type { font-size: 10px; padding: 2px 5px; border-radius: 3px; white-space: nowrap; }
.qb-type.single { background: #e3f2fd; color: #1976d2; }
.qb-type.multiple { background: #f3e5f5; color: #7b1fa2; }
.qb-type.judge { background: #fff3e0; color: #e65100; }
.qb-text { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.qb-text:hover { color: var(--pixel-link, #4a90d9); }
.qb-pool { font-size: 10px; padding: 1px 5px; border-radius: 3px; background: #f0f0f0; color: #666; }
.qb-btn { padding: 3px 8px; border: 1px solid #d4c5a0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 11px; }
.qb-btn:hover { border-color: var(--pixel-border, #8b6914); background: #faf5ea; }
.qb-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* 预览 */
.qb-preview-box { padding: 12px 24px; background: #fdfaf0; border: 1px solid #e0d5c8; margin: 4px 14px 8px 24px; border-radius: 6px; font-size: 13px; line-height: 1.7; position: relative; }
.qb-preview-close { position: absolute; top: 8px; right: 12px; cursor: pointer; font-size: 12px; color: var(--pixel-muted); }

/* 预览（编辑弹窗内） */
.qb-preview-inline { margin: -4px 0 12px; }
.qb-preview-label { font-size: 11px; color: var(--pixel-muted); font-weight: 600; margin-bottom: 4px; }
.qb-preview-content { padding: 10px 14px; background: #fdfaf0; border: 1px solid #e0d5c8; border-radius: 4px; font-size: 13px; line-height: 1.6; }

/* 通用题提示 */
.qb-general-hint { padding: 6px 14px; background: #fff8f0; border-bottom: 1px solid #f0e6d2; font-size: 11px; color: #d4882a; }

/* 分页 */
.qb-pagination { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 8px; font-size: 12px; color: var(--pixel-muted); }

/* 批量操作条 */
.qb-batch-bar { position: sticky; bottom: 0; display: flex; gap: 10px; align-items: center; padding: 10px 16px; background: #e8f4fd; border: 2px solid #b3d9f2; border-radius: 8px; margin-top: 12px; font-size: 13px; }

/* 弹窗 */
.qb-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.qb-modal { background: var(--pixel-card, #fffbf0); border: 3px solid var(--pixel-border, #8b6914); border-radius: 12px; padding: 24px; width: 480px; max-width: 90vw; max-height: 85vh; overflow-y: auto; }
.qb-modal h3 { font-size: 16px; margin-bottom: 16px; }
.qb-form-row { margin-bottom: 14px; }
.qb-form-row label { display: block; font-size: 12px; font-weight: 600; margin-bottom: 4px; color: var(--pixel-muted, #9e8a76); }
.qb-form-row select, .qb-form-row input, .qb-form-row textarea { padding: 8px 10px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 13px; width: 100%; font-family: inherit; }
.qb-form-hint { font-size: 11px; color: var(--pixel-muted); margin-top: 3px; }
.qb-modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }

/* 像素按钮 */
.pixel-btn { padding: 8px 16px; background: var(--pixel-link, #4a90d9); color: #fff; border: 2px solid #3a7bc8; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600; }
.pixel-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.pixel-btn-outline { padding: 8px 16px; background: #fff; color: var(--pixel-text, #4a3728); border: 2px solid #d4c5a0; border-radius: 6px; cursor: pointer; font-size: 13px; }
.pixel-btn-sm { padding: 5px 12px; border: 1px solid #d4c5a0; background: #fff; border-radius: 4px; cursor: pointer; font-size: 12px; }
.pixel-btn-sm.danger { color: #c0392b; border-color: #e8b4b4; }

/* 骨架屏 */
@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
.skel { background: linear-gradient(90deg, #E8DFD0 25%, #F0E8D8 37%, #E8DFD0 63%); background-size: 200px 100%; animation: shimmer 1.4s ease infinite; border-radius: 4px; }
.qb-skeleton { padding: 0; }
.qb-skel-filter { display: flex; gap: 10px; margin-bottom: 16px; }
.qb-skel-table { background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; overflow: hidden; }
.qb-skel-row { display: flex; gap: 16px; padding: 12px 16px; border-bottom: 1px solid #f0e8d8; align-items: center; }
.qb-skel-row:last-child { border-bottom: none; }
.qb-skel-row.header { background: #F5EDD8; }
.qb-skel-row.header .skel { background: linear-gradient(90deg, #DDD5C0 25%, #E8DFD0 37%, #DDD5C0 63%); background-size: 200px 100%; animation: shimmer 1.4s ease infinite; }
.px-error-state { text-align: center; padding: 48px 20px; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; }
</style>
