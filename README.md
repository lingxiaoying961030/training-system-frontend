# 培训系统 — 前端

Vue 3 + Vite + Naive UI，像素/星露谷风格培训系统前端。

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认端口 5200）
npm run dev
# 或指定 host 供局域网访问
npx vite --host 0.0.0.0 --port 5200

# 3. 构建生产版本
npm run build
# 产物在 dist/ 目录
```

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `VITE_API_BASE_URL` | 后端 API 地址 | 开发: `http://localhost:3002/api`，生产: `/api` |

## 目录结构

```
src/
├── api/           # axios 封装
├── components/    # 全局组件（PixelToast 等）
├── composables/   # 组合式函数（useToast 等）
├── layouts/       # AdminLayout
├── router/        # 路由配置
├── stores/        # Pinia 状态管理
└── views/
    ├── admin/     # 管理端页面
    └── user/      # 学员端页面
public/
├── pixel-icons/   # 像素风图标素材
└── demo_test/     # UI demo 文件
```

## 部署

构建后将 `dist/` 部署到 Nginx，配置反向代理：

```nginx
server {
    listen 80;
    root /path/to/dist;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3002;
    }
}
```
