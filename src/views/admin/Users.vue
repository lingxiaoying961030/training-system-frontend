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

        <!-- 翻页 -->
        <div v-if="totalPages > 1" class="px-pagination">
          <button class="px-page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">‹ 上一页</button>
          <template v-for="p in paginationPages" :key="p">
            <span v-if="p === '...'" style="color:#ccc;font-size:12px">…</span>
            <span v-else class="px-page-num" :class="{ active: p === currentPage }" @click="goPage(p)">{{ p }}</span>
          </template>
          <button class="px-page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页 ›</button>
          <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
        </div>
        <div v-else-if="searchFiltered.length > 0" class="px-pagination">
          <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
        </div>
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
          <n-checkbox-group v-model:value="formData.roles" @update:value="onRolesChange">
            <n-space>
              <n-checkbox value="student" :disabled="hasNonStudentRole">学员</n-checkbox>
              <n-checkbox value="mentor" :disabled="hasStudentRole">导师</n-checkbox>
              <n-checkbox value="data_mentor" :disabled="hasStudentRole">数据 Mentor</n-checkbox>
              <n-checkbox value="admin" :disabled="hasStudentRole">管理员</n-checkbox>
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
import { ref, h, computed, onMounted, watch } from 'vue'
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
const currentPage = ref(1)
const pageSize = 15

const searchFiltered = computed(() => {
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

const totalPages = computed(() => Math.ceil(searchFiltered.value.length / pageSize))

const filteredUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return searchFiltered.value.slice(start, start + pageSize)
})

const paginationPages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
  const pages = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

function goPage(p) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

// 角色互斥
const hasStudentRole = computed(() => formData.value.roles.includes('student'))
const hasNonStudentRole = computed(() => formData.value.roles.some(r => r !== 'student'))

function onRolesChange(newRoles) {
  // 如果刚选了 student，移除其他角色
  if (newRoles.includes('student') && !formData.value.roles.includes('student')) {
    formData.value.roles = ['student']
    return
  }
  // 如果刚选了非 student 角色，移除 student
  const nonStudent = newRoles.filter(r => r !== 'student')
  if (nonStudent.length > 0 && newRoles.includes('student')) {
    formData.value.roles = nonStudent
    return
  }
  formData.value.roles = newRoles
}

const roleTagClass = (r) => ({ student: 'pixel-tag-gray', mentor: 'pixel-tag-green', data_mentor: 'pixel-tag-blue', admin: 'pixel-tag-orange' }[r] || 'pixel-tag-gray')
const roleLabel = (r) => ({ student: '学员', mentor: '导师', data_mentor: '数据 Mentor', admin: '管理员' }[r] || r)
const sourceLabel = (s) => ({ manual: '手动添加', exam: '笔试通过', feishu: '飞书注册', import: '批量导入' }[s] || s || '-')

function formatDate(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

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

watch([searchKeyword, filterRole], () => { currentPage.value = 1 })
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

/* 翻页 */
.px-pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; font-size: 13px; color: var(--pixel-muted, #9e8a76); border-top: 1px solid #e8dcc8; background: #faf8f0; }
.px-page-btn { padding: 5px 12px; border: 2px solid #d4c5a0; background: var(--pixel-card, #fffbf0); border-radius: 4px; cursor: pointer; font-size: 12px; color: var(--pixel-text, #4a3728); transition: all 0.15s; }
.px-page-btn:hover:not(:disabled) { border-color: var(--pixel-border, #8b6914); background: #f0e6d2; }
.px-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.px-page-num { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #d4c5a0; background: var(--pixel-card, #fffbf0); border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.px-page-num:hover { border-color: var(--pixel-border, #8b6914); background: #f0e6d2; }
.px-page-num.active { background: var(--pixel-link, #4a90d9); color: #fff; border-color: #3a7bc8; }
.px-page-total { margin-left: 8px; font-size: 11px; color: var(--pixel-muted, #9e8a76); }
</style>
