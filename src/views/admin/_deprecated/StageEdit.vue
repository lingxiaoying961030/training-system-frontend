<template>
  <div class="stage-edit-page">
    <div class="pixel-breadcrumb">
      <a @click="$router.push('/admin/projects')">项目管理</a>
      <span class="sep">/</span>
      <a @click="$router.push('/admin/projects')">返回</a>
      <span class="sep">/</span>
      <span style="color: var(--pixel-text);">{{ stageForm.title || '编辑关卡' }}</span>
    </div>

    <div class="pixel-page-header">
      <h2><span>{{ stageForm.icon || '📖' }}</span> {{ stageForm.title || '编辑关卡' }}</h2>
      <div style="display: flex; gap: 8px; align-items: center;">
        <span class="pixel-tag" :class="statusTagClass(stageForm.status)" style="margin-right: 8px;">{{ statusLabel(stageForm.status) }}</span>
        <n-button type="primary" @click="saveStageInfo" :loading="saving">保存关卡信息</n-button>
      </div>
    </div>

    <n-spin :show="loading">
      <!-- 关卡基础信息（可折叠） -->
      <div class="pixel-section-card" style="margin-bottom: 16px;">
        <div class="pixel-section-header" @click="showBasicInfo = !showBasicInfo" style="cursor: pointer;">
          <span>⚙️ 基础信息</span>
          <span style="color: #999; font-size: 12px;">{{ showBasicInfo ? '▲ 收起' : '▼ 展开' }}</span>
        </div>
        <div v-if="showBasicInfo" class="pixel-section-body">
          <n-form :model="stageForm" label-placement="left" label-width="80">
            <n-form-item label="标题">
              <n-input v-model:value="stageForm.title" placeholder="关卡标题" />
            </n-form-item>
            <n-form-item label="描述">
              <n-input v-model:value="stageForm.description" type="textarea" placeholder="关卡描述" />
            </n-form-item>
            <n-form-item label="图标">
              <n-input v-model:value="stageForm.icon" placeholder="emoji 图标" maxlength="2" style="width: 80px;" />
            </n-form-item>
            <n-form-item label="状态">
              <n-select v-model:value="stageForm.status" :options="statusOptions" style="width: 160px;" />
            </n-form-item>
          </n-form>
        </div>
      </div>

      <!-- 学习单元 -->
      <div class="pixel-section-card">
        <div class="pixel-section-header">
          <span>📚 学习单元</span>
          <n-button type="primary" size="small" @click="showUnitModal = true">+ 添加单元</n-button>
        </div>
        <div class="pixel-section-body">
          <div v-if="units.length === 0" class="pixel-empty" style="padding: 20px;">暂无学习单元</div>
          <div v-else>
            <draggable
              v-model="units"
              item-key="id"
              handle=".pixel-drag-handle"
              ghost-class="sortable-ghost"
              @end="onUnitDragEnd"
            >
              <template #item="{ element: unit }">
                <div class="pixel-unit-item">
                  <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                    <span class="pixel-drag-handle" title="拖拽排序">⠿</span>
                    <span class="pixel-tag" :class="unitTagClass(unit.unit_type)">{{ unitTypeLabel(unit.unit_type) }}</span>
                    <span style="font-size: 14px;">{{ unit.title }}</span>
                    <span v-if="unit.is_required" class="pixel-tag pixel-tag-green" style="font-size: 11px;">必学</span>
                  </div>
                  <div class="pixel-action-bar">
                    <button class="pixel-action-btn" @click="$router.push(`/admin/units/${unit.id}/content`)">
                      <span class="tip">编辑内容</span>📝
                    </button>
                    <button class="pixel-action-btn" @click="editUnit(unit)">
                      <span class="tip">编辑设置</span>⚙️
                    </button>
                    <span class="pixel-action-divider"></span>
                    <button class="pixel-action-btn danger" @click="deleteUnit(unit)">
                      <span class="tip">删除</span>🗑
                    </button>
                  </div>
                </div>
              </template>
            </draggable>
          </div>
        </div>
      </div>

      <!-- 导师管理 -->
      <div class="pixel-section-card">
        <div class="pixel-section-header">
          <span>👨‍🏫 导师</span>
          <n-button type="primary" size="small" @click="showMentorModal = true">+ 添加导师</n-button>
        </div>
        <div class="pixel-section-body">
          <div v-if="mentors.length === 0" class="pixel-empty" style="padding: 20px;">暂未分配导师</div>
          <div v-else>
            <div v-for="mentor in mentors" :key="mentor.id" class="pixel-unit-item">
              <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                <span style="font-size: 14px;">{{ mentor.training_users?.name || '未知' }}</span>
                <span class="pixel-tag pixel-tag-blue">导师</span>
              </div>
              <div class="pixel-action-bar">
                <button class="pixel-action-btn danger" @click="removeMentorItem(mentor)">
                  <span class="tip">移除</span>🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>

    <!-- 学习单元弹窗 -->
    <n-modal v-model:show="showUnitModal" preset="dialog" :title="editingUnit ? '编辑学习单元' : '添加学习单元'" positive-text="确认" negative-text="取消" @positive-click="saveUnit">
      <n-form :model="unitForm" label-placement="left" label-width="80">
        <n-form-item label="标题" :rule="{ required: true, message: '请输入标题' }">
          <n-input v-model:value="unitForm.title" placeholder="单元标题" />
        </n-form-item>
        <n-form-item label="类型">
          <n-select v-model:value="unitForm.unit_type" :options="unitTypeOptions" />
        </n-form-item>
        <n-form-item label="必学">
          <n-switch v-model:value="unitForm.is_required" />
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 添加导师弹窗 -->
    <n-modal v-model:show="showMentorModal" preset="dialog" title="添加导师" positive-text="确认" negative-text="取消" @positive-click="saveMentor">
      <n-form :model="mentorForm" label-placement="left" label-width="80">
        <n-form-item label="用户">
          <n-select v-model:value="mentorForm.user_id" :options="userOptions" placeholder="选择用户" filterable />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NButton, NSpin, NForm, NFormItem, NInput, NSelect, NSwitch, NModal, useMessage, useDialog } from 'naive-ui'
import draggable from 'vuedraggable'
import api from '../../api/index.js'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const saving = ref(false)
const stageId = route.params.id
const showBasicInfo = ref(false)

const contextProjectId = ref(route.query.projectId || null)
const contextPlanId = ref(route.query.planId || null)

const backPath = computed(() => {
  if (contextProjectId.value && contextPlanId.value) {
    return `/admin/projects/${contextProjectId.value}/plans/${contextPlanId.value}/stages`
  }
  return '/admin/stages'
})

// 关卡信息
const stageForm = ref({ title: '', description: '', icon: '', status: 'draft' })
const statusOptions = [
  { label: '草稿', value: 'draft' },
  { label: '已发布', value: 'published' },
  { label: '已归档', value: 'archived' }
]
const statusTagClass = (s) => ({ draft: 'pixel-tag-gray', published: 'pixel-tag-green', archived: 'pixel-tag-orange' }[s] || 'pixel-tag-gray')
const statusType = (s) => ({ draft: 'default', published: 'success', archived: 'warning' }[s] || 'default')
const statusLabel = (s) => ({ draft: '草稿', published: '已发布', archived: '已归档' }[s] || s)

// 学习单元
const units = ref([])
const showUnitModal = ref(false)
const editingUnit = ref(null)
const unitForm = ref({ title: '', unit_type: 'article', is_required: true })
const unitTypeOptions = [
  { label: '文章', value: 'article' },
  { label: '视频', value: 'video' },
  { label: '练习', value: 'practice' },
  { label: '测验', value: 'quiz' },
  { label: '实战演练', value: 'practical' }
]
const unitTypeTag = (t) => ({ article: 'info', video: 'success', quiz: 'warning', practice: 'default', practical: 'error' }[t] || 'default')
const unitTagClass = (t) => ({ article: 'pixel-tag-blue', video: 'pixel-tag-green', quiz: 'pixel-tag-orange', practice: 'pixel-tag-gray', practical: 'pixel-tag-red' }[t] || 'pixel-tag-gray')
const unitTypeLabel = (t) => ({ article: '文章', video: '视频', quiz: '测验', practice: '练习', practical: '实战演练' }[t] || t)

async function onUnitDragEnd() {
  const orders = units.value.map((u, i) => ({ id: u.id, sort_order: i }))
  try {
    await api.put(`/admin/stages/${stageId}/units/order`, orders)
  } catch (err) {
    message.error('排序失败：' + err.message)
    await loadStageDetail()
  }
}

// 导师
const mentors = ref([])
const showMentorModal = ref(false)
const mentorForm = ref({ user_id: null, role: 'mentor' })
const userOptions = ref([])

async function loadStageDetail() {
  loading.value = true
  try {
    const res = await api.get(`/admin/stages/${stageId}`)
    const data = res.data
    stageForm.value = { title: data.title, description: data.description || '', icon: data.icon || '', status: data.status }
    units.value = data.units || []
    mentors.value = data.mentors || []
  } catch (err) {
    message.error('加载关卡详情失败：' + err.message)
    router.push(backPath.value)
  } finally {
    loading.value = false
  }
}

async function saveStageInfo() {
  saving.value = true
  try {
    await api.put(`/admin/stages/${stageId}`, stageForm.value)
    message.success('保存成功')
  } catch (err) {
    message.error('保存失败：' + err.message)
  } finally {
    saving.value = false
  }
}

function editUnit(unit) {
  editingUnit.value = unit
  unitForm.value = { title: unit.title, unit_type: unit.unit_type, is_required: unit.is_required }
  showUnitModal.value = true
}

async function saveUnit() {
  if (!unitForm.value.title.trim()) { message.warning('请输入标题'); return false }
  try {
    if (editingUnit.value) {
      await api.put(`/admin/units/${editingUnit.value.id}`, unitForm.value)
      message.success('更新成功')
    } else {
      await api.post(`/admin/stages/${stageId}/units`, unitForm.value)
      message.success('添加成功')
    }
    showUnitModal.value = false
    editingUnit.value = null
    unitForm.value = { title: '', unit_type: 'article', is_required: true }
    await loadStageDetail()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

function deleteUnit(unit) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除学习单元「${unit.title}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/units/${unit.id}`)
        message.success('删除成功')
        await loadStageDetail()
      } catch (err) {
        message.error('删除失败：' + err.message)
      }
    }
  })
}

async function loadUsers() {
  try {
    const res = await api.get('/admin/mentors/list')
    userOptions.value = (res.data || []).map(u => ({ label: u.name, value: u.id }))
  } catch {}
}

async function saveMentor() {
  if (!mentorForm.value.user_id) { message.warning('请选择用户'); return false }
  try {
    await api.post(`/admin/stages/${stageId}/mentors`, mentorForm.value)
    message.success('分配成功')
    showMentorModal.value = false
    mentorForm.value = { user_id: null, role: 'mentor' }
    await loadStageDetail()
  } catch (err) {
    message.error('分配失败：' + err.message)
    return false
  }
}

function removeMentorItem(mentor) {
  dialog.warning({
    title: '确认移除',
    content: `确定移除导师「${mentor.training_users?.name || ''}」吗？`,
    positiveText: '移除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/mentors/${mentor.id}`)
        message.success('移除成功')
        await loadStageDetail()
      } catch (err) {
        message.error('移除失败：' + err.message)
      }
    }
  })
}

onMounted(() => { loadStageDetail(); loadUsers() })
</script>

<style scoped>
.stage-edit-page { ; }
</style>
