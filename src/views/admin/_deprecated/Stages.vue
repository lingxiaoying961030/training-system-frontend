<template>
  <div class="stages-page">
    <div class="pixel-breadcrumb">
      <a @click="$router.push('/admin/projects')">项目管理</a>
      <span class="sep">/</span>
      <a @click="$router.push(`/admin/projects/${projectId}/plans`)">{{ projectName || '项目' }}</a>
      <span class="sep">/</span>
      <a @click="$router.push(`/admin/projects/${projectId}/plans`)">{{ planName || '计划' }}</a>
      <span class="sep">/</span>
      <span style="color: var(--pixel-text);">关卡管理</span>
    </div>

    <div class="pixel-page-header">
      <h2><span>🎯</span> 关卡管理</h2>
      <n-button type="primary" @click="showCreateModal = true">+ 新建关卡</n-button>
    </div>

    <n-spin :show="loading">
      <div v-if="stages.length === 0 && !loading" class="pixel-empty">
        <div style="font-size: 48px; margin-bottom: 12px;">🎯</div>
        <div>暂无关卡，点击上方按钮创建</div>
      </div>
      <div v-else>
        <draggable
          v-model="stages"
          item-key="id"
          handle=".pixel-drag-handle"
          ghost-class="sortable-ghost"
          @end="onDragEnd"
        >
          <template #item="{ element: stage }">
            <div class="pixel-card">
              <div class="card-row">
                <div class="card-left">
                  <span class="pixel-drag-handle" title="拖拽排序">⠿</span>
                  <span class="stage-icon">{{ stage.icon || '📍' }}</span>
                  <div>
                    <div class="card-title">{{ stage.title }}</div>
                    <div class="card-desc">{{ stage.description || '暂无描述' }}</div>
                  </div>
                </div>
                <div class="pixel-action-bar">
                  <span class="pixel-tag" :class="statusTagClass(stage.status)" style="margin-right: 8px;">{{ statusLabel(stage.status) }}</span>
                  <button class="pixel-action-btn" @click="goToEdit(stage)">
                    <span class="tip">编辑</span>✏️
                  </button>
                  <span class="pixel-action-divider"></span>
                  <button class="pixel-action-btn danger" @click="confirmDelete(stage)">
                    <span class="tip">删除</span>🗑
                  </button>
                </div>
              </div>
            </div>
          </template>
        </draggable>
      </div>
    </n-spin>

    <!-- 新建弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="dialog" :title="editingStage ? '编辑关卡' : '新建关卡'" positive-text="确认" negative-text="取消" @positive-click="saveStage">
      <n-form :model="formData" label-placement="left" label-width="80">
        <n-form-item label="标题" :rule="{ required: true, message: '请输入标题' }">
          <n-input v-model:value="formData.title" placeholder="关卡标题" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="formData.description" type="textarea" placeholder="关卡描述" />
        </n-form-item>
        <n-form-item label="图标">
          <n-input v-model:value="formData.icon" placeholder="emoji 图标，如 🎯" maxlength="2" />
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="formData.status" :options="statusOptions" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpin, NModal, NForm, NFormItem, NInput, NSelect, useMessage, useDialog } from 'naive-ui'
import draggable from 'vuedraggable'
import api from '../../api/index.js'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const planId = route.params.planId || null
const projectId = route.params.projectId || null
const projectName = ref('')
const planName = ref('')

const loading = ref(false)
const stages = ref([])
const showCreateModal = ref(false)
const editingStage = ref(null)
const formData = ref({ title: '', description: '', icon: '', status: 'draft' })

const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' }
]

const statusTagClass = (s) => ({ draft: 'pixel-tag-gray', published: 'pixel-tag-green', archived: 'pixel-tag-orange' }[s] || 'pixel-tag-gray')
const statusLabel = (s) => ({ draft: '草稿', published: '已发布', archived: '已归档' }[s] || s)

async function onDragEnd() {
  const orders = stages.value.map((s, i) => ({ id: s.id, sort_order: i }))
  try {
    await api.put('/admin/stages/order', orders)
  } catch (err) {
    message.error('排序失败：' + err.message)
    await loadStages()
  }
}

async function loadContext() {
  try {
    if (projectId) {
      const res = await api.get(`/projects/${projectId}`)
      projectName.value = res.data?.name || ''
    }
    if (projectId && planId) {
      const res = await api.get(`/projects/${projectId}/plans`)
      const plan = (res.data || []).find(p => p.id === planId)
      planName.value = plan?.name || ''
    }
  } catch {}
}

async function loadStages() {
  loading.value = true
  try {
    const params = {}
    if (planId) params.planId = planId
    const res = await api.get('/admin/stages', { params })
    stages.value = res.data || []
  } catch (err) {
    message.error('加载关卡失败：' + err.message)
  } finally {
    loading.value = false
  }
}

async function saveStage() {
  if (!formData.value.title.trim()) { message.warning('请输入标题'); return false }
  try {
    if (editingStage.value) {
      await api.put(`/admin/stages/${editingStage.value.id}`, formData.value)
      message.success('更新成功')
    } else {
      await api.post('/admin/stages', { ...formData.value, plan_id: planId })
      message.success('创建成功')
    }
    showCreateModal.value = false
    editingStage.value = null
    formData.value = { title: '', description: '', icon: '', status: 'draft' }
    await loadStages()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

function confirmDelete(stage) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除关卡「${stage.title}」吗？关联的学习单元和引导人配置也会被删除。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/stages/${stage.id}`)
        message.success('删除成功')
        await loadStages()
      } catch (err) {
        message.error('删除失败：' + err.message)
      }
    }
  })
}

function goToEdit(stage) {
  const query = {}
  if (projectId) query.projectId = projectId
  if (planId) query.planId = planId
  router.push({ path: `/admin/stages/${stage.id}/edit`, query })
}

onMounted(() => { loadContext(); loadStages() })
</script>

<style scoped>
.stages-page { ; }
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}
.stage-icon { font-size: 28px; }
.card-title { font-weight: 500; font-size: 15px; color: var(--pixel-text); }
.card-desc { font-size: 13px; color: var(--pixel-text-secondary); margin-top: 2px; }
</style>
