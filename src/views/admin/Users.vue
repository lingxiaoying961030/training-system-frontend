<template>
  <div class="users-page">
    <div class="pixel-page-header">
      <h2><span>👥</span> 用户管理</h2>
      <div style="display: flex; gap: 8px;">
        <button class="pixel-btn pixel-btn-primary" @click="showCreateModal = true">+ 新增用户</button>
        <button class="pixel-btn pixel-btn-ghost" @click="triggerImport">📥 批量导入</button>
        <input ref="fileInput" type="file" accept=".xlsx,.xls" style="display:none" @change="handleImport" />
      </div>
    </div>

    <!-- 筛选 -->
    <div class="pixel-filter-bar">
      <input class="pixel-filter-input" v-model="searchKeyword" placeholder="🔍 搜索姓名或手机号..." />
      <select class="pixel-filter-select" v-model="filterRole" style="width: 140px;">
        <option :value="null">全部角色</option>
        <option value="student">学员</option>
        <option value="mentor">导师</option>
        <option value="data_mentor">数据 Mentor</option>
        <option value="admin">管理员</option>
      </select>
    </div>

    <n-spin :show="loading">
      <div v-if="filteredUsers.length === 0 && !loading" class="pixel-empty">暂无用户</div>
      <div v-else class="pixel-table-wrap">
        <table class="pixel-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>手机号</th>
              <th>角色</th>
              <th>来源</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td><strong>{{ user.name }}</strong></td>
              <td>{{ user.phone || '-' }}</td>
              <td>
                <span v-for="role in (user.roles || [])" :key="role" class="pixel-tag" :class="roleTagClass(role)" style="margin-right: 4px;">
                  {{ roleLabel(role) }}
                </span>
              </td>
              <td>{{ sourceLabel(user.source) }}</td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td>
                <button class="pixel-btn-text" @click="editUser(user)">编辑</button>
                <button class="pixel-btn-text danger" @click="confirmDelete(user)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </n-spin>

    <!-- 新增/编辑弹窗 -->
    <n-modal v-model:show="showCreateModal" preset="dialog" :title="editingUser ? '编辑用户' : '新增用户'" positive-text="确认" negative-text="取消" @positive-click="saveUser" style="width: 480px;">
      <n-form :model="formData" label-placement="left" label-width="80">
        <n-form-item label="姓名" :rule="{ required: true, message: '请输入姓名' }">
          <n-input v-model:value="formData.name" placeholder="用户姓名" />
        </n-form-item>
        <n-form-item label="手机号" :rule="{ required: true, message: '请输入手机号' }">
          <n-input v-model:value="formData.phone" placeholder="手机号" />
        </n-form-item>
        <n-form-item label="角色">
          <n-checkbox-group v-model:value="formData.roles">
            <n-space>
              <n-checkbox value="student">学员</n-checkbox>
              <n-checkbox value="mentor">导师</n-checkbox>
              <n-checkbox value="data_mentor">数据 Mentor</n-checkbox>
              <n-checkbox value="admin">管理员</n-checkbox>
            </n-space>
          </n-checkbox-group>
        </n-form-item>
      </n-form>
    </n-modal>

    <!-- 批量导入弹窗 -->
    <n-modal v-model:show="showImportHelp" preset="dialog" title="📥 批量导入说明" positive-text="知道了">
      <p>导入结果将在上传后弹窗展示。</p>
      <n-button text type="primary" @click="downloadTemplate" style="margin-top: 8px;">📄 下载导入模板</n-button>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, h, computed, onMounted } from 'vue'
import { NButton, NSpin, NModal, NForm, NFormItem, NInput, NSelect, NCheckbox, NCheckboxGroup, NSpace, useMessage, useDialog } from 'naive-ui'
import * as XLSX from 'xlsx'
import api from '../../api/index.js'

const message = useMessage()
const dialog = useDialog()
const fileInput = ref(null)

const loading = ref(false)
const users = ref([])
const showCreateModal = ref(false)
const showImportHelp = ref(false)
const editingUser = ref(null)
const formData = ref({ name: '', phone: '', roles: ['student'] })
const searchKeyword = ref('')
const filterRole = ref(null)

const roleFilterOptions = [
  { label: '学员', value: 'student' },
  { label: '导师', value: 'mentor' },
  { label: '数据 Mentor', value: 'data_mentor' },
  { label: '管理员', value: 'admin' }
]

const roleType = (r) => ({ student: 'default', mentor: 'success', data_mentor: 'info', admin: 'warning' }[r] || 'default')
const roleTagClass = (r) => ({ student: 'pixel-tag-gray', mentor: 'pixel-tag-green', data_mentor: 'pixel-tag-blue', admin: 'pixel-tag-orange' }[r] || 'pixel-tag-gray')
const roleLabel = (r) => ({ student: '学员', mentor: '导师', data_mentor: '数据 Mentor', admin: '管理员' }[r] || r)
const sourceLabel = (s) => ({ manual: '手动添加', exam: '笔试通过', feishu: '飞书注册', import: '批量导入' }[s] || s || '-')

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const filteredUsers = computed(() => {
  let list = users.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    list = list.filter(u => u.name?.toLowerCase().includes(kw) || u.phone?.includes(kw))
  }
  if (filterRole.value) {
    list = list.filter(u => (u.roles || []).includes(filterRole.value))
  }
  return list
})

async function loadUsers() {
  loading.value = true
  try {
    const res = await api.get('/admin/users/manage')
    users.value = res.data || []
  } catch (err) {
    message.error('加载用户失败：' + err.message)
  } finally {
    loading.value = false
  }
}

function editUser(user) {
  editingUser.value = user
  formData.value = { name: user.name, phone: user.phone || '', roles: [...(user.roles || ['student'])] }
  showCreateModal.value = true
}

async function saveUser() {
  if (!formData.value.name.trim()) { message.warning('请输入姓名'); return false }
  if (!formData.value.phone.trim()) { message.warning('请输入手机号'); return false }
  if (formData.value.roles.length === 0) { message.warning('请至少选择一个角色'); return false }
  try {
    if (editingUser.value) {
      await api.put(`/admin/users/manage/${editingUser.value.id}`, formData.value)
      message.success('更新成功')
    } else {
      await api.post('/admin/users/manage', formData.value)
      message.success('创建成功')
    }
    showCreateModal.value = false
    editingUser.value = null
    formData.value = { name: '', phone: '', roles: ['student'] }
    await loadUsers()
  } catch (err) {
    message.error('保存失败：' + err.message)
    return false
  }
}

function confirmDelete(user) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除用户「${user.name}」吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/admin/users/manage/${user.id}`)
        message.success('删除成功')
        await loadUsers()
      } catch (err) {
        message.error('删除失败：' + err.message)
      }
    }
  })
}

onMounted(loadUsers)

// ==================== 批量导入 ====================

function triggerImport() {
  fileInput.value.click()
}

function downloadTemplate() {
  const ws = XLSX.utils.aoa_to_sheet([
    ['姓名', '手机号', '角色（可选，多角色用逗号分隔）'],
    ['张三', '13800138000', '学员'],
    ['李四', '13900139000', '导师,数据Mentor']
  ])
  ws['!cols'] = [{ wch: 15 }, { wch: 18 }, { wch: 35 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '学员导入模板')
  XLSX.writeFile(wb, '学员导入模板.xlsx')
}

async function handleImport(e) {
  const file = e.target.files[0]
  if (!file) return
  fileInput.value.value = ''

  const uploadData = new FormData()
  uploadData.append('file', file)

  const loadingMsg = message.loading('正在导入...', { duration: 0 })
  try {
    const res = await api.post('/admin/students/import', uploadData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    loadingMsg.destroy()

    const { success: count, skipped, failed } = res.data
    let content = `✅ 成功导入 ${count} 人`
    if (skipped > 0) content += `\n⏭️ 跳过 ${skipped} 人（已存在）`
    if (failed.length > 0) {
      content += `\n❌ 失败 ${failed.length} 行：`
      failed.forEach(f => {
        content += `\n　第${f.row}行 ${f.name || '-'} ${f.phone || '-'}：${f.reason}`
      })
    }

    dialog.info({
      title: '导入结果',
      content: () => content.split('\n').map((line, i) =>
        h('div', { key: i, style: { whiteSpace: 'pre', lineHeight: '1.8' } }, line)
      ),
      positiveText: '确定'
    })

    if (count > 0) loadUsers()
  } catch (err) {
    loadingMsg.destroy()
    message.error('导入失败：' + (err.response?.data?.message || err.message))
  }
}
</script>

<style scoped>
.users-page { ; }
</style>
