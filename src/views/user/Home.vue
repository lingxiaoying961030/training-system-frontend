<template>
  <div class="home-page">
    <!-- 欢迎区 -->
    <div class="welcome-section">
      <h1>🎓 欢迎来到培训系统</h1>
      <p class="subtitle">闯关式学习，轻松掌握数据标注技能</p>
      <n-button type="primary" size="large" @click="goToMap">
        开始学习 →
      </n-button>
    </div>

    <!-- 首页板块（从后端获取） -->
    <div class="sections" v-if="sections.length">
      <div
        v-for="(section, index) in sections"
        :key="section.key"
        class="section-card"
        :style="{ animationDelay: `${index * 0.1}s` }"
      >
        <div class="section-icon">
          <span>{{ sectionIcons[section.key] || '📌' }}</span>
        </div>
        <h2>{{ section.title }}</h2>
        <div class="section-content" v-html="section.content"></div>
      </div>
    </div>

    <!-- 无数据时显示默认内容 -->
    <div class="sections" v-else>
      <div class="section-card">
        <div class="section-icon"><span>📋</span></div>
        <h2>任务介绍</h2>
        <p>在这里，你将系统学习数据标注的核心技能，从基础概念到实战演练，一步步成为专业的标注员。</p>
      </div>
      <div class="section-card">
        <div class="section-icon"><span>🗺️</span></div>
        <h2>培训流程</h2>
        <p>培训采用闯关模式，每个关卡包含知识学习、自动测试和实战演练。通过所有关卡后，将分配专属 Mentor 进行后续指导。</p>
      </div>
      <div class="section-card">
        <div class="section-icon"><span>🏆</span></div>
        <h2>激励计划</h2>
        <p>表现优异的学员将获得实习机会、优先录用等激励。认真对待每一关，展现你的实力吧！</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../../api/index.js'

const router = useRouter()
const sections = ref([])

const sectionIcons = {
  intro: '📋',
  flow: '🗺️',
  incentive: '🏆',
  notice: '📢',
  guide: '📖'
}

function goToMap() {
  router.push('/map')
}

onMounted(async () => {
  try {
    const res = await api.get('/home')
    if (res.success) {
      sections.value = res.data
    }
  } catch {
    // 静默失败，使用默认内容
  }
})
</script>

<style scoped>
.home-page {
  padding-bottom: 40px;
}

.welcome-section {
  text-align: center;
  padding: 48px 24px 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  margin-bottom: 32px;
  color: #fff;
}

.welcome-section h1 {
  font-size: 32px;
  margin-bottom: 12px;
}

.subtitle {
  font-size: 16px;
  opacity: 0.9;
  margin-bottom: 24px;
}

.sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-card {
  background: #fff;
  border-radius: 12px;
  padding: 28px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: transform 0.2s, box-shadow 0.2s;
  animation: fadeInUp 0.4s ease both;
}

.section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.section-icon {
  margin-bottom: 12px;
}

.section-icon span {
  font-size: 28px;
}

.section-card h2 {
  font-size: 20px;
  color: #1d1d1f;
  margin-bottom: 12px;
}

.section-card p,
.section-content {
  font-size: 15px;
  color: #636366;
  line-height: 1.7;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
