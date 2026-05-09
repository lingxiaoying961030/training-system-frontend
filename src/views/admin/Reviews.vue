<template>
  <div class="rv-page">
    <div class="rv-header">
      <h2>📋 实战审核 <span v-if="pendingCount > 0" class="rv-pending-pill">{{ pendingCount }} 条待审核</span></h2>
      <button class="rv-btn rv-btn-ghost" @click="loadReviews">🔄 刷新</button>
    </div>

    <!-- 统计卡片 -->
    <div class="rv-stats">
      <div class="rv-stat pending"><div class="rv-stat-num">{{ statusCounts.pending }}</div><div class="rv-stat-label">⏳ 待审核</div></div>
      <div class="rv-stat approved"><div class="rv-stat-num">{{ statusCounts.approved }}</div><div class="rv-stat-label">✅ 已通过</div></div>
      <div class="rv-stat rejected"><div class="rv-stat-num">{{ statusCounts.rejected }}</div><div class="rv-stat-label">❌ 未通过</div></div>
      <div class="rv-stat total"><div class="rv-stat-num">{{ reviews.length }}</div><div class="rv-stat-label">📊 总记录</div></div>
    </div>

    <!-- 筛选 -->
    <div class="rv-filters">
      <input class="rv-input" v-model="searchKeyword" placeholder="🔍 搜索学员 / 关卡..." style="width:220px;">
      <select class="rv-select" v-model="filters.projectId" @change="onProjectChange(filters.projectId)">
        <option :value="null">全部项目</option>
        <option v-for="p in projectOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <select class="rv-select" v-model="filters.planId">
        <option :value="null">全部计划</option>
        <option v-for="p in planOptions" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <select class="rv-select" v-model="filters.status">
        <option :value="null">全部状态</option>
        <option value="pending">待审核</option>
        <option value="approved">已通过</option>
        <option value="rejected">未通过</option>
      </select>
    </div>

    <!-- 骨架屏 -->
    <div v-if="loading" class="rv-skeleton">
      <div v-for="i in 4" :key="i" class="rv-skel-card">
        <div class="rv-skel-row">
          <div class="skel" style="width:36px;height:36px;border-radius:50%"></div>
          <div style="flex:1;display:flex;flex-direction:column;gap:6px">
            <div class="skel" style="width:80px;height:14px"></div>
            <div class="skel" style="width:200px;height:12px"></div>
          </div>
          <div class="skel" style="width:60px;height:22px;border-radius:4px"></div>
        </div>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-else-if="filteredReviews.length === 0" class="rv-empty">
      <div style="font-size:40px;margin-bottom:8px">📭</div>
      <div>暂无审核记录</div>
    </div>

    <!-- 审核列表 -->
    <div v-else class="rv-list">
      <div v-for="review in filteredReviews" :key="review.id"
        class="rv-card" :class="'is-' + review.status">

        <!-- 卡片头 -->
        <div class="rv-card-hdr" @click="toggleExpand(review.id)">
          <div class="rv-card-left">
            <div class="rv-avatar"><img :src="getAvatarHead(review.userAvatar, review.userId)" class="rv-avatar-img" /></div>
            <div class="rv-card-info">
              <span class="rv-name">{{ review.userName }}</span>
              <span class="rv-meta">
                {{ review.stageTitle }} · {{ review.planName || '未知计划' }} · {{ review.projectName || '未知项目' }}
              </span>
            </div>
          </div>
          <div class="rv-card-right">
            <span class="rv-tag" :class="review.status">{{ statusLabel(review.status) }}</span>
            <span class="rv-time">{{ formatTime(review.submitted_at) }}</span>
            <span class="rv-arrow" :class="{ open: expandedId === review.id }">▼</span>
          </div>
        </div>

        <!-- 展开区 -->
        <div v-if="expandedId === review.id" class="rv-card-body">
          <!-- 信息网格 -->
          <div class="rv-info-grid">
            <template v-if="review.externalUrl">
              <span class="rv-info-label">📎 作品链接</span>
              <span class="rv-info-value"><a :href="review.externalUrl" target="_blank">查看学员作品 →</a></span>
            </template>
            <template v-if="review.reviewInstructions">
              <span class="rv-info-label">📋 审核说明</span>
              <span class="rv-info-value">{{ review.reviewInstructions }}</span>
            </template>
            <span class="rv-info-label">⏰ 申报时间</span>
            <span class="rv-info-value">{{ formatTimeFull(review.submitted_at) }}</span>
          </div>

          <!-- 待审核：评分表单 -->
          <div v-if="review.status === 'pending'" class="rv-form">
            <div class="rv-form-title">✍️ 审核评价</div>
            <div class="rv-form-group">
              <label>评分</label>
              <div class="rv-stars">
                <span v-for="n in 10" :key="n" class="rv-star"
                  :class="{ active: reviewForm.score >= n }"
                  @click="reviewForm.score = n">⭐</span>
                <span class="rv-score-num" v-if="reviewForm.score">{{ reviewForm.score }}/10</span>
              </div>
            </div>
            <div class="rv-form-group">
              <label>评价备注</label>
              <textarea class="rv-textarea" v-model="reviewForm.comment" placeholder="对学员的评价、建议..." rows="3"></textarea>
            </div>
            <div class="rv-form-actions">
              <button class="rv-btn-reject" @click="submitReview(review.id, 'rejected')" :disabled="submitting">❌ 不通过</button>
              <button class="rv-btn-approve" @click="submitReview(review.id, 'approved')" :disabled="submitting">✅ 通过</button>
            </div>
          </div>

          <!-- 已审核：结果展示 -->
          <div v-else class="rv-result">
            <div class="rv-result-score">
              <span class="rv-score-big" :class="scoreClass(review.score)">{{ review.score }}</span>
              <span class="rv-score-max">/10</span>
            </div>
            <div v-if="review.comment" class="rv-result-comment">{{ review.comment }}</div>
            <div class="rv-result-reviewer">审核人：{{ review.reviewerName || '-' }} · {{ formatTimeFull(review.reviewed_at) }}</div>
            <button v-if="review.status === 'rejected'" class="rv-btn-reset" @click="resetReview(review.id)" :disabled="submitting">🔄 重置（允许重新申报）</button>
          </div>

          <!-- 历史 -->
          <div v-if="review.history && review.history.length > 0" class="rv-history">
            <div class="rv-history-title">📜 历史审核（{{ review.history.length }}次）</div>
            <div v-for="(h, idx) in review.history" :key="h.id" class="rv-history-item">
              <span class="rv-h-round">第{{ review.history.length - idx }}次</span>
              <span class="rv-h-score">{{ h.score }}/10</span>
              <span v-if="h.comment" class="rv-h-comment">{{ h.comment }}</span>
              <span class="rv-h-reviewer">{{ h.reviewerName || '-' }}</span>
              <span class="rv-h-time">{{ formatTime(h.reviewedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 翻页 -->
    <div v-if="totalPages > 1" class="px-pagination">
      <button class="px-page-btn" :disabled="currentPage <= 1" @click="goPage(currentPage - 1)">‹ 上一页</button>
      <template v-for="p in paginationPages" :key="p">
        <span v-if="p === '...'" style="color:#ccc;font-size:12px">…</span>
        <span v-else class="px-page-num" :class="{ active: p === currentPage }" @click="goPage(p)">{{ p }}</span>
      </template>
      <button class="px-page-btn" :disabled="currentPage >= totalPages" @click="goPage(currentPage + 1)">下一页 ›</button>
      <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
    </div>
    <div v-else-if="searchFiltered.length > 0" class="px-pagination">
      <span class="px-page-total">共 {{ searchFiltered.length }} 条</span>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, inject } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import api from '../../api/index.js'
import { getAvatarHead } from '../../pixel-map.js'

const message = useMessage()
const dialog = useDialog()
const refreshPendingCount = inject('refreshPendingCount', () => {})

const loading = ref(false)
const submitting = ref(false)
const reviews = ref([])
const expandedId = ref(null)
const reviewForm = ref({ score: null, comment: '' })

const searchKeyword = ref('')
const filters = ref({ projectId: null, planId: null, status: null })
const projects = ref([])
const plans = ref([])
const currentPage = ref(1)
const pageSize = 8

const projectOptions = computed(() => projects.value.map(p => ({ label: p.name, value: p.id })))
const planOptions = computed(() => plans.value.map(p => ({ label: p.name, value: p.id })))

const pendingCount = computed(() => reviews.value.filter(r => r.status === 'pending').length)
const statusCounts = computed(() => ({
  pending: reviews.value.filter(r => r.status === 'pending').length,
  approved: reviews.value.filter(r => r.status === 'approved').length,
  rejected: reviews.value.filter(r => r.status === 'rejected').length,
}))

const searchFiltered = computed(() => {
  if (!searchKeyword.value) return reviews.value
  const kw = searchKeyword.value.toLowerCase()
  return reviews.value.filter(r =>
    (r.userName || '').toLowerCase().includes(kw) ||
    (r.stageTitle || '').toLowerCase().includes(kw) ||
    (r.planName || '').toLowerCase().includes(kw) ||
    (r.projectName || '').toLowerCase().includes(kw)
  )
})

const totalPages = computed(() => Math.ceil(searchFiltered.value.length / pageSize))

const filteredReviews = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return searchFiltered.value.slice(start, start + pageSize)
})

const paginationPages = computed(() => {
  const total = totalPages.value
  const cur = currentPage.value
  if (total <= 7) return Array.from({length: total}, (_, i) => i + 1)
  const pages = [1]
  if (cur > 3) pages.push('...')
  for (let i = Math.max(2, cur - 1); i <= Math.min(total - 1, cur + 1); i++) pages.push(i)
  if (cur < total - 2) pages.push('...')
  pages.push(total)
  return pages
})

function goPage(p) {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p
}

function statusLabel(s) { return { pending: '⏳ 待审核', approved: '✅ 已通过', rejected: '❌ 未通过' }[s] || s }
function scoreClass(s) { return s >= 7 ? 'high' : s >= 5 ? 'mid' : 'low' }
function formatTime(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}
function formatTimeFull(t) {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

function toggleExpand(id) {
  if (expandedId.value === id) { expandedId.value = null }
  else { expandedId.value = id; reviewForm.value = { score: null, comment: '' } }
}

async function loadProjects() {
  try { const res = await api.get('/projects'); projects.value = res.data || [] } catch {}
}

async function onProjectChange(projectId) {
  filters.value.planId = null; plans.value = []
  if (projectId) {
    try { const res = await api.get(`/projects/${projectId}/plans`); plans.value = res.data || [] } catch {}
  }
  loadReviews()
}

async function loadReviews() {
  loading.value = true
  try {
    const params = {}
    if (filters.value.status) params.status = filters.value.status
    if (filters.value.planId) params.planId = filters.value.planId
    if (filters.value.projectId) params.projectId = filters.value.projectId
    const res = await api.get('/admin/reviews', { params })
    reviews.value = res.data || []
  } catch (err) { message.error('加载失败：' + err.message) }
  finally { loading.value = false }
}

async function submitReview(reviewId, status) {
  if (!reviewForm.value.score) { message.warning('请先打分（1-10）'); return }
  const label = status === 'approved' ? '通过' : '不通过'
  dialog.warning({
    title: `确认${label}？`,
    content: `得分：${reviewForm.value.score}/10${reviewForm.value.comment ? '，评价：' + reviewForm.value.comment : ''}`,
    positiveText: '确认', negativeText: '取消',
    onPositiveClick: async () => {
      submitting.value = true
      try {
        await api.put(`/admin/reviews/${reviewId}`, { status, score: reviewForm.value.score, comment: reviewForm.value.comment })
        message.success(`审核${label}成功`); expandedId.value = null
        await loadReviews(); refreshPendingCount()
      } catch (err) { message.error('审核失败：' + err.message) }
      finally { submitting.value = false }
    }
  })
}

async function resetReview(reviewId) {
  dialog.warning({
    title: '确认重置？', content: '重置后学员可以重新申报',
    positiveText: '确认重置', negativeText: '取消',
    onPositiveClick: async () => {
      submitting.value = true
      try {
        await api.post(`/admin/reviews/${reviewId}/reset`)
        message.success('已重置'); expandedId.value = null
        await loadReviews(); refreshPendingCount()
      } catch (err) { message.error('重置失败：' + err.message) }
      finally { submitting.value = false }
    }
  })
}

watch(() => filters.value.status, () => { currentPage.value = 1; loadReviews() })
watch(() => filters.value.planId, () => { currentPage.value = 1; loadReviews() })
watch(searchKeyword, () => { currentPage.value = 1 })
onMounted(() => { loadProjects(); loadReviews() })
</script>

<style scoped>
.rv-page { }

/* 翻页 */
.px-pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 16px; font-size: 13px; color: #9e8a76; margin-top: 12px; }
.px-page-btn { padding: 5px 12px; border: 2px solid #d4c5a0; background: #FFFDF5; border-radius: 4px; cursor: pointer; font-size: 12px; color: #5B3A29; transition: all 0.15s; }
.px-page-btn:hover:not(:disabled) { border-color: #8b6914; background: #f0e6d2; }
.px-page-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.px-page-num { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid #d4c5a0; background: #FFFDF5; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.15s; }
.px-page-num:hover { border-color: #8b6914; background: #f0e6d2; }
.px-page-num.active { background: #4A90B8; color: #fff; border-color: #3a7bc8; }
.px-page-total { margin-left: 8px; font-size: 11px; color: #8B7355; }

/* 页头 */
.rv-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.rv-header h2 { font-family: "ZCOOL QingKe HuangYou", cursive, sans-serif; color: #5B3A29; font-size: 20px; letter-spacing: 2px; display: flex; align-items: center; gap: 8px; }
.rv-pending-pill { background: linear-gradient(135deg, #E8A93A, #D4912A); color: #fff; padding: 3px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; font-family: "PingFang SC", sans-serif; animation: pulse-glow 2s ease-in-out infinite; }
@keyframes pulse-glow { 0%, 100% { box-shadow: 0 0 0 rgba(232,169,58,0); } 50% { box-shadow: 0 0 8px rgba(232,169,58,0.4); } }

/* 统计 */
.rv-stats { display: flex; gap: 12px; margin-bottom: 20px; }
.rv-stat { flex: 1; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 8px; padding: 14px 16px; text-align: center; }
.rv-stat-num { font-size: 24px; font-weight: 700; font-family: "ZCOOL QingKe HuangYou", cursive; }
.rv-stat-label { font-size: 12px; color: #8B7355; margin-top: 2px; }
.rv-stat.pending .rv-stat-num { color: #E8A93A; }
.rv-stat.approved .rv-stat-num { color: #5C8A4D; }
.rv-stat.rejected .rv-stat-num { color: #C24A3A; }
.rv-stat.total .rv-stat-num { color: #5B3A29; }

/* 筛选 */
.rv-filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
.rv-input { padding: 7px 12px; border: 2px solid #E0D5C8; border-radius: 6px; font-size: 13px; background: #FFFDF5; color: #5B3A29; outline: none; }
.rv-input:focus { border-color: #5B3A29; }
.rv-select { padding: 7px 10px; border: 2px solid #E0D5C8; border-radius: 6px; font-size: 13px; background: #FFFDF5; color: #5B3A29; outline: none; cursor: pointer; }
.rv-btn { padding: 7px 14px; border: 2px solid #5B3A29; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.rv-btn-ghost { background: #FFFDF5; color: #5B3A29; }
.rv-btn-ghost:hover { background: #5B3A29; color: #FFF8E7; }

/* 骨架屏 */
@keyframes shimmer { 0% { background-position: -200px 0; } 100% { background-position: calc(200px + 100%) 0; } }
.skel { background: linear-gradient(90deg, #E8DFD0 25%, #F0E8D8 37%, #E8DFD0 63%); background-size: 200px 100%; animation: shimmer 1.4s ease infinite; border-radius: 4px; }
.rv-skel-card { background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
.rv-skel-row { display: flex; align-items: center; gap: 12px; }

/* 空状态 */
.rv-empty { text-align: center; padding: 48px; color: #8B7355; font-size: 14px; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 8px; }

/* 卡片 */
.rv-card { background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 8px; margin-bottom: 12px; overflow: hidden; transition: all 0.2s; }
.rv-card:hover { border-color: #C8B89A; box-shadow: 0 2px 12px rgba(91,58,41,0.08); }
.rv-card.is-pending { border-left: 4px solid #E8A93A; }
.rv-card.is-approved { border-left: 4px solid #5C8A4D; }
.rv-card.is-rejected { border-left: 4px solid #C24A3A; }

.rv-card-hdr { display: flex; align-items: center; justify-content: space-between; padding: 14px 16px; cursor: pointer; user-select: none; }
.rv-card-hdr:hover { background: #FFF8E7; }
.rv-card-left { display: flex; align-items: center; gap: 10px; }
.rv-avatar { width: 36px; height: 36px; border-radius: 50%; background: #FFF8E7; border: 2px solid #E0D5C8; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rv-avatar-img { width: 30px; height: 30px; image-rendering: pixelated; }
.rv-card-info { display: flex; flex-direction: column; gap: 2px; }
.rv-name { font-size: 14px; font-weight: 600; color: #5B3A29; }
.rv-meta { font-size: 12px; color: #8B7355; }
.rv-card-right { display: flex; align-items: center; gap: 12px; }
.rv-tag { padding: 3px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; border: 1px solid; }
.rv-tag.pending { background: #FFF8E7; color: #D4912A; border-color: #E8D5A0; }
.rv-tag.approved { background: #F0FAF0; color: #4E7A3F; border-color: #B8E0B8; }
.rv-tag.rejected { background: #FFF5F3; color: #C24A3A; border-color: #E8B4B4; }
.rv-time { font-size: 12px; color: #aaa; }
.rv-arrow { color: #C8B89A; font-size: 11px; transition: transform 0.2s; }
.rv-arrow.open { transform: rotate(180deg); }

/* 展开区 */
.rv-card-body { padding: 0 16px 16px; border-top: 1px dashed #E8DCC8; }
.rv-info-grid { display: grid; grid-template-columns: auto 1fr; gap: 6px 14px; margin-top: 14px; font-size: 13px; }
.rv-info-label { color: #8B7355; font-weight: 500; text-align: right; }
.rv-info-value { color: #5B3A29; }
.rv-info-value a { color: #4A90B8; text-decoration: none; }
.rv-info-value a:hover { text-decoration: underline; }

/* 评分表单 */
.rv-form { margin-top: 16px; background: #FFF8E7; border: 2px solid #E8D5A0; border-radius: 8px; padding: 16px; }
.rv-form-title { font-size: 13px; font-weight: 600; color: #5B3A29; margin-bottom: 12px; }
.rv-form-group { margin-bottom: 12px; }
.rv-form-group label { display: block; font-size: 12px; color: #8B7355; font-weight: 600; margin-bottom: 4px; }
.rv-stars { display: flex; gap: 3px; align-items: center; }
.rv-star { font-size: 20px; cursor: pointer; transition: transform 0.1s; filter: grayscale(1) opacity(0.3); }
.rv-star.active { filter: none; }
.rv-star:hover { transform: scale(1.2); }
.rv-score-num { margin-left: 8px; font-size: 14px; font-weight: 600; color: #E8A93A; }
.rv-textarea { width: 100%; padding: 8px 12px; border: 2px solid #E0D5C8; border-radius: 6px; font-size: 13px; background: #FFFDF5; color: #5B3A29; font-family: inherit; resize: vertical; min-height: 60px; }
.rv-form-actions { display: flex; gap: 10px; justify-content: flex-end; }
.rv-btn-reject { padding: 8px 18px; background: #FFFDF5; color: #C24A3A; border: 2px solid #C24A3A; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.rv-btn-reject:hover { background: #C24A3A; color: #fff; }
.rv-btn-reject:disabled { opacity: 0.5; cursor: not-allowed; }
.rv-btn-approve { padding: 8px 18px; background: #5C8A4D; color: #fff; border: 2px solid #4E7A3F; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.rv-btn-approve:hover { background: #4E7A3F; }
.rv-btn-approve:disabled { opacity: 0.5; cursor: not-allowed; }

/* 结果展示 */
.rv-result { margin-top: 14px; background: #F8F5EE; border: 1px solid #E8DCC8; border-radius: 8px; padding: 14px 16px; }
.rv-result-score { display: flex; align-items: baseline; gap: 4px; margin-bottom: 8px; }
.rv-score-big { font-size: 28px; font-weight: 700; font-family: "ZCOOL QingKe HuangYou", cursive; }
.rv-score-big.high { color: #5C8A4D; }
.rv-score-big.mid { color: #E8A93A; }
.rv-score-big.low { color: #C24A3A; }
.rv-score-max { font-size: 14px; color: #aaa; }
.rv-result-comment { font-size: 13px; color: #5B3A29; line-height: 1.6; margin-bottom: 8px; padding: 8px 12px; background: #FFFDF5; border-radius: 4px; border-left: 3px solid #E8D5A0; }
.rv-result-reviewer { font-size: 12px; color: #8B7355; }
.rv-btn-reset { margin-top: 10px; padding: 6px 14px; background: #FFFDF5; color: #E8A93A; border: 2px solid #E8A93A; border-radius: 6px; font-size: 12px; font-weight: 600; cursor: pointer; }
.rv-btn-reset:hover { background: #E8A93A; color: #fff; }
.rv-btn-reset:disabled { opacity: 0.5; cursor: not-allowed; }

/* 历史 */
.rv-history { margin-top: 14px; padding-top: 12px; border-top: 1px dashed #E0D5C8; }
.rv-history-title { font-size: 12px; color: #8B7355; font-weight: 600; margin-bottom: 8px; }
.rv-history-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: #F8F5EE; border-radius: 6px; margin-bottom: 6px; font-size: 12px; }
.rv-h-round { background: #E0D5C8; color: #5B3A29; padding: 2px 8px; border-radius: 10px; font-weight: 600; font-size: 11px; }
.rv-h-score { color: #E8A93A; font-weight: 600; }
.rv-h-comment { color: #8B7355; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rv-h-reviewer { color: #aaa; }
.rv-h-time { color: #bbb; }
</style>
