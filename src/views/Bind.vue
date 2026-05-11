<template>
  <div class="bind-page">
    <div class="bind-card">
      <div class="bind-header">
        <div class="bind-icon">⛺️</div>
        <h1>绑定账号</h1>
        <p>首次飞书登录，请绑定你的培训账号</p>
      </div>

      <div class="bind-form">
        <div class="form-group">
          <label>👤 姓名</label>
          <input
            v-model="form.name"
            type="text"
            placeholder="请输入真实姓名"
            maxlength="20"
            class="pixel-input"
          />
        </div>
        <div class="form-group">
          <label>📱 手机号</label>
          <input
            v-model="form.phone"
            type="text"
            placeholder="请输入培训时使用的手机号"
            maxlength="11"
            class="pixel-input"
            @keyup.enter="handleBind"
          />
        </div>
        <div v-if="errorMsg" class="error-block">
          <div class="error-icon">🚫</div>
          <div class="error-title">未找到匹配的账号</div>
          <div class="error-desc">{{ errorMsg }}</div>
        </div>
        <button
          class="pixel-btn"
          :disabled="loading"
          @click="handleBind"
        >
          {{ loading ? '绑定中...' : '🔗 绑定并登录' }}
        </button>
      </div>

      <div class="bind-tip">
        💡 请填写培训注册时使用的姓名和手机号，绑定后可直接用飞书一键登录
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage } from 'naive-ui'
import api from '../api/index.js'
import { useUserStore } from '../stores/user.js'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const userStore = useUserStore()

const loading = ref(false)
const feishuInfo = ref(null)
const errorMsg = ref('')

const form = ref({
  name: '',
  phone: ''
})

onMounted(async () => {
  const token = route.query.t
  if (!token) {
    message.error('缺少授权信息，请重新登录')
    router.replace('/login')
    return
  }

  try {
    const res = await api.get(`/auth/bind-info?t=${token}`)
    if (!res.success) {
      message.error(res.message)
      router.replace('/login')
      return
    }
    feishuInfo.value = res.data
    if (feishuInfo.value.name && !feishuInfo.value.name.startsWith('飞书用户')) {
      form.value.name = feishuInfo.value.name
    }
  } catch (e) {
    message.error(e.message || '获取授权信息失败')
    router.replace('/login')
  }
})

async function handleBind() {
  errorMsg.value = ''
  if (!form.value.name.trim()) {
    errorMsg.value = '请输入姓名'
    return
  }
  if (!/^1\d{10}$/.test(form.value.phone)) {
    errorMsg.value = '请输入正确的手机号'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/bind', {
      feishuId: feishuInfo.value?.feishuId,
      name: form.value.name,
      phone: form.value.phone,
      avatar: feishuInfo.value?.avatar
    })

    if (res.success) {
      userStore.setToken(res.data.token)
      userStore.setUserInfo(res.data.user)
      message.success('绑定成功！欢迎 🎉')
      router.push('/')
    }
  } catch (e) {
    errorMsg.value = e.message || '绑定失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.bind-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFF8E7;
  position: relative;
}
.bind-page::before {
  content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  background-image: radial-gradient(circle, #F5EDD8 1px, transparent 1px);
  background-size: 20px 20px; opacity: 0.5;
}

.bind-card {
  position: relative; z-index: 1;
  width: 380px; padding: 36px;
  background: #FFFDF5;
  border: 3px solid #E0D5C8;
  border-radius: 12px;
  box-shadow: 4px 4px 0 #E0D5C8;
}

.bind-header {
  text-align: center;
  margin-bottom: 28px;
}
.bind-icon { font-size: 44px; margin-bottom: 8px; }
.bind-header h1 { font-size: 22px; color: #5B3A29; margin-bottom: 6px; }
.bind-header p { font-size: 13px; color: #8B7355; }

.form-group { margin-bottom: 18px; }
.form-group label {
  font-size: 13px; color: #5B3A29; font-weight: 500;
  display: block; margin-bottom: 6px;
}
.pixel-input {
  width: 100%; padding: 10px 12px;
  border: 2px solid #E0D5C8; border-radius: 6px;
  background: #FFF8E7; font-size: 14px; color: #3E2723;
  outline: none; transition: border-color 0.2s;
}
.pixel-input:focus { border-color: #E8A93A; background: #FFFDF5; }
.pixel-input::placeholder { color: #C4B5A0; }

.error-block {
  margin-bottom: 18px;
  padding: 16px;
  background: #FFF5F3;
  border: 2px solid #E8A08A;
  border-radius: 8px;
  text-align: center;
  animation: shake 0.4s ease-in-out;
}
.error-block .error-icon { font-size: 36px; margin-bottom: 8px; }
.error-block .error-title { font-size: 15px; color: #C24A3A; font-weight: 600; margin-bottom: 6px; }
.error-block .error-desc { font-size: 12px; color: #8B7355; line-height: 1.6; }

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-3px); }
  80% { transform: translateX(3px); }
}

.pixel-btn {
  width: 100%; padding: 12px;
  border: 2px solid #5B3A29; border-radius: 6px;
  background: #5C8A4D; color: #fff; font-size: 15px; font-weight: 600;
  cursor: pointer; box-shadow: 2px 2px 0 #3E5A33;
  transition: transform 0.1s;
}
.pixel-btn:hover:not(:disabled) { transform: translate(1px, 1px); box-shadow: 1px 1px 0 #3E5A33; }
.pixel-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.bind-tip {
  margin-top: 20px; padding: 10px 12px;
  background: #FFF3E0; border: 1px dashed #FFB74D; border-radius: 6px;
  font-size: 12px; color: #8B7355; text-align: center; line-height: 1.6;
}
</style>
