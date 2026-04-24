<template>
  <div class="admin-layout">
    <aside class="admin-sidebar">
      <div class="sidebar-header">
        <span class="sidebar-logo">🏰</span>
        <span class="sidebar-title">培训管理后台</span>
      </div>
      <nav class="sidebar-nav">
        <!-- 数据看板 -->
        <router-link to="/admin/dashboard" class="nav-item">
          <span class="nav-icon">📊</span> 数据看板
        </router-link>

        <!-- 培训管理 -->
        <div class="nav-group">
          <div class="nav-group-title" @click="toggleGroup('training')">
            <span>📁 培训管理</span>
            <span class="nav-arrow">{{ groupOpen.training ? '▾' : '▸' }}</span>
          </div>
          <div v-show="groupOpen.training" class="nav-group-items">
            <router-link to="/admin/projects" class="nav-item sub">
              <span class="nav-icon">📋</span> 项目管理
            </router-link>
            <router-link to="/admin/question-bank" class="nav-item sub">
              <span class="nav-icon">📝</span> 题库管理
            </router-link>
            <router-link to="/admin/reviews" class="nav-item sub">
              <span class="nav-icon">✅</span> 实战审核
              <span v-if="pendingReviewCount > 0" class="nav-badge">{{ pendingReviewCount }}</span>
            </router-link>
          </div>
        </div>

        <!-- 学员管理 -->
        <div class="nav-group">
          <div class="nav-group-title" @click="toggleGroup('students')">
            <span>👥 学员管理</span>
            <span class="nav-arrow">{{ groupOpen.students ? '▾' : '▸' }}</span>
          </div>
          <div v-show="groupOpen.students" class="nav-group-items">
            <router-link to="/admin/students" class="nav-item sub">
              <span class="nav-icon">📈</span> 学员进度
            </router-link>
            <router-link to="/admin/users" class="nav-item sub">
              <span class="nav-icon">🔑</span> 账号管理
            </router-link>
          </div>
        </div>

        <!-- 系统 -->
        <div class="nav-group">
          <div class="nav-group-title" @click="toggleGroup('system')">
            <span>⚙️ 系统</span>
            <span class="nav-arrow">{{ groupOpen.system ? '▾' : '▸' }}</span>
          </div>
          <div v-show="groupOpen.system" class="nav-group-items">
            <router-link to="/admin/settings" class="nav-item sub">
              <span class="nav-icon">🔧</span> 系统设置
            </router-link>
            <router-link to="/admin/audit-logs" class="nav-item sub">
              <span class="nav-icon">📋</span> 操作日志
            </router-link>
          </div>
        </div>
      </nav>
      <div class="sidebar-footer">
        <div class="sidebar-avatar">管</div>
        <div>
          <div class="sidebar-user">{{ userStore.userInfo?.name || '管理员' }}</div>
          <div class="sidebar-logout" @click="logout">退出登录</div>
        </div>
      </div>
    </aside>
    <main class="admin-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, provide } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import api from '../api/index.js'

const router = useRouter()
const userStore = useUserStore()
const pendingReviewCount = ref(0)

const groupOpen = reactive({
  training: true,
  students: true,
  system: false
})

function toggleGroup(key) {
  groupOpen[key] = !groupOpen[key]
}

async function loadPendingCount() {
  try {
    const res = await api.get('/admin/reviews', { params: { status: 'pending' } })
    pendingReviewCount.value = (res.data || []).length
  } catch {}
}

provide('refreshPendingCount', loadPendingCount)

function logout() {
  userStore.logout()
  router.push('/login')
}

onMounted(() => {
  loadPendingCount()
  api.get('/admin/dashboard/overview').catch(() => {})
  api.get('/admin/students').catch(() => {})
})
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
}

/* ===== Sidebar ===== */
.admin-sidebar {
  width: 220px;
  background: var(--pixel-sidebar);
  color: #fff;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 20px 16px;
  border-bottom: 2px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-logo { font-size: 22px; }
.sidebar-title { font-size: 15px; font-weight: 600; letter-spacing: 2px; font-family: var(--pixel-font-title); }

.sidebar-nav {
  flex: 1;
  padding: 8px 0;
  display: flex;
  flex-direction: column;
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 20px;
  color: rgba(255,255,255,0.65);
  text-decoration: none;
  font-size: 14px;
  transition: all 0.15s;
  border-left: 3px solid transparent;
}
.nav-item:hover {
  background: var(--pixel-sidebar-hover);
  color: rgba(255,255,255,0.9);
}
.nav-item.router-link-active {
  background: var(--pixel-sidebar-active);
  color: #fff;
  border-left-color: var(--pixel-gold);
  font-weight: 500;
}
.nav-icon { font-size: 16px; width: 20px; text-align: center; }
.nav-badge {
  margin-left: auto;
  background: var(--pixel-red);
  color: #fff;
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 8px;
  font-weight: 600;
}

/* 导航分组 */
.nav-group { margin-top: 4px; }
.nav-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  font-size: 11px;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.35);
  cursor: pointer;
  user-select: none;
  font-weight: 700;
  text-transform: uppercase;
}
.nav-group-title:hover { color: rgba(255,255,255,0.55); }
.nav-arrow { font-size: 10px; }
.nav-group-items .nav-item.sub {
  padding-left: 32px;
  font-size: 13px;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255,255,255,0.1);
  display: flex;
  align-items: center;
  gap: 10px;
}
.sidebar-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--pixel-sidebar-active);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}
.sidebar-user { color: rgba(255,255,255,0.8); font-size: 13px; }
.sidebar-logout {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  cursor: pointer;
}
.sidebar-logout:hover { color: rgba(255,255,255,0.7); }

/* ===== Content ===== */
.admin-content {
  margin-left: 220px;
  flex: 1;
  padding: 24px 28px;
  min-height: 100vh;
  background: var(--pixel-bg);
  position: relative;
}
</style>
