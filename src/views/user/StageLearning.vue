<template>
  <div class="stage-page">
    <!-- 顶部 -->
    <div class="stage-header">
      <div class="stage-breadcrumb">
        <router-link :to="mapPath" class="back-link">← 返回地图</router-link>
      </div>
      <h1>📖 {{ stageTitle }}</h1>
      <div class="progress-row">
        <div class="progress-bar-px">
          <div :class="progressPercent >= 100 ? 'progress-fill-green' : 'progress-fill-yellow'"
               :style="{ width: progressPercent + '%' }"></div>
        </div>
        <span class="progress-label">
          <img :src="progressPercent >= 100 ? '/pixel-icons/ui/trophy.png' : '/pixel-icons/ui/star_gold.png'" alt="" />
          {{ completedCount }} / {{ units.length }} 已完成
        </span>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap"><p>加载中...</p></div>
    <div v-else-if="!units.length" class="empty-wrap"><p>📚 该关卡暂无学习内容</p></div>

    <!-- 单元卡片列表 -->
    <div v-else class="unit-list">
      <div
        v-for="unit in units"
        :key="unit.id"
        class="unit-card"
        :class="{ locked: unit.progress.status === 'locked', expanded: expandedUnit === unit.id }"
        @click="toggleUnit(unit)"
      >
        <div class="unit-summary">
          <img class="unit-icon" :src="unitIconSrc(unit)" />
          <div class="unit-meta">
            <div class="unit-title-row">
              <h3>{{ unit.title }}</h3>
              <span class="px-tag" :class="statusClass(unit)">
                <img v-if="statusTagIcon(unit)" :src="statusTagIcon(unit)" />
                {{ statusText(unit) }}
              </span>
            </div>
            <p class="unit-type-label">【{{ typeLabel(unit.unit_type) }}】</p>
          </div>
          <span v-if="unit.progress.status !== 'locked'" class="expand-arrow">{{ expandedUnit === unit.id ? '▲' : '▼' }}</span>
        </div>

        <div v-if="expandedUnit === unit.id" class="unit-detail" @click.stop>
          <!-- 文章：分页模式 -->
          <template v-if="unit.unit_type === 'article'">
            <div class="article-pager" v-if="articlePages(unit).length > 1">
              <div class="article-body" v-html="articlePages(unit)[articlePageIdx[unit.id] || 0]"></div>
              <div class="pager-controls">
                <button class="px-btn outline" :disabled="!articlePageIdx[unit.id]" @click="articlePageIdx[unit.id]--">← 上一页</button>
                <span class="pager-info">{{ (articlePageIdx[unit.id] || 0) + 1 }} / {{ articlePages(unit).length }}</span>
                <button class="px-btn outline" :disabled="(articlePageIdx[unit.id] || 0) >= articlePages(unit).length - 1" @click="articlePageIdx[unit.id]++">下一页 →</button>
              </div>
            </div>
            <div v-else class="article-body" v-html="unit.content?.body || '<p>暂无内容</p>'"></div>
            <div v-if="unit.progress.status !== 'completed'" class="unit-action">
              <button class="px-btn green" @click="completeUnit(unit)">
                <img src="/pixel-icons/ui/checkmark.png" /> 我已学完
              </button>
            </div>
            <div v-else class="done-msg"><img src="/pixel-icons/ui/checkmark.png" /> 已完成</div>
          </template>

          <!-- 视频 -->
          <template v-else-if="unit.unit_type === 'video'">
            <div class="video-wrap" v-if="unit.content?.url">
              <iframe :src="getBilibiliEmbed(unit.content.url)" scrolling="no" frameborder="0" allowfullscreen></iframe>
            </div>
            <p v-else class="no-content">暂未配置视频</p>
            <div v-if="unit.progress.status !== 'completed'" class="unit-action">
              <button class="px-btn green" @click="completeUnit(unit)">
                <img src="/pixel-icons/ui/checkmark.png" /> 我已看完
              </button>
            </div>
            <div v-else class="done-msg"><img src="/pixel-icons/ui/checkmark.png" /> 已完成</div>
          </template>

          <!-- 练习：逐题模式 -->
          <template v-else-if="unit.unit_type === 'practice'">
            <div v-if="!quizStates[unit.id]" class="quiz-intro">
              <p>本单元为练习，每道题提交后可立即查看解析。</p>
              <button class="px-btn green" @click="startQuiz(unit)">
                <img src="/pixel-icons/plans/sword.png" /> 开始做题
              </button>
            </div>
            <div v-else-if="quizStates[unit.id].finished" class="quiz-summary">
              <div class="status-card">
                <img src="/pixel-icons/ui/trophy.png" />
                <h3>📝 练习完成！</h3>
                <p>答对 {{ quizStates[unit.id].correctCount }} / {{ quizStates[unit.id].questions.length }} 题</p>
              </div>
              <div class="unit-action">
                <button class="px-btn outline" @click="retryQuiz(unit)">再做一次</button>
              </div>
            </div>
            <div v-else>
              <p class="quiz-progress">第 {{ quizStates[unit.id].currentIndex + 1 }} / {{ quizStates[unit.id].questions.length }} 题</p>
              <div class="question-item">
                <p class="q-text">
                  {{ quizStates[unit.id].currentIndex + 1 }}.
                  <span class="q-type">[{{ typeLabel(currentQuestion(unit).question_type) }}]</span>
                </p>
                <div class="q-content-md" v-html="renderMd(currentQuestion(unit).content)"></div>
                <!-- 判断题 -->
                <div v-if="currentQuestion(unit).question_type === 'judge'" class="options">
                  <label class="opt" :class="{ selected: quizStates[unit.id].currentAnswer === 'A', correct: quizStates[unit.id].showResult && 'A' === currentQuestion(unit).answer, wrong: quizStates[unit.id].showResult && quizStates[unit.id].currentAnswer === 'A' && 'A' !== currentQuestion(unit).answer }">
                    <input type="radio" name="practice_q" value="A" v-model="quizStates[unit.id].currentAnswer"> {{ judgeLabel(currentQuestion(unit), 'A') }}
                  </label>
                  <label class="opt" :class="{ selected: quizStates[unit.id].currentAnswer === 'B', correct: quizStates[unit.id].showResult && 'B' === currentQuestion(unit).answer, wrong: quizStates[unit.id].showResult && quizStates[unit.id].currentAnswer === 'B' && 'B' !== currentQuestion(unit).answer }">
                    <input type="radio" name="practice_q" value="B" v-model="quizStates[unit.id].currentAnswer"> {{ judgeLabel(currentQuestion(unit), 'B') }}
                  </label>
                </div>
                <!-- 单选/多选 -->
                <div v-else class="options">
                  <label v-for="opt in getOptions(currentQuestion(unit))" :key="opt.key"
                    class="opt"
                    :class="optionClass(unit, opt.key, currentQuestion(unit))">
                    <input
                      :type="currentQuestion(unit).question_type === 'multiple' ? 'checkbox' : 'radio'"
                      :name="'practice_q'"
                      :value="opt.key"
                      :checked="isPracticeChecked(unit, opt.key)"
                      @change="onPracticeChange(unit, opt.key, currentQuestion(unit).question_type)">
                    {{ opt.key }}. <span v-html="renderMdInline(opt.text)"></span>
                  </label>
                </div>
              </div>
              <!-- 未提交 -->
              <div v-if="!quizStates[unit.id].showResult" class="unit-action">
                <button class="px-btn green" @click="submitPracticeAnswer(unit)" :disabled="!hasAnswer(unit)">提交答案</button>
              </div>
              <!-- 已提交：反馈 -->
              <div v-else class="practice-feedback">
                <div class="fb" :class="{ correct: quizStates[unit.id].lastCorrect, wrong: !quizStates[unit.id].lastCorrect }"
                     :ref="el => { if (el && quizStates[unit.id].lastCorrect) fbRefs[unit.id] = el }">
                  <img :src="quizStates[unit.id].lastCorrect ? '/pixel-icons/ui/checkmark.png' : '/pixel-icons/plans/exclamation.png'" />
                  {{ quizStates[unit.id].lastCorrect ? '回答正确！' : '回答错误' }}
                </div>
                <p v-if="!quizStates[unit.id].lastCorrect" class="correct-answer">正确答案：{{ currentQuestion(unit).question_type === 'judge' ? judgeLabel(currentQuestion(unit), currentQuestion(unit).answer) : currentQuestion(unit).answer }}</p>
                <p v-if="currentQuestion(unit).analysis" class="analysis">💡 {{ currentQuestion(unit).analysis }}</p>
                <div class="unit-action">
                  <button v-if="quizStates[unit.id].currentIndex < quizStates[unit.id].questions.length - 1" class="px-btn green" @click="nextQuestion(unit)">下一题 →</button>
                  <button v-else class="px-btn green" @click="finishPractice(unit)">查看总结</button>
                </div>
              </div>
            </div>
          </template>

          <!-- 实战演练 -->
          <template v-else-if="unit.unit_type === 'practical'">
            <div v-if="!practicalStates[unit.id]" class="loading-wrap"><p>加载中...</p></div>
            <div v-else class="practical-section">
              <div v-if="unit.content?.review_instructions" class="practical-instructions">
                <p class="instructions-label">📋 任务说明</p>
                <p class="instructions-text">{{ unit.content.review_instructions }}</p>
              </div>
              <div v-if="unit.content?.external_url" class="practical-link">
                <a :href="unit.content.external_url" target="_blank" class="px-btn blue" style="text-decoration:none;">
                  🔗 前往标注平台 →
                </a>
              </div>

              <!-- 未提交 -->
              <div v-if="practicalStates[unit.id].status === 'not_submitted' || practicalStates[unit.id].status === 'active'">
                <div class="warn-box">⚠️ 请确认已完成全部实战任务后再申报，申报后无法撤回。</div>
                <button class="px-btn green" @click="submitPractical(unit)" :disabled="practicalSubmitting">
                  {{ practicalSubmitting ? '提交中...' : '✋ 申报完成' }}
                </button>
              </div>

              <!-- 待审核 -->
              <div v-else-if="practicalStates[unit.id].status === 'pending'">
                <div class="status-card">
                  <img src="/pixel-icons/ui/flag.png" />
                  <h3>已申报，等待审核中...</h3>
                  <p>申报时间：{{ formatPracticalTime(practicalStates[unit.id].submittedAt) }}</p>
                </div>
              </div>

              <!-- 已通过 -->
              <div v-else-if="practicalStates[unit.id].status === 'approved'">
                <div class="status-card passed">
                  <img src="/pixel-icons/ui/trophy.png" />
                  <h3>审核通过！</h3>
                  <p class="score-text">得分：{{ practicalStates[unit.id].score }}/10</p>
                  <p v-if="practicalStates[unit.id].comment">💬 {{ practicalStates[unit.id].comment }}</p>
                  <p class="sub-text">审核人：{{ practicalStates[unit.id].reviewerName || '-' }}</p>
                </div>
              </div>

              <!-- 未通过 -->
              <div v-else-if="practicalStates[unit.id].status === 'rejected'">
                <div class="status-card failed">
                  <img src="/pixel-icons/plans/exclamation.png" />
                  <h3>审核未通过</h3>
                  <p class="score-text">得分：{{ practicalStates[unit.id].score }}/10</p>
                  <p v-if="practicalStates[unit.id].comment">💬 {{ practicalStates[unit.id].comment }}</p>
                </div>
              </div>
            </div>
          </template>

          <!-- 测验：全部做完再提交 -->
          <template v-else-if="unit.unit_type === 'quiz'">
            <!-- 未开始 -->
            <div v-if="!quizStates[unit.id] && unit.progress.status !== 'completed' && unit.progress.status !== 'failed'">
              <p class="quiz-intro">本单元为测验，完成后需达到 80 分才能通过，每人最多 2 次机会。</p>
              <button class="px-btn green" @click="startQuiz(unit)">
                <img src="/pixel-icons/plans/sword.png" /> 开始做题
              </button>
            </div>
            <!-- 已完成/未通过：显示上次成绩和重做 -->
            <div v-else-if="!quizStates[unit.id]" class="quiz-result-info">
              <p>上次得分：{{ unit.progress.score }}分（{{ unit.progress.score >= 80 ? '通过' : '未通过' }}）</p>
              <p v-if="unit.progress.attempt_count >= 2" class="attempts-warn">⚠️ 已用完所有机会</p>
              <button v-if="unit.progress.attempt_count < 2" class="px-btn outline" @click="retryQuiz(unit)">重新做题（剩余 {{ 2 - unit.progress.attempt_count }} 次）</button>
              <p v-else class="attempts-warn">如需重做，请联系管理员重置</p>
            </div>
            <div v-else-if="!quizStates[unit.id].submitted" class="quiz-area">
              <p class="quiz-progress">第 {{ quizStates[unit.id].currentIndex + 1 }} / {{ quizStates[unit.id].questions.length }} 题</p>
              <div class="question-item">
                <p class="q-text">{{ quizStates[unit.id].currentIndex + 1 }}.
                  <span class="q-type">[{{ typeLabel(currentQuizQuestion(unit).question_type) }}]</span>
                </p>
                <div class="q-content-md" v-html="renderMd(currentQuizQuestion(unit).content)"></div>
                <div v-if="currentQuizQuestion(unit).question_type === 'judge'" class="options">
                  <label class="opt" :class="{ selected: quizStates[unit.id].answers[currentQuizQuestion(unit).id] === 'A' }">
                    <input type="radio" :name="'q_' + currentQuizQuestion(unit).id" value="A" v-model="quizStates[unit.id].answers[currentQuizQuestion(unit).id]"> {{ judgeLabel(currentQuizQuestion(unit), 'A') }}
                  </label>
                  <label class="opt" :class="{ selected: quizStates[unit.id].answers[currentQuizQuestion(unit).id] === 'B' }">
                    <input type="radio" :name="'q_' + currentQuizQuestion(unit).id" value="B" v-model="quizStates[unit.id].answers[currentQuizQuestion(unit).id]"> {{ judgeLabel(currentQuizQuestion(unit), 'B') }}
                  </label>
                </div>
                <div v-else class="options">
                  <label v-for="opt in getOptions(currentQuizQuestion(unit))" :key="opt.key"
                    class="opt"
                    :class="{ selected: isQuizOptSelected(unit, opt.key) }">
                    <input
                      :type="currentQuizQuestion(unit).question_type === 'multiple' ? 'checkbox' : 'radio'"
                      :name="'q_' + currentQuizQuestion(unit).id"
                      :value="opt.key"
                      :checked="isQuizOptSelected(unit, opt.key)"
                      @change="onQuizOptChange(unit, opt.key, currentQuizQuestion(unit).question_type)">
                    {{ opt.key }}. <span v-html="renderMdInline(opt.text)"></span>
                  </label>
                </div>
              </div>
              <div class="unit-action quiz-nav">
                <button v-if="quizStates[unit.id].currentIndex > 0" class="px-btn outline" @click="quizStates[unit.id].currentIndex--">← 上一题</button>
                <span v-else></span>
                <button v-if="quizStates[unit.id].currentIndex < quizStates[unit.id].questions.length - 1"
                  class="px-btn green" @click="nextQuizQuestion(unit)"
                  :disabled="!hasQuizAnswer(unit)">下一题 →</button>
                <button v-else class="px-btn green" @click="submitQuiz(unit)"
                  :disabled="!allQuizAnswered(unit)">提交答案</button>
              </div>
            </div>
            <div v-else class="quiz-result">
              <div class="status-card" :class="{ passed: quizStates[unit.id].result.score >= 80, failed: quizStates[unit.id].result.score < 80 }"
                   :ref="el => { if (el && quizStates[unit.id].result.score >= 80) quizPassRef = el }">
                <img :src="quizStates[unit.id].result.score >= 80 ? '/pixel-icons/ui/trophy.png' : '/pixel-icons/plans/exclamation.png'" />
                <h3>{{ quizStates[unit.id].result.score >= 80 ? '🎉 恭喜通过！' : '😅 未通过' }}</h3>
                <p>得分：{{ quizStates[unit.id].result.score ?? 0 }} / 100（答对 {{ quizStates[unit.id].result.correct ?? 0 }} / {{ quizStates[unit.id].result.total ?? 0 }}）</p>
                <p v-if="quizStates[unit.id].result.remainingAttempts !== null" class="sub-text">
                  剩余机会：{{ quizStates[unit.id].result.remainingAttempts }} 次
                </p>
              </div>
              <!-- 通过时才展示错题详情 -->
              <template v-if="quizStates[unit.id].result.score >= 80">
                <div v-for="(d, idx) in quizStates[unit.id].result.details" :key="idx" class="result-item" :class="{ wrong: !d.isCorrect }">
                  <p><strong>{{ idx + 1 }}.</strong></p>
                  <div class="q-content-md result-content" v-html="renderMd(d.content)"></div>
                  <p>你的答案：{{ d.userAnswer || '未作答' }} | 正确答案：{{ d.correctAnswer }}</p>
                  <p v-if="d.analysis" class="analysis">💡 {{ d.analysis }}</p>
                </div>
              </template>
              <div class="unit-action">
                <button v-if="quizStates[unit.id].result.remainingAttempts > 0" class="px-btn outline" @click="retryQuiz(unit)">
                  重新做题（剩余 {{ quizStates[unit.id].result.remainingAttempts }} 次）
                </button>
                <p v-else class="attempts-warn">⚠️ 已用完所有机会，如需重做请联系管理员</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <div v-if="units.length > 0 && completedCount === units.length" class="all-done" ref="allDoneRef">
      <img src="/pixel-icons/ui/trophy.png" />
      <h2>🎊 恭喜通关！</h2>
      <p>本关卡全部完成！</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { marked } from 'marked'
import { starBurst, shakeEl, fireworkBurst, junimoCelebrate } from '../../pixel-particles.js'

// marked 配置
marked.setOptions({ breaks: true, gfm: true })

function renderMd(text) {
  if (!text) return ''
  return marked.parse(String(text))
}

function renderMdInline(text) {
  if (!text) return ''
  return marked.parseInline(String(text))
}

const route = useRoute()
const dialog = useDialog()
const stageId = route.params.id
const planId = route.query.planId || null

const mapPath = computed(() => planId ? `/plans/${planId}/map` : '/map')

const stageTitle = ref('')
const units = ref([])
const loading = ref(true)
const expandedUnit = ref(null)
const quizStates = reactive({})
const articlePageIdx = reactive({})
const practicalStates = reactive({})
const practicalSubmitting = ref(false)
const fbRefs = reactive({})
const quizPassRef = ref(null)
const allDoneRef = ref(null)

const completedCount = computed(() => units.value.filter(u => u.progress.status === 'completed').length)
const progressPercent = computed(() => {
  if (!units.value.length) return 0
  return Math.round((completedCount.value / units.value.length) * 100)
})

// 单元图标
const unitTypeIcons = {
  article: '/pixel-icons/plans/book.png',
  video: '/pixel-icons/plans/star_gold.png',
  practice: '/pixel-icons/plans/sword.png',
  quiz: '/pixel-icons/plans/lightning.png',
  practical: '/pixel-icons/plans/trophy.png'
}
function unitIconSrc(unit) {
  if (unit.progress.status === 'locked') return '/pixel-icons/ui/lock.png'
  return unitTypeIcons[unit.unit_type] || '/pixel-icons/plans/question.png'
}

// 状态标签
function statusText(unit) {
  const s = unit.progress.status
  if (s === 'locked') return '未解锁'
  if (s === 'completed') return '已完成'
  if (s === 'failed') return '未通过'
  if (s === 'pending_review') return '待审核'
  return '进行中'
}
function statusClass(unit) { return unit.progress.status }
function statusTagIcon(unit) {
  const s = unit.progress.status
  if (s === 'completed') return '/pixel-icons/ui/checkmark.png'
  if (s === 'locked') return '/pixel-icons/ui/lock.png'
  if (s === 'active') return '/pixel-icons/ui/flag.png'
  if (s === 'pending_review') return '/pixel-icons/ui/flag.png'
  if (s === 'failed') return '/pixel-icons/plans/exclamation.png'
  return '/pixel-icons/ui/flag.png'
}

function typeLabel(type) {
  return { article: '文章', video: '视频', practice: '练习', quiz: '测验', practical: '实战演练', single: '单选', multiple: '多选', judge: '判断' }[type] || type
}

function getOptions(q) {
  const opts = []
  if (q.option_a) opts.push({ key: 'A', text: q.option_a })
  if (q.option_b) opts.push({ key: 'B', text: q.option_b })
  if (q.option_c) opts.push({ key: 'C', text: q.option_c })
  if (q.option_d) opts.push({ key: 'D', text: q.option_d })
  return opts
}

// 判断题选项文本：优先用题目上传的 option_a/option_b，否则 fallback 为 对/错
function judgeLabel(q, key) {
  if (key === 'A') return q.option_a || '对'
  if (key === 'B') return q.option_b || '错'
  return key
}

function getBilibiliEmbed(url) {
  const match = url.match(/BV[a-zA-Z0-9]+/)
  if (match) return `//player.bilibili.com/player.html?bvid=${match[0]}&high_quality=1`
  return url
}

function currentQuestion(unit) {
  const state = quizStates[unit.id]
  return state.questions[state.currentIndex]
}

function currentQuizQuestion(unit) {
  const state = quizStates[unit.id]
  return state.questions[state.currentIndex]
}

function nextQuizQuestion(unit) {
  const state = quizStates[unit.id]
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++
  }
}

function hasQuizAnswer(unit) {
  const state = quizStates[unit.id]
  const q = state.questions[state.currentIndex]
  const ans = state.answers[q.id]
  return ans && (!Array.isArray(ans) || ans.length > 0)
}

function allQuizAnswered(unit) {
  const state = quizStates[unit.id]
  return state.questions.every(q => {
    const ans = state.answers[q.id]
    return ans && (!Array.isArray(ans) || ans.length > 0)
  })
}

function optionClass(unit, key, q) {
  const state = quizStates[unit.id]
  const cls = {}
  if (!state.showResult) {
    if (q.question_type === 'multiple') {
      cls.selected = Array.isArray(state.currentAnswer) && state.currentAnswer.includes(key)
    } else {
      cls.selected = state.currentAnswer === key
    }
  } else {
    const correctAnswer = q.answer.toUpperCase().split('').sort().join('')
    const userAnswer = (() => {
      const a = state.currentAnswer
      if (Array.isArray(a)) return a.map(x => String(x).toUpperCase()).sort().join('')
      return String(a || '').toUpperCase()
    })()
    cls.correct = correctAnswer.includes(key)
    cls.wrong = userAnswer.includes(key) && !correctAnswer.includes(key)
  }
  return cls
}

function toggleUnit(unit) {
  if (unit.progress.status === 'locked') return
  if (!articlePageIdx[unit.id]) articlePageIdx[unit.id] = 0
  expandedUnit.value = expandedUnit.value === unit.id ? null : unit.id
  if (expandedUnit.value === unit.id && unit.unit_type === 'practical' && !practicalStates[unit.id]) {
    loadPracticalStatus(unit)
  }
}

function articlePages(unit) {
  const html = unit.content?.body || ''
  if (!html) return ['<p>暂无内容</p>']
  const pages = html.split(/<hr\s*\/?>/i).map(p => p.trim()).filter(Boolean)
  return pages.length > 0 ? pages : [html]
}

async function completeUnit(unit) {
  try {
    // 乐观更新：立即在 UI 上标记完成 + 解锁下一个
    optimisticUnlock(unit)
    await api.post(`/training/units/${unit.id}/complete`)
    // 延迟刷新确保后端解锁完成
    setTimeout(() => fetchUnits(), 800)
  } catch (err) { alert('操作失败：' + err.message); await fetchUnits() }
}

function optimisticUnlock(unit) {
  // 标记当前单元完成
  const idx = units.value.findIndex(u => u.id === unit.id)
  if (idx >= 0) {
    units.value[idx].progress.status = 'completed'
    // 解锁下一个
    if (idx + 1 < units.value.length && units.value[idx + 1].progress.status === 'locked') {
      units.value[idx + 1].progress.status = 'active'
    }
  }
}

function hasAnswer(unit) {
  const a = quizStates[unit.id].currentAnswer
  return a && (!Array.isArray(a) || a.length > 0)
}

async function startQuiz(unit) {
  try {
    // 优先用预加载的题目
    let questions = prefetchedQuestions[unit.id]
    if (!questions) {
      const res = await api.post(`/training/units/${unit.id}/quiz`)
      if (!res.success) return
      questions = res.data
    } else {
      delete prefetchedQuestions[unit.id] // 用完清除
    }

    if (!questions || questions.length === 0) {
      alert('⚠️ 该单元暂无可用题目，请联系管理员配置题库')
      return
    }

    if (unit.unit_type === 'practice') {
      const firstQ = questions[0]
      const initAnswer = firstQ?.question_type === 'multiple' ? [] : ''
      quizStates[unit.id] = {
        questions, currentIndex: 0, currentAnswer: initAnswer,
        showResult: false, lastCorrect: false, correctCount: 0, finished: false
      }
    } else {
      const answers = {}
      for (const q of questions) { answers[q.id] = q.question_type === 'multiple' ? [] : '' }
      quizStates[unit.id] = { questions, answers, currentIndex: 0, submitted: false, result: null }
    }
  } catch (err) {
    if (err.message?.includes('已用完')) {
      alert('⚠️ 已用完所有测验机会，如需重做请联系管理员')
      await fetchUnits()
    } else { alert('抽题失败：' + err.message) }
  }
}

function submitPracticeAnswer(unit) {
  const state = quizStates[unit.id]
  const q = currentQuestion(unit)
  const normalize = (s) => String(s || '').toUpperCase().replace(/[,，\s]/g, '').split('').sort().join('')
  const userAns = normalize(Array.isArray(state.currentAnswer) ? state.currentAnswer.join('') : state.currentAnswer)
  const correctAns = normalize(q.answer)
  const isCorrect = userAns === correctAns
  if (isCorrect) state.correctCount++
  state.lastCorrect = isCorrect
  state.showResult = true

  // 动画
  nextTick(() => {
    if (isCorrect) {
      const fb = fbRefs[unit.id]
      if (fb) starBurst(fb)
    } else {
      // 抖动错误选项
      document.querySelectorAll('.opt.wrong').forEach(el => shakeEl(el))
    }
  })
}

function nextQuestion(unit) {
  const state = quizStates[unit.id]
  state.currentIndex++
  const q = state.questions[state.currentIndex]
  state.currentAnswer = q?.question_type === 'multiple' ? [] : ''
  state.showResult = false
  state.lastCorrect = false
}

function isPracticeChecked(unit, key) {
  const a = quizStates[unit.id].currentAnswer
  if (Array.isArray(a)) return a.includes(key)
  return a === key
}

function isQuizOptSelected(unit, key) {
  const qId = currentQuizQuestion(unit).id
  const a = quizStates[unit.id].answers[qId]
  if (Array.isArray(a)) return a.includes(key)
  return a === key
}

function onQuizOptChange(unit, key, questionType) {
  const qId = currentQuizQuestion(unit).id
  if (questionType === 'multiple') {
    const arr = [...(quizStates[unit.id].answers[qId] || [])]
    const idx = arr.indexOf(key)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(key)
    quizStates[unit.id].answers[qId] = arr
  } else {
    quizStates[unit.id].answers[qId] = key
  }
}

function onPracticeChange(unit, key, questionType) {
  if (questionType === 'multiple') {
    const arr = [...(quizStates[unit.id].currentAnswer || [])]
    const idx = arr.indexOf(key)
    if (idx >= 0) arr.splice(idx, 1)
    else arr.push(key)
    quizStates[unit.id].currentAnswer = arr
  } else {
    quizStates[unit.id].currentAnswer = key
  }
}

async function finishPractice(unit) {
  const state = quizStates[unit.id]
  state.finished = true
  try {
    optimisticUnlock(unit)
    await api.post(`/training/units/${unit.id}/complete`)
    setTimeout(() => fetchUnits(), 800)
  } catch (err) { alert('操作失败：' + err.message); await fetchUnits() }
}

async function submitQuiz(unit) {
  const state = quizStates[unit.id]
  const unanswered = state.questions.filter(q => {
    const ans = state.answers[q.id]
    return !ans || (Array.isArray(ans) && ans.length === 0)
  })
  if (unanswered.length > 0) { alert(`还有 ${unanswered.length} 题未作答`); return }
  try {
    const res = await api.post(`/training/units/${unit.id}/submit`, {
      answers: state.answers, questions: state.questions
    })
    if (res.success) {
      state.submitted = true
      state.result = res.data
      state.result.remainingAttempts = res.data.remainingAttempts
      // 通过时乐观解锁
      if (res.data.score >= 80) {
        optimisticUnlock(unit)
      }
      // 延迟刷新
      setTimeout(() => fetchUnits(), 800)
      // 通关烟花
      if (res.data.score >= 80) {
        nextTick(() => { if (quizPassRef.value) fireworkBurst(quizPassRef.value) })
      }
    }
  } catch (err) { alert('提交失败：' + err.message) }
}

function retryQuiz(unit) {
  delete quizStates[unit.id]
  startQuiz(unit)
}

async function loadPracticalStatus(unit) {
  try {
    const res = await api.get(`/training/practical/${unit.id}/status`)
    if (res.success) practicalStates[unit.id] = res.data
  } catch { practicalStates[unit.id] = { status: 'not_submitted' } }
}

async function submitPractical(unit) {
  dialog.warning({
    title: '确认申报',
    content: '⚠️ 申报后无法撤回，请确认你已完成全部实战任务。确定申报吗？',
    positiveText: '确定申报',
    negativeText: '取消',
    onPositiveClick: async () => {
      practicalSubmitting.value = true
      try {
        await api.post(`/training/practical/${unit.id}/submit`)
        await loadPracticalStatus(unit)
        await fetchUnits()
      } catch (err) { alert('申报失败：' + err.message) }
      finally { practicalSubmitting.value = false }
    }
  })
}

function formatPracticalTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

async function fetchUnits() {
  try {
    const res = await api.get(`/training/stages/${stageId}/units`)
    if (res.success) {
      units.value = res.data
      // 全通关 → Junimo 庆祝
      nextTick(() => {
        if (allDoneRef.value && units.value.length > 0 && completedCount.value === units.value.length) {
          junimoCelebrate(allDoneRef.value)
        }
      })
    }
  } catch (err) { console.error('获取学习单元失败:', err) }
}

// 预加载缓存
const prefetchedQuestions = reactive({})

onMounted(async () => {
  try {
    const mapParams = {}
    if (planId) mapParams.planId = planId
    const mapRes = await api.get('/training/map', { params: mapParams })
    if (mapRes.success) {
      const stage = mapRes.data.find(s => s.id === stageId)
      if (stage) stageTitle.value = stage.title
    }
  } catch {}
  await fetchUnits()
  loading.value = false

  // 后台预加载：找到第一个未完成的 practice/quiz 单元，提前抽题
  for (const u of units.value) {
    if ((u.unit_type === 'practice' || u.unit_type === 'quiz') &&
        u.progress.status !== 'completed' && u.progress.status !== 'locked') {
      api.post(`/training/units/${u.id}/quiz`).then(res => {
        if (res.success && res.data?.length > 0) {
          prefetchedQuestions[u.id] = res.data
        }
      }).catch(() => {})
      break // 只预加载第一个
    }
  }
})
</script>

<style scoped>
.stage-page { padding-bottom: 40px; }

/* ===== Header ===== */
.stage-header {
  padding: 20px 24px 24px;
  margin-bottom: 24px;
  background: var(--pixel-card, #FFFDF5);
  border: 3px solid var(--pixel-brown, #5B3A29);
  position: relative;
}
.stage-breadcrumb { margin-bottom: 8px; }
.back-link { font-size: 13px; color: var(--pixel-blue, #4A90B8); text-decoration: none; }
.back-link:hover { text-decoration: underline; }
.stage-header h1 { font-size: 20px; color: var(--pixel-brown, #5B3A29); margin: 0 0 10px; }

.progress-row { display: flex; align-items: center; gap: 10px; }
.progress-bar-px { flex: 1; max-width: 300px; height: 14px; background: #E0D5C8; border: 2px solid var(--pixel-brown, #5B3A29); }
.progress-fill-yellow { height: 100%; background: var(--pixel-gold, #E8A93A); transition: width 0.4s; }
.progress-fill-green { height: 100%; background: var(--pixel-green, #5C8A4D); transition: width 0.4s; }
.progress-label { font-size: 13px; color: var(--pixel-text-secondary, #8B7355); display: flex; align-items: center; gap: 4px; white-space: nowrap; }
.progress-label img { width: 14px; height: 14px; image-rendering: pixelated; }

.loading-wrap, .empty-wrap { text-align: center; padding: 60px 0; color: var(--pixel-text-secondary, #999); }

/* ===== Unit cards ===== */
.unit-list { display: flex; flex-direction: column; gap: 10px; }
.unit-card {
  background: var(--pixel-card, #FFFDF5);
  border: 3px solid var(--pixel-border, #E0D5C8);
  cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s;
}
.unit-card:not(.locked):hover { border-color: var(--pixel-brown, #5B3A29); box-shadow: 3px 3px 0 rgba(91,58,41,0.12); }
.unit-card.locked { opacity: 0.5; cursor: default; filter: saturate(0.3); }
.unit-card.expanded { cursor: default; }

.unit-summary { display: flex; align-items: center; gap: 12px; padding: 14px 16px; }
.unit-icon { width: 28px; height: 28px; image-rendering: pixelated; flex-shrink: 0; }
.unit-meta { flex: 1; min-width: 0; }
.unit-title-row { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; }
.unit-title-row h3 { margin: 0; font-size: 15px; font-weight: 600; color: var(--pixel-brown, #5B3A29); }
.unit-type-label { font-size: 11px; color: var(--pixel-text-secondary, #8B7355); margin: 0; }
.expand-arrow { font-size: 11px; color: var(--pixel-text-secondary); flex-shrink: 0; }

/* Tags */
.px-tag { display: inline-flex; align-items: center; gap: 3px; font-size: 10px; padding: 1px 6px; font-weight: 500; border: 2px solid; background: var(--pixel-card, #FFFDF5); flex-shrink: 0; }
.px-tag img { width: 12px; height: 12px; image-rendering: pixelated; }
.px-tag.completed { border-color: #A5D6A7; color: #2E7D32; }
.px-tag.active { border-color: #FFCC80; color: #E65100; }
.px-tag.failed { border-color: #EF9A9A; color: #C62828; }
.px-tag.locked { border-color: #D5C9B8; color: #8B7355; }
.px-tag.pending_review { border-color: #FFCC80; color: #E65100; }

/* ===== Detail ===== */
.unit-detail {
  padding: 0 16px 16px; border-top: 2px solid var(--pixel-border, #E0D5C8);
  padding-top: 14px; animation: slideDown 0.2s ease;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-6px); }
  to { opacity: 1; transform: translateY(0); }
}

.article-body { font-size: 14px; line-height: 1.8; color: var(--pixel-text, #3E2723); padding: 0 16px; max-height: calc(100vh - 260px); overflow-y: auto; }
.article-body::-webkit-scrollbar { width: 6px; }
.article-body::-webkit-scrollbar-thumb { background: var(--pixel-border, #E0D5C8); border-radius: 3px; }
.article-body::-webkit-scrollbar-thumb:hover { background: #C8B89A; }
.article-body :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
.article-body :deep(blockquote) { border-left: 4px solid var(--pixel-gold, #E8A93A); background: #FFF8E7; padding: 10px 16px; margin: 12px 0; }
.article-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
.article-body :deep(th), .article-body :deep(td) { border: 1px solid var(--pixel-border, #E0D5C8); padding: 8px 12px; text-align: left; }
.article-body :deep(th) { background: #faf5ea; font-weight: 600; }
.article-body :deep(pre) { background: #2d2d2d; color: #f8f8f2; padding: 14px 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; font-size: 13px; line-height: 1.5; }
.article-body :deep(code) { background: #F5EFE0; padding: 2px 6px; font-size: 13px; border-radius: 3px; border: 1px solid var(--pixel-border, #E0D5C8); }
.article-body :deep(pre code) { background: none; padding: 0; border: none; color: inherit; }
.article-body :deep(ul), .article-body :deep(ol) { padding-left: 24px; margin: 8px 0; }
.article-body :deep(li) { margin: 4px 0; }
.article-body :deep(hr) { border: none; border-top: 2px dashed var(--pixel-border, #E0D5C8); margin: 16px 0; }
.pager-controls { display: flex; align-items: center; justify-content: center; gap: 12px; padding: 12px 0; }
.pager-info { font-size: 13px; color: var(--pixel-text-secondary); }

.video-wrap { position: relative; width: 100%; padding-bottom: 62.5%; overflow: hidden; margin-bottom: 14px; border: 2px solid var(--pixel-border); }
.video-wrap iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
.no-content { color: var(--pixel-text-secondary); font-size: 14px; text-align: center; padding: 24px 0; }

/* Options */
.options { display: flex; flex-direction: column; gap: 6px; margin-top: 10px; }
.opt {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 14px; border: 2px solid var(--pixel-border, #E0D5C8);
  cursor: pointer; font-size: 14px; background: var(--pixel-card, #FFFDF5); transition: all 0.15s;
}
.opt:hover { border-color: var(--pixel-gold); background: #FFFBF2; }
.opt.selected { border-color: var(--pixel-blue, #4A90B8); background: #F0F5FA; }
.opt.correct { border-color: var(--pixel-green, #5C8A4D); background: #ECF5E8; }
.opt.wrong { border-color: var(--pixel-red, #C24A3A); background: #FFF0EE; }
.opt input { accent-color: var(--pixel-brown, #5B3A29); }

.q-text { font-size: 14px; font-weight: 500; color: var(--pixel-brown, #5B3A29); margin-bottom: 4px; }
.q-type { font-size: 11px; color: var(--pixel-blue, #4A90B8); font-weight: normal; margin-left: 4px; }

/* Markdown 渲染区 */
.q-content-md { font-size: 14px; line-height: 1.7; color: var(--pixel-text, #3E2723); margin-bottom: 8px; padding: 12px 16px; background: #FDFAF0; border: 2px solid var(--pixel-border, #E0D5C8); }
.q-content-md :deep(h1) { font-size: 18px; margin: 12px 0 8px; color: var(--pixel-brown, #5B3A29); }
.q-content-md :deep(h2) { font-size: 16px; margin: 10px 0 6px; color: var(--pixel-brown, #5B3A29); }
.q-content-md :deep(h3) { font-size: 15px; margin: 8px 0 4px; color: var(--pixel-brown, #5B3A29); }
.q-content-md :deep(h4) { font-size: 14px; margin: 8px 0 4px; color: var(--pixel-text, #3E2723); }
.q-content-md :deep(h5) { font-size: 13px; margin: 6px 0 4px; color: var(--pixel-text, #3E2723); }
.q-content-md :deep(p) { margin: 6px 0; }
.q-content-md :deep(ul), .q-content-md :deep(ol) { padding-left: 22px; margin: 6px 0; }
.q-content-md :deep(li) { margin: 3px 0; line-height: 1.6; }
.q-content-md :deep(strong) { color: var(--pixel-brown, #5B3A29); }
.q-content-md :deep(em) { color: var(--pixel-text-secondary, #8B7355); }
.q-content-md :deep(hr) { border: none; border-top: 2px solid var(--pixel-border, #E0D5C8); margin: 14px 0; }
.q-content-md :deep(code) { background: #F5EFE0; padding: 1px 5px; font-size: 12px; border: 1px solid var(--pixel-border, #E0D5C8); }
.q-content-md :deep(blockquote) { border-left: 3px solid var(--pixel-gold, #E8A93A); background: #FFF8E7; padding: 6px 14px; margin: 8px 0; }
.q-content-md.result-content { padding: 8px 12px; margin-bottom: 4px; }

/* 选项内 markdown inline */
.opt :deep(code) { background: #F5EFE0; padding: 1px 4px; font-size: 12px; border: 1px solid var(--pixel-border, #E0D5C8); }
.opt :deep(strong) { color: var(--pixel-brown, #5B3A29); }
.opt :deep(em) { color: var(--pixel-text-secondary, #8B7355); }
.quiz-intro { font-size: 14px; color: var(--pixel-text-secondary); line-height: 1.6; margin-bottom: 14px; }
.quiz-result-info { text-align: center; padding: 16px 0; color: var(--pixel-text-secondary); font-size: 14px; }
.quiz-progress { font-size: 13px; color: var(--pixel-text-secondary); margin-bottom: 10px; }
.question-item { padding: 14px 0; border-bottom: 2px solid var(--pixel-border, #E0D5C8); }

/* Feedback */
.practice-feedback { margin-top: 12px; }
.fb { display: inline-flex; align-items: center; gap: 4px; padding: 4px 12px; font-size: 13px; font-weight: 500; border: 2px solid; margin-bottom: 6px; position: relative; overflow: visible; }
.fb img { width: 16px; height: 16px; image-rendering: pixelated; }
.fb.correct { border-color: #A5D6A7; color: #2E7D32; background: #ECF5E8; }
.fb.wrong { border-color: #EF9A9A; color: #C62828; background: #FFF0EE; }
.correct-answer { font-size: 13px; color: #E65100; margin-bottom: 4px; }
.analysis { color: var(--pixel-blue, #4A90B8); font-size: 13px; line-height: 1.5; }

/* Buttons */
.px-btn {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 8px 20px; font-size: 13px; font-weight: 500;
  border: 2px solid var(--pixel-brown, #5B3A29); cursor: pointer; color: #fff;
  transition: box-shadow 0.1s;
}
.px-btn img { width: 14px; height: 14px; image-rendering: pixelated; }
.px-btn.green { background: var(--pixel-green, #5C8A4D); }
.px-btn.green:hover { background: #4A7A3D; box-shadow: 2px 2px 0 var(--pixel-brown, #5B3A29); }
.px-btn.blue { background: var(--pixel-blue, #4A90B8); }
.px-btn.blue:hover { background: #3A80A8; box-shadow: 2px 2px 0 var(--pixel-brown, #5B3A29); }
.px-btn.outline { background: var(--pixel-card, #FFFDF5); color: var(--pixel-brown, #5B3A29); border-color: var(--pixel-border, #E0D5C8); }
.px-btn.outline:hover { border-color: var(--pixel-brown, #5B3A29); box-shadow: 2px 2px 0 rgba(91,58,41,0.1); }
.px-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.unit-action { margin-top: 12px; }
.unit-action.quiz-nav { display: flex; justify-content: space-between; align-items: center; }
.done-msg { display: flex; align-items: center; gap: 6px; padding: 6px 0; color: #2E7D32; font-size: 13px; }
.done-msg img { width: 16px; height: 16px; image-rendering: pixelated; }
.attempts-warn { font-size: 13px; color: var(--pixel-red, #C24A3A); margin-top: 6px; }

/* Practical */
.practical-section { padding: 4px 0; }
.practical-instructions { background: #F5EFE0; border: 2px solid var(--pixel-border, #E0D5C8); padding: 12px 16px; margin-bottom: 14px; }
.instructions-label { font-weight: 600; color: var(--pixel-brown, #5B3A29); margin: 0 0 4px; font-size: 13px; }
.instructions-text { color: var(--pixel-text-secondary); margin: 0; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
.practical-link { margin-bottom: 14px; }
.warn-box { background: #FFF8E7; border: 2px solid var(--pixel-gold, #E8A93A); padding: 10px 14px; margin-bottom: 12px; font-size: 13px; color: #B8860B; }

/* Status cards */
.status-card { text-align: center; padding: 24px; border: 3px solid var(--pixel-border, #E0D5C8); background: var(--pixel-card, #FFFDF5); position: relative; overflow: hidden; }
.status-card img { width: 48px; height: 48px; image-rendering: pixelated; margin-bottom: 8px; }
.status-card h3 { font-size: 16px; color: var(--pixel-brown, #5B3A29); margin: 0 0 6px; }
.status-card p { font-size: 13px; color: var(--pixel-text-secondary); margin: 2px 0; }
.status-card .score-text { color: var(--pixel-blue, #4A90B8); font-weight: 500; }
.status-card .sub-text { font-size: 12px; }
.status-card.passed { border-color: var(--pixel-green, #5C8A4D); background: #F5FAF2; }
.status-card.failed { border-color: var(--pixel-red, #C24A3A); background: #FFF5F3; }

.quiz-summary { margin-top: 8px; }
.result-item { padding: 10px 14px; margin-bottom: 6px; border: 2px solid var(--pixel-border, #E0D5C8); background: var(--pixel-card, #FFFDF5); font-size: 14px; }
.result-item.wrong { border-color: var(--pixel-gold, #E8A93A); border-left-width: 4px; }
.result-item p { margin: 3px 0; }

/* All done */
.all-done {
  text-align: center; padding: 28px; margin-top: 24px;
  background: #F5EFE0; border: 4px solid var(--pixel-gold, #E8A93A);
  position: relative; overflow: hidden;
}
.all-done img { width: 48px; height: 48px; image-rendering: pixelated; margin-bottom: 8px; }
.all-done h2 { font-size: 20px; color: var(--pixel-brown, #5B3A29); margin: 0 0 6px; }
.all-done p { font-size: 14px; color: var(--pixel-text-secondary); margin: 0; }
</style>
