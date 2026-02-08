# Geo-Intel Brief

> 使用 Google RSS + CogView-4 + Supabase + Gamma 生成图片优先的地缘情报简报站点。

## 项目简介

Geo-Intel Brief 是一个 Web 应用，能够：

1. **聚合内容** - 按地区固定模板抓取 Google News RSS
2. **图片生成** - 使用智谱 CogView-4 为每条新闻生成配图
3. **数据持久化** - 保存到 Supabase Postgres + Storage
4. **生成微站点** - 调用 Gamma API 生成简报页面
5. **实时跟踪** - 前端轮询任务进度和指标

## 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **状态管理**: React hooks + 轮询
- **API**: Next.js Route Handlers
- **数据库**: Supabase (Postgres + Storage)
- **模型**: Zhipu CogView-4

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制 `.env.example` 为 `.env.local` 并填写：

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_STORAGE_BUCKET=brief-images
GAMMA_API_KEY=
GAMMA_BASE_URL=https://public-api.gamma.app/v1.0
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
ZHIPU_COGVIEW_MODEL=CogView-4
```

### 初始化 Supabase 表结构

在 Supabase SQL Editor 执行：

`supabase/schema.sql`

### 开发模式

```bash
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

### 生产构建

```bash
npm run build
npm start
```

## 项目结构

```
├── app/
│   ├── api/brief/
│   │   ├── generate/route.ts       # 生成任务创建
│   │   └── status/[generationId]/  # 状态查询 API
│   ├── layout.tsx                   # 根布局
│   ├── page.tsx                     # 主页面
│   └── globals.css                  # 全局样式
├── components/
│   └── ui/                          # shadcn/ui 组件库
├── lib/
│   ├── utils.ts                     # 通用工具函数
│   └── server/                      # 后端服务模块
│       ├── googleRss.ts
│       ├── zhipuCogview.ts
│       ├── supabase.ts
│       ├── gamma.ts
│       └── pipeline.ts
├── supabase/
│   └── schema.sql                   # 数据库结构
└── hooks/
    └── use-toast.ts                 # Toast 通知 hook
```

## 功能状态

| 功能 | 状态 |
|------|------|
| UI 界面 | ✅ 完成 |
| API 路由 | ✅ 完成 |
| 状态轮询 | ✅ 完成 |
| Google RSS 抓取 | ✅ 完成 |
| CogView-4 配图生成 | ✅ 完成 |
| Gamma API 集成 | ✅ 完成 |
| Supabase 持久化 | ✅ 完成 |

详细的开发计划请查看 [TODO.md](TODO.md)

## 开发指南

### 可用脚本

```bash
npm run dev      # 启动开发服务器
npm run build    # 构建生产版本
npm run start    # 启动生产服务器
npm run lint     # 运行 ESLint
```

### TypeScript 配置

- 路径别名: `@/*` 映射到项目根目录
- 严格模式已启用
- JSX: `react-jsx`

## License

MIT
# Geo-Intel-Brief
