# Geo-Intel Brief - MVP 开发计划

## 项目概述

从 RSS 源和 X (Twitter) 查询聚合内容，生成图片优先的 Gamma 微站点，专注于欧洲、中东和北非 (MENA)、非洲地区的地缘情报简报。

---

## 当前进度

### ✅ 已完成 (v0.1)

| 模块 | 状态 | 说明 |
|------|------|------|
| 前端 UI | ✅ 完成 | 完整的配置界面，使用 shadcn/ui 组件 |
| API 路由 | ✅ 完成 | `/api/brief/generate` 和 `/api/brief/status` |
| 状态轮询 | ✅ 完成 | 客户端每 2.5 秒轮询生成状态 |
| 主题系统 | ✅ 完成 | Tailwind CSS 变量 + shadcn/ui |
| TypeScript 配置 | ✅ 完成 | 路径别名 `@/*`、严格模式 |

---

## MVP 待办事项

### 阶段 1: 核心数据获取 (P0 - MVP 必需)

- [ ] **RSS 解析器**
  - [ ] 使用 `rss-parser` 或 `fast-xml-parser` 解析 RSS feeds
  - [ ] 提取标题、描述、图片、发布时间、链接
  - [ ] 错误处理（无效 URL、超时、格式错误）

- [ ] **X (Twitter) API 集成**
  - [ ] 配置 X API v2 客户端
  - [ ] 实现搜索查询功能
  - [ ] 提取推文内容、图片、作者信息
  - [ ] 处理 API 速率限制

- [ ] **网站内容抓取** (可选，P1)
  - [ ] 使用 `cheerio` 或 `playwright` 提取文章正文
  - [ ] 提取主图（Open Graph 或文章内图片）

### 阶段 2: 数据处理与存储 (P0)

- [ ] **数据库层**
  - [ ] 选择：SQLite (开发) / PostgreSQL (生产) / Supabase
  - [ ] 表设计：`generations`, `items`, `sources`
  - [ ] 实现数据访问层 (DAL)

- [ ] **图片处理**
  - [ ] 图片下载与缓存
  - [ ] AI 图片回退生成 (使用 DALL-E 或 Stable Diffusion)
  - [ ] 图片优化（压缩、格式转换）

- [ ] **内容分类**
  - [ ] 按地区分类（欧洲/MENA/非洲）
  - [ ] 按来源分组
  - [ ] 应用自定义标签

### 阶段 3: Gamma 集成 (P0)

- [ ] **Gamma API 集成**
  - [ ] 注册 Gamma API 密钥
  - [ ] 实现页面创建 API 调用
  - [ ] 实现内容块添加（卡片、图片、文本）
  - [ ] 应用用户自定义指令

- [ ] **模板系统**
  - [ ] 设计默认微站点布局
  - [ ] 按地区生成目录 (TOC)
  - [ ] 卡片样式标准化

### 阶段 4: 后台任务处理 (P0)

- [ ] **任务队列**
  - [ ] 集成 BullMQ 或类似队列系统
  - [ ] Worker 进程处理生成任务
  - [ ] 进度跟踪与更新

- [ ] **状态管理持久化**
  - [ ] 替换内存 Map 为数据库存储
  - [ ] 添加任务超时处理
  - [ ] 失败重试机制

### 阶段 5: 用户体验改进 (P1)

- [ ] **实时预览**
  - [ ] WebSocket 或 Server-Sent Events (SSE)
  - [ ] 实时显示已抓取的项目

- [ ] **历史记录持久化**
  - [ ] LocalStorage 或服务端存储
  - [ ] 按日期、地区筛选

- [ ] **主题切换生效**
  - [ ] 实现 ThemeProvider 逻辑
  - [ ] 持久化用户选择

### 阶段 6: 运维与部署 (P1)

- [ ] **环境配置**
  - [ ] `.env` 文件模板
  - [ ] 环境变量文档

- [ ] **Docker 支持**
  - [ ] Dockerfile
  - [ ] docker-compose.yml（含数据库）

- [ ] **部署配置**
  - [ ] Vercel 部署配置
  - [ ] 或自托管指南

---

## 技术债务 / 未来改进

- [ ] 单元测试覆盖
- [ ] E2E 测试 (Playwright)
- [ ] API 速率限制
- [ ] 用户认证（可选）
- [ ] 批量操作（同时生成多个简报）
- [ ] 导出为 PDF（可选）
- [ ] 邮件通知（可选）

---

## 依赖决策待定

| 决策点 | 选项 | 建议 |
|--------|------|------|
| 数据库 | SQLite / PostgreSQL / Supabase | 开发用 SQLite，生产用 Supabase |
| 队列系统 | BullMQ / Postgres Queue / Cloudflare Queues | BullMQ（Redis）或简单数据库队列 |
| 图片存储 | 本地 / S3 / Cloudflare R2 | 开发本地，生产 R2/S3 |
| AI 图片生成 | DALL-E / Stable Diffusion / None | DALL-E 3（简单集成） |
| Gamma API | 需要申请 / 文档待查 | 需要调研 Gamma API 可用性 |
