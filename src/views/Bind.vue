<template>
  <div class="bind-page">
    <div class="bind-card">
      <div class="bind-header">
        <h1>🔗 完善信息</h1>
        <p>首次使用飞书登录，请绑定手机号</p>
      </div>

      <n-form ref="formRef" :model="form" :rules="rules">
        <n-form-item path="name" label="姓名">
          <n-input
            v-model:value="form.name"
            placeholder="请输入真实姓名"
            :maxlength="20"
          />
        </n-form-item>
        <n-form-item path="phone" label="手机号">
          <n-input
            v-model:value="form.phone"
            placeholder="请输入手机号"
            :maxlength="11"
            @keyup.enter="handleBind"
          />
        </n-form-item>
        <n-button
          type="primary"
          block
          strong
          size="large"
          :loading="loading"
          @click="handleBind"
        >
          绑定并登录
        </n-button>
      </n-form>

      <div class="bind-tip">
        <p>💡 如果你是笔试通过人员，请填写笔试时使用的姓名和手机号</p>
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
const formRef = ref(null)
const feishuInfo = ref(null)

const form = ref({
  name: '',
  phone: ''
})

const rules = {
  name: { required: true, message: '请输入姓名', trigger: 'blur' },
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1\d{10}$/, message: '手机号格式不正确', trigger: 'blur' }
  ]
}

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
  try {
    await formRef.value?.validate()
  } catch {
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
    message.error(e.message)
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.bind-card {
  width: 420px;
  padding: 40px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
}

.bind-header {
  text-align: center;
  margin-bottom: 32px;
}

.bind-header h1 {
  font-size: 28px;
  margin-bottom: 8px;
  color: #1d1d1f;
}

.bind-header p {
  font-size: 14px;
  color: #86868b;
}

.bind-tip {
  margin-top: 20px;
  text-align: center;
  font-size: 13px;
  color: #86868b;
}
</style>
