<template>
  <div class="welcome-page" @click="onPageClick">
    <!-- 星星 -->
    <div class="star" v-for="s in stars" :key="s.id"
      :style="{ left: s.x+'%', top: s.y+'%', animationDelay: s.delay+'s', width: s.size+'px', height: s.size+'px' }">
    </div>

    <!-- 对话框 -->
    <div v-if="phase === 'dialog'" class="dialog-box" :class="{ visible: dialogVisible }">
      <div class="dialog-speaker">
        <img src="/pixel-icons/decorations/deco_junimo.png" /> {{ siteSettings.get('welcome_speaker', 'Junimo 精灵') }}
      </div>
      <div class="dialog-text" v-html="displayedText + '<span class=\'cursor\'></span>'"></div>
      <div v-if="canAdvance" class="dialog-hint">点击任意位置继续 ▶</div>
    </div>

    <!-- 角色选择 -->
    <div v-if="phase === 'avatar'" class="avatar-select" :class="{ visible: avatarVisible }">
      <h3>{{ siteSettings.get('welcome_choose_title', '✨ 选择你的冒险伙伴') }}</h3>
      <div class="avatar-grid">
        <div v-for="a in avatarList" :key="a"
          class="avo" :class="{ selected: selectedAvatar === a }"
          @click.stop="selectAvatar(a)">
          <img :src="`/pixel-icons/avatars/avatar_${a}_head.png`" />
        </div>
      </div>
      <div class="confirm-row">
        <button class="cbtn" :class="{ ok: selectedAvatar }" :disabled="!selectedAvatar || saving" @click.stop="confirmAvatar">
          {{ saving ? '保存中...' : '🚀 出发冒险！' }}
        </button>
      </div>
    </div>

    <!-- 过渡 -->
    <div v-if="phase === 'transition'" class="trans">
      <img :src="`/pixel-icons/avatars/avatar_${selectedAvatar}.png`" />
      <p>冒险开始...</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { AVATARS } from '../pixel-map.js'
import api from '../api/index.js'
import { useUserStore } from '../stores/user.js'

import { useSiteSettingsStore } from '../stores/siteSettings.js'

const router = useRouter()
const userStore = useUserStore()
const siteSettings = useSiteSettingsStore()

const avatarList = AVATARS.map(a => a.key)

const defaultLines = [
  '欢迎来到培训营地！🏕️',
  '在这里，每个项目都是一段冒险旅程...',
  '你将闯过一个个关卡，学习新技能，接受挑战！⚔️',
  '不过在出发之前——你得先选一个冒险伙伴。',
]
const dialogLines = computed(() => siteSettings.getJSON('welcome_lines', defaultLines))

const phase = ref('dialog')
const dialogVisible = ref(false)
const avatarVisible = ref(false)
const selectedAvatar = ref(null)
const saving = ref(false)

// 打字机
const displayedText = ref('')
const canAdvance = ref(false)
let currentLine = 0
let typing = false
let charIdx = 0
let typeTimer = null

// 星星
const stars = reactive([])
for (let i = 0; i < 80; i++) {
  stars.push({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    size: Math.random() > 0.7 ? 3 : 2
  })
}

function typeText(text) {
  typing = true
  charIdx = 0
  canAdvance.value = false
  displayedText.value = ''
  function tick() {
    if (!typing) return
    if (charIdx < text.length) {
      charIdx++
      displayedText.value = text.substring(0, charIdx)
      typeTimer = setTimeout(tick, 35 + Math.random() * 25)
    } else {
      typing = false
      canAdvance.value = true
    }
  }
  tick()
}

function skipType() {
  typing = false
  clearTimeout(typeTimer)
  displayedText.value = dialogLines.value[currentLine]
  canAdvance.value = true
}

function onPageClick() {
  if (phase.value !== 'dialog') return
  if (typing) { skipType(); return }
  currentLine++
  if (currentLine < dialogLines.value.length) {
    typeText(dialogLines.value[currentLine])
  } else {
    phase.value = 'avatar'
    setTimeout(() => { avatarVisible.value = true }, 50)
  }
}

function selectAvatar(key) {
  selectedAvatar.value = key
}

async function confirmAvatar() {
  if (!selectedAvatar.value || saving.value) return
  saving.value = true
  try {
    await api.put('/training/my-avatar', { avatar: selectedAvatar.value })
    if (userStore.userInfo) {
      userStore.userInfo.avatar = selectedAvatar.value
      localStorage.setItem('training_user', JSON.stringify(userStore.userInfo))
    }
    // 过渡动画
    phase.value = 'transition'
    setTimeout(() => {
      const roles = userStore.userInfo?.roles || []
      if (roles.includes('admin') || roles.includes('mentor') || roles.includes('guide')) {
        router.replace('/admin/projects')
      } else {
        router.replace('/projects')
      }
    }, 2000)
  } catch (e) {
    alert('保存失败：' + e.message)
    saving.value = false
  }
}

onMounted(() => {
  setTimeout(() => {
    dialogVisible.value = true
    setTimeout(() => typeText(dialogLines.value[0]), 400)
  }, 300)
})
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #1a1a2e;
  overflow: hidden; position: relative;
}

.star {
  position: absolute; background: #FFE8A0; border-radius: 50%;
  animation: twinkle 2s ease-in-out infinite;
}
@keyframes twinkle { 0%,100%{opacity:0.2} 50%{opacity:1} }

.dialog-box {
  position: relative; z-index: 10; width: 560px; max-width: 90vw;
  background: url('/pixel-icons/ui/letterBG_clean.png') center / 100% 100% no-repeat;
  border: 4px solid var(--pixel-brown, #5B3A29);
  box-shadow: 5px 5px 0 rgba(0,0,0,0.5);
  padding: 22px 26px;
  opacity: 0; transform: translateY(20px);
  transition: all 0.6s ease;
}
.dialog-box.visible { opacity: 1; transform: translateY(0); }

.dialog-speaker { font-size: 14px; font-weight: 600; color: var(--pixel-brown, #5B3A29); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
.dialog-speaker img { width: 28px; height: 28px; image-rendering: pixelated; }
.dialog-text { font-size: 16px; line-height: 1.8; color: var(--pixel-text, #3E2723); min-height: 68px; }
.dialog-text :deep(.cursor) { display: inline-block; width: 2px; height: 18px; background: var(--pixel-brown, #5B3A29); margin-left: 2px; animation: blink 0.6s step-end infinite; vertical-align: text-bottom; }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
.dialog-hint { text-align: right; margin-top: 8px; font-size: 12px; color: var(--pixel-text-secondary, #8B7355); animation: pulse 1.5s ease-in-out infinite; }
@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }

.avatar-select {
  position: relative; z-index: 10; width: 560px; max-width: 90vw;
  background: url('/pixel-icons/ui/letterBG_clean.png') center / 100% 100% no-repeat;
  border: 4px solid var(--pixel-brown, #5B3A29);
  box-shadow: 5px 5px 0 rgba(0,0,0,0.5);
  padding: 18px 22px;
  opacity: 0; transform: translateY(20px);
  transition: all 0.6s ease;
}
.avatar-select.visible { opacity: 1; transform: translateY(0); }
.avatar-select h3 { font-size: 15px; color: var(--pixel-brown, #5B3A29); margin: 0 0 12px; text-align: center; }

.avatar-grid {
  display: grid; grid-template-columns: repeat(8, 1fr); gap: 6px;
  max-height: 185px; overflow-y: auto; overflow-x: hidden;
  padding: 4px;
}
.avatar-grid::-webkit-scrollbar { width: 6px; }
.avatar-grid::-webkit-scrollbar-thumb { background: var(--pixel-border, #E0D5C8); border-radius: 3px; }

.avo {
  aspect-ratio: 1; border: 3px solid var(--pixel-border, #E0D5C8);
  cursor: pointer; background: rgba(255,253,245,0.5);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s;
}
.avo:hover { border-color: var(--pixel-gold, #E8A93A); transform: scale(1.08); background: rgba(255,253,245,0.85); }
.avo.selected { border-color: var(--pixel-green, #5C8A4D); background: #ECF5E8; box-shadow: 0 0 0 2px var(--pixel-green, #5C8A4D); }
.avo img { width: 80%; height: 80%; image-rendering: pixelated; object-fit: contain; }

.confirm-row { margin-top: 14px; text-align: center; }
.cbtn {
  padding: 10px 40px; font-size: 14px; font-weight: 600;
  border: 3px solid var(--pixel-brown, #5B3A29); cursor: pointer;
  color: #fff; background: var(--pixel-green, #5C8A4D);
  opacity: 0.35; pointer-events: none; transition: all 0.15s;
}
.cbtn.ok { opacity: 1; pointer-events: auto; }
.cbtn.ok:hover { background: #4A7A3D; box-shadow: 3px 3px 0 var(--pixel-brown, #5B3A29); }
.cbtn:disabled { opacity: 0.4; pointer-events: none; }

.trans {
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  animation: fadeIn 0.5s ease;
}
.trans img { width: 64px; height: 64px; image-rendering: pixelated; animation: walkB 0.4s steps(2) infinite; }
@keyframes walkB { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
.trans p { font-size: 16px; color: #FFE8A0; font-weight: 500; }
@keyframes fadeIn { from{opacity:0} to{opacity:1} }
</style>
