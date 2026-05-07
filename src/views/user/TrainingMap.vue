<template>
  <div class="map-page">
    <!-- Header -->
    <div class="map-header">
      <img :src="$base + '/pixel-icons/dobo/notebookModal_v1.png'" class="banner-bg" alt="" />
      <div class="banner-content">
        <div class="map-breadcrumb">
          <router-link v-if="projectId" :to="`/projects/${projectId}/plans`">返回计划列表</router-link>
          <router-link v-else to="/projects">返回项目</router-link>
          <span v-if="planName"> / {{ planName }}</span>
        </div>
        <h1>🗺️ {{ planName || '&nbsp;' }}</h1>
        <p class="map-subtitle">{{ siteSettings.get('map_subtitle', '闯关式学习，一步步成为专业标注员！') }}</p>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="skeleton-stages">
      <div v-for="i in 4" :key="i" class="skel-stage"><div class="skel-circle"></div><div class="skel-lines"><div class="skel-line w80"></div><div class="skel-line w60"></div></div></div>
    </div>
    <div v-else-if="!stages.length" class="pixel-empty-fancy">
      <img :src="$base + '/pixel-icons/plans/sword.png'" class="empty-icon" />
      <div class="empty-title">暂未开放关卡</div>
      <div class="empty-sub">冒险地图正在绘制中...</div>
    </div>

    <!-- Map Area -->
    <div v-else class="map-area" :style="mapBgStyle">
      <!-- 固定树（左右底部） -->
      <img class="deco" :src="$base + '/pixel-icons/decorations/deco_tree1.png'"
           style="left:-4px; bottom:-6px; height:100px; opacity:0.45;" />
      <img class="deco" :src="$base + '/pixel-icons/decorations/deco_tree2.png'"
           style="right:-2px; bottom:-6px; height:90px; opacity:0.4;" />

      <!-- 随机装饰动物 -->
      <img v-for="(d, i) in decoItems" :key="'deco'+i"
           class="deco" :src="d.src" :style="d.style" />

      <!-- 关卡路径 -->
      <div class="stage-path">
        <template v-for="(stage, index) in stages" :key="stage.id">
          <!-- SVG 连接路径（第一个关卡前不需要） -->
          <div v-if="index > 0" class="path-segment path-draw-in" :style="{ animationDelay: (index * 300) + 'ms' }">
            <svg viewBox="0 0 600 44" preserveAspectRatio="none">
              <template v-if="stage.status !== 'locked' && stages[index-1].status !== 'locked'">
                <path :d="getPathD(index)" stroke="#5B3A29" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.12"/>
                <path :d="getPathD(index)" stroke="#E8A93A" stroke-width="6" fill="none" stroke-linecap="round"/>
              </template>
              <template v-else>
                <path :d="getPathD(index)" stroke="#C8B8A0" stroke-width="6" fill="none" stroke-dasharray="8 6" stroke-linecap="round"/>
              </template>
            </svg>
          </div>

          <!-- 关卡节点 -->
          <div class="stage-node-wrap node-bounce-in" :class="index % 2 === 0 ? 'left' : 'right'"
               :style="{ position: 'relative', animationDelay: (index * 300 + 150) + 'ms' }">
            <div class="stage-card" :class="{ locked: stage.status === 'locked' }"
                 @click="enterStage(stage)">
              <div class="stage-icon" :class="stage.status">
                <img :src="getStageIcon(stage.status)" />
                <span class="stage-num">{{ index + 1 }}</span>
              </div>
              <div class="stage-info">
                <div class="stage-title-row">
                  <span class="stage-title">{{ stage.title }}</span>
                  <span class="stage-tag" :class="stage.status">
                    <img :src="getStageIcon(stage.status)" />
                    {{ statusLabel(stage.status) }}
                  </span>
                </div>
                <p v-if="stage.description" class="stage-desc">{{ stage.description }}</p>
                <!-- 星级评分 -->
                <div v-if="stage.status === 'completed'" class="star-rating">
                  <span class="star filled">★</span><span class="star filled">★</span><span class="star filled">★</span>
                  <span class="star-label">已通关</span>
                </div>
                <div v-if="stage.mentors && stage.mentors.length" class="stage-mentors">
                  👤 导师：{{ stage.mentors.join('、') }}
                </div>
                <div v-if="stage.completed_at" class="stage-time">
                  完成时间：{{ formatDate(stage.completed_at) }}
                </div>
                <div v-if="stage.status !== 'locked'" class="stage-btn"
                     :class="stage.status === 'completed' ? 'blue' : 'green'">
                  <img :src="stage.status === 'completed' ? $base + '/pixel-icons/plans/book.png' : $base + '/pixel-icons/ui/arrow_green.png'" />
                  {{ stage.status === 'completed' ? '查看详情' : '进入关卡' }}
                </div>
              </div>
            </div>

            <!-- 学员角色（显示在当前进行中的关卡旁） -->
            <img v-if="stage.status === 'active'"
                 class="player-char"
                 :src="playerAvatar"
                 :style="index % 2 === 0
                   ? 'position:absolute; right:-56px; bottom:8px; height:68px;'
                   : 'position:absolute; left:-56px; bottom:8px; height:68px;'" />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../../api/index.js'
import { getMapBackground, generateDecorations, getAvatarFull } from '../../pixel-map.js'
import { useUserStore } from '../../stores/user.js'
import { useSiteSettingsStore } from '../../stores/siteSettings.js'
import { assetUrl } from '../../asset-url.js'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const siteSettings = useSiteSettingsStore()
const stages = ref([])
const loading = ref(true)
const planName = ref('')

const planId = route.params.planId || null
const projectId = ref(null)

// 玩家头像
const playerAvatar = computed(() => {
  const avatar = userStore.userInfo?.avatar
  const userId = userStore.userInfo?.id
  return getAvatarFull(avatar, userId)
})

// 地图背景
const mapBg = computed(() => planId ? getMapBackground(planId) : getMapBackground('default'))
const mapBgStyle = computed(() => ({
  backgroundColor: mapBg.value.color,
  backgroundImage: `url(${mapBg.value.image})`,
}))

// 装饰动物
const decoItems = computed(() => planId ? generateDecorations(planId) : [])

// SVG 路径（左右交替的 S 型曲线）
function getPathD(index) {
  // 偶数 index: 从左到右; 奇数: 从右到左
  if (index % 2 === 1) {
    return 'M 120 0 C 120 22, 480 22, 480 44'
  } else {
    return 'M 480 0 C 480 22, 120 22, 120 44'
  }
}

function getStageIcon(status) {
  const map = {
    completed: assetUrl('/pixel-icons/ui/checkmark.png'),
    active: assetUrl('/pixel-icons/ui/flag.png'),
    failed: assetUrl('/pixel-icons/ui/star_gold.png'),
    locked: assetUrl('/pixel-icons/ui/lock.png'),
  }
  return map[status] || assetUrl('/pixel-icons/ui/flag.png')
}

function statusLabel(status) {
  return { completed: '已通过', active: '进行中', failed: '未通过', locked: '未解锁' }[status] || ''
}

function formatDate(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function enterStage(stage) {
  if (stage.status === 'locked') return
  router.push(`/stage/${stage.id}?planId=${planId || ''}`)
}

async function loadPlanInfo() {
  if (!planId) return
  try {
    const res = await api.get(`/training/plans/${planId}`)
    if (res.success && res.data) {
      projectId.value = res.data.project_id
      planName.value = res.data.name || ''
    }
  } catch {}
}

onMounted(async () => {
  loadPlanInfo()
  try {
    const params = {}
    if (planId) params.planId = planId
    const res = await api.get('/training/map', { params })
    if (res.success) {
      stages.value = res.data
    }
  } catch (err) {
    console.error('获取培训地图失败', err)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.map-page { padding-bottom: 40px; }

/* Header — notebookModal 统一样式 */
.map-header {
  position: relative; text-align: center;
  padding: 36px 24px 40px; margin-bottom: 28px; overflow: hidden;
}
.banner-bg {
  position: absolute; inset: 0; width: 100%; height: 100%;
  object-fit: fill; z-index: 0;
}
.banner-content { position: relative; z-index: 1; }
.map-header h1 { font-size: 22px; color: var(--pixel-brown); margin-bottom: 6px; font-family: var(--pixel-font-title); letter-spacing: 2px; text-shadow: 0 1px 2px rgba(255,255,255,0.5); }
.map-subtitle { font-size: 14px; color: var(--pixel-text-secondary); }
.map-breadcrumb { font-size: 13px; color: var(--pixel-text-secondary); margin-bottom: 10px; }
.map-breadcrumb a { color: var(--pixel-blue, #4A90B8); text-decoration: none; }

/* Map Area */
.map-area {
  position: relative; padding: 48px 0 40px; overflow: hidden;
  border: 4px solid var(--pixel-brown);
  background-size: 128px 128px; background-repeat: repeat;
  image-rendering: pixelated;
}

/* 装饰 */
.deco { position: absolute; image-rendering: pixelated; z-index: 0; pointer-events: none; }

/* 学员角色 */
.player-char {
  image-rendering: pixelated; z-index: 3;
  filter: drop-shadow(1px 1px 0 rgba(0,0,0,0.15));
  animation: player-bounce 2s ease-in-out infinite;
}
@keyframes player-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

/* Stage Path */
.stage-path {
  position: relative; z-index: 2;
  display: flex; flex-direction: column; align-items: center;
}

/* ③ 路径绘制动画 */
.path-draw-in {
  opacity: 0;
  animation: path-fade-in 400ms ease-out forwards;
}
.path-draw-in svg path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: draw-path 500ms ease-out forwards;
  animation-delay: inherit;
}
@keyframes draw-path {
  to { stroke-dashoffset: 0; }
}
@keyframes path-fade-in {
  to { opacity: 1; }
}

/* ③ 关卡节点弹入 */
.node-bounce-in {
  opacity: 0;
  animation: node-bounce 400ms ease-out forwards;
}
@keyframes node-bounce {
  0%   { opacity: 0; transform: scale(0.6); }
  70%  { opacity: 1; transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
}

.stage-node-wrap {
  width: 100%; max-width: 600px;
  display: flex; padding: 0 24px;
}
.stage-node-wrap.left { justify-content: flex-start; }
.stage-node-wrap.right { justify-content: flex-end; }

.path-segment {
  width: 100%; max-width: 600px; height: 44px;
  position: relative; z-index: 1;
}
.path-segment svg { width: 100%; height: 100%; }

/* Stage Card */
.stage-card {
  display: flex; align-items: flex-start; gap: 12px;
  background: var(--pixel-card); border: 3px solid var(--pixel-border);
  padding: 14px 16px; max-width: 360px;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s, border-color 0.15s;
}
.stage-card:hover {
  transform: translateY(-2px);
  box-shadow: 4px 4px 0 var(--pixel-brown);
  border-color: var(--pixel-brown);
  animation: pixel-border-flash 0.6s steps(2) infinite;
}
.stage-card.locked { opacity: 0.5; cursor: default; filter: saturate(0.3); }
.stage-card.locked:hover { transform: none; box-shadow: none; border-color: var(--pixel-border); }

/* Stage Icon */
.stage-icon {
  flex-shrink: 0; width: 48px; height: 48px;
  display: flex; align-items: center; justify-content: center;
  border: 3px solid var(--pixel-border); background: #F0EBE3;
  position: relative;
}
.stage-icon img { width: 32px; height: 32px; image-rendering: pixelated; }
.stage-num {
  position: absolute; bottom: -5px; right: -5px;
  background: var(--pixel-brown); color: #fff;
  font-size: 10px; font-weight: bold;
  width: 18px; height: 18px;
  display: flex; align-items: center; justify-content: center;
  border: 2px solid var(--pixel-card);
}
.stage-icon.completed { border-color: var(--pixel-green); background: #ECF5E8; }
.stage-icon.active { border-color: var(--pixel-gold); background: #FFF8E7; }
.stage-icon.failed { border-color: var(--pixel-red); background: #FFF0EE; }

/* Stage Info */
.stage-info { flex: 1; min-width: 0; }
.stage-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; flex-wrap: wrap; }
.stage-title { font-size: 14px; font-weight: 600; color: var(--pixel-brown); }

.stage-tag {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 10px; padding: 1px 6px; font-weight: 500;
  border: 2px solid; background: var(--pixel-card);
}
.stage-tag img { width: 12px; height: 12px; image-rendering: pixelated; }
.stage-tag.completed { border-color: #A5D6A7; color: #2E7D32; }
.stage-tag.active { border-color: #FFCC80; color: #E65100; }
.stage-tag.failed { border-color: #EF9A9A; color: #C62828; }
.stage-tag.locked { border-color: #D5C9B8; color: #8B7355; }

.stage-desc { font-size: 12px; color: var(--pixel-text-secondary); line-height: 1.4; margin: 3px 0; }

/* 星级评分 */
.star-rating { display: flex; align-items: center; gap: 1px; margin-top: 4px; }
.star { font-size: 16px; }
.star.filled { color: #FFD700; filter: drop-shadow(0 1px 1px rgba(255,215,0,0.3)); }
.star.empty { color: #E0D5C8; }
.star-label { font-size: 10px; color: #B0A090; margin-left: 6px; }
.stage-mentors { font-size: 11px; color: var(--pixel-brown-light, #8B6F5E); }
.stage-time { font-size: 11px; color: #B0A090; }

.stage-btn {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 6px; font-size: 11px; font-weight: 500;
  color: #fff; border: 2px solid var(--pixel-brown);
  padding: 3px 10px; cursor: pointer;
}
.stage-btn img { width: 12px; height: 12px; image-rendering: pixelated; }
.stage-btn.green { background: var(--pixel-green); }
.stage-btn.green:hover { background: #4A7A3D; box-shadow: 2px 2px 0 var(--pixel-brown); }
.stage-btn.blue { background: var(--pixel-blue, #4A90B8); }

.pixel-empty { text-align: center; padding: 60px 0; color: var(--pixel-text-secondary); }
.pixel-empty-fancy { text-align: center; padding: 60px 24px; display: flex; flex-direction: column; align-items: center; }
.pixel-empty-fancy .empty-icon { height: 40px; opacity: 0.55; image-rendering: pixelated; margin-bottom: 12px; }
.pixel-empty-fancy .empty-title { font-family: var(--pixel-font-title); font-size: 16px; letter-spacing: 2px; color: var(--pixel-text-secondary); margin-bottom: 4px; }
.pixel-empty-fancy .empty-sub { font-size: 12px; color: #B0A090; }
.skeleton-stages { display: flex; flex-direction: column; gap: 16px; padding: 20px 0; }
.skel-stage { display: flex; align-items: center; gap: 16px; }
.skel-circle { width: 48px; height: 48px; border-radius: 50%; background: #F0EAE0; flex-shrink: 0; position: relative; overflow: hidden; }
.skel-circle::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%); animation: shimmer 1.8s ease-in-out infinite; }
.skel-lines { flex: 1; }
.skel-line { height: 10px; background: #EDE7DA; margin-bottom: 8px; position: relative; overflow: hidden; }
.skel-line::after { content:''; position:absolute; inset:0; background: linear-gradient(90deg, transparent 0%, rgba(255,248,231,0.5) 50%, transparent 100%); animation: shimmer 1.8s ease-in-out infinite; }
.skel-line.w80 { width: 80%; } .skel-line.w60 { width: 60%; }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
</style>
