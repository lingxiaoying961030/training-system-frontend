<template>
  <div class="questions-page">
    <div class="page-header">
      <div>
        <n-button v-if="routeProjectId" text @click="$router.push('/admin/projects')" style="margin-right: 8px;">← 返回项目</n-button>
        <h2 style="display: inline;">题库管理</h2>
      </div>
      <n-button type="primary" @click="showUploadModal = true">上传题目</n-button>
    </div>

    <!-- 筛选 -->
    <n-space style="margin-bottom: 16px;" align="center">
      <n-input v-model:value="filterKeyword" placeholder="搜索题目内容/ID" clearable style="width: 200px;" @clear="currentPage = 1" @keyup.enter="currentPage = 1" />
      <n-select v-model:value="filterStage" :options="stageOptions" placeholder="筛选关卡" clearable style="width: 200px;" />
      <n-select v-model:value="filterCategory" :options="categoryOptions" placeholder="筛选分类" clearable style="width: 160px;" />
      <n-select v-model:value="filterPool" :options="poolOptions" placeholder="题库类型" clearable style="width: 140px;" />
      <n-select v-model:value="filterType" :options="typeOptions" placeholder="题型" clearable style="width: 120px;" />
      <n-checkbox v-model:checked="showInactive">显示已废弃</n-checkbox>
      <n-button v-if="selectedIds.length > 0" type="error" size="small" @click="confirmBatchDelete">批量删除 ({{ selectedIds.length }})</n-button>
    </n-space>

    <n-spin :show="loading">
      <div v-if="questions.length === 0 && !loading" class="empty-tip">暂无题目</div>
      <template v-else>
        <div class="question-list">
          <div v-for="q in pagedQuestions" :key="q.id" class="question-card" :class="{ inactive: !q.is_active }">
            <n-checkbox :checked="selectedIds.includes(q.id)" @update:checked="toggleSelect(q.id)" style="margin-right: 10px; flex-shrink: 0;" />
            <div class="q-main">
              <div class="q-header">
                <n-tag :type="qTypeTag(q.question_type)" size="small">{{ qTypeLabel(q.question_type) }}</n-tag>
                <span class="q-id">{{ q.question_id }}</span>
                <n-tag size="small" :type="q.question_pool === 'exercise' ? 'info' : 'warning'">{{ q.question_pool === 'exercise' ? '练习' : '测验' }}</n-tag>
                <n-tag v-if="q.training_stages" size="small" type="success">{{ q.training_stages.title }}</n-tag>
                <n-tag v-if="!q.is_active" size="small" type="error">已废弃</n-tag>
              </div>
              <div class="q-content" @click.stop="togglePreview(q.id)">
                {{ q.content?.substring(0, 80) }}{{ q.content?.length > 80 ? '...' : '' }}
                <span class="preview-toggle">{{ previewId === q.id ? '收起预览 ▲' : '预览 ▼' }}</span>
              </div>
              <div v-if="previewId === q.id" class="q-preview" @click.stop>
                <div class="preview-box" v-html="renderMd(q.content)"></div>
                <div v-if="q.question_type !== 'judge'" class="preview-box preview-options" style="margin-top: 6px;">
                  <div class="preview-opt" v-for="o in ['A','B','C','D']" :key="o">
                    <span v-if="q['option_' + o.toLowerCase()]"><strong>{{ o }}.</strong> <span v-html="renderMdInline(q['option_' + o.toLowerCase()])"></span></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="q-actions">
              <button class="q-action-btn edit" @click="editQuestion(q)">✏️ 编辑</button>
              <button v-if="q.is_active" class="q-action-btn warn" @click="toggleActive(q, false)">🚫 废弃</button>
              <button v-else class="q-action-btn success" @click="toggleActive(q, true)">✅ 恢复</button>
              <button class="q-action-btn danger" @click="confirmDelete(q)">🗑 删除</button>
            </div>
          </div>
        </div>
        <n-pagination v-model:page="currentPage" :page-count="Math.ceil(questions.length / pageSize)" style="margin-top: 16px; justify-content: center;" />
      </template>
    </n-spin>

    <!-- 上传弹窗 -->
    <n-modal v-model:show="showUploadModal" preset="dialog" title="上传题目" positive-text="上传" negative-text="取消" @positive-click="handleUpload" style="width: 500px;">
      <n-form label-placement="left" label-width="80">
        <n-form-item label="题库类型">
          <n-select v-model:value="uploadPool" :options="[{ label: '练习题库', value: 'exercise' }, { label: '测验题库', value: 'quiz' }]" />
        </n-form-item>
        <n-form-item label="Excel">
          <n-upload :max="1" accept=".xlsx,.xls" @before-upload="handleFileSelect">
            <n-button>选择文件</n-button>
          </n-upload>
          <span v-if="uploadFile" style="margin-left: 8px; color: #666;">{{ uploadFile.name }}</span>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 上传结果弹窗 -->
    <n-modal v-model:show="showUploadResult" preset="dialog" :title="`上传结果`">
      <div v-if="uploadResult.errors.length > 0" style="margin-bottom: 12px;">
        <p style="color: #e65100; font-weight: 500;">⚠️ 跳过 {{ uploadResult.errors.length }} 条：</p>
        <div style="max-height: 150px; overflow-y: auto; font-size: 12px; color: #999;">
          <div v-for="(err, i) in uploadResult.errors" :key="i">{{ err }}</div>
        </div>
      </div>
      <p style="color: #18a058;">✅ 成功导入 {{ uploadResult.inserted }} / {{ uploadResult.total }} 条</p>
    </n-modal>

    <!-- 编辑弹窗 -->
    <n-modal v-model:show="showEditModal" preset="dialog" title="编辑题目" positive-text="保存" negative-text="取消" @positive-click="saveEdit" style="width: 600px;">
      <n-form :model="editForm" label-placement="top">
        <n-form-item label="题目ID">
          <n-input v-model:value="editForm.question_id" />
        </n-form-item>
        <n-form-item label="题目类型">
          <n-select v-model:value="editForm.question_type" :options="[{ label: '单选', value: 'single' }, { label: '多选', value: 'multiple' }, { label: '判断', value: 'judge' }]" />
        </n-form-item>
        <n-form-item label="题目内容">
          <n-input v-model:value="editForm.content" type="textarea" :rows="4" placeholder="支持 Markdown 格式" />
        </n-form-item>
        <div v-if="editForm.content" class="preview-section">
          <div class="preview-label">📖 Markdown 预览</div>
          <div class="preview-box" v-html="renderMd(editForm.content)"></div>
        </div>
        <div v-if="editForm.question_type !== 'judge'">
          <n-form-item :label="'选项 ' + o" v-for="o in ['A','B','C','D']" :key="o">
            <n-input v-model:value="editForm['option_' + o.toLowerCase()]" placeholder="支持 Markdown 格式" />
          </n-form-item>
          <div v-if="hasOptionContent" class="preview-section">
            <div class="preview-label">📖 选项预览</div>
            <div class="preview-box preview-options">
              <div v-for="o in ['A','B','C','D']" :key="o" class="preview-opt">
                <span v-if="editForm['option_' + o.toLowerCase()]"><strong>{{ o }}.</strong> <span v-html="renderMdInline(editForm['option_' + o.toLowerCase()])"></span></span>
              </div>
            </div>
          </div>
        </div>
        <n-form-item label="正确答案">
          <n-input v-model:value="editForm.answer" />
        </n-form-item>
        <n-form-item label="解析">
          <n-input v-model:value="editForm.analysis" type="textarea" :rows="2" />
        </n-form-item>
        <n-form-item label="题库类型">
          <n-select v-model:value="editForm.question_pool" :options="[{ label: '练习', value: 'exercise' }, { label: '测验', value: 'quiz' }]" />
        </n-form-item>
        <n-form-item label="所属关卡">
          <n-select v-model:value="editForm.stage_id" :options="stageOptions" clearable placeholder="不选则未分类" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NSpin, NTag, NModal, NForm, NFormItem, NInput, NSelect, NUpload, NCheckbox, NSpace, NPagination, useMessage, useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { marked } from 'marked'

marked.setOptions({ breaks: true, gfm: true })

function renderMd(text) {
  if (!text) return ''
  return marked.parse(String(text))
}

function renderMdInline(text) {
  if (!text) return ''
  return marked.parseInline(String(text))
}

const route = useRoute()
const message = useMessage()
const dialog = useDialog()

// 从路由获取 projectId（如果从项目页面进入）
const routeProjectId = route.params.projectId || null

const loading = ref(false)
const questions = ref([])
const stages = ref([])
const stageOptions = ref([])
const poolOptions = [{ label: '练习', value: 'exercise' }, { label: '测验', value: 'quiz' }]
const typeOptions = [{ label: '单选', value: 'single' }, { label: '多选', value: 'multiple' }, { label: '判断', value: 'judge' }]

// 筛选
const filterStage = ref(null)
const filterPool = ref(null)
const filterType = ref(null)
const filterKeyword = ref('')
const filterCategory = ref(null)
const categoryOptions = ref([])
const showInactive = ref(false)

// 批量选择
const selectedIds = ref([])

// 上传
const showUploadModal = ref(false)
const uploadPool = ref('exercise')
const uploadFile = ref(null)
const showUploadResult = ref(false)
const uploadResult = ref({ inserted: 0, errors: [], total: 0 })

// 编辑
const showEditModal = ref(false)
const editForm = ref({})
const editingId = ref(null)

// 列表预览
const previewId = ref(null)
function togglePreview(id) { previewId.value = previewId.value === id ? null : id }

// 编辑弹窗选项预览
const hasOptionContent = computed(() => {
  const f = editForm.value
  return f.option_a || f.option_b || f.option_c || f.option_d
})

const qTypeTag = (t) => ({ single: 'info', multiple: 'success', judge: 'warning' }[t] || 'default')
const qTypeLabel = (t) => ({ single: '单选', multiple: '多选', judge: '判断' }[t] || t)

// 分页
const pageSize = 15
const currentPage = ref(1)
const pagedQuestions = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return questions.value.slice(start, start + pageSize)
})
watch(questions, () => { currentPage.value = 1 })

async function loadStages() {
  const res = await api.get('/admin/stages')
  stages.value = res.data || []
  stageOptions.value = stages.value.map(s => ({ label: s.title, value: s.id }))
}

async function loadQuestions() {
  loading.value = true
  try {
    const params = {}
    if (routeProjectId) params.projectId = routeProjectId
    if (filterCategory.value) params.category = filterCategory.value
    if (filterStage.value) params.stageId = filterStage.value
    if (filterPool.value) params.questionPool = filterPool.value
    if (filterType.value) params.questionType = filterType.value
    if (filterKeyword.value) params.keyword = filterKeyword.value
    if (!showInactive.value) params.activeOnly = 'true'
    else params.all = 'true'
    const res = await api.get('/admin/questions', { params })
    questions.value = res.data || []
    // 提取 category 选项
    const cats = [...new Set((res.data || []).map(q => q.category).filter(Boolean))]
    categoryOptions.value = cats.map(c => ({ label: c, value: c }))
  } catch (err) {
    message.error('加载题目失败')
  } finally {
    loading.value = false
  }
}

watch([filterStage, filterPool, filterType, filterKeyword, showInactive, filterCategory], () => { currentPage.value = 1; loadQuestions() })

// 批量选择
function toggleSelect(id) {
  const idx = selectedIds.value.indexOf(id)
  if (idx >= 0) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(id)
}

async function confirmBatchDelete() {
  dialog.warning({
    title: '确认批量删除',
    content: `确定删除选中的 ${selectedIds.value.length} 道题目吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        for (const id of selectedIds.value) {
          await api.delete(`/admin/questions/${id}`)
        }
        message.success(`成功删除 ${selectedIds.value.length} 道题目`)
        selectedIds.value = []
        await loadQuestions()
      } catch (err) {
        message.error('删除失败')
      }
    }
  })
}

function handleFileSelect({ file }) {
  uploadFile.value = file.file
  return false
}

async function handleUpload() {
  if (!uploadFile.value) { message.warning('请选择文件'); return false }
  try {
    const buffer = await uploadFile.value.arrayBuffer()
    const res = await api.post('/admin/questions/upload', {
      buffer: { data: Array.from(new Uint8Array(buffer)) },
      questionPool: uploadPool.value,
      projectId: routeProjectId
    })
    uploadResult.value = res.data
    showUploadResult.value = true
    showUploadModal.value = false
    uploadFile.value = null
    await loadQuestions()
  } catch (err) {
    message.error('上传失败：' + err.message)
  }
  return false
}

function editQuestion(q) {
  editingId.value = q.id
  editForm.value = { ...q }
  showEditModal.value = true
}

async function saveEdit() {
  try {
    await api.put(`/admin/questions/${editingId.value}`, editForm.value)
    message.success('保存成功')
    showEditModal.value = false
    await loadQuestions()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

async function toggleActive(q, active) {
  try {
    await api.put('/admin/questions/batch-active', { questionIds: [q.id], is_active: active })
    message.success(active ? '已恢复' : '已废弃')
    await loadQuestions()
  } catch (err) {
    message.error('操作失败')
  }
}

function confirmDelete(q) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除题目「${q.question_id} - ${q.content}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/questions/${q.id}`)
        message.success('删除成功')
        await loadQuestions()
      } catch (err) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(() => {
  loadStages()
  loadQuestions()
})
</script>

<style scoped>
.questions-page { padding: 20px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.page-header h2 { margin: 0; }
.empty-tip { text-align: center; color: #999; padding: 40px 0; }
.question-list { display: flex; flex-direction: column; gap: 10px; }
.question-card { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #fff; border: 1px solid #e8e8e8; border-radius: 6px; }
.question-card.inactive { opacity: 0.5; }
.q-main { flex: 1; min-width: 0; }
.q-header { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.q-id { font-size: 12px; color: #999; }
.q-content { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.q-content:hover { color: #4A90B8; }
.preview-toggle { font-size: 11px; color: #4A90B8; margin-left: 6px; white-space: nowrap; }
.q-preview { margin-top: 6px; }
.q-actions { display: flex; gap: 6px; flex-shrink: 0; margin-left: 12px; }
.q-action-btn {
  padding: 4px 10px; font-size: 12px; font-weight: 500; border: 1.5px solid;
  background: #fff; cursor: pointer; transition: all 0.15s; white-space: nowrap;
}
.q-action-btn:hover { box-shadow: 1px 1px 0 rgba(0,0,0,0.1); }
.q-action-btn.edit { color: #5B3A29; border-color: #D5C9B8; }
.q-action-btn.edit:hover { background: #F5EFE0; border-color: #5B3A29; }
.q-action-btn.warn { color: #E8A93A; border-color: #F0D9A0; }
.q-action-btn.warn:hover { background: #FFF8E7; border-color: #E8A93A; }
.q-action-btn.success { color: #5C8A4D; border-color: #A5D6A7; }
.q-action-btn.success:hover { background: #F0F8EC; border-color: #5C8A4D; }
.q-action-btn.danger { color: #C24A3A; border-color: #EEC4BF; }
.q-action-btn.danger:hover { background: #FFF5F3; border-color: #C24A3A; }

/* Markdown 预览 */
.preview-section { margin: -8px 0 12px; }
.preview-label { font-size: 12px; color: #8B7355; font-weight: 600; margin-bottom: 4px; }
.preview-box {
  padding: 12px 16px; background: #FDFAF0; border: 1px solid #E0D5C8; border-radius: 4px;
  font-size: 13px; line-height: 1.7; color: #3E2723; max-height: 400px; overflow-y: auto;
}
.preview-box :deep(h1) { font-size: 17px; margin: 10px 0 6px; }
.preview-box :deep(h2) { font-size: 15px; margin: 8px 0 4px; }
.preview-box :deep(h3) { font-size: 14px; margin: 6px 0 4px; }
.preview-box :deep(h4), .preview-box :deep(h5) { font-size: 13px; margin: 4px 0; }
.preview-box :deep(p) { margin: 4px 0; }
.preview-box :deep(ul), .preview-box :deep(ol) { padding-left: 20px; margin: 4px 0; }
.preview-box :deep(li) { margin: 2px 0; }
.preview-box :deep(strong) { color: #5B3A29; }
.preview-box :deep(hr) { border: none; border-top: 1px solid #E0D5C8; margin: 10px 0; }
.preview-box :deep(code) { background: #F5EFE0; padding: 1px 4px; font-size: 12px; border: 1px solid #E0D5C8; }
.preview-box :deep(blockquote) { border-left: 3px solid #E8A93A; background: #FFF8E7; padding: 4px 12px; margin: 6px 0; }
.preview-options { padding: 8px 14px; }
.preview-opt { padding: 3px 0; font-size: 13px; }
.preview-opt :deep(code) { background: #F5EFE0; padding: 1px 4px; font-size: 12px; }
</style>
