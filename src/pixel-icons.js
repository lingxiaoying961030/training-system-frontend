/**
 * 像素图标池配置
 * 
 * 增删图标步骤：
 * 1. 把 png 文件放到 public/pixel-icons/projects/ 或 plans/ 目录
 * 2. 在下面对应数组里加上/删掉文件名
 * 3. 完成！前端管理端选择器和学员端 fallback 都会自动更新
 */

// 项目图标（64px，显示在项目卡片封面）
export const PROJECT_ICONS = [
  'adventure_icon_64px.png',
  'chestRuby_icon_64px.png',
  'gem_icon_64px.png',
  'key_icon_64px.png',
  'energy_icon_64px.png',
]

// 计划图标（小图标，显示在计划列表左侧）
export const PLAN_ICONS = [
  'book.png',
  'sword.png',
  'trophy.png',
  'star_gold.png',
  'gift.png',
  'lightning.png',
  'star_iridium.png',
  'heart.png',
  'star_silver.png',
  'exclamation.png',
  'question.png',
]

// 封面渐变色池（项目卡片背景）
export const COVER_GRADIENTS = [
  'linear-gradient(135deg, #D4E7C5, #C5DEBA)',
  'linear-gradient(135deg, #C5D8E7, #B0CAD9)',
  'linear-gradient(135deg, #E7DFC8, #DDD4BC)',
  'linear-gradient(135deg, #E0D0E7, #D1BFD9)',
  'linear-gradient(135deg, #E7D4C5, #D9C4B0)',
  'linear-gradient(135deg, #C5E7DE, #B0D9CE)',
]

// 根据 ID 稳定分配（同一 ID 永远同一图标）
export function hashId(id) {
  return String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

export function getProjectIcon(project) {
  if (project.icon) return `/pixel-icons/projects/${project.icon}`
  return `/pixel-icons/projects/${PROJECT_ICONS[hashId(project.id) % PROJECT_ICONS.length]}`
}

export function getPlanIcon(plan) {
  if (plan.icon) return `/pixel-icons/plans/${plan.icon}`
  return `/pixel-icons/plans/${PLAN_ICONS[hashId(plan.id) % PLAN_ICONS.length]}`
}

export function getCoverGradient(id) {
  return COVER_GRADIENTS[hashId(id) % COVER_GRADIENTS.length]
}
