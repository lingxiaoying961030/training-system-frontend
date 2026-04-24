<template>
  <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <router-view v-slot="{ Component }">
          <Transition name="page-fade" mode="out-in">
            <component :is="Component" />
          </Transition>
        </router-view>
        <PixelToast />
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref } from 'vue'
import { darkTheme } from 'naive-ui'
import PixelToast from './components/PixelToast.vue'

// 亮色主题，后面可以切换
const theme = ref(null)

// 主题色覆盖 — 培训系统配色
const themeOverrides = {
  common: {
    primaryColor: '#4F46E5',       // 靛蓝紫 — 专业又活泼
    primaryColorHover: '#6366F1',
    primaryColorPressed: '#4338CA',
    primaryColorSuppl: '#4F46E5',
    borderRadius: '8px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif'
  }
}
</script>

<style>
/* ① 路由过渡动画 */
.page-fade-enter-active {
  transition: opacity 250ms ease-out, transform 250ms ease-out;
}
.page-fade-leave-active {
  transition: opacity 120ms ease-in;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.page-fade-leave-to {
  opacity: 0;
}
</style>
