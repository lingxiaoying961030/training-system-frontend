<template>
  <div class="profile-page">
    <div v-if="loading" class="pixel-empty">加载中...</div>

    <template v-else-if="profile">
      <!-- 个人信息卡片 -->
      <div class="user-card">
        <img :src="$base + '/pixel-icons/dobo/notebookModal_v1.png'" class="banner-bg" alt="" />
        <div class="banner-content user-card-inner">
        <div class="user-avatar-wrap" @click="showAvatarPicker = true">
          <img :src="currentAvatarFull" class="user-avatar-img" />
          <span class="avatar-edit-hint">点击换角色</span>
        </div>
        <div class="user-info">
          <h1>{{ profile.user.name }}</h1>
          <p class="user-phone">📱 {{ profile.user.phone || '未绑定手机' }}</p>
          <p class="user-since">加入时间：{{ formatDate(profile.user.createdAt) }}</p>
        </div>
        </div>
      </div>

      <!-- 角色选择弹窗 -->
      <div v-if="showAvatarPicker" class="avatar-modal-mask" @click.self="showAvatarPicker = false">
        <div class="avatar-modal">
          <h3>选择你的冒险角色</h3>
          <div class="avatar-grid">
            <div
              v-for="a in avatarList"
              :key="a.key"
              class="avatar-option"
              :class="{ active: selectedAvatar === a.key }"
              @click="selectedAvatar = a.key"
            >
              <img :src="getHeadSrc(a.key)" />
              <span class="avatar-name">{{ a.name }}</span>
            </div>
          </div>
          <div class="avatar-modal-actions">
            <button class="pixel-btn-cancel" @click="showAvatarPicker = false">取消</button>
            <button class="pixel-btn-confirm" @click="saveAvatar" :disabled="savingAvatar">
              {{ savingAvatar ? '保存中...' : '确认选择' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 学习概览 -->
      <div class="section">
        <div class="section-header">📚 学习概览</div>
        <div v-if="progressLoading" class="pixel-empty" style="padding:30px 0;">加载学习进度中...</div>
        <div v-else-if="!profile.projects.length" class="pixel-empty" style="padding:30px 0;">暂无学习数据</div>

        <div v-for="proj in profile.projects" :key="proj.id" class="project-block">
          <div class="project-title">
            <img :src="getProjectIconSrc(proj)" class="project-icon-small" />
            {{ proj.name }}
          </div>

          <div v-for="plan in proj.plans" :key="plan.id" class="plan-block">
            <div class="plan-header" @click="togglePlan(plan.id)">
              <div class="plan-info">
                <img :src="getPlanIconSrc(plan)" class="plan-icon-small" />
                <span class="plan-name">{{ plan.name }}</span>
                <span class="stage-tag" :class="planStatus(plan)">{{ planStatusText(plan) }}</span>
              </div>
              <div class="plan-right">
                <div class="progress-wrap-sm">
                  <div :class="planStatus(plan) === 'completed' ? 'progress-fill-green' : 'progress-fill-yellow'"
                       :style="{ width: planPercent(plan) + '%' }"></div>
                </div>
                <span class="progress-text-sm">{{ plan.completedStages }}/{{ plan.totalStages }}</span>
                <span class="expand-icon">{{ expandedPlans.includes(plan.id) ? '▲' : '▼' }}</span>
              </div>
            </div>

            <div v-if="expandedPlans.includes(plan.id)" class="stages-list">
              <div v-for="stage in plan.stages" :key="stage.id" class="stage-row">
                <img :src="stageStatusIcon(stage.status)" class="stage-icon-small" />
                <span class="stage-title-text">{{ stage.title }}</span>
                <span class="stage-tag" :class="stage.status">{{ stageStatusText(stage.status) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import api from '../../api/index.js'
import { AVATARS, getAvatarHead, getAvatarFull } from '../../pixel-map.js'
import { getProjectIcon, getPlanIcon } from '../../pixel-icons.js'
import { assetUrl, BASE } from '../../asset-url.js'

const progressFillYellowBg = `url('${BASE}/pixel-icons/ui/progressBar_yellow.png')`
const progressFillGreenBg = `url('${BASE}/pixel-icons/ui/progressBar_green.png')`
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const loading = ref(true)
const profile = ref(null)
const progressLoading = ref(true)
const expandedPlans = ref([])
const showAvatarPicker = ref(false)
const selectedAvatar = ref('')
const savingAvatar = ref(false)

const avatarList = AVATARS

const currentAvatarFull = computed(() => getAvatarFull(profile.value?.user?.avatar || selectedAvatar.value, profile.value?.user?.id))

function getHeadSrc(key) { return getAvatarHead(key) }
function getProjectIconSrc(proj) { return getProjectIcon(proj) }
function getPlanIconSrc(plan) { return getPlanIcon(plan) }

function stageStatusIcon(status) {
  const map = { completed: assetUrl('/pixel-icons/ui/checkmark.png'), active: assetUrl('/pixel-icons/ui/flag.png'), failed: assetUrl('/pixel-icons/ui/star_gold.png'), locked: assetUrl('/pixel-icons/ui/lock.png') }
  return map[status] || assetUrl('/pixel-icons/ui/lock.png')
}

async function saveAvatar() {
  if (!selectedAvatar.value) return
  savingAvatar.value = true
  try {
    await api.put('/training/my-avatar', { avatar: selectedAvatar.value })
    profile.value.user.avatar = selectedAvatar.value
    // 同步到 store
    if (userStore.userInfo) {
      userStore.userInfo.avatar = selectedAvatar.value
      localStorage.setItem('training_user', JSON.stringify(userStore.userInfo))
    }
    showAvatarPicker.value = false
  } catch (err) {
    console.error('保存头像失败:', err.message)
  } finally {
    savingAvatar.value = false
  }
}

function togglePlan(planId) {
  const idx = expandedPlans.value.indexOf(planId)
  if (idx >= 0) expandedPlans.value.splice(idx, 1)
  else expandedPlans.value.push(planId)
}

function planPercent(plan) {
  if (plan.totalStages === 0) return 0
  return Math.round((plan.completedStages / plan.totalStages) * 100)
}

function planStatus(plan) {
  if (plan.completedStages >= plan.totalStages && plan.totalStages > 0) return 'completed'
  if (plan.completedStages > 0 || plan.stages.some(s => s.status === 'active')) return 'in_progress'
  return 'not_started'
}

function planStatusText(plan) {
  const s = planStatus(plan)
  if (s === 'completed') return '已完成'
  if (s === 'in_progress') return '学习中'
  return '未开始'
}

function stageStatusText(status) {
  return { completed: '已通过', active: '进行中', locked: '未解锁', failed: '未通过' }[status] || status
}

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })
}

onMounted(async () => {
  // 先用 store 里的数据立即显示用户卡片
  if (userStore.userInfo) {
    profile.value = {
      user: {
        id: userStore.userInfo.id,
        name: userStore.userInfo.name,
        phone: userStore.userInfo.phone,
        avatar: userStore.userInfo.avatar,
        createdAt: userStore.userInfo.createdAt
      },
      projects: []
    }
    selectedAvatar.value = userStore.userInfo.avatar || ''
    loading.value = false
  }

  try {
    const res = await api.get('/training/my-profile')
    if (res.success) {
      profile.value = res.data
      selectedAvatar.value = res.data.user?.avatar || ''
    }
  } catch (err) {
    console.error('加载个人中心失败:', err.message)
  } finally {
    loading.value = false
    progressLoading.value = false
  }
})
</script>

<style scoped>
.profile-page { padding-bottom: 40px; }
.pixel-empty { text-align: center; padding: 60px 0; color: var(--pixel-text-secondary); }

/* 用户卡片 */
.user-card {
  position: relative;
  margin-bottom: 28px; overflow: hidden;
}
.banner-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill; z-index: 0;
}
.banner-content { position: relative; z-index: 1; }
.user-card-inner {
  display: flex; align-items: center; gap: 24px;
  padding: 28px 40px 28px 64px;
}

.user-avatar-wrap {
  flex-shrink: 0; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  transition: transform 0.15s;
}
.user-avatar-wrap:hover { transform: scale(1.05); }
.user-avatar-img { width: 40px; image-rendering: pixelated; }
.avatar-edit-hint { font-size: 10px; color: var(--pixel-blue); }

.user-info h1 { margin: 0 0 6px; font-size: 22px; color: var(--pixel-brown); }
.user-phone { margin: 0 0 2px; font-size: 14px; color: var(--pixel-text-secondary); }
.user-since { margin: 0; font-size: 13px; color: var(--pixel-text-secondary); opacity: 0.7; }

/* 角色选择弹窗 */
.avatar-modal-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4);
  z-index: 1000; display: flex; align-items: center; justify-content: center;
}
.avatar-modal {
  background: var(--pixel-card); border: 4px solid var(--pixel-brown);
  padding: 24px; max-width: 520px; width: 90%; max-height: 80vh; overflow-y: auto;
}
.avatar-modal h3 { font-size: 18px; color: var(--pixel-brown); margin: 0 0 16px; text-align: center; }
.avatar-grid { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-bottom: 20px; }
.avatar-option {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px; border: 2px solid var(--pixel-border);
  width: 68px; cursor: pointer; background: var(--pixel-card);
  transition: all 0.15s;
}
.avatar-option:hover { border-color: var(--pixel-gold); }
.avatar-option.active { border-color: var(--pixel-brown); background: #F5EFE0; box-shadow: 2px 2px 0 var(--pixel-brown); }
.avatar-option img { width: 40px; height: 40px; image-rendering: pixelated; }
.avatar-name { font-size: 9px; color: var(--pixel-text-secondary); text-align: center; line-height: 1.1; }

.avatar-modal-actions { display: flex; justify-content: center; gap: 12px; }
.pixel-btn-cancel {
  padding: 6px 16px; font-size: 13px; cursor: pointer;
  border: 2px solid var(--pixel-border); background: var(--pixel-card);
  color: var(--pixel-text-secondary);
}
.pixel-btn-confirm {
  padding: 6px 16px; font-size: 13px; cursor: pointer;
  border: 2px solid var(--pixel-brown); background: var(--pixel-green);
  color: #fff; font-weight: 500;
}
.pixel-btn-confirm:hover { background: #4A7A3D; box-shadow: 2px 2px 0 var(--pixel-brown); }
.pixel-btn-confirm:disabled { opacity: 0.5; cursor: not-allowed; }

/* 学习概览 */
.section-header { font-size: 18px; font-weight: 600; color: var(--pixel-brown); margin: 0 0 16px; }

.project-block { margin-bottom: 20px; }
.project-title {
  font-size: 15px; font-weight: 600; color: var(--pixel-brown);
  padding: 8px 0; margin-bottom: 8px;
  border-bottom: 3px solid var(--pixel-gold);
  display: flex; align-items: center; gap: 8px;
}
.project-icon-small { width: 24px; height: 24px; image-rendering: pixelated; }

.plan-block {
  background: var(--pixel-card); border: 2px solid var(--pixel-border);
  margin-bottom: 8px; overflow: hidden;
}
.plan-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 14px; cursor: pointer; user-select: none;
}
.plan-header:hover { background: #FFFBF2; }
.plan-info { display: flex; align-items: center; gap: 8px; }
.plan-icon-small { width: 20px; height: 20px; image-rendering: pixelated; }
.plan-name { font-size: 14px; font-weight: 500; color: var(--pixel-text); }

.stage-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; padding: 1px 6px; font-weight: 500;
  border: 2px solid; background: var(--pixel-card);
}
.stage-tag.completed { border-color: #A5D6A7; color: #2E7D32; }
.stage-tag.in_progress { border-color: #FFCC80; color: #E65100; }
.stage-tag.not_started { border-color: #D5C9B8; color: #8B7355; }
.stage-tag.active { border-color: #FFCC80; color: #E65100; }
.stage-tag.failed { border-color: #EF9A9A; color: #C62828; }
.stage-tag.locked { border-color: #D5C9B8; color: #8B7355; }

.plan-right { display: flex; align-items: center; gap: 8px; }
.progress-wrap-sm {
  width: 80px; height: 8px;
  background: #E0D5C8;
  border: 1px solid #D0C5B8;
}
.progress-fill-yellow { height: 100%; background-image: v-bind(progressFillYellowBg); background-size: cover; image-rendering: pixelated; }
.progress-fill-green { height: 100%; background-image: v-bind(progressFillGreenBg); background-size: cover; image-rendering: pixelated; }
.progress-text-sm { font-size: 11px; color: var(--pixel-text-secondary); min-width: 28px; text-align: right; }
.expand-icon { color: var(--pixel-text-secondary); font-size: 11px; }

/* 关卡列表 */
.stages-list { border-top: 1px solid var(--pixel-border); padding: 6px 14px; }
.stage-row {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 0; border-bottom: 1px solid #F5F0E8;
  font-size: 13px;
}
.stage-row:last-child { border-bottom: none; }
.stage-icon-small { width: 16px; height: 16px; image-rendering: pixelated; }
.stage-title-text { flex: 1; color: var(--pixel-text); }
</style>
