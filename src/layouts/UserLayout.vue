<template>
  <div class="user-layout">
    <header class="user-header">
      <div class="header-left">
        <router-link to="/projects" class="logo">{{ siteSettings.get('nav_title', '🏰 培训系统') }}</router-link>
      </div>
      <div class="header-right">
        <router-link to="/projects" class="nav-link">全部项目</router-link>
        <div class="avatar-menu" v-if="!loggingOut" @mouseenter="showMenu = true" @mouseleave="showMenu = false">
          <img :src="avatarHead" class="nav-avatar" />
          <div v-if="showMenu" class="avatar-dropdown">
            <div class="avatar-dropdown-inner">
              <router-link to="/profile" class="dropdown-item">👤 个人中心</router-link>
              <a href="javascript:;" class="dropdown-item logout" @click="handleLogout">🚪 退出登录</a>
            </div>
          </div>
        </div>
      </div>
    </header>
    <main class="user-content">
      <router-view />
    </main>
    <!-- P3: 底部草地装饰条 -->
    <div class="ground-deco">
      <div class="ground-grass"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user.js'
import { useSiteSettingsStore } from '../stores/siteSettings.js'
import { getAvatarHead } from '../pixel-map.js'

const router = useRouter()
const userStore = useUserStore()
const siteSettings = useSiteSettingsStore()
const showMenu = ref(false)
const loggingOut = ref(false)

const avatarHead = computed(() => getAvatarHead(userStore.userInfo?.avatar, userStore.userInfo?.id))

function handleLogout() {
  loggingOut.value = true
  showMenu.value = false
  userStore.logout()
  router.replace('/login')
}
</script>

<style scoped>
.user-layout {
  min-height: 100vh;
  background: var(--pixel-bg, #FFF8E7);
}
.user-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 56px;
  background: var(--pixel-card, #FFFDF5);
  border-bottom: 2px solid var(--pixel-border, #E0D5C8);
}
.logo {
  font-size: 17px;
  font-weight: 600;
  color: var(--pixel-brown, #5B3A29);
  text-decoration: none;
  font-family: var(--pixel-font-title);
  letter-spacing: 2px;
}
.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}
.nav-link {
  color: var(--pixel-text-secondary, #8B7355);
  text-decoration: none;
  font-size: 14px;
}
.nav-link:hover { color: var(--pixel-text, #3E2723); }

/* 头像下拉菜单 */
.avatar-menu {
  position: relative;
  cursor: pointer;
}
.nav-avatar {
  width: 36px;
  height: 36px;
  image-rendering: pixelated;
  border: 2px solid var(--pixel-gold, #E8A93A);
  display: block;
  transition: border-color 0.15s;
}
.nav-avatar:hover {
  border-color: var(--pixel-brown, #5B3A29);
}
.avatar-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  padding-top: 6px;
  z-index: 100;
}
.avatar-dropdown-inner {
  background: var(--pixel-card, #FFFDF5);
  border: 3px solid var(--pixel-brown, #5B3A29);
  min-width: 140px;
  box-shadow: 4px 4px 0 rgba(91,58,41,0.15);
}
.dropdown-item {
  display: block;
  padding: 10px 14px;
  font-size: 13px;
  color: var(--pixel-text, #3E2723);
  text-decoration: none;
  transition: background 0.1s;
}
.dropdown-item:hover {
  background: #F5EFE0;
}
.dropdown-item.logout {
  color: var(--pixel-red, #C24A3A);
  border-top: 1px solid var(--pixel-border, #E0D5C8);
}

.user-content {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 24px 80px;
}

/* P3: 底部草地装饰 */
.ground-deco {
  position: fixed; bottom: 0; left: 0; right: 0; height: 36px;
  pointer-events: none; z-index: 0; overflow: hidden;
}
.ground-grass {
  width: 100%; height: 24px; position: absolute; bottom: 0;
  background: linear-gradient(to top, #7CAA6E 0%, #9BC48E 60%, transparent 100%);
  opacity: 0.18;
}
</style>
