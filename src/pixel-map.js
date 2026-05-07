import { assetUrl } from './asset-url.js'

/**
 * 地图装饰配置
 * 背景、装饰动物、角色头像的集中管理
 */

// 地图背景池（按 planId hash 随机分配）
export const MAP_BACKGROUNDS = [
  { color: '#E8E1CC', image: assetUrl('/pixel-icons/backgrounds/bg_meadow.png') },
  { color: '#E4DCCC', image: assetUrl('/pixel-icons/backgrounds/bg_path.png') },
  { color: '#F5EBDB', image: assetUrl('/pixel-icons/backgrounds/bg_parchment.png') },
]

// 装饰动物池（随机散布在地图边缘）
export const DECO_ANIMALS = [
  'deco_chicken.png', 'deco_brown_chicken.png', 'deco_void_chicken.png',
  'deco_duck.png', 'deco_cat.png', 'deco_dog.png',
  'deco_goat.png', 'deco_sheep.png', 'deco_pig.png',
  'deco_brown_cow.png', 'deco_white_cow.png', 'deco_horse.png',
  'deco_junimo.png',
]

// 角色头像列表（学员选择用）
export const AVATARS = [
  { key: 'abigail', name: '阿比盖尔' },
  { key: 'alex', name: '亚历克斯' },
  { key: 'caroline', name: '卡洛琳' },
  { key: 'clint', name: '克林特' },
  { key: 'demetrius', name: '德米特里' },
  { key: 'elliott', name: '艾利欧特' },
  { key: 'emily', name: '艾米丽' },
  { key: 'haley', name: '海莉' },
  { key: 'harvey', name: '哈维' },
  { key: 'jas', name: '贾斯' },
  { key: 'jodi', name: '乔迪' },
  { key: 'kent', name: '肯特' },
  { key: 'leah', name: '莉亚' },
  { key: 'lewis', name: '刘易斯' },
  { key: 'linus', name: '莱纳斯' },
  { key: 'marnie', name: '玛妮' },
  { key: 'maru', name: '玛鲁' },
  { key: 'pam', name: '帕姆' },
  { key: 'penny', name: '潘妮' },
  { key: 'pierre', name: '皮埃尔' },
  { key: 'robin', name: '罗宾' },
  { key: 'sam', name: '山姆' },
  { key: 'sandy', name: '桑迪' },
  { key: 'sebastian', name: '塞巴斯蒂安' },
  { key: 'shane', name: '谢恩' },
  { key: 'vincent', name: '文森特' },
  { key: 'willy', name: '威利' },
  { key: 'wizard', name: '巫师' },
  { key: 'gus', name: '格斯' },
  { key: 'gunther', name: '冈瑟' },
  { key: 'krobus', name: '科罗布斯' },
  { key: 'dwarf', name: '矮人' },
  { key: 'junimo', name: '祝尼魔' },
  { key: 'robot', name: '机器人' },
]

export function getAvatarHead(key, userId) {
  if (!key && userId) {
    const idx = hashStr(userId) % AVATARS.length
    key = AVATARS[idx].key
  }
  if (!key) key = 'abigail'
  return assetUrl(`/pixel-icons/avatars/avatar_${key}_head.png`)
}

export function getAvatarFull(key, userId) {
  if (!key && userId) {
    const idx = hashStr(userId) % AVATARS.length
    key = AVATARS[idx].key
  }
  if (!key) key = 'abigail'
  return assetUrl(`/pixel-icons/avatars/avatar_${key}.png`)
}

// 基于种子的伪随机（同一 id 总是得到相同结果）
function seededRandom(seed) {
  let s = seed
  return function() {
    s = (s * 1103515245 + 12345) & 0x7fffffff
    return s / 0x7fffffff
  }
}

export function hashStr(str) {
  return String(str).split('').reduce((a, c) => a + c.charCodeAt(0), 0)
}

// 获取地图背景（按 planId）
export function getMapBackground(planId) {
  const h = hashStr(planId)
  return MAP_BACKGROUNDS[h % MAP_BACKGROUNDS.length]
}

// 生成装饰动物位置（4个固定区域槽位，微随机偏移，不与树重叠）
export function generateDecorations(planId) {
  const seed = hashStr(planId)
  const rand = seededRandom(seed)

  // 4个槽位：左上、右上、左中、右中
  // 每个槽位有一个基准位置 + 随机偏移范围
  const slots = [
    { base: { left: 50, top: 6 },   range: { x: 25, y: 8 } },   // 左上
    { base: { right: 55, top: 8 },  range: { x: 20, y: 10 } },  // 右上
    { base: { left: 18, top: 40 },  range: { x: 15, y: 10 } },  // 左中
    { base: { right: 22, top: 45 }, range: { x: 18, y: 8 } },   // 右中
  ]

  // 从动物池随机挑 4 个（不重复）
  const shuffled = [...DECO_ANIMALS].sort(() => rand() - 0.5)
  const picked = shuffled.slice(0, 4)

  return picked.map((file, i) => {
    const slot = slots[i]
    const offsetX = Math.round((rand() - 0.5) * 2 * slot.range.x)
    const offsetY = Math.round((rand() - 0.5) * 2 * slot.range.y)
    const size = 32 + Math.round(rand() * 12) // 32-44px
    const opacity = 0.4 + rand() * 0.15       // 0.4-0.55

    const style = { height: `${size}px`, opacity }
    if (slot.base.left !== undefined) {
      style.left = `${slot.base.left + offsetX}px`
    }
    if (slot.base.right !== undefined) {
      style.right = `${slot.base.right + offsetX}px`
    }
    style.top = `${slot.base.top + offsetY}%`

    return { src: assetUrl(`/pixel-icons/decorations/${file}`), style }
  })
}
