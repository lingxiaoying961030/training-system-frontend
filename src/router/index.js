import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '../stores/user.js'

const routes = [
  // ====== 公开页面 ======
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { guest: true }
  },
  {
    path: '/bind',
    name: 'Bind',
    component: () => import('../views/Bind.vue'),
    meta: { guest: true }
  },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('../views/Welcome.vue'),
    meta: { requiresAuth: true }
  },

  // ====== 用户端（需要登录） ======
  {
    path: '/',
    component: () => import('../layouts/UserLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/projects'
      },
      {
        path: 'projects',
        name: 'Projects',
        component: () => import('../views/user/Projects.vue')
      },
      {
        path: 'projects/:projectId/plans',
        name: 'Plans',
        component: () => import('../views/user/Plans.vue')
      },
      {
        path: 'plans/:planId/map',
        name: 'PlanMap',
        component: () => import('../views/user/TrainingMap.vue')
      },
      {
        path: 'map',
        name: 'TrainingMap',
        component: () => import('../views/user/TrainingMap.vue')
      },
      {
        path: 'stage/:id',
        name: 'StageLearning',
        component: () => import('../views/user/StageLearning.vue')
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/user/Profile.vue')
      }
    ]
  },

  // ====== 管理端（需要登录 + 管理员权限） ======
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      {
        path: '',
        redirect: '/admin/projects'
      },
      {
        path: 'projects',
        name: 'AdminProjects',
        component: () => import('../views/admin/ProjectManager.vue')
      },
      {
        path: 'projects/:projectId/plans',
        name: 'AdminPlans',
        component: () => import('../views/admin/Plans.vue')
      },
      {
        path: 'projects/:projectId/plans/:planId/stages',
        name: 'AdminPlanStages',
        redirect: '/admin/projects'
      },
      {
        path: 'projects/:projectId/questions',
        name: 'AdminProjectQuestions',
        component: () => import('../views/admin/Questions.vue')
      },
      // Stages.vue 已整合进 ProjectManager.vue，保留 AdminPlanStages 路由兼容老链接
      {
        path: 'questions',
        name: 'AdminQuestions',
        component: () => import('../views/admin/Questions.vue')
      },
      // StageEdit.vue 已整合进 ProjectManager.vue Tabs 面板，路由已废弃
      {
        path: 'units/:id/content',
        name: 'AdminUnitContent',
        component: () => import('../views/admin/UnitContent.vue')
      },
      {
        path: 'reviews',
        name: 'AdminReviews',
        component: () => import('../views/admin/Reviews.vue')
      },
      {
        path: 'users',
        name: 'AdminUsers',
        component: () => import('../views/admin/Users.vue')
      },
      {
        path: 'students',
        name: 'AdminStudents',
        component: () => import('../views/admin/Students.vue')
      },
      {
        path: 'students/:id',
        name: 'AdminStudentDetail',
        component: () => import('../views/admin/StudentDetail.vue')
      },
      {
        path: 'dashboard',
        name: 'AdminDashboard',
        component: () => import('../views/admin/Dashboard.vue')
      },
      {
        path: 'dashboard/project/:projectId',
        name: 'AdminDashboardProject',
        component: () => import('../views/admin/DashboardProject.vue')
      },
      {
        path: 'dashboard/plan/:planId',
        name: 'AdminDashboardPlan',
        component: () => import('../views/admin/DashboardPlan.vue')
      },
      {
        path: 'audit-logs',
        name: 'AdminAuditLogs',
        component: () => import('../views/admin/AuditLogs.vue')
      },
      {
        path: 'question-bank',
        name: 'AdminQuestionBank',
        component: () => import('../views/admin/QuestionBank.vue')
      },
      {
        path: 'settings',
        name: 'AdminSettings',
        component: () => import('../views/admin/Settings.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/lxy-training/'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 根据角色选择首页
  function homeRoute() {
    return userStore.canAccessAdmin ? '/admin/projects' : '/projects'
  }

  // 需要登录但未登录 → 跳登录页
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    return next('/login')
  }

  // 已登录访问登录页 → 跳首页
  if (to.meta.guest && userStore.isLoggedIn) {
    return next(homeRoute())
  }

  // 已登录的管理员访问根路径或学员首页 → 跳管理后台
  if ((to.path === '/' || to.path === '/projects') && userStore.isLoggedIn && userStore.canAccessAdmin) {
    return next('/admin/projects')
  }

  // 需要管理员权限
  if (to.meta.requiresAdmin && !userStore.canAccessAdmin) {
    return next('/')
  }

  next()
})

export default router
