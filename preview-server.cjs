const http = require('http')
const fs = require('fs')
const path = require('path')

const DIST = path.join(__dirname, 'dist')
const BASE = '/lxy-training'
const PORT = 4000

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
}

http.createServer((req, res) => {
  let url = req.url.split('?')[0]
  
  // 去掉 base 前缀
  if (url.startsWith(BASE)) {
    url = url.slice(BASE.length) || '/'
  }
  
  let filePath = path.join(DIST, url)
  
  // SPA fallback: 文件不存在则返回 index.html
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST, 'index.html')
  }
  
  const ext = path.extname(filePath)
  res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream')
  fs.createReadStream(filePath).pipe(res)
}).listen(PORT, () => {
  console.log(`\n✅ 本地模拟线上环境已启动！`)
  console.log(`👉 打开浏览器访问: http://localhost:${PORT}${BASE}/`)
  console.log(`\n这和线上 http://106.75.8.161${BASE}/ 的效果完全一样`)
  console.log(`看标签页有没有🎮手柄图标\n`)
})
