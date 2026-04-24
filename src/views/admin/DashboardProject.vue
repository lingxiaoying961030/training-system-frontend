<template>
  <div class="dashboard-page">
    <div class="px-board">
      <div class="px-header"><span>📁</span> {{ data?.project?.name || '...' }}</div>
      <div class="px-body">

        <div class="px-bread">
          <router-link to="/admin/dashboard">📊 数据看板</router-link>
          <span> › </span>
          <span>{{ data?.project?.name || '...' }}</span>
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
            <div class="a-stat s1"><div class="icon">👥</div><div class="label">项目学员数</div><div class="val">{{ data.totalStudents }}</div></div>
            <div class="a-stat s2"><div class="icon">⚔️</div><div class="label">在训人数</div><div class="val">{{ data.inTraining }}</div></div>
            <div class="a-stat s3"><div class="icon">🏆</div><div class="label">已通关</div><div class="val">{{ data.completed }}</div><div class="sub">通关率 {{ data.totalStudents ? Math.round(data.completed / data.totalStudents * 100) : 0 }}%</div></div>
            <div class="a-stat s4"><div class="icon">📅</div><div class="label">平均通关天数</div><div class="val">{{ data.avgDays || '-' }}</div></div>
          </div>

          <!-- 培训计划 -->
          <h3 class="px-section">📋 培训计划</h3>
          <div class="a-grid">
            <div
              v-for="plan in data.plans"
              :key="plan.id"
              class="a-card"
              @click="$router.push(`/admin/dashboard/plan/${plan.id}`)"
            >
              <div class="a-card-title">📋 {{ plan.name }}</div>
              <div class="a-card-nums">
                <span>学员 <strong>{{ plan.totalStudents }}</strong></span>
                <span>通关 <strong>{{ plan.completed }}</strong></span>
                <span>通过率 <strong>{{ plan.passRate }}%</strong></span>
              </div>
              <div class="a-prog"><div class="a-prog-fill" :style="{ width: plan.passRate + '%' }"></div></div>
            </div>
          </div>

          <!-- 图表 -->
          <div class="a-chart-row">
            <div class="a-chart-box" v-if="data.funnel?.length">
              <h3>🔻 关卡漏斗（全项目）</h3>
              <v-chart :option="funnelOption" autoresize style="height:280px;" />
            </div>
            <div class="a-chart-box" v-if="data.weeklyTrend?.length">
              <h3>📈 每周趋势</h3>
              <v-chart :option="trendOption" autoresize style="height:280px;" />
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
import { LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import api from '../../api/index.js'

use([CanvasRenderer, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent])

const route = useRoute()
const projectId = route.params.projectId
const loading = ref(true)
const data = ref(null)
const loadError = ref('')

const funnelColors = ['#5B3A29', '#6D4C3D', '#8B6F5E', '#A68B6B', '#B89E7A', '#C8AE8A', '#D4BE9A', '#E0CCA8']

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

const trendOption = computed(() => {
  if (!data.value?.weeklyTrend) return {}
  const t = data.value.weeklyTrend
  return {
    tooltip: { trigger: 'axis' },
    legend: { data: ['新增', '通关'], top: 0, textStyle: { color: '#5B3A29' } },
    grid: { left: 40, right: 20, top: 40, bottom: 30 },
    xAxis: { type: 'category', data: t.map(w => w.weekStart), axisLabel: { color: '#8B7355' }, axisLine: { lineStyle: { color: '#E0D5C8' } } },
    yAxis: { type: 'value', axisLabel: { color: '#8B7355' }, axisLine: { lineStyle: { color: '#E0D5C8' } }, splitLine: { lineStyle: { color: '#F0E8D8' } } },
    series: [
      { name: '新增', type: 'line', smooth: true, data: t.map(w => w.newStudents), itemStyle: { color: '#9C7ADB' }, areaStyle: { color: 'rgba(156,122,219,0.1)' } },
      { name: '通关', type: 'line', smooth: true, data: t.map(w => w.completions), itemStyle: { color: '#5C8A4D' }, areaStyle: { color: 'rgba(92,138,77,0.1)' } }
    ]
  }
})

async function reload() {
  loading.value = true; loadError.value = ''; data.value = null
  try {
    const res = await api.get(`/admin/dashboard/project/${projectId}`)
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
.px-bread a { color: #5C8A4D; text-decoration: none; }
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

.a-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px; margin-bottom: 22px; }
.a-card {
  background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px;
  padding: 16px; cursor: pointer; transition: all 0.15s;
}
.a-card:hover { border-color: #5B3A29; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(91,58,41,0.1); }
.a-card-title { font-size: 14px; font-weight: 600; color: #5B3A29; margin-bottom: 10px; }
.a-card-nums { display: flex; gap: 14px; font-size: 12px; color: #8B7355; margin-bottom: 10px; }
.a-card-nums strong { color: #5B3A29; }
.a-prog { height: 10px; background: #E0D5C8; border-radius: 5px; overflow: hidden; border: 1px solid #d0c5b8; }
.a-prog-fill { height: 100%; border-radius: 5px; background: repeating-linear-gradient(90deg, #5C8A4D 0px, #5C8A4D 6px, #4E7A3F 6px, #4E7A3F 12px); }

.a-chart-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.a-chart-box { background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; padding: 16px; }
.a-chart-box h3 { font-size: 14px; color: #5B3A29; margin-bottom: 12px; }

.px-error-state { text-align: center; padding: 48px 20px; background: #FFFDF5; border: 2px solid #E0D5C8; border-radius: 6px; }
.px-error-state .err-icon { font-size: 48px; margin-bottom: 12px; }
.px-error-state .err-title { font-size: 16px; font-weight: 600; color: #5B3A29; margin-bottom: 6px; }
.px-error-state .err-msg { font-size: 13px; color: #8B7355; margin-bottom: 16px; }
.px-retry-btn { display: inline-block; padding: 8px 20px; background: #5C8A4D; color: #fff; border: 2px solid #4E7A3F; border-radius: 4px; font-size: 13px; font-weight: 600; cursor: pointer; }
.px-retry-btn:hover { background: #4E7A3F; }
</style>
