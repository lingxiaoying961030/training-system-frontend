<template>
  <div class="projects-page">
    <div class="pixel-page-header">
      <h2><span>📁</span> 项目管理</h2>
      <div style="display: flex; gap: 10px; align-items: center;">
        <input class="pixel-filter-input" v-model="searchKeyword" placeholder="🔍 搜索项目名称..." style="width: 220px;" />
        <n-button type="primary" @click="openCreate">+ 新建项目</n-button>
      </div>
    </div>

    <n-spin :show="loading">
      <div v-if="filteredProjects.length === 0 && !loading" class="pixel-empty">
        <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
        <div>暂无项目，点击上方按钮创建</div>
      </div>
      <div v-else class="project-list">
        <div v-for="p in filteredProjects" :key="p.id" class="pixel-card">
          <div class="card-row">
            <div class="card-info">
              <div class="card-title">{{ p.name }}</div>
              <div class="card-desc">{{ p.description || '暂无描述' }}</div>
              <div v-if="p.status === 'archived'" class="card-meta">
                <span class="pixel-tag pixel-tag-gray">已归档</span>
              </div>
            </div>
            <div class="card-actions">
              <n-button size="small" @click="$router.push(`/admin/projects/${p.id}/plans`)">📋 培训计划</n-button>
              <n-button size="small" @click="$router.push(`/admin/projects/${p.id}/questions`)">📚 题库</n-button>
              <div class="pixel-dropdown">
                <span class="pixel-dropdown-trigger">⋯</span>
                <div class="pixel-dropdown-menu">
                  <div class="pixel-dropdown-menu-inner">
                    <div class="pixel-dropdown-item" @click="openEdit(p)">✏️ 编辑</div>
                    <div class="pixel-dropdown-item danger" @click="confirmDelete(p)">🗑 删除</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </n-spin>

    <n-modal v-model:show="showModal" preset="dialog" :title="editing ? '编辑项目' : '新建项目'" positive-text="确认" negative-text="取消" @positive-click="save">
      <n-form :model="form" label-placement="left" label-width="80">
        <n-form-item label="项目名称">
          <n-input v-model:value="form.name" placeholder="如：文本标注" />
        </n-form-item>
        <n-form-item label="描述">
          <n-input v-model:value="form.description" type="textarea" placeholder="项目简介" />
        </n-form-item>
        <n-form-item label="项目图标">
          <div class="icon-picker">
            <div
              v-for="icon in projectIcons"
              :key="icon"
              class="icon-option"
              :class="{ active: form.icon === icon }"
              @click="form.icon = icon"
            >
              <img :src="`/pixel-icons/projects/${icon}`" />
            </div>
            <div class="icon-option" :class="{ active: !form.icon }" @click="form.icon = ''" title="自动分配">
              🎲
            </div>
          </div>
        </n-form-item>
        <n-form-item label="状态">
          <n-select v-model:value="form.status" :options="[{ label: '启用', value: 'active' }, { label: '归档', value: 'archived' }]" />
        </n-form-item>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { NButton, NSpin, NModal, NForm, NFormItem, NInput, NSelect, useMessage, useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { PROJECT_ICONS } from '../../pixel-icons.js'

const message = useMessage()
const dialog = useDialog()
const loading = ref(false)
const projects = ref([])
const searchKeyword = ref('')

const filteredProjects = computed(() => {
  if (!searchKeyword.value) return projects.value
  const kw = searchKeyword.value.toLowerCase()
  return projects.value.filter(p => p.name?.toLowerCase().includes(kw) || p.description?.toLowerCase().includes(kw))
})
const showModal = ref(false)
const editing = ref(null)
const form = ref({ name: '', description: '', status: 'active', icon: '' })

const projectIcons = PROJECT_ICONS

async function load() {
  loading.value = true
  try {
    const res = await api.get('/projects')
    projects.value = res.data || []
  } catch (err) {
    message.error('加载项目失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { name: '', description: '', status: 'active', icon: '' }
  showModal.value = true
}

function openEdit(p) {
  editing.value = p
  form.value = { name: p.name, description: p.description || '', status: p.status, icon: p.icon || '' }
  showModal.value = true
}

async function save() {
  if (!form.value.name.trim()) { message.warning('请输入项目名称'); return false }
  try {
    if (editing.value) {
      await api.put(`/projects/${editing.value.id}`, form.value)
      message.success('更新成功')
    } else {
      await api.post('/projects', form.value)
      message.success('创建成功')
    }
    showModal.value = false
    await load()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

function confirmDelete(p) {
  dialog.warning({
    title: '确认删除',
    content: `删除项目「${p.name}」将同时删除其下所有培训计划和关卡，确定吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/projects/${p.id}`)
        message.success('删除成功')
        await load()
      } catch (err) {
        message.error('删除失败')
      }
    }
  })
}

onMounted(load)
</script>

<style scoped>
.projects-page { ; }
.project-list { display: flex; flex-direction: column; gap: 0; }
.card-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.card-info { flex: 1; }
.card-title { font-weight: 500; font-size: 15px; color: var(--pixel-text); }
.card-desc { font-size: 13px; color: var(--pixel-text-secondary); margin-top: 4px; }
.card-meta { margin-top: 4px; }
.card-actions { display: flex; gap: 8px; align-items: center; }

.icon-picker { display: flex; flex-wrap: wrap; gap: 8px; }
.icon-option {
  width: 48px; height: 48px;
  border: 2px solid var(--pixel-border);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.15s;
  background: var(--pixel-card);
}
.icon-option:hover { border-color: var(--pixel-gold); }
.icon-option.active { border-color: var(--pixel-brown); background: #F5EFE0; box-shadow: 2px 2px 0 var(--pixel-brown); }
.icon-option img { width: 36px; height: 36px; image-rendering: pixelated; }
.icon-option:last-child { font-size: 20px; }
</style>
