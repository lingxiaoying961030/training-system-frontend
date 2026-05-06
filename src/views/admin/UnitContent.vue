<template>
  <div class="unit-content-page">
    <!-- 顶栏 -->
    <div class="uc-top-bar">
      <div class="uc-breadcrumb">
        <a @click="$router.push('/admin/projects')">📁 项目管理</a> ›
        <a @click="navTo('project')">{{ contextNames.project || '项目' }}</a> ›
        <a @click="navTo('plan')">{{ contextNames.plan || '计划' }}</a> ›
        <a @click="navTo('stage')">{{ contextNames.stage || '关卡' }}</a> ›
        {{ unitData?.title || '加载中...' }}
      </div>
    </div>

    <!-- 单元信息条 -->
    <div class="uc-info-bar">
      <span class="uc-info-icon">{{ unitIcon(unitData?.unit_type) }}</span>
      <div>
        <div class="uc-info-title">{{ unitData?.title || '加载中...' }}</div>
        <div class="uc-info-sub">{{ contextNames.stage || '' }} › 第 {{ unitData?.sort_order ?? '?' }} 个单元</div>
      </div>
      <div class="uc-info-meta">
        <span class="uc-tag" :class="'uc-tag-' + (unitData?.unit_type || '')">{{ unitTypeLabel(unitData?.unit_type) }}</span>
        <span v-if="unitData?.is_required" class="uc-tag uc-tag-req">必学</span>
        <span v-else class="uc-tag uc-tag-opt">选学</span>
      </div>
    </div>

    <div v-if="loading" style="text-align: center; padding: 60px; color: var(--pixel-muted, #9e8a76);">加载中...</div>

    <div v-else class="uc-content-area">
      <!-- 文章类型 -->
      <div v-if="unitData?.unit_type === 'article'" class="px-card">
        <div class="px-card-hdr">
          <span>📝 文章内容</span>
          <span class="px-card-hint">支持富文本 · 用分割线（---）分页</span>
        </div>
        <div class="px-card-body px-card-body-flush">
          <!-- 管理员：编辑器 -->
          <div v-if="!readonly" class="uc-editor-wrap">
            <Toolbar :editor="editorRef" :defaultConfig="toolbarConfig" class="uc-toolbar" />
            <Editor
              v-model="articleHtml"
              :defaultConfig="editorConfig"
              class="uc-editor"
              @onCreated="handleCreated"
            />
          </div>
          <!-- 导师：只读预览 -->
          <div v-else class="uc-readonly-body" v-html="articleHtml || '<p style=color:#9e8a76>暂无内容</p>'"></div>
        </div>
        <div class="px-card-footer">
          <template v-if="!readonly">
            <button class="uc-btn uc-btn-p" @click="saveArticleContent" :disabled="saving">💾 {{ saving ? '保存中...' : '保存内容' }}</button>
            <button class="uc-btn" @click="showPreview = true">👁 预览学员视角</button>
            <span style="color:#d4c5a0;font-size:16px;margin-left:4px;">│</span>
            <button class="uc-btn uc-btn-format" @click="autoFormat">✨ 一键排版</button>
            <select v-model="formatMode" class="uc-select-sm" @change="onFormatModeChange">
              <option value="heading">按标题分页</option>
              <option value="length">按字数分页</option>
              <option value="both">标题 + 字数</option>
            </select>
            <span v-if="formatMode !== 'heading'" style="display:inline-flex;align-items:center;gap:4px;">
              <span class="px-card-hint">每页约</span>
              <input type="number" v-model.number="formatPageSize" min="300" max="3000" step="100" class="uc-input-num" style="width:70px;">
              <span class="px-card-hint">字</span>
            </span>
            <span class="px-card-hint" style="margin-left: auto;">Ctrl+S 也可以保存</span>
          </template>
          <template v-else>
            <button class="uc-btn" @click="showPreview = true">👁 预览学员视角</button>
            <span class="px-card-hint" style="margin-left: auto;">📖 只读模式</span>
          </template>
        </div>
      </div>

      <!-- 视频类型 -->
      <div v-if="unitData?.unit_type === 'video'" class="px-card">
        <div class="px-card-hdr">
          <span>🎬 视频设置</span>
          <span class="px-card-hint">支持 B站视频链接</span>
        </div>
        <div class="px-card-body">
          <template v-if="!readonly">
            <div class="uc-form-label">视频链接</div>
            <div class="uc-input-row">
              <input v-model="videoUrl" class="uc-input" placeholder="粘贴 B站视频链接，如 https://www.bilibili.com/video/BV1xxxxx">
              <button class="uc-btn uc-btn-p" @click="saveVideoContent" :disabled="saving">💾 保存</button>
            </div>
          </template>
          <div v-if="videoEmbedUrl" style="margin-top: 16px;">
            <div class="uc-form-label">📺 视频预览</div>
            <div class="uc-video-preview">
              <iframe :src="videoEmbedUrl" allowfullscreen></iframe>
            </div>
          </div>
        </div>
      </div>

      <!-- 练习/测验类型 -->
      <div v-if="unitData?.unit_type === 'practice' || unitData?.unit_type === 'quiz'" class="px-card">
        <div class="px-card-hdr">
          <span>{{ unitData.unit_type === 'practice' ? '📝 练习配置' : '🎯 测验配置' }}</span>
        </div>
        <div class="px-card-body">
          <div class="uc-config-grid">
            <label>单选题数量</label>
            <input type="number" v-model.number="quizConfig.single_count" :min="0" :max="99" class="uc-input-num">
            <span class="uc-config-hint">题</span>
            <label>多选题数量</label>
            <input type="number" v-model.number="quizConfig.multiple_count" :min="0" :max="99" class="uc-input-num">
            <span class="uc-config-hint">题</span>
            <label>判断题数量</label>
            <input type="number" v-model.number="quizConfig.judge_count" :min="0" :max="99" class="uc-input-num">
            <span class="uc-config-hint">题</span>
          </div>

          <div class="uc-pool-info" v-if="validationResult">
            {{ unitData.unit_type === 'practice' ? '练习' : '测验' }}池题量：
            <strong>{{ (validationResult.counts?.single || 0) + (validationResult.counts?.multiple || 0) + (validationResult.counts?.judge || 0) }}</strong> 题 ·
            单选 <strong>{{ validationResult.counts?.single || 0 }}</strong> ·
            多选 <strong>{{ validationResult.counts?.multiple || 0 }}</strong> ·
            判断 <strong>{{ validationResult.counts?.judge || 0 }}</strong>
          </div>

          <div v-if="validationResult?.ok" class="uc-pool-ok">✅ 题目充足，可正常抽题</div>
          <div v-else-if="validationResult && !validationResult.ok" class="uc-pool-warn">
            ⚠️ 题目不足：
            <template v-if="validationResult.counts?.single < (quizConfig.single_count || 0)">单选需要{{ quizConfig.single_count }}题，仅{{ validationResult.counts.single }}题；</template>
            <template v-if="validationResult.counts?.multiple < (quizConfig.multiple_count || 0)">多选需要{{ quizConfig.multiple_count }}题，仅{{ validationResult.counts.multiple }}题；</template>
            <template v-if="validationResult.counts?.judge < (quizConfig.judge_count || 0)">判断需要{{ quizConfig.judge_count }}题，仅{{ validationResult.counts.judge }}题</template>
          </div>

          <div style="margin-top: 14px; display: flex; gap: 8px;">
            <button class="uc-btn" @click="validateConfig" :disabled="validating">🔍 {{ validating ? '验证中...' : '验证题目充足性' }}</button>
            <button class="uc-btn uc-btn-p" @click="saveQuizConfig" :disabled="saving">💾 {{ saving ? '保存中...' : '保存配置' }}</button>
          </div>
        </div>
      </div>

      <!-- 实战演练类型 -->
      <div v-if="unitData?.unit_type === 'practical'" class="px-card">
        <div class="px-card-hdr"><span>🔧 实战演练配置</span></div>
        <div class="px-card-body">
          <div class="uc-form-row">
            <label>外链地址 *</label>
            <input v-model="practicalConfig.external_url" class="uc-input" placeholder="https://标注平台链接...">
          </div>
          <div class="uc-form-row">
            <label>任务说明</label>
            <textarea v-model="practicalConfig.review_instructions" class="uc-textarea" rows="4" placeholder="给学员看的任务说明..."></textarea>
          </div>
          <div class="uc-form-row">
            <label>需要审核</label>
            <div class="uc-toggle-row">
              <n-switch v-model:value="practicalConfig.require_review" />
              <span class="uc-toggle-hint">开启后，学员提交需要导师审核通过才算完成</span>
            </div>
          </div>
          <div style="margin-top: 14px;">
            <button class="uc-btn uc-btn-p" @click="savePracticalConfig" :disabled="saving">💾 {{ saving ? '保存中...' : '保存配置' }}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- 预览弹窗 -->
    <Teleport to="body">
      <div v-if="showPreview" class="uc-preview-overlay" @click.self="showPreview = false">
        <div class="uc-preview-modal">
          <div class="uc-preview-hdr">
            <span>📖 学员视角预览</span>
            <span class="uc-preview-close" @click="showPreview = false">✕ 关闭</span>
          </div>
          <div class="uc-preview-body">
            <div v-if="previewPages.length > 1" v-html="previewPages[previewPageIdx]"></div>
            <div v-else v-html="previewPages[0] || '<p>暂无内容</p>'"></div>
          </div>
          <div v-if="previewPages.length > 1" class="uc-preview-footer">
            <button class="uc-btn" :disabled="previewPageIdx === 0" @click="previewPageIdx--">← 上一页</button>
            <span style="color: var(--pixel-muted); font-size: 13px;">{{ previewPageIdx + 1 }} / {{ previewPages.length }}</span>
            <button class="uc-btn" :disabled="previewPageIdx >= previewPages.length - 1" @click="previewPageIdx++">下一页 →</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, shallowRef, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NSwitch, useMessage } from 'naive-ui'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import '@wangeditor/editor/dist/css/style.css'
import api from '../../api/index.js'
import { useUserStore } from '../../stores/user.js'

const userStore = useUserStore()
const readonly = computed(() => !userStore.isAdmin)

const route = useRoute()
const router = useRouter()
const message = useMessage()
const unitId = route.params.id

const loading = ref(true)
const saving = ref(false)
const unitData = ref(null)

// 上下文名称（面包屑用）
const contextNames = reactive({ project: '', plan: '', stage: '' })
const contextIds = reactive({ project: '', plan: '', stage: '' })

function navTo(level) {
  const query = {}
  if (level === 'stage') {
    query.project = contextIds.project; query.plan = contextIds.plan; query.stage = contextIds.stage
  } else if (level === 'plan') {
    query.project = contextIds.project; query.plan = contextIds.plan
  } else if (level === 'project') {
    query.project = contextIds.project
  }
  router.push({ path: '/admin/projects', query })
}

function unitIcon(type) { return { article: '📖', video: '🎬', practice: '📝', quiz: '🎯', practical: '🔧' }[type] || '📌' }
function unitTypeLabel(type) { return { article: '文章', video: '视频', practice: '练习', quiz: '测验', practical: '实战演练' }[type] || type }

// === 文章编辑器 ===
const editorRef = shallowRef()
const articleHtml = ref('')
const showPreview = ref(false)
const previewPageIdx = ref(0)

// === 一键排版 ===
const formatMode = ref('both')
const formatPageSize = ref(800)
function onFormatModeChange() {}

function autoFormat() {
  if (!editorRef.value) return
  let html = editorRef.value.getHtml()
  if (!html || html === '<p><br></p>') { message.warning('请先粘贴内容'); return }

  // 1. 清理
  html = cleanFormatHTML(html)
  // 2. 分页
  html = insertFormatPageBreaks(html)

  editorRef.value.setHtml(html)
  articleHtml.value = html

  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const chars = tmp.textContent.length
  const pageCount = html.split(/<hr\s*\/?>/i).filter(p => p.trim()).length
  message.success(`排版完成！${chars} 字，分 ${pageCount} 页`)
}

function cleanFormatHTML(html) {
  html = html.replace(/\s*class="[^"]*"/g, '')
  html = html.replace(/\s*style="[^"]*"/g, '')
  html = html.replace(/\s*data-[a-z-]+="[^"]*"/g, '')
  html = html.replace(/<span\s*>([\s\S]*?)<\/span>/g, '$1')
  html = html.replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '')
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/(<br\s*\/?>){3,}/g, '<br><br>')
  html = html.replace(/<div>([\s\S]*?)<\/div>/g, '<p>$1</p>')
  html = html.replace(/<hr\s*\/?>/g, '')
  return html
}

function insertFormatPageBreaks(html) {
  const mode = formatMode.value
  const maxLen = formatPageSize.value || 800
  const container = document.createElement('div')
  container.innerHTML = html
  const children = Array.from(container.children)
  if (children.length === 0) return html

  const result = []
  let currentLen = 0

  children.forEach((el, i) => {
    const len = el.textContent.length
    const isH1 = el.tagName === 'H1'
    const isH2 = el.tagName === 'H2'

    if (i === 0) { result.push(el.outerHTML); currentLen = len; return }

    let shouldBreak = false
    if (mode === 'heading') {
      shouldBreak = isH1 || isH2
    } else if (mode === 'length') {
      shouldBreak = currentLen >= maxLen
    } else {
      shouldBreak = (isH1 || isH2) || currentLen >= maxLen
    }

    if (shouldBreak) {
      result.push('<hr>')
      currentLen = 0
    }
    result.push(el.outerHTML)
    currentLen += len
  })

  let joined = result.join('\n')
  joined = joined.replace(/^\s*<hr>\s*/, '')
  return joined
}

const previewPages = computed(() => {
  const html = articleHtml.value || ''
  if (!html) return ['<p>暂无内容</p>']
  const pages = html.split(/<hr\s*\/?>/i).map(p => p.trim()).filter(Boolean)
  previewPageIdx.value = 0
  return pages.length > 0 ? pages : [html]
})
const toolbarConfig = {}
const editorConfig = {
  placeholder: '请输入文章内容...',
  MENU_CONF: {
    uploadImage: {
      async customUpload(file, insertFn) {
        try {
          const formData = new FormData()
          formData.append('image', file)
          const res = await api.post('/admin/upload-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          })
          if (res.success && res.url) {
            insertFn(res.url, file.name, '')
          } else {
            message.error('图片上传失败')
          }
        } catch (err) {
          message.error('图片上传失败：' + err.message)
        }
      }
    }
  }
}
function handleCreated(editor) { editorRef.value = editor }
onBeforeUnmount(() => { if (editorRef.value) editorRef.value.destroy() })

// === 视频 ===
const videoUrl = ref('')
const videoEmbedUrl = computed(() => {
  if (!videoUrl.value) return ''
  const bvMatch = videoUrl.value.match(/BV[a-zA-Z0-9]+/)
  if (bvMatch) return `//player.bilibili.com/player.html?bvid=${bvMatch[0]}&autoplay=0`
  return ''
})

// === 抽题配置 ===
const quizConfig = ref({ single_count: 0, multiple_count: 0, judge_count: 0 })
const validationResult = ref(null)
const validating = ref(false)

// === 实战演练 ===
const practicalConfig = ref({ external_url: '', review_instructions: '', require_review: true })

// === 加载 ===
async function loadUnit() {
  loading.value = true
  try {
    const res = await api.get(`/admin/units/${unitId}`)
    const unit = res.data
    if (unit) {
      unitData.value = unit
      if (unit.unit_type === 'article') articleHtml.value = unit.content?.body || ''
      else if (unit.unit_type === 'video') videoUrl.value = unit.content?.url || ''
      else if (unit.unit_type === 'practice' || unit.unit_type === 'quiz') {
        quizConfig.value = { single_count: unit.content?.single_count || 0, multiple_count: unit.content?.multiple_count || 0, judge_count: unit.content?.judge_count || 0 }
      } else if (unit.unit_type === 'practical') {
        practicalConfig.value = { external_url: unit.content?.external_url || '', review_instructions: unit.content?.review_instructions || '', require_review: unit.content?.require_review !== false }
      }
      // 加载上下文名称
      loadContextNames(unit.stage_id)
    }
  } catch (err) {
    message.error('加载失败：' + err.message)
  } finally { loading.value = false }
}

async function loadContextNames(stageId) {
  try {
    contextIds.stage = stageId
    const stageRes = await api.get(`/admin/stages/${stageId}`)
    const stage = stageRes.data
    contextNames.stage = stage?.title || ''
    if (stage?.plan_id) {
      contextIds.plan = stage.plan_id
      const [plansRes, projsRes] = await Promise.all([api.get('/admin/plans'), api.get('/admin/projects')])
      const plan = (plansRes.data || []).find(p => p.id === stage.plan_id)
      contextNames.plan = plan?.name || ''
      if (plan?.project_id) {
        contextIds.project = plan.project_id
        const proj = (projsRes.data || []).find(p => p.id === plan.project_id)
        contextNames.project = proj?.name || ''
      }
    }
  } catch {}
}

// === 保存 ===
async function saveArticleContent() {
  saving.value = true
  try {
    await api.put(`/admin/units/${unitId}/content`, { unit_type: 'article', body: articleHtml.value })
    message.success('保存成功')
  } catch { message.error('保存失败') }
  finally { saving.value = false }
}

async function saveVideoContent() {
  saving.value = true
  try {
    await api.put(`/admin/units/${unitId}/content`, { unit_type: 'video', url: videoUrl.value })
    message.success('保存成功')
  } catch { message.error('保存失败') }
  finally { saving.value = false }
}

async function saveQuizConfig() {
  saving.value = true
  try {
    await api.put(`/admin/units/${unitId}/content`, { unit_type: unitData.value.unit_type, ...quizConfig.value })
    message.success('保存成功')
  } catch { message.error('保存失败') }
  finally { saving.value = false }
}

async function savePracticalConfig() {
  if (!practicalConfig.value.external_url.trim()) { message.warning('请输入外链地址'); return }
  saving.value = true
  try {
    await api.put(`/admin/units/${unitId}/content`, { unit_type: 'practical', ...practicalConfig.value })
    message.success('保存成功')
  } catch (err) { message.error('保存失败：' + err.message) }
  finally { saving.value = false }
}

async function validateConfig() {
  validating.value = true
  try {
    const res = await api.post(`/admin/units/${unitId}/content/validate`, {
      stage_id: unitData.value.stage_id, unit_type: unitData.value.unit_type, ...quizConfig.value
    })
    validationResult.value = res.data
  } catch (err) { message.error('验证失败：' + err.message) }
  finally { validating.value = false }
}

// Ctrl+S 保存
function onKeydown(e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault()
    if (unitData.value?.unit_type === 'article') saveArticleContent()
  }
}

onMounted(() => { loadUnit(); window.addEventListener('keydown', onKeydown) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeydown) })
</script>

<style scoped>
.unit-content-page { margin: -24px -28px; }

/* 顶栏 */
.uc-top-bar { background: #f0e6d2; border-bottom: 2px solid var(--pixel-border, #8b6914); padding: 12px 24px; }
.uc-breadcrumb { font-size: 12px; color: var(--pixel-muted, #9e8a76); }
.uc-breadcrumb a { color: var(--pixel-link, #4a90d9); cursor: pointer; text-decoration: none; }
.uc-breadcrumb a:hover { text-decoration: underline; }

/* 单元信息条 */
.uc-info-bar { padding: 14px 24px; background: var(--pixel-card, #fffbf0); border-bottom: 1px solid #e8dcc8; display: flex; align-items: center; gap: 12px; }
.uc-info-icon { font-size: 24px; }
.uc-info-title { font-size: 16px; font-weight: 600; }
.uc-info-sub { font-size: 12px; color: var(--pixel-muted, #9e8a76); margin-top: 2px; }
.uc-info-meta { margin-left: auto; display: flex; gap: 6px; }
.uc-tag { font-size: 11px; padding: 2px 8px; border-radius: 10px; }
.uc-tag-article { background: #e3f2fd; color: #1976d2; }
.uc-tag-video { background: #e8f5e9; color: #2e7d32; }
.uc-tag-practice { background: #f5f5f5; color: #666; }
.uc-tag-quiz { background: #fff3e0; color: #e65100; }
.uc-tag-practical { background: #fce4ec; color: #c62828; }
.uc-tag-req { background: #e8f5e9; color: #2e7d32; }
.uc-tag-opt { background: #f5f5f5; color: #999; }

/* 内容区 */
.uc-content-area { max-width: 1100px; margin: 0 auto; padding: 24px; position: relative; }

/* 像素卡片 */
.px-card { border: 2px solid var(--pixel-border, #8b6914); border-radius: 8px; overflow: hidden; margin-bottom: 20px; background: var(--pixel-card, #fffbf0); }
.px-card-hdr { padding: 10px 16px; background: #f0e6d2; font-weight: 600; font-size: 13px; display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #e0d5c0; }
.px-card-hint { font-size: 11px; font-weight: 400; color: var(--pixel-muted, #9e8a76); }
.px-card-body { padding: 16px; }
.px-card-body-flush { padding: 0; }
.px-card-footer { padding: 12px 16px; border-top: 1px solid #e8dcc8; display: flex; gap: 8px; align-items: center; }

/* WangEditor 样式覆盖 */
.uc-editor-wrap { border: none; }
.uc-toolbar { border-bottom: 1px solid #d4c5a0 !important; background: #faf5ea !important; }
.uc-editor { height: calc(100vh - 280px); overflow-y: auto; }

/* 深层覆盖 WangEditor 样式 */
:deep(.w-e-toolbar) { background: #faf5ea !important; border-bottom: 1px solid #d4c5a0 !important; }
:deep(.w-e-text-container) { background: #fff !important; max-height: calc(100vh - 280px) !important; overflow-y: auto !important; }
:deep(.w-e-text-container img) { max-width: 100%; height: auto; }
:deep(.w-e-text-container [data-slate-editor]) { min-height: 300px; }
:deep(.w-e-bar-item button:hover) { background: #f0e6d2 !important; }
:deep(.w-e-full-screen-container) { position: fixed !important; top: 0 !important; left: 220px !important; right: 0 !important; bottom: 0 !important; z-index: 50 !important; background: #fff !important; }

/* 按钮 */
.uc-btn { padding: 8px 16px; border: 2px solid #d4c5a0; background: #fff; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: inherit; }
.uc-btn:hover { background: #faf5ea; border-color: var(--pixel-border, #8b6914); }
.uc-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.uc-btn-p { background: var(--pixel-link, #4a90d9); color: #fff; border-color: #3a7bc8; }
.uc-btn-p:hover { background: #3a7bc8; }
.uc-btn-format { background: #f4a460; color: #fff; border-color: #d4882a; }
.uc-btn-format:hover { background: #e8944e; }
.uc-select-sm { padding: 5px 8px; border: 2px solid #d4c5a0; border-radius: 4px; font-size: 12px; background: #fff; font-family: inherit; cursor: pointer; }
.uc-select-sm:hover { border-color: var(--pixel-border, #8b6914); }

/* 导师只读预览 */
.uc-readonly-body { padding: 20px 24px; font-size: 15px; line-height: 1.8; color: #333; max-height: calc(100vh - 280px); overflow-y: auto; background: #fff; }
.uc-readonly-body :deep(h1), .uc-readonly-body :deep(h2), .uc-readonly-body :deep(h3) { color: #1d1d1f; margin: 16px 0 8px; }
.uc-readonly-body :deep(p) { margin: 0 0 12px; }
.uc-readonly-body :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
.uc-readonly-body :deep(blockquote) { border-left: 4px solid #E8A93A; background: #FFF8E7; padding: 10px 16px; margin: 12px 0; }
.uc-readonly-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; }
.uc-readonly-body :deep(th), .uc-readonly-body :deep(td) { border: 1px solid #d4c5a0; padding: 8px 12px; }
.uc-readonly-body :deep(th) { background: #faf5ea; font-weight: 600; }
.uc-readonly-body :deep(pre) { background: #2d2d2d; color: #f8f8f2; padding: 14px 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
.uc-readonly-body :deep(hr) { border: none; border-top: 2px dashed #d4c5a0; margin: 16px 0; }
.uc-readonly-body :deep(ul), .uc-readonly-body :deep(ol) { padding-left: 24px; margin: 8px 0; }

/* 表单 */
.uc-form-label { font-size: 12px; font-weight: 600; color: var(--pixel-muted, #9e8a76); margin-bottom: 6px; }
.uc-form-row { margin-bottom: 14px; }
.uc-form-row label { display: block; font-size: 12px; font-weight: 600; color: var(--pixel-muted, #9e8a76); margin-bottom: 4px; }
.uc-input { padding: 8px 12px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 13px; width: 100%; font-family: inherit; }
.uc-textarea { padding: 8px 12px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 13px; width: 100%; font-family: inherit; resize: vertical; }
.uc-input-row { display: flex; gap: 8px; }
.uc-input-row .uc-input { flex: 1; }
.uc-toggle-row { display: flex; align-items: center; gap: 8px; }
.uc-toggle-hint { font-size: 12px; color: var(--pixel-muted, #9e8a76); }

/* 视频预览 */
.uc-video-preview { border-radius: 8px; overflow: hidden; background: #1a1a2e; }
.uc-video-preview iframe { width: 100%; height: 400px; border: none; }

/* 测验配置 */
.uc-config-grid { display: grid; grid-template-columns: 100px auto 30px; gap: 10px 12px; align-items: center; max-width: 300px; }
.uc-config-grid label { text-align: right; color: var(--pixel-muted, #9e8a76); font-weight: 600; font-size: 12px; }
.uc-input-num { padding: 7px 10px; border: 2px solid #d4c5a0; border-radius: 6px; font-size: 13px; width: 80px; text-align: center; }
.uc-config-hint { font-size: 12px; color: var(--pixel-muted, #9e8a76); }
.uc-pool-info { margin-top: 14px; padding: 10px 14px; background: #faf5ea; border: 1px solid #e8dcc8; border-radius: 6px; font-size: 12px; }
.uc-pool-info strong { color: var(--pixel-link, #4a90d9); }
.uc-pool-ok { margin-top: 8px; padding: 8px 12px; background: #f0faf0; border: 1px solid #b8e0b8; border-radius: 4px; font-size: 12px; color: #2e7d32; }
.uc-pool-warn { margin-top: 8px; padding: 8px 12px; background: #fff8f0; border: 1px solid #f0d4a0; border-radius: 4px; font-size: 12px; color: #d4882a; }

/* 预览弹窗 */
.uc-preview-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
.uc-preview-modal { background: var(--pixel-card, #fffbf0); border: 3px solid var(--pixel-border, #8b6914); border-radius: 12px; width: 640px; max-width: 90vw; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; }
.uc-preview-hdr { padding: 12px 16px; background: #f0e6d2; border-bottom: 2px solid var(--pixel-border, #8b6914); display: flex; align-items: center; justify-content: space-between; font-weight: 600; font-size: 14px; }
.uc-preview-close { cursor: pointer; color: var(--pixel-muted, #9e8a76); font-size: 13px; }
.uc-preview-close:hover { color: #4a3728; }
.uc-preview-body { flex: 1; overflow-y: auto; padding: 20px; font-size: 15px; line-height: 1.8; color: #333; }
.uc-preview-body :deep(p) { margin: 0 0 12px; }
.uc-preview-body :deep(h1), .uc-preview-body :deep(h2), .uc-preview-body :deep(h3) { margin: 16px 0 8px; color: #1d1d1f; }
.uc-preview-body :deep(img) { max-width: 100%; height: auto; border-radius: 4px; }
.uc-preview-body :deep(blockquote) { border-left: 4px solid #E8A93A; background: #FFF8E7; padding: 10px 16px; margin: 12px 0; color: #5B3A29; }
.uc-preview-body :deep(table) { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
.uc-preview-body :deep(th), .uc-preview-body :deep(td) { border: 1px solid #d4c5a0; padding: 8px 12px; text-align: left; }
.uc-preview-body :deep(th) { background: #faf5ea; font-weight: 600; color: #5B3A29; }
.uc-preview-body :deep(pre) { background: #2d2d2d; color: #f8f8f2; padding: 14px 16px; border-radius: 6px; overflow-x: auto; margin: 12px 0; font-size: 13px; line-height: 1.5; }
.uc-preview-body :deep(code) { background: #F5EFE0; padding: 2px 6px; font-size: 13px; border-radius: 3px; border: 1px solid #e8dcc8; }
.uc-preview-body :deep(pre code) { background: none; padding: 0; border: none; color: inherit; }
.uc-preview-body :deep(ul), .uc-preview-body :deep(ol) { padding-left: 24px; margin: 8px 0; }
.uc-preview-body :deep(li) { margin: 4px 0; }
.uc-preview-body :deep(hr) { border: none; border-top: 2px dashed #d4c5a0; margin: 16px 0; }
.uc-preview-footer { padding: 10px 16px; border-top: 1px solid #e8dcc8; display: flex; align-items: center; justify-content: center; gap: 16px; }
</style>
