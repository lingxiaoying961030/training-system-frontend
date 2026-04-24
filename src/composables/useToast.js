// 像素风 Toast 通知系统
import { reactive } from 'vue'

const toasts = reactive([])
let id = 0

const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' }

function show(type, title, msg, duration = 3000) {
  const toast = { id: ++id, type, title, msg, icon: icons[type] || 'ℹ️', leaving: false }
  toasts.push(toast)
  if (duration > 0) {
    setTimeout(() => dismiss(toast.id), duration)
  }
}

function dismiss(toastId) {
  const t = toasts.find(t => t.id === toastId)
  if (!t || t.leaving) return
  t.leaving = true
  setTimeout(() => {
    const idx = toasts.findIndex(t => t.id === toastId)
    if (idx !== -1) toasts.splice(idx, 1)
  }, 300)
}

export function useToast() {
  return {
    toasts,
    dismiss,
    success: (title, msg) => show('success', title, msg),
    error: (title, msg) => show('error', title, msg, 5000),
    warning: (title, msg) => show('warning', title, msg, 4000),
    info: (title, msg) => show('info', title, msg),
  }
}
