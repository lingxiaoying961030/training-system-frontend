<template>
  <div class="login-page">
    <!-- 云朵 -->
    <img class="cloud-deco cloud-1" src="/pixel-icons/ui/clouds_small.png" />
    <img class="cloud-deco cloud-2" src="/pixel-icons/ui/clouds_small.png" />

    <!-- 底部草地+灌木 -->
    <div class="ground"></div>
    <img class="ground-bush gb1" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb2" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb3" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb4" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb5" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb6" src="/pixel-icons/ui/bush_00.png" />
    <img class="ground-bush gb7" src="/pixel-icons/ui/bush_00.png" />

    <!-- 树和动物 -->
    <img class="login-deco deco-tree-l" src="/pixel-icons/decorations/deco_tree1.png" />
    <img class="login-deco deco-tree-r" src="/pixel-icons/decorations/deco_tree2.png" />
    <img class="login-deco deco-a1" src="/pixel-icons/decorations/deco_chicken.png" />
    <img class="login-deco deco-a2" src="/pixel-icons/decorations/deco_cat.png" />
    <img class="login-deco deco-a3" src="/pixel-icons/decorations/deco_junimo.png" />

    <!-- 登录面板 -->
    <div class="login-panel">
      <div class="login-logo">
        <div class="login-logo-icon">{{ siteSettings.get('login_icon', '🏕️') }}</div>
        <h1>{{ siteSettings.get('login_title', 'AI训练营') }}</h1>
        <p>{{ siteSettings.get('login_subtitle', '开启你的学习冒险之旅') }}</p>
      </div>
      <div class="login-form">
        <div class="form-group">
          <label>👤 姓名</label>
          <input class="form-input" type="text" v-model="phoneForm.name" placeholder="请输入姓名" @keyup.enter="handlePhoneLogin" />
        </div>
        <div class="form-group">
          <label>📱 手机号</label>
          <input class="form-input" type="tel" v-model="phoneForm.phone" placeholder="请输入手机号" maxlength="11" @keyup.enter="handlePhoneLogin" />
        </div>
        <button class="login-btn" :disabled="loading" @click="handlePhoneLogin">
          {{ loading ? '登录中...' : '⚔️ 开始冒险' }}
        </button>
        <div class="login-divider">或</div>
        <button class="feishu-btn" :disabled="feishuLoading" @click="handleFeishuLogin">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M3 6.5L10.5 2L21 13.5L13.5 22L3 6.5Z" fill="#4A90B8"/><path d="M3 6.5L13.5 22L10.5 14.5L3 6.5Z" fill="#2D6A9F"/></svg>
          {{ feishuLoading ? '跳转中...' : '飞书登录' }}
        </button>
      </div>
      <div class="login-footer">内部培训系统 · 仅限授权人员使用</div>
    </div>

    <!-- 错误提示 -->
    <div v-if="errorMsg" class="error-toast">{{ errorMsg }}</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api/index.js'
import { useUserStore } from '../stores/user.js'
import { useSiteSettingsStore as useSiteSettings } from '../stores/siteSettings.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const siteSettings = useSiteSettings()

const loading = ref(false)
const feishuLoading = ref(false)
const errorMsg = ref('')

const phoneForm = ref({ name: '', phone: '' })

function showError(msg) {
  errorMsg.value = msg
  setTimeout(() => { errorMsg.value = '' }, 3000)
}

function getRedirectPath(roles) {
  if (!roles) return '/projects'
  if (roles.includes('admin') || roles.includes('mentor') || roles.includes('guide')) {
    return '/admin/projects'
  }
  return '/projects'
}

async function handlePhoneLogin() {
  if (!phoneForm.value.name.trim()) { showError('请输入姓名'); return }
  if (!/^1\d{10}$/.test(phoneForm.value.phone)) { showError('手机号格式不正确'); return }

  loading.value = true
  try {
    const res = await api.post('/auth/login', phoneForm.value)
    handleLoginSuccess(res)
  } catch (e) {
    showError(e.message)
  } finally {
    loading.value = false
  }
}

async function handleFeishuLogin() {
  feishuLoading.value = true
  try {
    const res = await api.get('/auth/feishu')
    if (res.success) window.location.href = res.data.authUrl
    else showError(res.message)
  } catch (e) {
    showError(e.message)
  } finally {
    feishuLoading.value = false
  }
}

function handleLoginSuccess(res) {
  userStore.setToken(res.data.token)
  userStore.setUserInfo(res.data.user)
  // 管理员直接进管理端，不走欢迎页
  const roles = res.data.user?.roles || []
  if (roles.includes('admin') || roles.includes('mentor') || roles.includes('guide')) {
    router.push(getRedirectPath(roles))
  } else if (!res.data.user?.avatar) {
    router.push('/welcome')
  } else {
    router.push(getRedirectPath(roles))
  }
}

onMounted(() => {
  const { token, feishu_error } = route.query
  if (feishu_error) {
    showError(decodeURIComponent(feishu_error))
    router.replace('/login')
  } else if (token) {
    const decoded = decodeURIComponent(token)
    userStore.setToken(decoded)
    // 管理员直接进管理端
    const roles = userStore.userInfo?.roles || []
    if (roles.includes('admin') || roles.includes('mentor') || roles.includes('guide')) {
      router.replace(getRedirectPath(roles))
    } else if (!userStore.userInfo?.avatar) {
      router.replace('/welcome')
    } else {
      router.replace(getRedirectPath(roles))
    }
  }
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #87CEEB 0%, #B8E0F0 35%, #E8DFC8 75%, #D4C9A8 100%);
  overflow: hidden; position: relative;
}

/* 云朵 */
.cloud-deco { position: absolute; z-index: 1; pointer-events: none; image-rendering: pixelated; }
.cloud-1 { width: 360px; top: 6%; left: 5%; opacity: 0.7; animation: drift 45s linear infinite; }
.cloud-2 { width: 280px; top: 14%; right: 8%; opacity: 0.5; animation: drift 60s linear infinite reverse; }
@keyframes drift { 0%{transform:translateX(0)} 50%{transform:translateX(50px)} 100%{transform:translateX(0)} }

/* 底部草地 */
.ground {
  position: absolute; bottom: 0; left: 0; right: 0; height: 90px; z-index: 1;
  background: linear-gradient(180deg, rgba(106,171,78,0) 0%, rgba(90,154,62,0.6) 30%, #4A8C3F 100%);
}
.ground-bush { position: absolute; bottom: 0; image-rendering: pixelated; pointer-events: none; z-index: 2; }
.gb1 { left: 0; bottom: 0; height: 50px; }
.gb2 { left: 15%; bottom: 0; height: 50px; }
.gb3 { left: 30%; bottom: 0; height: 50px; transform: scaleX(-1); }
.gb4 { left: 50%; bottom: 0; height: 50px; }
.gb5 { left: 65%; bottom: 0; height: 50px; transform: scaleX(-1); }
.gb6 { left: 80%; bottom: 0; height: 50px; }
.gb7 { right: 0; bottom: 0; height: 50px; transform: scaleX(-1); }

/* 装饰 */
.login-deco { position: absolute; image-rendering: pixelated; pointer-events: none; z-index: 3; }
.deco-tree-l { left: 3%; bottom: 40px; width: 100px; opacity: 0.85; }
.deco-tree-r { right: 4%; bottom: 45px; width: 88px; opacity: 0.75; transform: scaleX(-1); }
.deco-a1 { left: 16%; bottom: 35px; width: 40px; animation: bob 3s ease-in-out infinite; }
.deco-a2 { right: 17%; bottom: 38px; width: 36px; animation: bob 3.5s ease-in-out infinite 0.5s; }
.deco-a3 { left: 50%; bottom: 30px; width: 30px; animation: bob 2.8s ease-in-out infinite 1s; transform: translateX(-50%); }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }

/* 面板 */
.login-panel {
  position: relative; z-index: 10;
  width: 360px; max-width: 88vw;
  background: url('/pixel-icons/ui/letterBG_clean.png') center / 100% 100% no-repeat;
  border: 4px solid var(--pixel-brown, #5B3A29);
  box-shadow: 5px 5px 0 rgba(91,58,41,0.3);
  padding: 28px 26px 22px;
  animation: panelIn 0.6s ease;
}
@keyframes panelIn { from{opacity:0;transform:translateY(20px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }

.login-logo { text-align: center; margin-bottom: 20px; }
.login-logo-icon { font-size: 36px; margin-bottom: 2px; }
.login-logo h1 { font-size: 19px; color: var(--pixel-brown, #5B3A29); margin: 0; }
.login-logo p { font-size: 12px; color: var(--pixel-text-secondary, #8B7355); margin-top: 3px; }

.login-form { display: flex; flex-direction: column; gap: 11px; }
.form-group { display: flex; flex-direction: column; gap: 3px; }
.form-group label { font-size: 12px; color: var(--pixel-text-secondary, #8B7355); font-weight: 500; }
.form-input { padding: 9px 12px; font-size: 14px; border: 2px solid var(--pixel-border, #E0D5C8); background: rgba(255,253,245,0.75); color: var(--pixel-text, #3E2723); outline: none; }
.form-input:focus { border-color: var(--pixel-gold, #E8A93A); background: rgba(255,253,245,0.92); }
.form-input::placeholder { color: #C5B89A; }

.login-btn { padding: 10px; font-size: 15px; font-weight: 600; border: 3px solid var(--pixel-brown, #5B3A29); cursor: pointer; color: #fff; background: var(--pixel-green, #5C8A4D); transition: all 0.15s; margin-top: 2px; }
.login-btn:hover:not(:disabled) { background: #4A7A3D; box-shadow: 3px 3px 0 var(--pixel-brown, #5B3A29); }
.login-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.login-divider { display: flex; align-items: center; gap: 12px; margin: 1px 0; color: var(--pixel-text-secondary, #8B7355); font-size: 12px; }
.login-divider::before, .login-divider::after { content: ''; flex: 1; height: 1px; background: #D5C0A5; }

.feishu-btn { padding: 9px; font-size: 14px; border: 2px solid var(--pixel-border, #E0D5C8); cursor: pointer; color: var(--pixel-brown, #5B3A29); background: rgba(255,253,245,0.6); display: flex; align-items: center; justify-content: center; gap: 8px; }
.feishu-btn:hover:not(:disabled) { border-color: var(--pixel-blue, #4A90B8); background: rgba(240,250,255,0.75); }
.feishu-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.login-footer { text-align: center; margin-top: 12px; font-size: 11px; color: var(--pixel-text-secondary, #8B7355); opacity: 0.7; }

.error-toast {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 100;
  padding: 10px 24px; background: var(--pixel-red, #C24A3A); color: #fff;
  border: 2px solid #8B2A1A; font-size: 14px;
  animation: toastIn 0.3s ease;
}
@keyframes toastIn { from{opacity:0;transform:translateX(-50%) translateY(-10px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
</style>
