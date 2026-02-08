# Geo-Intel Brief

> 从 RSS 源和 X (Twitter) 查询生成图片优先的 Gamma 微站点，专注于欧洲、中东和北非 (MENA)、非洲地区的地缘情报简报。

## 项目简介

Geo-Intel Brief 是一个 Web 应用，能够：

1. **聚合内容** - 从 RSS feeds 和 X (Twitter) 搜索获取新闻
2. **智能分类** - 按地区（欧洲/MENA/非洲）自动分类
3. **生成微站点** - 自动在 Gamma 创建图片优先的简报页面
4. **实时跟踪** - 轮询生成进度，预览正在抓取的内容

## 技术栈

- **前端**: Next.js 16 + React 19 + TypeScript
- **UI**: shadcn/ui + Radix UI + Tailwind CSS
- **状态管理**: React hooks + 轮询
- **API**: Next.js Route Handlers

## 快速开始

### 安装依赖

```bash
npm install
```

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
│   └── utils.ts                     # 工具函数
└── hooks/
    └── use-toast.ts                 # Toast 通知 hook
```

## 功能状态

| 功能 | 状态 |
|------|------|
| UI 界面 | ✅ 完成 |
| API 路由 | ✅ 完成 |
| 状态轮询 | ✅ 完成 |
| RSS 解析 | ⏳ 待开发 |
| X API 集成 | ⏳ 待开发 |
| Gamma API 集成 | ⏳ 待开发 |
| 数据持久化 | ⏳ 待开发 |

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
