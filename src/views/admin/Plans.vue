<template>
  <div class="plans-page">
    <div class="pixel-breadcrumb">
      <a @click="$router.push('/admin/projects')">项目管理</a>
      <span class="sep">/</span>
      <span v-if="projectName">{{ projectName }}</span>
      <span class="sep">/</span>
      <span style="color: var(--pixel-text);">培训计划</span>
    </div>

    <div class="pixel-page-header">
      <h2><span>📋</span> 培训计划</h2>
      <n-button type="primary" @click="openCreate">+ 新建计划</n-button>
    </div>

    <n-spin :show="loading">
      <div v-if="plans.length === 0 && !loading" class="pixel-empty">
        <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
        <div>暂无培训计划</div>
      </div>
      <div v-else>
        <div v-for="plan in plans" :key="plan.id" class="pixel-card">
          <div class="card-row">
            <div class="card-info">
              <div class="card-title">{{ plan.name }}</div>
              <div class="card-desc">{{ plan.description || '暂无描述' }}</div>
              <div class="card-meta">通过线 {{ plan.pass_score ?? 80 }}分 · {{ plan.max_attempts ?? 2 }}次机会</div>
            </div>
            <div class="card-actions">
              <n-button size="small" @click="$router.push(`/admin/projects/${projectId}/plans/${plan.id}/stages`)">🎯 关卡管理</n-button>
              <div class="pixel-dropdown">
                <span class="pixel-dropdown-trigger">⋯</span>
                <div class="pixel-dropdown-menu">
                  <div class="pixel-dropdown-menu-inner">
                    <div class="pixel-dropdown-item" @click="openEdit(plan)">✏️ 编辑</div>
                    <div class="pixel-dropdown-item danger" @click="confirmDelete(plan)">🗑 删除</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>

    <n-modal v-model:show="showModal" preset="dialog" :title="editing ? '编辑计划' : '新建计划'" positive-text="确认" negative-text="取消" @positive-click="save">
      <n-form :model="form" label-placement="left" label-width="80">
        <n-form-item label="计划名称">
          <n-input v-model:value="form.name" placeholder="如：RL培训" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="计划简介" />
        </n-form-item>
        <n-form-item label="计划图标">
          <div class="icon-picker">
            <div
              v-for="icon in planIcons"
              :key="icon"
              class="icon-option"
              :class="{ active: form.icon === icon }"
              @click="form.icon = icon"
            >
              <img :src="`/pixel-icons/plans/${icon}`" />
            </div>
            <div class="icon-option" :class="{ active: !form.icon }" @click="form.icon = ''" title="自动分配">
              🎲
            </div>
          </div>
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="form.status" :options="[{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }]" />
        </n-form-item>
        <n-form-item label="通过分数">
          <n-input-number v-model:value="form.pass_score" :min="0" :max="100" placeholder="80" style="width: 120px;" />
          <span style="margin-left: 8px; color: #999; font-size: 13px;">分（答对率 × 100）</span>
        </n-form-item>
        <n-form-item label="测验次数">
          <n-input-number v-model:value="form.max_attempts" :min="1" :max="99" placeholder="2" style="width: 120px;" />
          <span style="margin-left: 8px; color: #999; font-size: 13px;">次</span>
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { NButton, NSpin, NModal, NForm, NFormItem, NInput, NSelect, NInputNumber, useMessage, useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { PLAN_ICONS } from '../../pixel-icons.js'

const route = useRoute()
const message = useMessage()
const dialog = useDialog()

const projectId = route.params.projectId
const projectName = ref('')
const loading = ref(false)
const plans = ref([])
const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', description: '', status: 'active', pass_score: 80, max_attempts: 2, icon: '' })

const planIcons = PLAN_ICONS

async function loadProject() {
  try {
    const res = await api.get(`/projects/${projectId}`)
    projectName.value = res.data?.name || ''
  } catch {}
}

async function loadPlans() {
  loading.value = true
  try {
    const res = await api.get(`/projects/${projectId}/plans`)
    plans.value = res.data || []
  } catch (err) {
    message.error('加载计划失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '', status: 'active', pass_score: 80, max_attempts: 2, icon: '' }
  showModal.value = true
}

function openEdit(plan) {
  editing.value = plan
  form.value = { name: plan.name, description: plan.description || '', status: plan.status, pass_score: plan.pass_score ?? 80, max_attempts: plan.max_attempts ?? 2, icon: plan.icon || '' }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) { message.warning('请输入计划名称'); return false }
  try {
    if (editing.value) {
      await api.put(`/projects/${projectId}/plans/${editing.value.id}`, form.value)
      message.success('更新成功')
    } else {
      await api.post(`/projects/${projectId}/plans`, form.value)
      message.success('创建成功')
    }
    showModal.value = false
    await loadPlans()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

function confirmDelete(plan) {
  dialog.warning({
    title: '确认删除',
    content: `删除计划「${plan.name}」将同时删除其下所有关卡，确定吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/projects/${projectId}/plans/${plan.id}`)
        message.success('删除成功')
        await loadPlans()
      } catch (err) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(() => { loadProject(); loadPlans() })
</script>

<style scoped>
.plans-page { ; }
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-info { flex: 1; }
.card-title { font-weight: 500; font-size: 15px; color: var(--pixel-text); }
.card-desc { font-size: 13px; color: var(--pixel-text-secondary); margin-top: 4px; }
.card-meta { font-size: 12px; color: #aaa; margin-top: 4px; }
.card-actions { display: flex; gap: 8px; align-items: center; }

.icon-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-option {
  width: 44px; height: 44px;
  border: 2px solid var(--pixel-border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  background: var(--pixel-card);
}
.icon-option:hover { border-color: var(--pixel-gold); }
.icon-option.active { border-color: var(--pixel-brown); background: #F5EFE0; box-shadow: 2px 2px 0 var(--pixel-brown); }
.icon-option img { width: 32px; height: 32px; image-rendering: pixelated; }
.icon-option:last-child { font-size: 18px; }
</style>
