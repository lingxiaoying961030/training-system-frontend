<template>
  <div class="dashboard-page">
    <div class="px-board">
      <div class="px-header"><span>📋</span> {{ data?.plan?.name || '...' }}</div>
      <div class="px-body">

        <div class="px-bread">
          <router-link to="/admin/dashboard">📊 数据看板</router-link>
          <span> › </span>
          <router-link v-if="data?.project" :to="`/admin/dashboard/project/${data.project.id}`">{{ data.project.name }}</router-link>
          <span> › </span>
          <span>{{ data?.plan?.name || '...' }}</span>
        </div>

        <!-- 骨架屏 -->
        <template v-if="!data && loading">
          <div class="a-stats">
            <div v-for="i in 4" :key="i" class="a-stat" style="opacity:0.5;min-height:80px;">
              <div style="background:#E0D5C8;width:50px;height:12px;border-radius:4px;margin:0 auto 8px;"></div>
              <div style="background:#d0c5b8;width:36px;height:24px;border-radius:4px;margin:0 auto;"></div>
            </div>
          </div>
        </template>

        <div v-if="loadError && !loading" class="px-error-state">
          <div class="err-icon">🔌</div>
          <div class="err-title">数据加载失败</div>
          <div class="err-msg">{{ loadError }}</div>
          <button class="px-retry-btn" @click="reload">🔄 重新加载</button>
        </div>

        <template v-if="data">
          <!-- 统计卡片 -->
          <div class="a-stats">
            <div class="a-stat s1"><div class="icon">👥</div><div class="label">参与学员</div><div class="val">{{ data.totalStudents }}</div></div>
            <div class="a-stat s2"><div class="icon">⚔️</div><div class="label">在训人数</div><div class="val">{{ data.inTraining }}</div></div>
            <div class="a-stat s3"><div class="icon">🏆</div><div class="label">已通关</div><div class="val">{{ data.completed }}</div><div class="sub">通过率 {{ data.totalStudents ? Math.round(data.completed / data.totalStudents * 100) : 0 }}%</div></div>
            <div class="a-stat s4"><div class="icon">📅</div><div class="label">平均通关天数</div><div class="val">{{ data.avgDays || '-' }}</div></div>
          </div>

          <!-- 图表行 -->
          <div class="a-chart-row">
            <div class="a-chart-box" v-if="data.funnel?.length">
              <h3>🔻 关卡漏斗</h3>
              <v-chart :option="funnelOption" autoresize style="height:280px;" />
            </div>
            <div class="a-chart-box" v-if="data.practicalStats?.total > 0">
              <h3>📊 实战演练统计</h3>
              <div class="practice-row">
                <div class="practice-item">
                  <div class="p-label">平均得分</div>
                  <div class="p-val" style="color:#9C7ADB">{{ data.practicalStats.avgScore }}</div>
                  <div class="p-label">/10 分</div>
                </div>
                <div class="practice-item">
                  <div class="p-label">通过率</div>
                  <div class="p-val" style="color:#5C8A4D">{{ data.practicalStats.passRate }}%</div>
                  <div class="p-label">首次通过</div>
                </div>
                <div class="practice-item">
                  <div class="p-label">平均审核时长</div>
                  <div class="p-val" style="color:#E8A93A">{{ data.practicalStats.avgReviewHours }}</div>
                  <div class="p-label">小时</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 学员列表 -->
          <div v-if="data.students?.length" style="margin-top: 20px;">
            <h3 class="px-section">👥 学员进度明细</h3>
            <table class="px-table">
              <thead>
                <tr>
                  <th>姓名</th>
                  <th>当前关卡</th>
                  <th>完成进度</th>
                  <th>测验均分</th>
                  <th>状态</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="s in paginatedStudents" :key="s.userId">
                  <td><strong>{{ s.name }}</strong></td>
                  <td>{{ s.currentStage || '-' }}</td>
                  <td>
                    {{ s.completedStages }}/{{ s.totalStages }}
                    <div class="mini-bar"><div class="mini-fill" :style="{ width: (s.totalStages ? s.completedStages / s.totalStages * 100 : 0) + '%' }"></div></div>
                  </td>
                  <td>{{ s.avgScore != null ? s.avgScore : '—' }}</td>
                  <td><span class="px-tag" :class="statusClass(s.status)">{{ statusText(s.status) }}</span></td>
                  <td><a class="link-btn" @click="$router.push(`/admin/students/${s.userId}`)">详情</a></td>
                </tr>
              </tbody>
            </table>
            <div class="pagination" v-if="totalPages > 1">
              <button class="pg-btn" :disabled="page === 1" @click="page--">‹ 上一页</button>
              <span class="pg-info">{{ page }} / {{ totalPages }}</span>
              <button class="pg-btn" :disabled="page === totalPages" @click="page++">下一页 ›</button>
            </div>
          </div>
        </template>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import api from '../../api/index.js'

use([CanvasRenderer, BarChart, GridComponent, TooltipComponent])

const route = useRoute()
const planId = route.params.planId
const loading = ref(true)
const data = ref(null)
const loadError = ref('')
const page = ref(1)
const pageSize = 20

const paginatedStudents = computed(() => {
  if (!data.value?.students) return []
  const start = (page.value - 1) * pageSize
  return data.value.students.slice(start, start + pageSize)
})
const totalPages = computed(() => data.value?.students ? Math.ceil(data.value.students.length / pageSize) : 1)

const statusText = (s) => ({ completed: '已通关', in_progress: '学习中', not_started: '未开始' }[s] || s)
const statusClass = (s) => ({ completed: 'green', in_progress: 'orange', not_started: 'gray' }[s] || 'gray')

const funnelColors = ['#5C8A4D', '#6B9A5C', '#7AAB6B', '#89BB7A', '#98CB89', '#A7DB98']

const funnelOption = computed(() => {
  if (!data.value?.funnel) return {}
  const f = data.value.funnel
  return {
    tooltip: { trigger: 'axis' },
    grid: { left: 80, right: 20, top: 10, bottom: 40 },
    xAxis: { type: 'category', data: f.map(s => s.title), axisLabel: { rotate: f.length > 5 ? 30 : 0, color: '#8B7355' }, axisLine: { lineStyle: { color: '#E0D5C8' } } },
    yAxis: { type: 'value', name: '通过人数', nameTextStyle: { color: '#8B7355' }, axisLabel: { color: '#8B7355' }, axisLine: { lineStyle: { color: '#E0D5C8' } }, splitLine: { lineStyle: { color: '#F0E8D8' } } },
    series: [{
      type: 'bar',
      data: f.map((s, i) => ({ value: s.passCount, itemStyle: { color: funnelColors[i % funnelColors.length], borderRadius: [4,4,0,0] } })),
      label: { show: true, position: 'top', formatter: '{c}人', color: '#5B3A29', fontSize: 11 }
    }]
  }
})

async function reload() {
  loading.value = true; loadError.value = ''; data.value = null
  try {
    const res = await api.get(`/admin/dashboard/plan/${planId}`)
    if (res.success) data.value = res.data
  } catch (err) {
    loadError.value = err.message || '网络连接失败'
  } finally {
    loading.value = false
  }
}

onMounted(reload)
</script>

<style scoped>
.dashboard-page { ; }

.px-board { background: #FFF8E7; border: 3px solid #5B3A29; border-radius: 8px; overflow: hidden; }
.px-header {
  background: linear-gradient(135deg, #5B3A29, #8B6F5E); color: #FFF8E7;
  padding: 12px 20px; font-family: var(--pixel-font-title, "ZCOOL QingKe HuangYou", sans-serif);
  letter-spacing: 2px; font-size: 17px; display: flex; align-items: center; gap: 8px;
}
.px-body { padding: 20px; }

.px-bread { font-size: 12px; color: #8B7355; margin-bottom: 16px; }
.px-bread a { color: #5C8A4D; text-decoration: none; cursor: pointer; }
.px-bread a:hover { text-decoration: underline; }
.px-bread span:last-child { color: #5B3A29; font-weight: 600; }

.a-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px; }
.a-stat {
  background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px;
  padding: 16px; text-align: center; position: relative; overflow: hidden;
}
.a-stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; }
.a-stat.s1::before { background: #9C7ADB; }
.a-stat.s2::before { background: #E8A93A; }
.a-stat.s3::before { background: #5C8A4D; }
.a-stat.s4::before { background: #4A90B8; }
.a-stat .icon { font-size: 22px; margin-bottom: 4px; }
.a-stat .label { font-size: 12px; color: #8B7355; }
.a-stat .val { font-size: 26px; font-weight: 700; color: #5B3A29; margin: 4px 0; }
.a-stat .sub { font-size: 11px; color: #aaa; }

.px-section { font-size: 14px; color: #5B3A29; margin-bottom: 12px; border-bottom: 2px dashed #E0D5C8; padding-bottom: 8px; }

.a-chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.a-chart-box { background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; padding: 16px; }
.a-chart-box h3 { font-size: 14px; color: #5B3A29; margin-bottom: 12px; }

/* 实战统计 */
.practice-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 8px; }
.practice-item { text-align: center; background: #FFF8E7; border: 1px solid #E0D5C8; border-radius: 6px; padding: 14px 8px; }
.practice-item .p-val { font-size: 24px; font-weight: 700; margin: 6px 0; }
.practice-item .p-label { font-size: 11px; color: #8B7355; }

/* 表格 */
.px-table { width: 100%; border-collapse: collapse; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; overflow: hidden; }
.px-table th { background: #F5EDD8; color: #5B3A29; font-size: 12px; font-weight: 600; padding: 10px 14px; text-align: left; border-bottom: 2px solid #E0D5C8; }
.px-table td { padding: 10px 14px; font-size: 13px; color: #5B3A29; border-bottom: 1px solid #f0e8d8; }
.px-table tr:hover td { background: #FFF5E0; }
.px-table tr:last-child td { border-bottom: none; }

.px-tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
.px-tag.green { background: #E8F5E9; color: #2E7D32; }
.px-tag.orange { background: #FFF3E0; color: #E65100; }
.px-tag.gray { background: #F5F5F5; color: #999; }

.mini-bar { width: 70px; height: 8px; background: #E0D5C8; border-radius: 4px; display: inline-block; overflow: hidden; vertical-align: middle; margin-left: 6px; }
.mini-fill { height: 100%; background: #5C8A4D; border-radius: 4px; }

.link-btn { color: #5C8A4D; cursor: pointer; font-size: 12px; text-decoration: none; }
.link-btn:hover { text-decoration: underline; }

/* 分页 */
.pagination { display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 14px; }
.pg-btn {
  background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 4px;
  padding: 4px 12px; font-size: 12px; color: #5B3A29; cursor: pointer;
}
.pg-btn:hover:not(:disabled) { border-color: #5B3A29; background: #FFF5E0; }
.pg-btn:disabled { opacity: 0.4; cursor: default; }
.pg-info { font-size: 12px; color: #8B7355; }

.px-error-state { text-align: center; padding: 48px 20px; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; }
.px-error-state .err-icon { font-size: 48px; margin-bottom: 12px; }
.px-error-state .err-title { font-size: 16px; font-weight: 600; color: #5B3A29; margin-bottom: 6px; }
.px-error-state .err-msg { font-size: 13px; color: #8B7355; margin-bottom: 16px; }
.px-retry-btn { display: inline-block; padding: 8px 20px; background: #5C8A4D; color: #fff; border: 2px solid #4E7A3F; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; }
.px-retry-btn:hover { background: #4E7A3F; }
</style>
