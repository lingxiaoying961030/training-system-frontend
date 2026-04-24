/**
 * pixel-particles.js — 像素风粒子动画工具
 * 纯 DOM + CSS 动画，无依赖
 */

const COLORS = ['#E8A93A', '#5C8A4D', '#4A90B8', '#E88BA5', '#C27ADB', '#FF8C42', '#F0C060']
function rnd(a, b) { return a + Math.random() * (b - a) }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }

// 注入全局 CSS（只注入一次）
let injected = false
function injectCSS() {
  if (injected) return
  injected = true
  const style = document.createElement('style')
  style.textContent = `
    /* 星星粒子 */
    .px-star-particle {
      position: absolute; width: 16px; height: 16px;
      image-rendering: pixelated; pointer-events: none; z-index: 10;
      animation: px-star-burst 700ms ease-out forwards;
    }
    @keyframes px-star-burst {
      0%   { opacity: 1; transform: translate(0,0) scale(1) rotate(0deg); }
      100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(0.3) rotate(var(--rot)); }
    }

    /* 答错抖动 */
    .px-shake { animation: px-shake 350ms ease-in-out !important; }
    @keyframes px-shake {
      0%, 100% { transform: translateX(0); }
      15% { transform: translateX(-5px); }
      30% { transform: translateX(5px); }
      45% { transform: translateX(-4px); }
      60% { transform: translateX(4px); }
      75% { transform: translateX(-2px); }
      90% { transform: translateX(2px); }
    }

    /* 烟花爆发粒子 */
    .px-firework {
      position: absolute; pointer-events: none; z-index: 5; border-radius: 1px;
      opacity: 0;
      animation: px-fw-explode var(--dur) ease-out forwards;
      animation-delay: var(--delay);
    }
    @keyframes px-fw-explode {
      0%   { opacity: 1; transform: translate(0,0) scale(1); }
      30%  { opacity: 1; }
      100% { opacity: 0; transform: translate(var(--fx), var(--fy)) scale(0.2); }
    }

    /* Junimo 蹦跳 */
    .px-junimo {
      position: absolute; bottom: 10px; image-rendering: pixelated; z-index: 3;
      width: 32px; height: 32px;
      animation: px-junimo-hop var(--j-dur) ease-in-out infinite;
      animation-delay: var(--j-delay);
    }
    @keyframes px-junimo-hop {
      0%, 100% { transform: translateY(0) scaleX(var(--j-dir)); }
      30% { transform: translateY(-14px) scaleX(var(--j-dir)); }
      50% { transform: translateY(-2px) scaleX(var(--j-dir)); }
      70% { transform: translateY(-10px) scaleX(var(--j-dir)); }
    }

    /* 闪光点 */
    .px-sparkle {
      position: absolute; pointer-events: none; z-index: 1;
      width: 4px; height: 4px;
      animation: px-sparkle-twinkle var(--sk-dur) ease-in-out infinite;
      animation-delay: var(--sk-delay);
    }
    @keyframes px-sparkle-twinkle {
      0%, 100% { opacity: 0; transform: scale(0.5); }
      50%      { opacity: 1; transform: scale(1.2); }
    }
  `
  document.head.appendChild(style)
}

/**
 * ① 答对：星星粒子飞散
 * @param {HTMLElement} anchor - 反馈区域元素（需 position:relative）
 */
export function starBurst(anchor) {
  injectCSS()
  anchor.querySelectorAll('.px-star-particle').forEach(e => e.remove())
  const count = 6 + Math.floor(Math.random() * 3)
  for (let i = 0; i < count; i++) {
    const star = document.createElement('img')
    star.className = 'px-star-particle'
    star.src = '/pixel-icons/ui/star_gold.png'
    const angle = (Math.PI * 2 / count) * i + rnd(-0.5, 0.5)
    const dist = rnd(40, 60)
    star.style.cssText = `
      left:50%; top:50%;
      --dx:${Math.cos(angle) * dist}px; --dy:${Math.sin(angle) * dist}px;
      --rot:${rnd(-360, 360)}deg;
    `
    anchor.appendChild(star)
    star.addEventListener('animationend', () => star.remove())
  }
}

/**
 * ② 答错：给元素添加抖动
 * @param {HTMLElement} el
 */
export function shakeEl(el) {
  injectCSS()
  el.classList.remove('px-shake')
  void el.offsetHeight
  el.classList.add('px-shake')
  el.addEventListener('animationend', () => el.classList.remove('px-shake'), { once: true })
}

/**
 * ③ 测验通关：多点烟花爆发（方案A）
 * @param {HTMLElement} container - 状态卡片容器（需 position:relative + overflow:hidden）
 */
export function fireworkBurst(container) {
  injectCSS()
  container.querySelectorAll('.px-firework').forEach(e => e.remove())
  const centers = [
    { x: 25, y: 35, delay: 0 },
    { x: 70, y: 30, delay: 200 },
    { x: 50, y: 55, delay: 400 },
  ]
  centers.forEach(c => {
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('div')
      p.className = 'px-firework'
      const size = 3 + Math.floor(Math.random() * 5)
      const angle = (Math.PI * 2 / 18) * i + rnd(-0.3, 0.3)
      const dist = rnd(40, 100)
      p.style.cssText = `
        width:${size}px; height:${size}px; background:${pick(COLORS)};
        left:${c.x}%; top:${c.y}%;
        --fx:${Math.cos(angle) * dist}px; --fy:${Math.sin(angle) * dist}px;
        --dur:${rnd(500, 800)}ms; --delay:${c.delay + rnd(0, 100)}ms;
      `
      container.appendChild(p)
      p.addEventListener('animationend', () => p.remove())
    }
  })
}

/**
 * ④ 全通关：Junimo 庆祝舞 + 闪光（方案E）
 * @param {HTMLElement} container
 * @param {number} duration - 持续时间 ms，默认 5000
 */
export function junimoCelebrate(container, duration = 5000) {
  injectCSS()
  container.querySelectorAll('.px-junimo,.px-sparkle').forEach(e => e.remove())

  const positions = [15, 35, 65, 85]
  positions.forEach((x, i) => {
    const j = document.createElement('img')
    j.className = 'px-junimo'
    j.src = '/pixel-icons/decorations/deco_junimo.png'
    const dir = i % 2 === 0 ? 1 : -1
    j.style.cssText = `left:${x}%; --j-dur:${rnd(600, 900)}ms; --j-delay:${i * 150}ms; --j-dir:${dir};`
    container.appendChild(j)
  })

  const sparkleShades = ['#E8A93A', '#F0C060', '#FFF8E7', '#FFEB3B']
  for (let i = 0; i < 12; i++) {
    const d = document.createElement('div')
    d.className = 'px-sparkle'
    d.style.cssText = `
      left:${rnd(5, 95)}%; top:${rnd(10, 80)}%;
      background:${pick(sparkleShades)};
      --sk-dur:${rnd(800, 1400)}ms; --sk-delay:${rnd(0, 1000)}ms;
    `
    container.appendChild(d)
  }

  setTimeout(() => {
    container.querySelectorAll('.px-junimo,.px-sparkle').forEach(e => {
      e.style.transition = 'opacity 0.5s'
      e.style.opacity = '0'
      setTimeout(() => e.remove(), 500)
    })
  }, duration)
}
