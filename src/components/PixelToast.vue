<template>
  <Teleport to="body">
    <div class="px-toast-container" v-if="toasts.length">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="px-toast"
        :class="[t.type, { leaving: t.leaving }]"
      >
        <span class="toast-icon">{{ t.icon }}</span>
        <div class="toast-content">
          <div class="toast-title">{{ t.title }}</div>
          <div v-if="t.msg" class="toast-msg">{{ t.msg }}</div>
        </div>
        <button class="toast-close" @click="dismiss(t.id)">✕</button>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '../composables/useToast.js'
const { toasts, dismiss } = useToast()
</script>

<style scoped>
.px-toast-container {
  position: fixed; top: 20px; right: 20px; z-index: 99999;
  display: flex; flex-direction: column; gap: 10px; pointer-events: none;
}
.px-toast {
  background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px;
  padding: 12px 16px; min-width: 260px; max-width: 380px;
  box-shadow: 0 4px 16px rgba(91,58,41,0.15);
  display: flex; align-items: flex-start; gap: 10px;
  animation: toast-in 0.3s ease-out;
  pointer-events: auto;
}
.px-toast.leaving { animation: toast-out 0.3s ease-in forwards; }
@keyframes toast-in { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
@keyframes toast-out { from { opacity: 1; } to { opacity: 0; transform: translateX(40px); } }

.px-toast.success { border-left: 4px solid #5C8A4D; }
.px-toast.error { border-left: 4px solid #C24A3A; }
.px-toast.warning { border-left: 4px solid #E8A93A; }
.px-toast.info { border-left: 4px solid #4A90B8; }

.toast-icon { font-size: 18px; flex-shrink: 0; margin-top: 1px; }
.toast-content { flex: 1; }
.toast-title { font-size: 13px; font-weight: 600; color: #5B3A29; }
.toast-msg { font-size: 12px; color: #8B7355; margin-top: 2px; line-height: 1.4; }
.toast-close { background: none; border: none; color: #bbb; cursor: pointer; font-size: 14px; padding: 0 2px; }
.toast-close:hover { color: #5B3A29; }
</style>
